import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";
import prisma from "@/lib/prisma";
import {
  DEFAULT_AI_MODEL,
  AI_MODELS,
  type AIModelId,
} from "@/lib/ai-models";

import { askDebugger } from "@/lib/gemini-debugger";
import { askImagePrompt } from "@/lib/gemini-image";
import { askDocument } from "@/lib/gemini-document";
import { askOCR } from "@/lib/gemini-ocr";
import { askTranslator } from "@/lib/gemini-translator";

type Feature =
  | "AI Tech Assistant"
  | "Image Prompt"
  | "AI Document"
  | "AI OCR"
  | "AI Translator";

function detectFeature(
  message: string,
  file: File | null
): Feature {
  const text = message.toLowerCase();

  if (file) {
    const isImage = file.type.startsWith("image/");

    if (isImage) {
      const ocrKeywords = [
        "baca tulisan",
        "baca teks",
        "baca tulisan di gambar",
        "ambil teks",
        "ambil tulisan",
        "extract text",
        "extract teks",
        "ocr",
        "salin tulisan",
        "salin teks",
        "tuliskan isi gambar",
        "apa isi tulisan",
        "apa tulisan",
      ];

      const imagePromptKeywords = [
        "buat prompt",
        "buatkan prompt",
        "prompt gambar",
        "prompt image",
        "generate prompt",
        "jadikan prompt",
        "ubah menjadi prompt",
        "deskripsikan gambar untuk prompt",
      ];

      if (
        ocrKeywords.some((keyword) =>
          text.includes(keyword)
        )
      ) {
        return "AI OCR";
      }

      if (
        imagePromptKeywords.some((keyword) =>
          text.includes(keyword)
        )
      ) {
        return "Image Prompt";
      }

      return "AI OCR";
    }

    return "AI Document";
  }

  const translatorKeywords = [
    "terjemahkan",
    "translate",
    "translation",
    "translatekan",
    "ubah ke bahasa",
    "dalam bahasa inggris",
    "dalam bahasa indonesia",
    "dalam bahasa jepang",
    "dalam bahasa korea",
    "dalam bahasa china",
    "dalam bahasa mandarin",
    "dalam bahasa spanyol",
    "dalam bahasa prancis",
    "dalam bahasa jerman",
    "ke bahasa inggris",
    "ke bahasa indonesia",
    "ke bahasa jepang",
    "ke bahasa korea",
    "ke bahasa china",
    "ke bahasa mandarin",
    "ke bahasa spanyol",
    "ke bahasa prancis",
    "ke bahasa jerman",
  ];

  if (
    translatorKeywords.some((keyword) =>
      text.includes(keyword)
    )
  ) {
    return "AI Translator";
  }

  const debuggerKeywords = [
    "error",
    "bug",
    "debug",
    "debugging",
    "kode",
    "code",
    "coding",
    "program",
    "programming",
    "javascript",
    "typescript",
    "react",
    "next.js",
    "nextjs",
    "node.js",
    "nodejs",
    "python",
    "java",
    "c++",
    "c#",
    "html",
    "css",
    "sql",
    "database",
    "mysql",
    "postgresql",
    "mongodb",
    "git",
    "github",
    "docker",
    "api",
    "server",
    "deployment",
    "windows",
    "driver",
    "hardware",
    "network",
    "npm",
    "yarn",
    "pnpm",
  ];

  if (
    debuggerKeywords.some((keyword) =>
      text.includes(keyword)
    )
  ) {
    return "AI Tech Assistant";
  }

  return "AI Tech Assistant";
}

async function fileToBase64(file: File) {
  const bytes = await file.arrayBuffer();

  return Buffer.from(bytes).toString("base64");
}

type ParsedApiError = {
  code?: number;
  message?: string;
  status?: string;
  retryDelaySeconds?: number;
  reason?: string;
};

