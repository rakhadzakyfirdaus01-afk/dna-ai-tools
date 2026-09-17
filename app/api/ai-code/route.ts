import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";
import { askCode } from "@/lib/gemini-code";

import {
  AI_MODELS,
  DEFAULT_AI_MODEL,
  type AIModelId,
} from "@/lib/ai-models";

type GeneratedFile = {
  path: string;
  content: string;
};

type GeneratedProject = {
  projectName: string;
  type: "web" | "game" | "software";
  description: string;
  files: GeneratedFile[];
};

type ExistingProjectRequest = {
  projectName?: unknown;
  type?: unknown;
  description?: unknown;
  files?: unknown;
};

const MAX_PROMPT_LENGTH = 12000;
const MAX_CONTEXT_LENGTH = 30000;
const MAX_FILENAME_LENGTH = 500;
const MAX_PROJECT_FILES = 100;
const MAX_FILE_PATH_LENGTH = 500;
const MAX_FILE_CONTENT_LENGTH = 500000;
const MAX_EXISTING_PROJECT_LENGTH = 250000;

const ALLOWED_PREVIEW_EXTENSIONS = [
  ".html",
  ".htm",
  ".css",
  ".js",
  ".mjs",
  ".svg",
  ".json",
  ".txt",
  ".md",
  ".webmanifest",
];

function cleanAIResponse(
  text: string
): string {
  let cleaned = text.trim();

  if (
    cleaned.startsWith("```")
  ) {
    cleaned = cleaned.replace(
      /^```(?:json)?\s*/i,
      ""
    );

    cleaned = cleaned.replace(
      /\s*```$/i,
      ""
    );
  }

  return cleaned.trim();
}

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

function isSafeFilePath(
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

  const segments =
    path.split("/");

  if (
    segments.some(
      (segment) =>
        segment === ".."
    )
  ) {
    return false;
  }

  if (
    path.includes("://")
  ) {
    return false;
  }

  return true;
}

function isAllowedPreviewFile(
  path: string
): boolean {
  const lowerPath =
    path.toLowerCase();

  return ALLOWED_PREVIEW_EXTENSIONS.some(
    (extension) =>
      lowerPath.endsWith(
        extension
      )
  );
}

function hasHtmlFile(
  files: GeneratedFile[]
): boolean {
  return files.some(
    (file) =>
      file.path
        .toLowerCase()
        .endsWith(".html")
  );
}

function parseGeneratedProject(
  text: string
): GeneratedProject {
  const cleaned =
    cleanAIResponse(text);

  let parsed: unknown;

  try {
    parsed =
      JSON.parse(cleaned);
  } catch {
    throw new Error(
      "AI menghasilkan format project yang tidak valid."
    );
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    Array.isArray(parsed)
  ) {
    throw new Error(
      "Format project AI tidak valid."
    );
  }

  const project =
    parsed as Record<
      string,
      unknown
    >;

  const projectName =
    typeof project.projectName ===
    "string"
      ? project.projectName.trim()
      : "";

  const type =
    project.type === "web" ||
    project.type === "game" ||
    project.type === "software"
      ? project.type
      : "web";

  const description =
    typeof project.description ===
    "string"
      ? project.description.trim()
      : "";

  if (!projectName) {
    throw new Error(
      "AI tidak menghasilkan nama project."
    );
  }

  if (
    !Array.isArray(
      project.files
    )
  ) {
    throw new Error(
      "AI tidak menghasilkan daftar file project."
    );
  }

  if (
    project.files.length ===
    0
  ) {
    throw new Error(
      "AI tidak menghasilkan file project."
    );
  }

  if (
    project.files.length >
    MAX_PROJECT_FILES
  ) {
    throw new Error(
      `Project menghasilkan terlalu banyak file. Maksimal ${MAX_PROJECT_FILES} file.`
    );
  }

  const files: GeneratedFile[] =
    [];

  const usedPaths =
    new Set<string>();

  for (
    let index = 0;
    index < project.files.length;
    index++
  ) {
    const file =
      project.files[index];

    if (
      typeof file !==
        "object" ||
      file === null ||
      Array.isArray(file)
    ) {
      throw new Error(
        `File project ke-${index + 1} tidak valid.`
      );
    }

    const item =
      file as Record<
        string,
        unknown
      >;

    const rawPath =
      typeof item.path ===
      "string"
        ? item.path.trim()
        : "";

    const content =
      typeof item.content ===
      "string"
        ? item.content
        : "";

    if (!rawPath) {
      throw new Error(
        `File project ke-${index + 1} tidak memiliki path.`
      );
    }

    if (
      rawPath.length >
      MAX_FILE_PATH_LENGTH
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
      MAX_FILE_CONTENT_LENGTH
    ) {
      throw new Error(
        `File "${rawPath}" terlalu besar.`
      );
    }

    const normalizedPath =
      normalizePath(
        rawPath
      );

    if (
      !isSafeFilePath(
        normalizedPath
      )
    ) {
      throw new Error(
        `Path file "${rawPath}" tidak aman.`
      );
    }

    const normalizedKey =
      normalizedPath.toLowerCase();

    if (
      usedPaths.has(
        normalizedKey
      )
    ) {
      throw new Error(
        `File "${normalizedPath}" terduplikasi.`
      );
    }

    usedPaths.add(
      normalizedKey
    );

    /*
     * File yang tidak didukung oleh preview
     * tetap diperbolehkan untuk project software,
     * tetapi preview web hanya akan menggunakan
     * file yang kompatibel.
     */
    files.push({
      path: normalizedPath,
      content,
    });
  }

  /*
   * Web dan game harus mempunyai HTML
   * agar dapat ditampilkan oleh Live Preview.
   */
  if (
    (type === "web" ||
      type === "game") &&
    !hasHtmlFile(files)
  ) {
    throw new Error(
      "Project web/game tidak memiliki file HTML untuk Live Preview."
    );
  }

  return {
    projectName,
    type,
    description,
    files,
  };
}

