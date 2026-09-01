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

type DocumentType =
  | "pdf"
  | "word"
  | "excel";

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

/* =========================
   HELPERS
========================= */

function wrapText(
  text: string,
  maxChars: number
) {
  const words =
    text.split(/\s+/);

  const lines: string[] = [];

  let current = "";

  for (const word of words) {
    if (!word) {
      continue;
    }

    const next =
      current.length === 0
        ? word
        : `${current} ${word}`;

    if (
      next.length <=
      maxChars
    ) {
      current = next;
    } else {
      if (current) {
        lines.push(current);
      }

      current = word;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

function parseExcelContent(
  content: string
) {
  let cleaned =
    content.trim();

  cleaned = cleaned
    .replace(
      /^```(?:tsv|csv)?\s*/i,
      ""
    )
    .replace(
      /\s*```$/i,
      ""
    )
    .trim();

  let rows =
    cleaned
      .split(/\r?\n/)
      .map((line) =>
        line.trim()
      )
      .filter(Boolean);

  if (!rows.length) {
    return [];
  }

  /* TAB */

  if (
    rows.some((row) =>
      row.includes("\t")
    )
  ) {
    return rows.map(
      (row) =>
        row
          .split("\t")
          .map((cell) =>
            cell.trim()
          )
    );
  }

  /* PIPE */

  if (
    rows.some((row) =>
      row.includes("|")
    )
  ) {
    rows = rows.filter(
      (row) =>
        !/^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?$/.test(
          row
        )
    );

    return rows.map(
      (row) =>
        row
          .replace(
            /^\||\|$/g,
            ""
          )
          .split("|")
          .map((cell) =>
            cell.trim()
          )
    );
  }

  /* COMMA */

  if (
    rows.some((row) =>
      row.includes(",")
    )
  ) {
    return rows.map(
      (row) =>
        row
          .split(",")
          .map((cell) =>
            cell
              .trim()
              .replace(
                /^["']|["']$/g,
                ""
              )
          )
    );
  }

  return rows.map((row) => [
    row,
  ]);
}

/* =========================
   POST
========================= */

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
       REQUEST
    ========================== */

    const body =
      await req.json();

    const prompt =
      typeof body.prompt ===
      "string"
        ? body.prompt.trim()
        : "";

    const documentType =
      body.documentType as
        | DocumentType
        | undefined;

    if (!prompt) {
      return NextResponse.json(
        {
          error:
            "Prompt dokumen wajib diisi.",
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
            "Format dokumen tidak valid.",
        },
        {
          status: 400,
        }
      );
    }

    /* =========================
       AI PROMPT
    ========================== */

    const aiPrompt = `
Kamu adalah AI Document Generator
milik DNA AI Tools.

Buat dokumen berdasarkan instruksi
pengguna berikut:

${prompt}

Format yang diminta:
${documentType}

ATURAN UMUM:
- Langsung hasilkan isi dokumen.
- Jangan memperkenalkan diri.
- Jangan menulis "Halo, saya AI".
- Jangan menjelaskan proses internal.
- Jangan mengatakan hanya bisa menulis teks.
- Buat isi yang lengkap, profesional,
  rapi, dan siap digunakan.
- Gunakan Bahasa Indonesia kecuali
  pengguna meminta bahasa lain.
- Jangan menambahkan informasi yang
  tidak diperlukan.
- Jangan membuat komentar tentang
  format output.

ATURAN UNTUK PDF:
- Buat struktur dokumen profesional.
- Gunakan judul yang jelas.
- Gunakan subjudul bila diperlukan.
- Pisahkan paragraf dengan jelas.
- Gunakan daftar jika diperlukan.

ATURAN UNTUK WORD:
- Buat dokumen profesional.
- Gunakan judul, subjudul,
  paragraf, dan daftar bila diperlukan.
- Jangan menambahkan markup teknis
  yang tidak diperlukan.

ATURAN UNTUK EXCEL:
- Hasil harus berupa DATA TABEL.
- Baris pertama harus menjadi header.
- Setiap baris berikutnya harus menjadi
  satu record.
- Gunakan TAB sebagai pemisah kolom.
- Jangan gunakan Markdown table.
- Jangan tambahkan penjelasan sebelum
  atau sesudah tabel.
- Jangan gunakan bullet point.
- Jangan gunakan code fence.

Contoh Excel:

Nama<TAB>Kelas<TAB>Nilai
Andi<TAB>XI RPL 1<TAB>90
Budi<TAB>XI RPL 1<TAB>85
`.trim();

    /* =========================
       GENERATE AI CONTENT
    ========================== */

    const result =
      await ai.models.generateContent({
        model:
          "gemini-3.6-flash",
        contents:
          aiPrompt,
      });

    const content =
      result.text?.trim() ??
      "";

    if (!content) {
      return NextResponse.json(
        {
          error:
            "AI tidak menghasilkan isi dokumen.",
        },
        {
          status: 500,
        }
      );
    }

    /* =========================
       WORD
    ========================== */

    if (
      documentType ===
      "word"
    ) {
      const paragraphs =
        content
          .split(/\r?\n/)
          .map((line) =>
            line.trim()
          )
          .filter(Boolean)
          .map((line) => {
            const isHeading =
              line.startsWith(
                "# "
              ) ||
              line.startsWith(
                "## "
              );

            const cleanLine =
              line.replace(
                /^#{1,6}\s*/,
                ""
              );

            return new Paragraph({
              children: [
                new TextRun({
                  text:
                    cleanLine,
                  bold:
                    isHeading,
                  size:
                    isHeading
                      ? 28
                      : 24,
                }),
              ],
              spacing: {
                after:
                  isHeading
                    ? 300
                    : 200,
              },
            });
          });

      const doc =
        new Document({
          sections: [
            {
              properties: {},
              children:
                paragraphs,
            },
          ],
        });

      const buffer =
        await Packer.toBuffer(
          doc
        );

      const fileBase64 =
        Buffer.from(
          buffer
        ).toString(
          "base64"
        );

      await prisma.history.create({
        data: {
          userId:
            session.user.id,
          title:
            "AI Document Word",
          feature:
            "AI Document",
          prompt,
          result:
            content,
        },
      });

      return NextResponse.json({
        success: true,
        documentType:
          "word",
        fileName:
          "AI-Document.docx",
        fileBase64,
      });
    }

    /* =========================
       PDF
    ========================== */

    if (
      documentType ===
      "pdf"
    ) {
      const pdfDoc =
        await PDFDocument.create();

      const font =
        await pdfDoc.embedFont(
          StandardFonts.Helvetica
        );

      const boldFont =
        await pdfDoc.embedFont(
          StandardFonts.HelveticaBold
        );

      const pageWidth =
        595.28;

      const pageHeight =
        841.89;

      const margin =
        50;

      const fontSize =
        11;

      const lineHeight =
        17;

      let page =
        pdfDoc.addPage([
          pageWidth,
          pageHeight,
        ]);

      let y =
        pageHeight -
        margin;

      const rawLines =
        content.split(
          /\r?\n/
        );

      for (
        const rawLine of
          rawLines
      ) {
        const line =
          rawLine.trim();

        if (!line) {
          y -=
            lineHeight;

          continue;
        }

        const isHeading =
          line.startsWith(
            "# "
          ) ||
          line.startsWith(
            "## "
          );

        const cleanLine =
          line.replace(
            /^#{1,6}\s*/,
            ""
          );

        const currentFont =
          isHeading
            ? boldFont
            : font;

        const currentSize =
          isHeading
            ? 15
            : fontSize;

        const wrapped =
          wrapText(
            cleanLine,
            isHeading
              ? 45
              : 75
          );

        for (
          const wrappedLine of
            wrapped
        ) {
          if (
            y <
            margin +
              lineHeight
          ) {
            page =
              pdfDoc.addPage([
                pageWidth,
                pageHeight,
              ]);

            y =
              pageHeight -
              margin;
          }

          page.drawText(
            wrappedLine,
            {
              x:
                margin,
              y,
              size:
                currentSize,
              font:
                currentFont,
              color: rgb(
                0.08,
                0.1,
                0.15
              ),
            }
          );

          y -=
            isHeading
              ? lineHeight +
                5
              : lineHeight;
        }

        if (isHeading) {
          y -= 5;
        }
      }

      const pdfBytes =
        await pdfDoc.save();

      const fileBase64 =
        Buffer.from(
          pdfBytes
        ).toString(
          "base64"
        );

      await prisma.history.create({
        data: {
          userId:
            session.user.id,
          title:
            "AI Document PDF",
          feature:
            "AI Document",
          prompt,
          result:
            content,
        },
      });

      return NextResponse.json({
        success: true,
        documentType:
          "pdf",
        fileName:
          "AI-Document.pdf",
        fileBase64,
      });
    }

    /* =========================
       EXCEL
    ========================== */

    if (
      documentType ===
      "excel"
    ) {
      const rows =
        parseExcelContent(
          content
        );

      if (!rows.length) {
        return NextResponse.json(
          {
            error:
              "AI tidak menghasilkan data Excel yang valid.",
          },
          {
            status: 500,
          }
        );
      }

      const workbook =
        new ExcelJS.Workbook();

      workbook.creator =
        "DNA AI Tools";

      workbook.created =
        new Date();

      const worksheet =
        workbook.addWorksheet(
          "Data"
        );

      worksheet.addRows(
        rows
      );

      /* HEADER */

      const header =
        worksheet.getRow(1);

      header.font = {
        bold: true,
      };

      header.alignment = {
        vertical:
          "middle",
        horizontal:
          "center",
      };

      header.height = 24;

      header.eachCell(
        (cell) => {
          cell.border = {
            top: {
              style:
                "thin",
            },
            left: {
              style:
                "thin",
            },
            bottom: {
              style:
                "thin",
            },
            right: {
              style:
                "thin",
            },
          };
        }
      );

      /* CELLS */

      worksheet.eachRow(
        (row) => {
          row.eachCell(
            (cell) => {
              cell.alignment = {
                vertical:
                  "middle",
                wrapText:
                  true,
              };

              cell.border = {
                top: {
                  style:
                    "thin",
                },
                left: {
                  style:
                    "thin",
                },
                bottom: {
                  style:
                    "thin",
                },
                right: {
                  style:
                    "thin",
                },
              };
            }
          );
        }
      );

      /* WIDTH */

      worksheet.columns.forEach(
        (column) => {
          let maxLength =
            10;

          column.eachCell?.(
            {
              includeEmpty:
                false,
            },
            (cell) => {
              const value =
                cell.value;

              const length =
                value
                  ? String(
                      value
                    ).length
                  : 0;

              if (
                length >
                maxLength
              ) {
                maxLength =
                  length;
              }
            }
          );

          column.width =
            Math.min(
              maxLength +
                2,
              40
            );
        }
      );

      /* FREEZE HEADER */

      worksheet.views = [
        {
          state:
            "frozen",
          ySplit: 1,
        },
      ];

      /* EXPORT */

      const buffer =
        await workbook.xlsx.writeBuffer();

      const fileBase64 =
        Buffer.from(
          buffer
        ).toString(
          "base64"
        );

      await prisma.history.create({
        data: {
          userId:
            session.user.id,
          title:
            "AI Document Excel",
          feature:
            "AI Document",
          prompt,
          result:
            content,
        },
      });

      return NextResponse.json({
        success: true,
        documentType:
          "excel",
        fileName:
          "AI-Document.xlsx",
        fileBase64,
      });
    }

    return NextResponse.json(
      {
        error:
          "Format dokumen tidak dikenali.",
      },
      {
        status: 400,
      }
    );
  } catch (error) {
    console.error(
      "CREATE DOCUMENT API ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal membuat dokumen.",
      },
      {
        status: 500,
      }
    );
  }
}