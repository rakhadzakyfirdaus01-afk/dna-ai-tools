import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { GoogleGenAI } from "@google/genai";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import {
  PDFDocument,
  StandardFonts,
  rgb,
} from "pdf-lib";
import ExcelJS from "exceljs";

import { authOptions } from "@/auth";
import prisma from "@/lib/prisma";

/* =========================================================
   TYPES
========================================================= */

type DocumentType =
  | "pdf"
  | "word"
  | "excel";

type SortDirection =
  | "asc"
  | "desc";

type SortInstruction = {
  column: string;
  direction: SortDirection;
};

type FilterInstruction = {
  column: string;
  operator:
    | "equals"
    | "contains";
  value: string;
};

type AIInstruction = {
  mode?: "transform" | "split";
  split?: {
    column: string;
  };
  sort?: SortInstruction[];
  filters?: FilterInstruction[];
  missingColumns?: string[];
};

type SourceRow = {
  values: any[];
  originalIndex: number;
};

/* =========================================================
   GEMINI
========================================================= */

const apiKey =
  process.env.GEMINI_DOCUMENT_API_KEY;

if (!apiKey) {
  throw new Error(
    "GEMINI_DOCUMENT_API_KEY belum diset."
  );
}

const ai = new GoogleGenAI({
  apiKey,
});

/* =========================================================
   CELL TO TEXT
========================================================= */

function cellToText(
  value: unknown
): string {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }

  if (
    value instanceof Date
  ) {
    return value.toISOString();
  }

  if (
    typeof value === "object"
  ) {
    const object =
      value as Record<
        string,
        unknown
      >;

    if (
      "text" in object
    ) {
      return String(
        object.text ?? ""
      );
    }

    if (
      "result" in object
    ) {
      return String(
        object.result ?? ""
      );
    }

    if (
      "richText" in object &&
      Array.isArray(
        object.richText
      )
    ) {
      return object.richText
        .map(
          (item) => {
            if (
              typeof item ===
                "object" &&
              item !== null &&
              "text" in
                (item as Record<
                  string,
                  unknown
                >)
            ) {
              return String(
                (
                  item as Record<
                    string,
                    unknown
                  >
                ).text ?? ""
              );
            }

            return "";
          }
        )
        .join("");
    }
  }

  return String(value);
}

/* =========================================================
   NORMALIZE COLUMN
========================================================= */

function normalizeColumn(
  value: string
): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(
      /[^a-z0-9]/g,
      ""
    );
}

/* =========================================================
   COLUMN ALIASES
========================================================= */

const COLUMN_ALIASES: Record<
  string,
  string[]
> = {
  kota: [
    "kota",
    "city",
    "kabupaten",
  ],

  orientasi: [
    "orientasi",
    "orientation",
  ],

  kategori: [
    "kategori",
    "category",
    "jenis",
    "type",
  ],

  ukuran: [
    "ukuran",
    "size",
  ],

  kepemilikan: [
    "kepemilikan",
    "ownership",
    "pemilik",
  ],

  ready: [
    "ready",
    "tersedia",
    "availability",
  ],

  sisi: [
    "sisi",
    "side",
  ],

  vendor: [
    "vendor",
    "codevendor",
  ],
};

/* =========================================================
   FIND COLUMN INDEX
========================================================= */

function findColumnIndex(
  requested: string,
  headers: string[]
): number {
  const normalizedRequested =
    normalizeColumn(
      requested
    );

  /*
   * Exact.
   */

  for (
    let index = 0;
    index < headers.length;
    index++
  ) {
    const header =
      headers[index];

    if (
      !header ||
      !header.trim()
    ) {
      continue;
    }

    if (
      normalizeColumn(
        header
      ) ===
      normalizedRequested
    ) {
      return index;
    }
  }

  /*
   * Alias.
   */

  for (
    const aliasList of Object.values(
      COLUMN_ALIASES
    )
  ) {
    const requestMatches =
      aliasList.some(
        (alias) =>
          normalizeColumn(
            alias
          ) ===
          normalizedRequested
      );

    if (!requestMatches) {
      continue;
    }

    for (
      let index = 0;
      index < headers.length;
      index++
    ) {
      if (
        aliasList.some(
          (alias) =>
            normalizeColumn(
              alias
            ) ===
            normalizeColumn(
              headers[index]
            )
        )
      ) {
        return index;
      }
    }
  }

  return -1;
}

/* =========================================================
   COMPARE
========================================================= */