function parseExistingProject(
  value: unknown
): GeneratedProject | null {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return null;
  }

  const project =
    value as ExistingProjectRequest;

  const projectName =
    typeof project.projectName === "string"
      ? project.projectName.trim()
      : "";

  const type =
    project.type === "web" ||
    project.type === "game" ||
    project.type === "software"
      ? project.type
      : "web";

  const description =
    typeof project.description === "string"
      ? project.description.trim()
      : "";

  if (!Array.isArray(project.files)) {
    return null;
  }

  if (project.files.length === 0) {
    return null;
  }

  if (project.files.length > MAX_PROJECT_FILES) {
    throw new Error(
      `Project lama memiliki terlalu banyak file. Maksimal ${MAX_PROJECT_FILES} file.`
    );
  }

  const files: GeneratedFile[] = [];
  const usedPaths = new Set<string>();
  let totalContentLength = 0;

  for (
    let index = 0;
    index < project.files.length;
    index++
  ) {
    const file = project.files[index];

    if (
      typeof file !== "object" ||
      file === null ||
      Array.isArray(file)
    ) {
      throw new Error(
        `File project lama ke-${index + 1} tidak valid.`
      );
    }

    const item =
      file as Record<string, unknown>;

    const rawPath =
      typeof item.path === "string"
        ? item.path.trim()
        : "";

    const content =
      typeof item.content === "string"
        ? item.content
        : "";

    if (!rawPath || !content) {
      throw new Error(
        `File project lama ke-${index + 1} tidak valid.`
      );
    }

    if (rawPath.length > MAX_FILE_PATH_LENGTH) {
      throw new Error(
        `Path file project lama "${rawPath}" terlalu panjang.`
      );
    }

    if (content.length > MAX_FILE_CONTENT_LENGTH) {
      throw new Error(
        `File project lama "${rawPath}" terlalu besar.`
      );
    }

    const normalizedPath =
      normalizePath(rawPath);

    if (!isSafeFilePath(normalizedPath)) {
      throw new Error(
        `Path file project lama "${rawPath}" tidak aman.`
      );
    }

    const normalizedKey =
      normalizedPath.toLowerCase();

    if (usedPaths.has(normalizedKey)) {
      throw new Error(
        `File project lama "${normalizedPath}" terduplikasi.`
      );
    }

    usedPaths.add(normalizedKey);
    totalContentLength += content.length;

    files.push({
      path: normalizedPath,
      content,
    });

    if (
      totalContentLength >
      MAX_EXISTING_PROJECT_LENGTH
    ) {
      throw new Error(
        `Project lama terlalu besar. Maksimal ${MAX_EXISTING_PROJECT_LENGTH} karakter content.`
      );
    }
  }

  return {
    projectName:
      projectName || "AI Project",
    type,
    description,
    files,
  };
}

