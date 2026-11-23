import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
} from "docx";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export interface ExportMessageItem {
  role: "user" | "assistant";
  content: string;
  timestamp?: string | Date;
}

export interface ExportOptions {
  title: string;
  messages: ExportMessageItem[];
  singleMessageContent?: string;
  locale?: "id" | "en";
}

/**
 * Download a Blob in browser as a named file.
 */
function triggerBrowserDownload(blob: Blob, filename: string) {
  if (typeof window === "undefined") return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
}

/**
 * Format string into clean plain text for text-based wrappers.
 */
function cleanMarkdownText(md: string): string {
  return md
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, "")
    .replace(/\[SUBAGENTS?:[^\]]+\]/gi, "")
    .replace(/\[OPTION:[^\]]+\]/gi, "")
    .replace(/\[ACTION_COMMAND:[^\]]+\]/gi, "")
    .replace(/```[\w]*\n([\s\S]*?)```/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)")
    .replace(/^#+\s+/gm, "")
    .trim();
}

/**
 * 1. REAL EXPORT TO WORD (.DOCX)
 * Creates a professional formatted Word Document with DNA AI header, metadata, and structured dialogues.
 */
export async function exportChatToDocx({
  title,
  messages,
  singleMessageContent,
  locale = "id",
}: ExportOptions): Promise<void> {
  const isEn = locale === "en";
  const dateStr = new Date().toLocaleString(isEn ? "en-US" : "id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const exportList: ExportMessageItem[] = singleMessageContent
    ? [{ role: "assistant", content: singleMessageContent }]
    : messages;

  const docParagraphs: (Paragraph | Table)[] = [];

  // Header Title
  docParagraphs.push(
    new Paragraph({
      text: title || (isEn ? "DNA AI Chat Export" : "Ekspor Obrolan DNA AI"),
      heading: HeadingLevel.TITLE,
      spacing: { after: 120 },
    })
  );

  // Metadata Subtitle
  docParagraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `${isEn ? "Exported on" : "Diekspor pada"}: ${dateStr} | Platform: DNA AI Platform`,
          italics: true,
          color: "666666",
          size: 18,
        }),
      ],
      spacing: { after: 300 },
    })
  );

  // Divider
  docParagraphs.push(
    new Paragraph({
      border: {
        bottom: {
          color: "00B4D8",
          space: 1,
          style: BorderStyle.SINGLE,
          size: 6,
        },
      },
      spacing: { after: 240 },
    })
  );

  // Iterate messages
  for (const msg of exportList) {
    const isUser = msg.role === "user";
    const senderName = isUser
      ? isEn
        ? "👤 User"
        : "👤 Pengguna"
      : isEn
      ? "🤖 DNA AI Assistant"
      : "🤖 DNA AI Assistant";

    // Speaker heading
    docParagraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: senderName,
            bold: true,
            color: isUser ? "0077B6" : "0F172A",
            size: 22,
          }),
        ],
        spacing: { before: 200, after: 80 },
      })
    );

    // Message text paragraphs
    const cleaned = cleanMarkdownText(msg.content);
    const lines = cleaned.split("\n").filter((l) => l.trim().length > 0);

    for (const line of lines) {
      docParagraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: line,
              size: 20,
              color: "333333",
            }),
          ],
          spacing: { after: 100 },
        })
      );
    }

    // Small divider between message pairs
    docParagraphs.push(
      new Paragraph({
        border: {
          bottom: {
            color: "E2E8F0",
            space: 1,
            style: BorderStyle.SINGLE,
            size: 2,
          },
        },
        spacing: { before: 80, after: 160 },
      })
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: docParagraphs,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const safeFilename = `${(title || "DNA-AI-Export")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 40)}.docx`;
  triggerBrowserDownload(blob, safeFilename);
}

/**
 * Helper to wrap text into multiple lines for PDF rendering.
 */
function wrapLinesForPdf(
  text: string,
  maxCharsPerLine = 75
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if ((currentLine + " " + word).trim().length > maxCharsPerLine) {
      if (currentLine) lines.push(currentLine.trim());
      currentLine = word;
    } else {
      currentLine += (currentLine ? " " : "") + word;
    }
  }
  if (currentLine.trim()) lines.push(currentLine.trim());
  return lines;
}

/**
 * 2. REAL EXPORT TO PDF (.PDF)
 * Generates a standard, cleanly formatted multi-page PDF document using pdf-lib.
 */