function parseApiError(error: unknown): ParsedApiError {
  const fallbackMessage =
    error instanceof Error
      ? error.message
      : String(error);

  if (!fallbackMessage) {
    return {};
  }

  try {
    const jsonStart = fallbackMessage.indexOf("{");

    if (jsonStart === -1) {
      return {
        message: fallbackMessage,
      };
    }

    const parsed = JSON.parse(
      fallbackMessage.slice(jsonStart)
    );

    const apiError =
      parsed?.error && typeof parsed.error === "object"
        ? parsed.error
        : parsed;

    const details = Array.isArray(apiError?.details)
      ? apiError.details
      : [];

    const retryInfo = details.find(
      (detail: unknown) =>
        detail &&
        typeof detail === "object" &&
        "@type" in detail &&
        String(
          (detail as Record<string, unknown>)["@type"]
        ).includes("RetryInfo")
    ) as
      | Record<string, unknown>
      | undefined;

    const retryDelay =
      typeof retryInfo?.retryDelay === "string"
        ? retryInfo.retryDelay
        : undefined;

    let retryDelaySeconds: number | undefined;

    if (retryDelay) {
      const secondsMatch =
        retryDelay.match(
          /^([\d.]+)s$/
        );

      if (secondsMatch) {
        retryDelaySeconds = Number(
          secondsMatch[1]
        );
      }
    }

    const errorInfo = details.find(
      (detail: unknown) =>
        detail &&
        typeof detail === "object" &&
        "@type" in detail &&
        String(
          (detail as Record<string, unknown>)["@type"]
        ).includes("ErrorInfo")
    ) as
      | Record<string, unknown>
      | undefined;

    return {
      code:
        typeof apiError?.code === "number"
          ? apiError.code
          : undefined,
      message:
        typeof apiError?.message === "string"
          ? apiError.message
          : fallbackMessage,
      status:
        typeof apiError?.status === "string"
          ? apiError.status
          : undefined,
      retryDelaySeconds,
      reason:
        typeof errorInfo?.reason === "string"
          ? errorInfo.reason
          : undefined,
    };
  } catch {
    return {
      message: fallbackMessage,
    };
  }
}

