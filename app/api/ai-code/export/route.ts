import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import JSZip from "jszip";

import { authOptions } from "@/auth";

type ExportFile = {
  path: string;
  content: string;
};

type ExportRequest = {
  projectName?: string;
  files?: ExportFile[];
};

const MAX_FILES = 100;
const MAX_PATH_LENGTH = 500;
const MAX_FILE_SIZE = 500000;
const MAX_TOTAL_SIZE = 5000000;

function normalizePath(
  path: string
): string {
  return path
    .replace(/\\/g, "/")
    .replace(/^\.\/+/g, "")
    .replace(/^\/+/g, "")
    .replace(/\/+/g, "/")
    .trim();
}

function isSafePath(
  path: string
): boolean {
  if (!path) {
    return false;
  }

  if (
    path.includes("\0")
  ) {
    return false;
  }

  if (
    path.startsWith("/")
  ) {
    return false;
  }

  if (
    /^[a-zA-Z]:\//.test(path)
  ) {
    return false;
  }

  if (
    path.includes("://")
  ) {
    return false;
  }

  const segments =
    path.split("/");

  return !segments.some(
    (segment) =>
      segment === ".."
  );
}

function sanitizeProjectName(
  name: string
): string {
  const cleaned = name
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^\.+/, "")
    .replace(/\.+$/, "");

  return (
    cleaned.slice(0, 100) ||
    "ai-project"
  );
}

function parseRequestBody(
  body: unknown
): {
  projectName: string;
  files: ExportFile[];
} {
  if (
    typeof body !== "object" ||
    body === null ||
    Array.isArray(body)
  ) {
    throw new Error(
      "Request body tidak valid."
    );
  }

  const request =
    body as ExportRequest;

  const projectName =
    typeof request.projectName ===
    "string"
      ? request.projectName
      : "ai-project";

  if (
    !Array.isArray(
      request.files
    )
  ) {
    throw new Error(
      "Daftar file project tidak ditemukan."
    );
  }

  if (
    request.files.length ===
    0
  ) {
    throw new Error(
      "Project tidak memiliki file."
    );
  }

  if (
    request.files.length >
    MAX_FILES
  ) {
    throw new Error(
      `Project memiliki terlalu banyak file. Maksimal ${MAX_FILES} file.`
    );
  }

  const files: ExportFile[] =
    [];

  const usedPaths =
    new Set<string>();

  let totalSize = 0;

  for (
    let index = 0;
    index <
    request.files.length;
    index++
  ) {
    const file =
      request.files[index];

    if (
      typeof file !==
        "object" ||
      file === null ||
      Array.isArray(file)
    ) {
      throw new Error(
        `File ke-${index + 1} tidak valid.`
      );
    }

    const rawPath =
      typeof file.path ===
      "string"
        ? file.path.trim()
        : "";

    const content =
      typeof file.content ===
      "string"
        ? file.content
        : "";

    if (!rawPath) {
      throw new Error(
        `File ke-${index + 1} tidak memiliki path.`
      );
    }

    if (
      rawPath.length >
      MAX_PATH_LENGTH
    ) {
      throw new Error(
        `Path file "${rawPath}" terlalu panjang.`
      );
    }

    if (!content) {
      throw new Error(
        `File "${rawPath}" tidak memiliki content.`
      );
    }

    if (
      content.length >
      MAX_FILE_SIZE
    ) {
      throw new Error(
        `File "${rawPath}" terlalu besar.`
      );
    }

    const path =
      normalizePath(
        rawPath
      );

    if (
      !isSafePath(path)
    ) {
      throw new Error(
        `Path file "${rawPath}" tidak aman.`
      );
    }

    const pathKey =
      path.toLowerCase();

    if (
      usedPaths.has(
        pathKey
      )
    ) {
      throw new Error(
        `File "${path}" terduplikasi.`
      );
    }

    usedPaths.add(
      pathKey
    );

    totalSize +=
      content.length;

    if (
      totalSize >
      MAX_TOTAL_SIZE
    ) {
      throw new Error(
        "Ukuran total project terlalu besar."
      );
    }

    files.push({
      path,
      content,
    });
  }

  return {
    projectName:
      sanitizeProjectName(
        projectName
      ),
    files,
  };
}

export async function POST(
  req: Request
) {
  try {
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

    let body: unknown;

    try {
      body =
        await req.json();
    } catch {
      return NextResponse.json(
        {
          error:
            "Request body tidak valid.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      projectName,
      files,
    } =
      parseRequestBody(
        body
      );

    const zip =
      new JSZip();

    for (const file of files) {
      zip.file(
        file.path,
        file.content
      );
    }

    const zipBuffer =
      await zip.generateAsync({
        type: "uint8array",
        compression:
          "DEFLATE",
        compressionOptions: {
          level: 6,
        },
      });

    return new NextResponse(
      zipBuffer as BodyInit,
      {
        status: 200,

        headers: {
          "Content-Type":
            "application/zip",

          "Content-Disposition":
            `attachment; filename="${projectName}.zip"`,

          "Content-Length":
            String(
              zipBuffer.byteLength
            ),

          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "AI CODE EXPORT ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal membuat file ZIP project.",
      },
      {
        status: 500,
      }
    );
  }
}