export async function exportChatToPdf({
  title,
  messages,
  singleMessageContent,
  locale = "id",
}: ExportOptions): Promise<void> {
  const isEn = locale === "en";
  const dateStr = new Date().toLocaleString(isEn ? "en-US" : "id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const exportList: ExportMessageItem[] = singleMessageContent
    ? [{ role: "assistant", content: singleMessageContent }]
    : messages;

  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  const pageWidth = 595.28; // A4
  const pageHeight = 841.89;
  const margin = 50;
  const contentWidth = pageWidth - margin * 2;

  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const checkPageBreak = (neededHeight: number) => {
    if (y - neededHeight < margin) {
      currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
  };

  // Header Title
  currentPage.drawText(title || (isEn ? "DNA AI Chat Export" : "Ekspor Obrolan DNA AI"), {
    x: margin,
    y: y - 18,
    size: 18,
    font: fontBold,
    color: rgb(0.06, 0.47, 0.71), // #0f766e / cyan blue
  });
  y -= 30;

  // Subtitle / Date
  currentPage.drawText(
    `${isEn ? "Exported on" : "Diekspor pada"}: ${dateStr} | DNA AI Platform`,
    {
      x: margin,
      y: y - 10,
      size: 9,
      font: fontItalic,
      color: rgb(0.4, 0.4, 0.4),
    }
  );
  y -= 25;

  // Decorative header line
  currentPage.drawLine({
    start: { x: margin, y },
    end: { x: pageWidth - margin, y },
    thickness: 1.5,
    color: rgb(0.0, 0.7, 0.85),
  });
  y -= 20;

  // Iterate dialogues
  for (const msg of exportList) {
    const isUser = msg.role === "user";
    const sender = isUser
      ? isEn
        ? "USER:"
        : "PENGGUNA:"
      : isEn
      ? "DNA AI ASSISTANT:"
      : "DNA AI ASSISTANT:";

    checkPageBreak(40);

    // Draw sender label
    currentPage.drawText(sender, {
      x: margin,
      y: y - 10,
      size: 10,
      font: fontBold,
      color: isUser ? rgb(0.02, 0.4, 0.7) : rgb(0.1, 0.1, 0.1),
    });
    y -= 18;

    const cleaned = cleanMarkdownText(msg.content);
    const rawParagraphs = cleaned.split("\n").filter((p) => p.trim());

    for (const para of rawParagraphs) {
      const wrapped = wrapLinesForPdf(para, 78);
      for (const line of wrapped) {
        checkPageBreak(15);
        currentPage.drawText(line, {
          x: margin + 6,
          y: y - 9,
          size: 9.5,
          font: fontRegular,
          color: rgb(0.2, 0.2, 0.2),
        });
        y -= 14;
      }
      y -= 4;
    }

    y -= 12;

    // Subtle divider
    checkPageBreak(15);
    currentPage.drawLine({
      start: { x: margin, y },
      end: { x: pageWidth - margin, y },
      thickness: 0.5,
      color: rgb(0.85, 0.85, 0.85),
    });
    y -= 16;
  }

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes.buffer as ArrayBuffer], {
    type: "application/pdf",
  });
  const safeFilename = `${(title || "DNA-AI-Export")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 40)}.pdf`;
  triggerBrowserDownload(blob, safeFilename);
}

/**
 * 3. REAL EXPORT TO NOTION (.MD / CLIPBOARD)
 * Generates formatted Notion markdown blocks with callouts, toggle details, and headings.
 */
export function formatChatForNotion({
  title,
  messages,
  singleMessageContent,
  locale = "id",
}: ExportOptions): string {
  const isEn = locale === "en";
  const dateStr = new Date().toLocaleString(isEn ? "en-US" : "id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const exportList: ExportMessageItem[] = singleMessageContent
    ? [{ role: "assistant", content: singleMessageContent }]
    : messages;

  let notionContent = `# 🚀 ${title || (isEn ? "DNA AI Chat" : "Obrolan DNA AI")}\n\n`;
  notionContent += `> 📅 **${isEn ? "Export Date" : "Tanggal Ekspor"}:** ${dateStr}\n`;
  notionContent += `> 🤖 **Platform:** DNA AI Platform (Google DeepMind Antigravity)\n\n---\n\n`;

  for (const msg of exportList) {
    if (msg.role === "user") {
      notionContent += `### 👤 ${isEn ? "User" : "Pengguna"}\n`;
      notionContent += `${msg.content.trim()}\n\n`;
    } else {
      notionContent += `### 🤖 DNA AI Assistant\n`;
      notionContent += `> 💡 **${isEn ? "AI Response" : "Jawaban AI"}**\n>\n`;
      const quoted = msg.content
        .trim()
        .split("\n")
        .map((l) => `> ${l}`)
        .join("\n");
      notionContent += `${quoted}\n\n`;
    }
    notionContent += `---\n\n`;
  }

  return notionContent;
}

/**
 * Copy Notion-ready Markdown directly to user clipboard.
 */
export async function copyChatForNotion(options: ExportOptions): Promise<boolean> {
  try {
    const text = formatChatForNotion(options);
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error("Failed to copy for Notion:", err);
    return false;
  }
}

/**
 * Download Notion-ready Markdown file (.md).
 */
export function downloadChatForNotion(options: ExportOptions): void {
  const text = formatChatForNotion(options);
  const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
  const safeFilename = `${(options.title || "DNA-AI-Notion")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 40)}.md`;
  triggerBrowserDownload(blob, safeFilename);
}
