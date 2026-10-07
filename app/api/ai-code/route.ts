import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

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
  // Web & Frontend
  ".html", ".htm", ".css", ".scss", ".sass", ".less", ".js", ".mjs", ".cjs", ".jsx", ".ts", ".tsx", ".vue", ".svelte",
  // Backend, Systems & General Programming
  ".py", ".pyw", ".java", ".c", ".cpp", ".cc", ".cxx", ".h", ".hpp", ".cs", ".go", ".rs", ".php", ".rb", ".kt", ".kts", ".swift", ".dart", ".scala", ".lua", ".r", ".pl", ".pm", ".asm",
  // Database, DevOps & Configurations
  ".sql", ".json", ".yaml", ".yml", ".toml", ".xml", ".env", ".sh", ".bash", ".zsh", ".ps1", ".bat", ".cmd", ".dockerfile", ".md", ".txt", ".svg", ".webmanifest"
];


function cleanAIResponse(
  text: string
): string {
  let cleaned = text.trim();

  // 1. Strip markdown code fence anywhere if model wrapped in ```json ... ```
  // Gunakan indeks pagar awal dan akhir untuk menghindari pemotongan oleh inner code blocks
  const firstFence = cleaned.indexOf("```");
  if (firstFence !== -1) {
    const afterFirstFence = cleaned.indexOf("\n", firstFence);
    const lastFence = cleaned.lastIndexOf("```");
    if (lastFence > firstFence && afterFirstFence !== -1 && lastFence > afterFirstFence) {
      cleaned = cleaned.substring(afterFirstFence + 1, lastFence).trim();
    }
  }

  // 2. Strip any conversational intro before first { or outro after last }
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1).trim();
  }

  return cleaned;
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

function repairJsonEscapes(jsonStr: string): string {
  // 1. Perbaiki escape sequence ilegal dalam JSON (valid: " \ / b f n r t u)
  // Ubah unescaped \s, \d, \w, \., \+, dll. menjadi \\s, \\d, \\w, \\., dsb.
  let repaired = jsonStr.replace(/\\([^"\\\/bfnrtu])/g, "\\\\$1");

  // 2. Bersihkan trailing commas sebelum closing brace atau bracket
  repaired = repaired.replace(/,\s*([}\]])/g, "$1");

  // 3. Bersihkan ASCII control characters ilegal
  repaired = repaired.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");

  return repaired;
}

function extractProjectByRegex(text: string): Record<string, unknown> | null {
  try {
    const nameMatch = text.match(/"(?:projectName|name|project_name|title)"\s*:\s*"([^"]+)"/i);
    const projectName = nameMatch ? nameMatch[1].trim() : "AI Project";

    const typeMatch = text.match(/"type"\s*:\s*"(web|game|software)"/i);
    const type = typeMatch ? typeMatch[1] : "web";

    const descMatch = text.match(/"description"\s*:\s*"([^"]+)"/i);
    const description = descMatch ? descMatch[1].trim() : "";

    const files: Array<{ path: string; content: string }> = [];

    // Pola A: "path" diikuti "content"
    const fileRegexA = /"path"\s*:\s*"([^"]+)"[\s\S]*?"content"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
    let match: RegExpExecArray | null;

    while ((match = fileRegexA.exec(text)) !== null) {
      const path = match[1];
      let content = match[2];

      try {
        content = JSON.parse(`"${content}"`);
      } catch {
        content = content
          .replace(/\\n/g, "\n")
          .replace(/\\r/g, "\r")
          .replace(/\\t/g, "\t")
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, "\\");
      }

      if (path && content) {
        files.push({ path, content });
      }
    }

    // Pola B: "content" diikuti "path" jika pola A kosong
    if (files.length === 0) {
      const fileRegexB = /"content"\s*:\s*"((?:[^"\\]|\\.)*)"[\s\S]*?"path"\s*:\s*"([^"]+)"/g;
      while ((match = fileRegexB.exec(text)) !== null) {
        const path = match[2];
        let content = match[1];

        try {
          content = JSON.parse(`"${content}"`);
        } catch {
          content = content
            .replace(/\\n/g, "\n")
            .replace(/\\r/g, "\r")
            .replace(/\\t/g, "\t")
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, "\\");
        }

        if (path && content) {
          files.push({ path, content });
        }
      }
    }

    // Pola C: Response terpotong di tengah content file (quote penutup hilang)
    if (files.length === 0) {
      const truncatedMatch = text.match(/"path"\s*:\s*"([^"]+)"[\s\S]*?"content"\s*:\s*"([\s\S]*)$/);
      if (truncatedMatch) {
        const path = truncatedMatch[1];
        let content = truncatedMatch[2].replace(/["\s}\]]+$/, "");
        try {
          content = JSON.parse(`"${content}"`);
        } catch {
          content = content
            .replace(/\\n/g, "\n")
            .replace(/\\r/g, "\r")
            .replace(/\\t/g, "\t")
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, "\\");
        }

        if (path.endsWith(".html")) {
          if (content.includes("<script") && !content.includes("</script>")) content += "\n</script>";
          if (content.includes("<body") && !content.includes("</body>")) content += "\n</body>";
          if (content.includes("<html") && !content.includes("</html>")) content += "\n</html>";
        }

        if (path && content) {
          files.push({ path, content });
        }
      }
    }

    // Pola D: Deteksi dokumen HTML mentah
    if (files.length === 0) {
      const htmlStart = text.indexOf("<!DOCTYPE html");
      const htmlStartAlt = htmlStart === -1 ? text.indexOf("<html") : htmlStart;
      if (htmlStartAlt !== -1) {
        let rawHtml = text.substring(htmlStartAlt);
        const htmlEnd = rawHtml.lastIndexOf("</html>");
        if (htmlEnd !== -1) {
          rawHtml = rawHtml.substring(0, htmlEnd + 7);
        } else {
          if (rawHtml.includes("<script") && !rawHtml.includes("</script>")) rawHtml += "\n</script>";
          if (!rawHtml.includes("</body>")) rawHtml += "\n</body>";
          if (!rawHtml.includes("</html>")) rawHtml += "\n</html>";
        }
        files.push({ path: "index.html", content: rawHtml });
      }
    }

    // Pola E: Markdown code block fallback
    if (files.length === 0) {
      const codeMatch = text.match(/```(?:html|javascript|js)?\s*([\s\S]+?)\s*```/);
      if (codeMatch && codeMatch[1]) {
        files.push({ path: "index.html", content: codeMatch[1].trim() });
      }
    }

    if (files.length > 0) {
      return {
        projectName,
        type,
        description,
        files,
      };
    }
  } catch (err) {
    console.warn("[AI Code Regex Extractor Fallback Error]", err);
  }

  return null;
}