function getPreviewFiles(
  files: GeneratedFile[]
): GeneratedFile[] {
  return files.filter(
    (file) =>
      isAllowedPreviewFile(
        file.path
      )
  );
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

    if (
      typeof body !==
        "object" ||
      body === null ||
      Array.isArray(body)
    ) {
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

    const request =
      body as Record<
        string,
        unknown
      >;

    const prompt =
      typeof request.prompt ===
      "string"
        ? request.prompt.trim()
        : "";

    const codeContext =
      typeof request.codeContext ===
      "string"
        ? request.codeContext
        : "";

    const fileName =
      typeof request.fileName ===
      "string"
        ? request.fileName.trim()
        : "";

    const locale =
      request.locale === "en"
        ? "en"
        : "id";

    const requestedModel =
      typeof request.model ===
      "string"
        ? request.model
        : DEFAULT_AI_MODEL;

    const existingProject =
      parseExistingProject(
        request.existingProject
      );

    if (!prompt) {
      return NextResponse.json(
        {
          error:
            "Prompt AI Code wajib diisi.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      prompt.length >
      MAX_PROMPT_LENGTH
    ) {
      return NextResponse.json(
        {
          error:
            `Prompt terlalu panjang. Maksimal ${MAX_PROMPT_LENGTH} karakter.`,
        },
        {
          status: 400,
        }
      );
    }

    if (
      codeContext.length >
      MAX_CONTEXT_LENGTH
    ) {
      return NextResponse.json(
        {
          error:
            `Code context terlalu panjang. Maksimal ${MAX_CONTEXT_LENGTH} karakter.`,
        },
        {
          status: 400,
        }
      );
    }

    if (
      fileName.length >
      MAX_FILENAME_LENGTH
    ) {
      return NextResponse.json(
        {
          error:
            "Nama file terlalu panjang.",
        },
        {
          status: 400,
        }
      );
    }

    const model: AIModelId =
      AI_MODELS.some(
        (item) =>
          item.id ===
          requestedModel
      )
        ? (requestedModel as AIModelId)
        : DEFAULT_AI_MODEL;

    /*
     * Jika ada project lama, kirim project tersebut
     * sebagai konteks eksplisit agar AI memahami
     * file dan implementasi yang sudah ada.
     *
     * Prompt user tetap menjadi instruksi utama:
     * - perubahan mengikuti permintaan terbaru
     * - file lama dipertahankan jika masih relevan
     * - file yang perlu diubah dibuat ulang secara lengkap
     * - jangan mengembalikan patch/diff
     */
    let effectiveCodeContext =
      codeContext;

    if (existingProject) {
      const existingProjectContext =
        JSON.stringify(
          existingProject,
          null,
          2
        );

      const regenerationInstruction = [
        "MODE: REGENERATE / MODIFY EXISTING PROJECT",
        "",
        "You are modifying an existing AI-generated project.",
        "Treat the existing project below as the current source of truth.",
        "Apply the user's newest request to that project.",
        "Preserve existing functionality and files that are still relevant.",
        "Update, add, or remove files when required by the newest request.",
        "Return the COMPLETE resulting project, not a patch, diff, explanation, or partial files.",
        "Every returned file must contain its complete final content.",
        "",
        "EXISTING PROJECT:",
        existingProjectContext,
      ].join("\n");

      effectiveCodeContext = [
        codeContext.trim(),
        regenerationInstruction,
      ]
        .filter(Boolean)
        .join("\n\n");

      if (
        effectiveCodeContext.length >
        MAX_CONTEXT_LENGTH +
          MAX_EXISTING_PROJECT_LENGTH
      ) {
        return NextResponse.json(
          {
            error:
              "Konteks project lama terlalu besar untuk diproses.",
          },
          {
            status: 400,
          }
        );
      }
    }

    const rawResult =
      await askCode({
        prompt,
        codeContext:
          effectiveCodeContext,
        fileName,
        locale,
        model,
      });

    if (
      !rawResult.trim()
    ) {
      return NextResponse.json(
        {
          error:
            "AI Code tidak menghasilkan project.",
        },
        {
          status: 500,
        }
      );
    }

    const project =
      parseGeneratedProject(
        rawResult
      );

    const previewFiles =
      getPreviewFiles(
        project.files
      );

    return NextResponse.json({
      success: true,

      project: {
        ...project,
        files:
          project.files,
      },

      preview: {
        available:
          project.type ===
            "web" ||
          project.type ===
            "game"
            ? hasHtmlFile(
                previewFiles
              )
            : false,

        files:
          previewFiles,
      },

      result: rawResult,

      model,

      feature:
        "AI Code",

      outputType:
        "project",
    });
  } catch (error) {
    console.error(
      "AI CODE ERROR:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Terjadi kesalahan pada AI Code.";

    return NextResponse.json(
      {
        success: false,
        error: message,
        feature:
          "AI Code",
      },
      {
        status: 500,
      }
    );
  }
}