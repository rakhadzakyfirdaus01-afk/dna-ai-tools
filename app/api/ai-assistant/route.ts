import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";
import prisma from "@/lib/prisma";

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

function detectFeature(message: string, file: File | null): Feature {
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

      if (ocrKeywords.some((keyword) => text.includes(keyword))) {
        return "AI OCR";
      }

      if (
        imagePromptKeywords.some((keyword) => text.includes(keyword))
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
    translatorKeywords.some((keyword) => text.includes(keyword))
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
    debuggerKeywords.some((keyword) => text.includes(keyword))
  ) {
    return "AI Tech Assistant";
  }

  return "AI Tech Assistant";
}

async function fileToBase64(file: File) {
  const bytes = await file.arrayBuffer();

  return Buffer.from(bytes).toString("base64");
}

/**
 * Gemini menggunakan reset RPD pada pukul 00:00
 * berdasarkan Pacific Time.
 *
 * Fungsi ini menghitung waktu reset berikutnya
 * secara otomatis dan mengembalikannya sebagai Date.
 */
function getNextPacificMidnight(): Date {
  const now = new Date();

  const pacificDateParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const year = Number(
    pacificDateParts.find((part) => part.type === "year")?.value
  );

  const month = Number(
    pacificDateParts.find((part) => part.type === "month")?.value
  );

  const day = Number(
    pacificDateParts.find((part) => part.type === "day")?.value
  );

  /**
   * Ambil tanggal besok dalam kalender Pacific.
   */
  const nextDayUtc = new Date(
    Date.UTC(year, month - 1, day + 1, 12, 0, 0)
  );

  /**
   * Cari offset Pacific pada tanggal tersebut.
   * Bisa GMT-7 atau GMT-8 tergantung daylight saving time.
   */
  const offsetParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    timeZoneName: "shortOffset",
  }).formatToParts(nextDayUtc);

  const offsetText =
    offsetParts.find((part) => part.type === "timeZoneName")?.value ?? "GMT-8";

  const offsetMatch = offsetText.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);

  let offsetMinutes = -8 * 60;

  if (offsetMatch) {
    const sign = offsetMatch[1] === "+" ? 1 : -1;
    const hours = Number(offsetMatch[2]);
    const minutes = Number(offsetMatch[3] ?? "0");

    offsetMinutes = sign * (hours * 60 + minutes);
  }

  /**
   * 00:00 Pacific pada hari berikutnya.
   */
  const resetTime = new Date(
    Date.UTC(year, month - 1, day + 1, 0, 0, 0) -
      offsetMinutes * 60 * 1000
  );

  return resetTime;
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

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
          error: "Pesan atau file diperlukan.",
        },
        {
          status: 400,
        }
      );
    }

    const feature = detectFeature(message, file);

    let result = "";

    if (feature === "AI Tech Assistant") {
      result = await askDebugger(message, "id");
    }

    if (feature === "AI Translator") {
      result = await askTranslator(message);
    }

    if (feature === "AI OCR") {
      if (!file) {
        return NextResponse.json(
          {
            error: "AI OCR membutuhkan gambar.",
          },
          {
            status: 400,
          }
        );
      }

      if (!file.type.startsWith("image/")) {
        return NextResponse.json(
          {
            error: "AI OCR hanya dapat memproses gambar.",
          },
          {
            status: 400,
          }
        );
      }

      const base64 = await fileToBase64(file);

      result = await askOCR({
        prompt:
          message ||
          "Baca dan salin seluruh teks yang terdapat pada gambar.",
        image: {
          mimeType: file.type,
          data: base64,
        },
      });
    }

    if (feature === "Image Prompt") {
      if (!file) {
        return NextResponse.json(
          {
            error: "Prompt Gambar membutuhkan gambar.",
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

      const base64 = await fileToBase64(file);

      result = await askImagePrompt({
        prompt: message,
        image: {
          mimeType: file.type,
          data: base64,
        },
      });
    }

    if (feature === "AI Document") {
      if (!file) {
        return NextResponse.json(
          {
            error: "AI Document membutuhkan dokumen.",
          },
          {
            status: 400,
          }
        );
      }

      if (file.type.startsWith("image/")) {
        return NextResponse.json(
          {
            error: "File gambar bukan dokumen.",
          },
          {
            status: 400,
          }
        );
      }

      const base64 = await fileToBase64(file);

      result = await askDocument({
        prompt:
          message ||
          "Analisis dokumen ini dan jelaskan poin-poin pentingnya.",
        document: {
          mimeType:
            file.type || "application/octet-stream",
          data: base64,
        },
      });
    }

    if (!result.trim()) {
      return NextResponse.json(
        {
          error: "AI tidak memberikan jawaban.",
        },
        {
          status: 500,
        }
      );
    }

    const history = await prisma.history.create({
      data: {
        userId: session.user.id,
        title: feature,
        feature,
        prompt: message || file?.name || "",
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
    console.error("AI ASSISTANT ERROR:", error);

    const errorMessage =
      error instanceof Error
        ? error.message
        : String(error);

    /**
     * Gemini mengembalikan 429 ketika quota habis.
     */
    const isQuotaError =
      errorMessage.includes("429") ||
      errorMessage.includes("RESOURCE_EXHAUSTED") ||
      errorMessage.toLowerCase().includes("quota") ||
      errorMessage
        .toLowerCase()
        .includes("exceeded your current quota") ||
      errorMessage
        .toLowerCase()
        .includes("rate limit");

    if (isQuotaError) {
      const resetAt = getNextPacificMidnight();

      return NextResponse.json(
        {
          error: "Kuota AI hari ini sudah habis.",
          quota: {
            exhausted: true,
            resetAt: resetAt.toISOString(),
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
          "Terjadi kendala pada AI Asisten. Silakan coba lagi.",
      },
      {
        status: 500,
      }
    );
  }
}