function parseGeneratedProject(
  text: string
): GeneratedProject {
  const cleaned =
    cleanAIResponse(text);

  let parsed: unknown = null;

  // Layer 1: Parsing JSON langsung
  try {
    parsed =
      JSON.parse(cleaned);
  } catch {
    // Layer 2: Sanitasi escape sequences & trailing commas
    try {
      const repaired = repairJsonEscapes(cleaned);
      parsed = JSON.parse(repaired);
    } catch {
      // Layer 3: Coba perbaiki pada raw text jika markdown fence merusak struktur
      try {
        const repairedRaw = repairJsonEscapes(text.trim());
        const firstBrace = repairedRaw.indexOf("{");
        const lastBrace = repairedRaw.lastIndexOf("}");
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          parsed = JSON.parse(repairedRaw.substring(firstBrace, lastBrace + 1));
        }
      } catch {
        // Abaikan ke Layer 4
      }
    }
  }

  // Layer 4: Ekstraksi fallback menggunakan Regex jika parsing JSON masih gagal
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    Array.isArray(parsed)
  ) {
    parsed = extractProjectByRegex(text);
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    Array.isArray(parsed)
  ) {
    console.error("[AI Code JSON Parse Error] Raw text head:", text.slice(0, 500));
    throw new Error(
      "AI menghasilkan format project yang tidak valid."
    );
  }

  // Dukung format bersarang seperti { project: { ... } } atau { data: { ... } }
  const rawObj = parsed as Record<string, unknown>;
  const project =
    (typeof rawObj.project === "object" && rawObj.project !== null && !Array.isArray(rawObj.project))
      ? (rawObj.project as Record<string, unknown>)
      : (typeof rawObj.data === "object" && rawObj.data !== null && !Array.isArray(rawObj.data))
      ? (rawObj.data as Record<string, unknown>)
      : rawObj;

  const rawProjectName =
    project.projectName || project.name || project.project_name || project.title;

  const projectName =
    typeof rawProjectName === "string" && rawProjectName.trim()
      ? rawProjectName.trim()
      : "AI Project";

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

  let rawFiles =
    Array.isArray(project.files)
      ? project.files
      : Array.isArray(project.fileList)
      ? project.fileList
      : Array.isArray(project.project_files)
      ? project.project_files
      : null;

  // Jika files kosong di JSON, coba selamatkan dengan regex extractor dari text mentah
  if (!rawFiles || rawFiles.length === 0) {
    const regexFallback = extractProjectByRegex(text);
    if (regexFallback && Array.isArray(regexFallback.files) && regexFallback.files.length > 0) {
      rawFiles = regexFallback.files;
    }
  }

  if (
    !rawFiles ||
    rawFiles.length === 0
  ) {
    throw new Error(
      "AI tidak menghasilkan file project."
    );
  }

  if (
    rawFiles.length >
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
    index < rawFiles.length;
    index++
  ) {
    const file =
      rawFiles[index];

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
      typeof item.path === "string" && item.path.trim()
        ? item.path.trim()
        : typeof item.filename === "string" && item.filename.trim()
        ? item.filename.trim()
        : typeof item.name === "string" && item.name.trim()
        ? item.name.trim()
        : "";

    const content =
      typeof item.content === "string"
        ? item.content
        : typeof item.code === "string"
        ? item.code
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
   * Jika project web atau game tidak memiliki file HTML (misal script Python, C++, Java, dsb.),
   * otomatis sesuaikan tipenya menjadi "software" agar tetap sukses diproses.
   */
  const resolvedType =
    (type === "web" || type === "game") && !hasHtmlFile(files)
      ? "software"
      : type;

  return {
    projectName,
    type: resolvedType,
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

    const mode =
      request.mode === "web" ||
      request.mode === "software" ||
      request.mode === "fix" ||
      request.mode === "game"
        ? request.mode
        : "auto";


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
        mode,
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