function compareValues(
  first: unknown,
  second: unknown
): number {
  const a =
    cellToText(
      first
    ).trim();

  const b =
    cellToText(
      second
    ).trim();

  if (
    a === "" &&
    b === ""
  ) {
    return 0;
  }

  if (a === "") {
    return 1;
  }

  if (b === "") {
    return -1;
  }

  /*
   * Angka.
   */

  const aNumber =
    Number(
      a.replace(
        /[^\d.-]/g,
        ""
      )
    );

  const bNumber =
    Number(
      b.replace(
        /[^\d.-]/g,
        ""
      )
    );

  const aNumeric =
    !Number.isNaN(
      aNumber
    ) &&
    /\d/.test(a);

  const bNumeric =
    !Number.isNaN(
      bNumber
    ) &&
    /\d/.test(b);

  if (
    aNumeric &&
    bNumeric
  ) {
    return (
      aNumber -
      bNumber
    );
  }

  /*
   * Teks.
   */

  return a.localeCompare(
    b,
    "id",
    {
      numeric: true,
      sensitivity:
        "base",
    }
  );
}

/* =========================================================
   SAFE JSON EXTRACTION
========================================================= */

function extractJson(
  text: string
): string {
  const cleaned =
    text
      .trim()
      .replace(
        /^```json\s*/i,
        ""
      )
      .replace(
        /^```\s*/i,
        ""
      )
      .replace(
        /\s*```$/i,
        ""
      )
      .trim();

  const firstBrace =
    cleaned.indexOf(
      "{"
    );

  const lastBrace =
    cleaned.lastIndexOf(
      "}"
    );

  if (
    firstBrace < 0 ||
    lastBrace < 0 ||
    lastBrace <= firstBrace
  ) {
    throw new Error(
      "AI tidak menghasilkan JSON yang valid."
    );
  }

  return cleaned.slice(
    firstBrace,
    lastBrace + 1
  );
}

/* =========================================================
   AI UNDERSTANDS PROMPT
========================================================= */

async function understandInstruction(
  prompt: string,
  headers: string[]
): Promise<AIInstruction> {
  const columnList =
    headers
      .map(
        (
          header,
          index
        ) =>
          `${index + 1}. ${
            header ||
            "[KOLOM KOSONG]"
          }`
      )
      .join("\n");

  const aiPrompt = `
Kamu adalah AI Data Planner untuk spreadsheet.

Daftar kolom spreadsheet ASLI:
${columnList}

Instruksi pengguna:
${prompt}

Tentukan operasi yang diminta.

OPERASI:

1. SPLIT
Jika pengguna meminta memisahkan/kelompokkan data menjadi
file terpisah berdasarkan kota, gunakan mode "split".
Untuk "berdasarkan kota", gunakan kolom KOTA yang benar-benar
tersedia.

Contoh:
{
  "mode": "split",
  "split": {
    "column": "KOTA"
  },
  "sort": [],
  "filters": [],
  "missingColumns": []
}

2. TRANSFORM
Untuk sortir/filter biasa gunakan mode "transform".

ATURAN:
- Jangan menghasilkan data.
- Jangan menghasilkan spreadsheet.
- Jangan membuat nama kolom baru.
- Gunakan nama kolom yang benar-benar tersedia.
- Jika kolom yang diminta tidak tersedia, masukkan ke missingColumns.
- Jika hanya diminta sortir, filters HARUS kosong.
- Urutan sort mengikuti urutan permintaan pengguna.
- Jika arah tidak disebutkan, gunakan asc.
- Jangan membuat filter kota ketika pengguna meminta "pisahkan berdasarkan kota".
- Mode split harus membuat kelompok untuk SEMUA nilai kota.
- Jangan mengubah isi record.

Kembalikan JSON SAJA.

Format:
{
  "mode": "transform",
  "split": null,
  "sort": [],
  "filters": [],
  "missingColumns": []
}
`.trim();

  const response =
    await ai.models.generateContent({
      model:
        "gemini-3.6-flash",
      contents:
        aiPrompt,
    });

  const responseText =
    response.text?.trim() ||
    "";

  if (!responseText) {
    throw new Error(
      "AI tidak menghasilkan aturan pengolahan."
    );
  }

  const json =
    extractJson(
      responseText
    );

  try {
    const parsed =
      JSON.parse(json) as AIInstruction;

    if (
      parsed.mode !== "split" &&
      parsed.mode !== "transform"
    ) {
      parsed.mode = "transform";
    }

    return parsed;
  } catch {
    throw new Error(
      "JSON aturan dari AI tidak valid."
    );
  }
}

/* =========================================================
   RESOLVE INSTRUCTIONS
========================================================= */

function resolveInstructions(
  instruction: AIInstruction,
  headers: string[]
) {
  const sorts: Array<{
    index: number;
    column: string;
    direction:
      | "asc"
      | "desc";
  }> = [];

  const filters: Array<{
    index: number;
    column: string;
    operator:
      | "equals"
      | "contains";
    value: string;
  }> = [];

  /*
   * SORT
   */

  for (
    const item of
      instruction.sort ?? []
  ) {
    const index =
      findColumnIndex(
        item.column,
        headers
      );

    if (index < 0) {
      continue;
    }

    sorts.push({
      index,
      column:
        headers[index],
      direction:
        item.direction ===
        "desc"
          ? "desc"
          : "asc",
    });
  }

  /*
   * FILTER
   */

  for (
    const item of
      instruction.filters ?? []
  ) {
    const index =
      findColumnIndex(
        item.column,
        headers
      );

    if (index < 0) {
      continue;
    }

    filters.push({
      index,
      column:
        headers[index],
      operator:
        item.operator ===
        "contains"
          ? "contains"
          : "equals",
      value:
        String(
          item.value ?? ""
        ),
    });
  }

  return {
    sorts,
    filters,
  };
}

/* =========================================================
   APPLY TRANSFORMATION
========================================================= */

function applyTransformation(
  rows: SourceRow[],
  headers: string[],
  instruction: AIInstruction
) {
  const {
    sorts,
    filters,
  } =
    resolveInstructions(
      instruction,
      headers
    );

  let result =
    rows.slice();

  /*
   * FILTER
   */

  if (
    filters.length
  ) {
    result =
      result.filter(
        (row) => {
          return filters.every(
            (filter) => {
              const current =
                cellToText(
                  row.values[
                    filter.index
                  ]
                )
                  .trim()
                  .toLowerCase();

              const target =
                filter.value
                  .trim()
                  .toLowerCase();

              if (
                filter.operator ===
                "equals"
              ) {
                return (
                  current ===
                  target
                );
              }

              return current.includes(
                target
              );
            }
          );
        }
      );
  }

  /*
   * SORT
   */

  if (
    sorts.length
  ) {
    result.sort(
      (
        rowA,
        rowB
      ) => {
        for (
          const sort of
            sorts
        ) {
          const comparison =
            compareValues(
              rowA.values[
                sort.index
              ],
              rowB.values[
                sort.index
              ]
            );

          if (
            comparison !==
            0
          ) {
            return sort.direction ===
              "desc"
              ? -comparison
              : comparison;
          }
        }

        /*
         * Pertahankan urutan asli
         * kalau semua nilai sama.
         */

        return (
          rowA.originalIndex -
          rowB.originalIndex
        );
      }
    );
  }

  return {
    result,
    sorts,
    filters,
  };
}

/* =========================================================
   COPY EXCEL CELL
========================================================= */

function copyExcelCell(
  source: any,
  target: any
) {
  /*
   * Nilai utama.
   *
   * Untuk hyperlink ExcelJS,
   * value dapat berupa object
   * { text, hyperlink } dan
   * object tersebut kita salin.
   */

  if (
    source.value &&
    typeof source.value ===
      "object"
  ) {
    target.value =
      JSON.parse(
        JSON.stringify(
          source.value
        )
      );
  } else {
    target.value =
      source.value;
  }

  /*
   * Format angka/tanggal.
   */

  if (
    source.numFmt
  ) {
    target.numFmt =
      source.numFmt;
  }

  /*
   * Alignment.
   */

  if (
    source.alignment
  ) {
    target.alignment = {
      ...source.alignment,
    };
  }

  /*
   * Font.
   */

  if (
    source.font
  ) {
    target.font = {
      ...source.font,
    };
  }

  /*
   * Fill.
   */

  if (
    source.fill
  ) {
    target.fill = {
      ...source.fill,
    };
  }

  /*
   * Border.
   */

  if (
    source.border
  ) {
    target.border = {
      ...source.border,
    };
  }

  /*
   * Protection.
   */

  if (
    source.protection
  ) {
    target.protection = {
      ...source.protection,
    };
  }
}

/* =========================================================
   SPLIT EXCEL BY COLUMN
========================================================= */

function sanitizeFileName(
  value: string
): string {
  const cleaned =
    value
      .trim()
      .replace(
        /[<>:"/\\|?*\x00-\x1F]/g,
        "_"
      )
      .replace(
        /\s+/g,
        " "
      );

  return (
    cleaned ||
    "Tanpa Nama"
  );
}

function groupRowsByColumn(
  rows: SourceRow[],
  columnIndex: number
) {
  const groups =
    new Map<
      string,
      {
        displayName: string;
        rows: SourceRow[];
      }
    >();

  for (
    const row of rows
  ) {
    const rawValue =
      cellToText(
        row.values[columnIndex]
      ).trim();

    const key =
      rawValue
        .normalize("NFKD")
        .replace(
          /[\u0300-\u036f]/g,
          ""
        )
        .toUpperCase();

    const displayName =
      rawValue ||
      "Tanpa Kota";

    const group =
      groups.get(key);

    if (group) {
      group.rows.push(row);
    } else {
      groups.set(
        key,
        {
          displayName,
          rows: [row],
        }
      );
    }
  }

  return Array.from(
    groups.values()
  );
}

async function createSplitExcelResults(
  headers: string[],
  rows: SourceRow[],
  sourceWorksheet: ExcelJS.Worksheet,
  splitColumn: string
): Promise<
  Array<{
    fileName: string;
    fileBase64: string;
    recordCount: number;
    groupValue: string;
  }>
> {
  const splitIndex =
    findColumnIndex(
      splitColumn,
      headers
    );

  if (splitIndex < 0) {
    throw new Error(
      `Kolom "${splitColumn}" tidak ditemukan.`
    );
  }

  const groups =
    groupRowsByColumn(
      rows,
      splitIndex
    );

  groups.sort(
    (a, b) =>
      a.displayName.localeCompare(
        b.displayName,
        "id",
        {
          numeric: true,
          sensitivity: "base",
        }
      )
  );

  const results: Array<{
    fileName: string;
    fileBase64: string;
    recordCount: number;
    groupValue: string;
  }> = [];

  for (
    const group of groups
  ) {
    const workbook =
      new ExcelJS.Workbook();

    workbook.creator =
      "DNA AI Tools";

    workbook.created =
      new Date();

    const worksheet =
      workbook.addWorksheet(
        "Hasil"
      );

    /*
     * HEADER A:M.
     */
    const sourceHeader =
      sourceWorksheet.getRow(1);

    const targetHeader =
      worksheet.getRow(1);

    targetHeader.height =
      sourceHeader.height;

    for (
      let column = 1;
      column <= headers.length;
      column++
    ) {
      const targetCell =
        targetHeader.getCell(
          column
        );

      if (column === 10) {
        targetCell.value = null;
        continue;
      }

      copyExcelCell(
        sourceHeader.getCell(
          column
        ),
        targetCell
      );
    }

    /*
     * DATA.
     */
    for (
      let rowIndex = 0;
      rowIndex < group.rows.length;
      rowIndex++
    ) {
      const sourceRow =
        sourceWorksheet.getRow(
          group.rows[rowIndex]
            .originalIndex + 2
        );

      const targetRow =
        worksheet.getRow(
          rowIndex + 2
        );

      targetRow.height =
        sourceRow.height;

      // Jangan membawa status hidden dari file sumber.
      // File hasil split harus selalu menampilkan semua record kota.
      targetRow.hidden = false;

      for (
        let column = 1;
        column <= headers.length;
        column++
      ) {
        const targetCell =
          targetRow.getCell(
            column
          );

        if (column === 10) {
          targetCell.value = null;
          continue;
        }

        copyExcelCell(
          sourceRow.getCell(
            column
          ),
          targetCell
        );
      }
    }

    /*
     * LEBAR KOLOM.
     */
    for (
      let column = 1;
      column <= headers.length;
      column++
    ) {
      const sourceColumn =
        sourceWorksheet.getColumn(
          column
        );

      const targetColumn =
        worksheet.getColumn(
          column
        );

      targetColumn.width =
        sourceColumn.width;

      // Jangan membawa hidden state kolom dari workbook sumber.
      targetColumn.hidden = false;

      targetColumn.outlineLevel =
        sourceColumn.outlineLevel;
    }

    worksheet.views = [
      {
        state: "frozen",
        ySplit: 1,
      },
    ];

    worksheet.autoFilter = {
      from: "A1",
      to:
        `${numberToColumn(
          headers.length
        )}1`,
    };

    const buffer =
      await workbook.xlsx.writeBuffer();

    results.push({
      fileName:
        `${sanitizeFileName(
          group.displayName
        )}.xlsx`,
      fileBase64:
        Buffer.from(
          buffer as any
        ).toString("base64"),
      recordCount:
        group.rows.length,
      groupValue:
        group.displayName,
    });
  }

  return results;
}

/* =========================================================
   CREATE EXCEL RESULT
========================================================= */

async function createExcelResult(
  headers: string[],
  rows: SourceRow[],
  sourceWorksheet: ExcelJS.Worksheet
): Promise<string> {
  const workbook =
    new ExcelJS.Workbook();

  workbook.creator =
    "DNA AI Tools";

  workbook.created =
    new Date();

  const worksheet =
    workbook.addWorksheet(
      "Hasil"
    );

  /*
   * HEADER
   *
   * Posisi kolom tetap sama.
   * Kolom kosong juga tetap
   * dibuat.
   */

  const sourceHeader =
    sourceWorksheet.getRow(1);

  const targetHeader =
    worksheet.getRow(1);

  targetHeader.height =
    sourceHeader.height;

  for (
    let column = 1;
    column <= headers.length;
    column++
  ) {
    const targetCell =
      targetHeader.getCell(
        column
      );

    if (column === 10) {
      targetCell.value = null;
      continue;
    }

    copyExcelCell(
      sourceHeader.getCell(
        column
      ),
      targetCell
    );
  }

  /*
   * DATA
   */

  for (
    let rowIndex = 0;
    rowIndex < rows.length;
    rowIndex++
  ) {
    const sourceRow =
      sourceWorksheet.getRow(
        rows[rowIndex]
          .originalIndex + 2
      );

    const targetRow =
      worksheet.getRow(
        rowIndex + 2
      );

    targetRow.height =
      sourceRow.height;

    targetRow.hidden =
      sourceRow.hidden;

    for (
      let column = 1;
      column <= headers.length;
      column++
    ) {
      const targetCell =
        targetRow.getCell(
          column
        );

      if (column === 10) {
        targetCell.value = null;
        continue;
      }

      copyExcelCell(
        sourceRow.getCell(
          column
        ),
        targetCell
      );
    }
  }

  /*
   * Lebar kolom.
   */

  for (
    let column = 1;
    column <= headers.length;
    column++
  ) {
    const sourceColumn =
      sourceWorksheet.getColumn(
        column
      );

    const targetColumn =
      worksheet.getColumn(
        column
      );

    targetColumn.width =
      sourceColumn.width;

    targetColumn.hidden =
      sourceColumn.hidden;

    targetColumn.outlineLevel =
      sourceColumn.outlineLevel;
  }

  /*
   * Freeze header.
   */

  worksheet.views = [
    {
      state:
        "frozen",
      ySplit: 1,
    },
  ];

  /*
   * Auto filter.
   */

  if (
    headers.some(
      (header) =>
        header.trim() !==
        ""
    )
  ) {
    worksheet.autoFilter = {
      from: "A1",
      to:
        `${numberToColumn(
          headers.length
        )}1`,
    };
  }

  const buffer =
    await workbook.xlsx.writeBuffer();

  return Buffer.from(
    buffer as any
  ).toString(
    "base64"
  );
}

/* =========================================================
   COLUMN NUMBER -> LETTER
========================================================= */

function numberToColumn(
  number: number
): string {
  let result = "";

  let current =
    number;

  while (
    current > 0
  ) {
    const remainder =
      (current - 1) %
      26;

    result =
      String.fromCharCode(
        65 + remainder
      ) +
      result;

    current =
      Math.floor(
        (current - 1) /
          26
      );
  }

  return result;
}

/* =========================================================
   CREATE WORD RESULT
========================================================= */

async function createWordResult(
  headers: string[],
  rows: SourceRow[]
): Promise<string> {
  const paragraphs: Paragraph[] =
    [];

  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text:
            headers.join(
              " | "
            ),
          bold: true,
          size: 20,
        }),
      ],
    })
  );

  for (
    const row of rows
  ) {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text:
              headers
                .map(
                  (
                    _header,
                    index
                  ) =>
                    cellToText(
                      row.values[
                        index
                      ]
                    )
                )
                .join(
                  " | "
                ),
            size: 18,
          }),
        ],
      })
    );
  }

  const document =
    new Document({
      sections: [
        {
          children:
            paragraphs,
        },
      ],
    });

  const buffer =
    await Packer.toBuffer(
      document
    );

  return Buffer.from(
    buffer
  ).toString(
    "base64"
  );
}

/* =========================================================
   CREATE PDF RESULT
========================================================= */

async function createPdfResult(
  headers: string[],
  rows: SourceRow[]
): Promise<string> {
  const pdf =
    await PDFDocument.create();

  const font =
    await pdf.embedFont(
      StandardFonts.Helvetica
    );

  const boldFont =
    await pdf.embedFont(
      StandardFonts.HelveticaBold
    );

  const pageWidth =
    595.28;

  const pageHeight =
    841.89;

  const margin =
    35;

  const lineHeight =
    14;

  let page =
    pdf.addPage([
      pageWidth,
      pageHeight,
    ]);

  let y =
    pageHeight -
    margin;

  const allRows =
    [
      headers.map(
        (header) =>
          header
      ),
      ...rows.map(
        (row) =>
          headers.map(
            (
              _header,
              index
            ) =>
              cellToText(
                row.values[
                  index
                ]
              )
          )
      ),
    ];

  for (
    let rowIndex = 0;
    rowIndex <
    allRows.length;
    rowIndex++
  ) {
    const text =
      allRows[rowIndex].join(
        " | "
      );

    const chunks =
      wrapText(
        text,
        90
      );

    for (
      const chunk of chunks
    ) {
      if (
        y <
        margin +
          lineHeight
      ) {
        page =
          pdf.addPage([
            pageWidth,
            pageHeight,
          ]);

        y =
          pageHeight -
          margin;
      }

      page.drawText(
        chunk,
        {
          x: margin,
          y,
          size:
            rowIndex === 0
              ? 8
              : 7,
          font:
            rowIndex === 0
              ? boldFont
              : font,
          color: rgb(
            0.08,
            0.1,
            0.15
          ),
        }
      );

      y -=
        lineHeight;
    }

    y -= 3;
  }

  const bytes =
    await pdf.save();

  return Buffer.from(
    bytes
  ).toString(
    "base64"
  );
}

/* =========================================================
   WRAP TEXT
========================================================= */

function wrapText(
  text: string,
  maxLength: number
): string[] {
  const words =
    text.split(
      /\s+/
    );

  const lines: string[] =
    [];

  let current = "";

  for (
    const word of words
  ) {
    const next =
      current
        ? `${current} ${word}`
        : word;

    if (
      next.length <=
      maxLength
    ) {
      current = next;
    } else {
      if (current) {
        lines.push(
          current
        );
      }

      current = word;
    }
  }

  if (current) {
    lines.push(
      current
    );
  }

  return lines;
}

/* =========================================================
   POST
========================================================= */

export async function POST(
  req: Request
) {
  try {
    /* =========================
       AUTH
    ========================== */

    const session =
      await getServerSession(
        authOptions
      );

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          error:
            "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    /* =========================
       FORM
    ========================== */

    const formData =
      await req.formData();

    const uploaded =
      formData.get(
        "document"
      );

    const prompt =
      String(
        formData.get(
          "prompt"
        ) || ""
      ).trim();

    const documentType =
      String(
        formData.get(
          "documentType"
        ) || ""
      ) as DocumentType;

    if (
      !uploaded ||
      !(uploaded instanceof File)
    ) {
      return NextResponse.json(
        {
          error:
            "Dokumen wajib diupload.",
        },
        {
          status: 400,
        }
      );
    }

    if (!prompt) {
      return NextResponse.json(
        {
          error:
            "Instruksi wajib diisi.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      documentType !== "pdf" &&
      documentType !== "word" &&
      documentType !== "excel"
    ) {
      return NextResponse.json(
        {
          error:
            "Format output tidak valid.",
        },
        {
          status: 400,
        }
      );
    }

    const fileName =
      uploaded.name.toLowerCase();

    const bytes =
      await uploaded.arrayBuffer();

    /* =====================================================
       EXCEL
    ====================================================== */

    if (
      fileName.endsWith(
        ".xlsx"
      )
    ) {
      const {
        worksheet,
        headers,
        rows,
      } =
        await readExcel(
          bytes
        );

      const instruction =
        await understandInstruction(
          prompt,
          headers
        );

      const missingColumns =
        Array.isArray(
          instruction.missingColumns
        )
          ? instruction.missingColumns.filter(
              (column) =>
                findColumnIndex(
                  column,
                  headers
                ) < 0
            )
          : [];

      /*
       * ===================================================
       * MODE SPLIT
       * ===================================================
       */
      if (
        instruction.mode ===
        "split"
      ) {
        const splitColumn =
          instruction.split
            ?.column ||
          "KOTA";

        const splitIndex =
          findColumnIndex(
            splitColumn,
            headers
          );

        if (splitIndex < 0) {
          return NextResponse.json(
            {
              error:
                `Kolom "${splitColumn}" tidak ditemukan.`,
              availableColumns:
                headers,
              missingColumns: [
                splitColumn,
              ],
            },
            {
              status: 400,
            }
          );
        }

        const files =
          await createSplitExcelResults(
            headers,
            rows,
            worksheet,
            headers[splitIndex] ||
              splitColumn
          );

        const resultRecords =
          files.reduce(
            (
              total,
              file
            ) =>
              total +
              file.recordCount,
            0
          );

        /*
         * INVARIANT:
         * seluruh record sumber harus
         * muncul tepat sekali di output.
         */
        if (
          resultRecords !==
          rows.length
        ) {
          throw new Error(
            `Validasi split gagal: sumber ${rows.length} record, hasil ${resultRecords} record.`
          );
        }

        await prisma.history.create(
          {
            data: {
              userId:
                session.user.id,
              title:
                "AI Document Transform",
              feature:
                "AI Document",
              prompt,
              result:
                JSON.stringify({
                  sourceFile:
                    uploaded.name,
                  mode:
                    "split",
                  splitColumn:
                    headers[
                      splitIndex
                    ],
                  originalRecords:
                    rows.length,
                  resultRecords,
                  fileCount:
                    files.length,
                  files:
                    files.map(
                      (file) => ({
                        fileName:
                          file.fileName,
                        groupValue:
                          file.groupValue,
                        recordCount:
                          file.recordCount,
                      })
                    ),
                  missingColumns,
                }),
            },
          }
        );

        return NextResponse.json({
          success: true,
          documentType:
            "excel",
          mode: "split",
          splitColumn:
            headers[splitIndex],
          originalRecords:
            rows.length,
          resultRecords,
          fileCount:
            files.length,
          files,
          availableColumns:
            headers,
          missingColumns,
        });
      }

      /*
       * ===================================================
       * MODE TRANSFORM LAMA
       * ===================================================
       */
      const transformed =
        applyTransformation(
          rows,
          headers,
          instruction
        );

      if (
        transformed.sorts
          .length === 0 &&
        transformed.filters
          .length === 0
      ) {
        return NextResponse.json(
          {
            error:
              "Tidak ada kolom yang cocok dengan instruksi.",
            availableColumns:
              headers,
            missingColumns,
          },
          {
            status: 400,
          }
        );
      }

      let fileBase64 =
        "";

      if (
        documentType ===
        "excel"
      ) {
        fileBase64 =
          await createExcelResult(
            headers,
            transformed.result,
            worksheet
          );
      }

      if (
        documentType ===
        "word"
      ) {
        fileBase64 =
          await createWordResult(
            headers,
            transformed.result
          );
      }

      if (
        documentType ===
        "pdf"
      ) {
        fileBase64 =
          await createPdfResult(
            headers,
            transformed.result
          );
      }

      await prisma.history.create(
        {
          data: {
            userId:
              session.user.id,
            title:
              "AI Document Transform",
            feature:
              "AI Document",
            prompt,
            result:
              JSON.stringify({
                sourceFile:
                  uploaded.name,
                mode:
                  "transform",
                originalRecords:
                  rows.length,
                resultRecords:
                  transformed
                    .result
                    .length,
                sorts:
                  transformed.sorts,
                filters:
                  transformed.filters,
                missingColumns,
              }),
          },
        }
      );

      return NextResponse.json({
        success: true,
        documentType,
        mode: "transform",
        fileName:
          `AI-Document-Result.${
            documentType ===
            "word"
              ? "docx"
              : documentType ===
                  "excel"
                ? "xlsx"
                : "pdf"
          }`,
        fileBase64,
        originalRecords:
          rows.length,
        resultRecords:
          transformed.result
            .length,
        availableColumns:
          headers,
        missingColumns,
        sorts:
          transformed.sorts,
        filters:
          transformed.filters,
      });
    }

    /* =====================================================
       NON EXCEL
    ====================================================== */

    const base64 =
      Buffer.from(
        bytes
      ).toString(
        "base64"
      );

    const mimeType =
      uploaded.type ||
      "application/octet-stream";

    const response =
      await ai.models.generateContent(
        {
          model:
            "gemini-3.6-flash",
          contents: [
            {
              inlineData: {
                mimeType,
                data: base64,
              },
            },
            `
Baca dokumen yang diberikan.

Instruksi pengguna:
${prompt}

Buat hasil dokumen berdasarkan
dokumen sumber.

Jangan mengarang informasi.
Ikuti instruksi pengguna.
            `.trim(),
          ],
        }
      );

    const content =
      response.text?.trim() ||
      "";

    if (!content) {
      throw new Error(
        "AI tidak menghasilkan hasil pengolahan."
      );
    }

    const lines =
      content
        .split(
          /\r?\n/
        )
        .filter(
          (line) =>
            line.trim()
              .length > 0
        )
        .map(
          (line) => [
            line,
          ]
        );

    let fileBase64 =
      "";

    if (
      documentType ===
      "word"
    ) {
      fileBase64 =
        await createWordResult(
          ["Hasil"],
          lines.map(
            (row, index) => ({
              values:
                row,
              originalIndex:
                index,
            })
          )
        );
    }

    if (
      documentType ===
      "pdf"
    ) {
      fileBase64 =
        await createPdfResult(
          ["Hasil"],
          lines.map(
            (row, index) => ({
              values:
                row,
              originalIndex:
                index,
            })
          )
        );
    }

    if (
      documentType ===
      "excel"
    ) {
      fileBase64 =
        await createSimpleExcel(
          ["Hasil"],
          lines
        );
    }

    await prisma.history.create(
      {
        data: {
          userId:
            session.user.id,
          title:
            "AI Document Transform",
          feature:
            "AI Document",
          prompt,
          result:
            content,
        },
      }
    );

    return NextResponse.json({
      success:
        true,
      documentType,
      fileName:
        `AI-Document-Result.${
          documentType ===
          "word"
            ? "docx"
            : documentType ===
                "excel"
              ? "xlsx"
              : "pdf"
        }`,
      fileBase64,
    });
  } catch (error) {
    console.error(
      "TRANSFORM DOCUMENT ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal mengolah dokumen.",
      },
      {
        status: 500,
      }
    );
  }
}

/* =========================================================
   READ EXCEL
========================================================= */

async function readExcel(
  bytes: ArrayBuffer
) {
  const workbook =
    new ExcelJS.Workbook();

  await workbook.xlsx.load(
    Buffer.from(bytes) as any
  );

  const worksheet =
    workbook.worksheets[0];

  if (!worksheet) {
    throw new Error(
      "Worksheet pertama tidak ditemukan."
    );
  }

  /*
   * DATABASE BILLBOARD mempunyai 13 posisi
   * kolom A:M.
   *
   * Jangan memakai columnCount ExcelJS karena
   * formatting dapat membuat batas kolom berubah.
   */
  const columnCount = 13;

  /*
   * ExcelJS dapat menghitung baris yang hanya
   * mempunyai formatting sebagai rowCount.
   *
   * Karena itu kita mencari baris terakhir yang
   * benar-benar mempunyai isi pada A:M.
   */
  let lastDataRow = 1;

  for (
    let rowNumber = 2;
    rowNumber <= worksheet.rowCount;
    rowNumber++
  ) {
    const row =
      worksheet.getRow(
        rowNumber
      );

    let hasValue = false;

    for (
      let column = 1;
      column <= columnCount;
      column++
    ) {
      const value =
        row.getCell(column).value;

      if (
        value !== null &&
        value !== undefined &&
        cellToText(value).trim() !== ""
      ) {
        hasValue = true;
        break;
      }
    }

    if (hasValue) {
      lastDataRow = rowNumber;
    }
  }

  /*
   * HEADER A:M.
   *
   * J memang merupakan posisi kolom kosong
   * pada struktur sumber, jadi J tidak boleh
   * mendapatkan nilai dari merged cell I1:J1.
   */
  const headers: string[] = [];

  for (
    let column = 1;
    column <= columnCount;
    column++
  ) {
    if (column === 10) {
      headers.push("");
      continue;
    }

    headers.push(
      cellToText(
        worksheet
          .getRow(1)
          .getCell(column)
          .value
      )
    );
  }

  /*
   * SATU BARIS EXCEL = SATU RECORD.
   *
   * Tidak ada pemecahan berdasarkan merged cell.
   * Tidak ada penggabungan berdasarkan CODE BB.
   * Tidak ada penghapusan baris kosong di tengah.
   *
   * Untuk file sumber saat ini:
   * baris 2..239 = 238 record.
   */
  const rows: SourceRow[] = [];

  for (
    let rowNumber = 2;
    rowNumber <= lastDataRow;
    rowNumber++
  ) {
    const sourceRow =
      worksheet.getRow(
        rowNumber
      );

    const values: any[] = [];

    for (
      let column = 1;
      column <= columnCount;
      column++
    ) {
      /*
       * J selalu kosong.
       */
      if (column === 10) {
        values.push(null);
        continue;
      }

      values.push(
        sourceRow
          .getCell(column)
          .value
      );
    }

    rows.push({
      values,
      originalIndex:
        rowNumber - 2,
    });
  }

  return {
    workbook,
    worksheet,
    headers,
    rows,
  };
}

/* =========================================================
   SIMPLE EXCEL FOR NON EXCEL
========================================================= */

async function createSimpleExcel(
  headers: string[],
  rows: string[][]
): Promise<string> {
  const workbook =
    new ExcelJS.Workbook();

  workbook.creator =
    "DNA AI Tools";

  workbook.created =
    new Date();

  const worksheet =
    workbook.addWorksheet(
      "Hasil"
    );

  for (
    let column = 0;
    column < headers.length;
    column++
  ) {
    worksheet.getCell(
      1,
      column + 1
    ).value =
      headers[column];
  }

  for (
    let row = 0;
    row < rows.length;
    row++
  ) {
    for (
      let column = 0;
      column < headers.length;
      column++
    ) {
      worksheet.getCell(
        row + 2,
        column + 1
      ).value =
        rows[row][column] ??
        "";
    }
  }

  worksheet.getRow(
    1
  ).font = {
    bold: true,
  };

  const buffer =
    await workbook.xlsx.writeBuffer();

  return Buffer.from(
    buffer as any
  ).toString(
    "base64"
  );
}