function getRetryAt(
  retryDelaySeconds?: number
): string | null {
  if (
    typeof retryDelaySeconds !== "number" ||
    !Number.isFinite(retryDelaySeconds) ||
    retryDelaySeconds < 0
  ) {
    return null;
  }

  return new Date(
    Date.now() +
      retryDelaySeconds * 1000
  ).toISOString();
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(
      authOptions
    );

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    const formData = await req.formData();

    const messageValue = formData.get("message");
    const fileValue = formData.get("file");
    const modelValue = formData.get("model");

    const model: AIModelId =
      typeof modelValue === "string" &&
      AI_MODELS.some(
        (item) => item.id === modelValue
      )
        ? (modelValue as AIModelId)
        : DEFAULT_AI_MODEL;

    const message =
      typeof messageValue === "string"
        ? messageValue.trim()
        : "";

    const file =
      fileValue instanceof File
        ? fileValue
        : null;

    if (!message && !file) {
      return NextResponse.json(
        {
          error:
            "Pesan atau file diperlukan.",
        },
        {
          status: 400,
        }
      );
    }

    const feature = detectFeature(
      message,
      file
    );

    let result = "";

    if (feature === "AI Tech Assistant") {
      result = await askDebugger(
        message,
        "id",
        model
      );
    }

    if (feature === "AI Translator") {
      result = await askTranslator(
        message,
        model
      );
    }

    if (feature === "AI OCR") {
      if (!file) {
        return NextResponse.json(
          {
            error:
              "AI OCR membutuhkan gambar.",
          },
          {
            status: 400,
          }
        );
      }

      if (!file.type.startsWith("image/")) {
        return NextResponse.json(
          {
            error:
              "AI OCR hanya dapat memproses gambar.",
          },
          {
            status: 400,
          }
        );
      }

      const base64 =
        await fileToBase64(file);

      result = await askOCR({
        prompt:
          message ||
          "Analisis gambar secara menyeluruh. Jika gambar berisi soal, pertanyaan, latihan, tugas, atau masalah yang harus diselesaikan, kerjakan dan berikan jawabannya secara lengkap. Jika gambar hanya berisi teks biasa, jelaskan atau salin isi pentingnya.",
        image: {
          mimeType: file.type,
          data: base64,
        },
        model,
      });
    }

    if (feature === "Image Prompt") {
      if (!file) {
        return NextResponse.json(
          {
            error:
              "Prompt Gambar membutuhkan gambar.",
          },
          {
            status: 400,
          }
        );
      }

      if (!file.type.startsWith("image/")) {
        return NextResponse.json(
          {
            error:
              "Prompt Gambar hanya dapat menggunakan gambar.",
          },
          {
            status: 400,
          }
        );
      }

      const base64 =
        await fileToBase64(file);

      result = await askImagePrompt({
        prompt: message,
        image: {
          mimeType: file.type,
          data: base64,
        },
        model,
      });
    }

    if (feature === "AI Document") {
      if (!file) {
        return NextResponse.json(
          {
            error:
              "AI Document membutuhkan dokumen.",
          },
          {
            status: 400,
          }
        );
      }

      if (file.type.startsWith("image/")) {
        return NextResponse.json(
          {
            error:
              "File gambar bukan dokumen.",
          },
          {
            status: 400,
          }
        );
      }

      const base64 =
        await fileToBase64(file);

      result = await askDocument({
        prompt: message,
        document: {
          mimeType: file.type,
          data: base64,
        },
        model,
      });
    }

    if (!result.trim()) {
      return NextResponse.json(
        {
          error:
            "AI tidak memberikan jawaban.",
        },
        {
          status: 500,
        }
      );
    }

    const history =
      await prisma.history.create({
        data: {
          userId: session.user.id,
          title: feature,
          feature,
          prompt:
            message ||
            file?.name ||
            "",
          result,
        },
      });

    return NextResponse.json({
      success: true,
      feature,
      result,
      history,
    });
  } catch (error) {
    console.error(
      "AI ASSISTANT ERROR:",
      error
    );

    const parsedError =
      parseApiError(error);

    const errorMessage =
      parsedError.message ||
      (error instanceof Error
        ? error.message
        : String(error));

    const errorLower =
      errorMessage.toLowerCase();

    const isApiKeyError =
      parsedError.reason ===
        "API_KEY_INVALID" ||
      errorLower.includes(
        "api key not valid"
      ) ||
      errorLower.includes(
        "api_key_invalid"
      );

    if (isApiKeyError) {
      return NextResponse.json(
        {
          error:
            "API key Gemini tidak valid. Periksa environment variable di Vercel.",
        },
        {
          status: 400,
        }
      );
    }

    const isRateLimitError =
      parsedError.code === 429 ||
      parsedError.status ===
        "RESOURCE_EXHAUSTED" ||
      errorLower.includes(
        "resource_exhausted"
      ) ||
      errorLower.includes(
        "rate limit"
      );

    if (isRateLimitError) {
      const retryAt = getRetryAt(
        parsedError.retryDelaySeconds
      );

      if (retryAt) {
        return NextResponse.json(
          {
            error:
              "Batas penggunaan AI sedang tercapai. Silakan coba lagi setelah waktu yang diberikan oleh API.",
            quota: {
              exhausted: true,
              retryAt,
              source:
                "gemini-api",
            },
          },
          {
            status: 429,
          }
        );
      }

      return NextResponse.json(
        {
          error:
            "Batas penggunaan AI sedang tercapai. Silakan coba lagi beberapa saat lagi.",
          quota: {
            exhausted: true,
            retryAt: null,
            source:
              "gemini-api",
          },
        },
        {
          status: 429,
        }
      );
    }

    console.error(
      "AI ASSISTANT PARSED ERROR:",
      parsedError
    );

    return NextResponse.json(
      {
        error:
          "Terjadi kendala pada AI Asisten. Silakan coba lagi.",
      },
      {
        status: 500,
      }
    );
  }
}