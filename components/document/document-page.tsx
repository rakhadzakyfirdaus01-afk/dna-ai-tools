"use client";

import { useState } from "react";
import {
  FileText,
  Upload,
  Play,
  Copy,
  Trash2,
  Download,
  WandSparkles,
} from "lucide-react";
import { toast } from "sonner";
import { addNotification } from "@/components/notifications/notification-store";
import { useLanguage } from "@/components/shared/language-provider";

type DocumentType =
  | "pdf"
  | "word"
  | "excel";

type DocumentMode =
  | "analyze"
  | "create"
  | "transform";

type SplitFileResult = {
  fileName: string;
  fileBase64: string;
  recordCount: number;
  groupValue: string;
};

export default function DocumentPage() {
  const { t } = useLanguage();

  const [file, setFile] =
    useState<File | null>(null);

  const [prompt, setPrompt] =
    useState("");

  const [result, setResult] =
    useState("");

  const [splitFiles, setSplitFiles] =
    useState<SplitFileResult[]>([]);

  const [splitSummary, setSplitSummary] =
    useState<{
      originalRecords: number;
      resultRecords: number;
      fileCount: number;
      splitColumn: string;
    } | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [documentType, setDocumentType] =
    useState<DocumentType>("pdf");

  const [documentMode, setDocumentMode] =
    useState<DocumentMode>("analyze");

  /* =========================
     ANALYZE
  ========================== */

  async function analyze() {
    if (!file) {
      toast.error(
        t.uploadDocumentToAnalyze
      );

      return;
    }

    try {
      setLoading(true);

      const formData =
        new FormData();

      formData.append(
        "document",
        file
      );

      formData.append(
        "prompt",
        prompt
      );

      const res =
        await fetch(
          "/api/document",
          {
            method: "POST",
            body: formData,
          }
        );

      const data =
        await res.json();

      if (!res.ok) {
        throw new Error(
          data.error ||
            t.failedToAnalyzeDocument
        );
      }

      setResult(
        data.result
      );

      addNotification({
        feature:
          "AI Document",
        title:
          "AI Document selesai",
        message:
          "Dokumen berhasil dianalisis dan hasilnya siap dilihat.",
        type: "success",
        result:
          data.result,
      });

      toast.success(
        t.documentAnalyzedSuccessfully
      );
    } catch (error) {
      console.error(error);

      toast.error(
        error instanceof Error
          ? error.message
          : t.failedToAnalyzeDocument
      );
    } finally {
      setLoading(false);
    }
  }

  /* =========================
     CREATE
  ========================== */

  async function createDocument() {
    if (!prompt.trim()) {
      toast.error(
        "Tulis terlebih dahulu instruksi dokumen yang ingin dibuat."
      );

      return;
    }

    try {
      setLoading(true);

      const res =
        await fetch(
          "/api/document/create",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              prompt,
              documentType,
            }),
          }
        );

      const data =
        await res.json();

      if (!res.ok) {
        throw new Error(
          data.error ||
            "Gagal membuat dokumen."
        );
      }

      downloadFile(
        data.fileBase64,
        data.fileName,
        documentType
      );

      setResult(
        `Dokumen ${documentType.toUpperCase()} berhasil dibuat: ${
          data.fileName ||
          getDefaultFileName(
            documentType
          )
        }`
      );

      addNotification({
        feature:
          "AI Document",
        title:
          "Dokumen berhasil dibuat",
        message:
          `Dokumen ${documentType.toUpperCase()} berhasil dibuat dan diunduh.`,
        type: "success",
        result:
          data.fileName ||
          getDefaultFileName(
            documentType
          ),
      });

      toast.success(
        `Dokumen ${documentType.toUpperCase()} berhasil dibuat dan diunduh.`
      );
    } catch (error) {
      console.error(
        "CREATE DOCUMENT ERROR:",
        error
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "Gagal membuat dokumen."
      );
    } finally {
      setLoading(false);
    }
  }

  /* =========================
     TRANSFORM
  ========================== */

  async function transformDocument() {
    if (!file) {
      toast.error(
        "Upload dokumen yang ingin diolah terlebih dahulu."
      );
      return;
    }

    if (!prompt.trim()) {
      toast.error(
        "Tulis instruksi pengolahan dokumen."
      );
      return;
    }

    try {
      setLoading(true);
      setSplitFiles([]);
      setSplitSummary(null);

      const formData =
        new FormData();

      formData.append(
        "document",
        file
      );

      formData.append(
        "prompt",
        prompt
      );

      formData.append(
        "documentType",
        documentType
      );

      const res =
        await fetch(
          "/api/document/transform",
          {
            method: "POST",
            body: formData,
          }
        );

      const data =
        await res.json();

      if (!res.ok) {
        throw new Error(
          data.error ||
            "Gagal mengolah dokumen."
        );
      }

      /*
       * MODE SPLIT:
       * backend mengirim files[],
       * bukan fileBase64 tunggal.
       */
      if (
        data.mode ===
        "split"
      ) {
        if (
          !Array.isArray(
            data.files
          )
        ) {
          throw new Error(
            "Server tidak mengirim daftar file hasil pemisahan."
          );
        }

        const files =
          data.files as SplitFileResult[];

        const originalRecords =
          Number(
            data.originalRecords
          ) || 0;

        const resultRecords =
          Number(
            data.resultRecords
          ) || 0;

        const fileCount =
          Number(
            data.fileCount
          ) || files.length;

        if (
          resultRecords !==
          originalRecords
        ) {
          throw new Error(
            `Validasi hasil gagal: ${originalRecords} record sumber, tetapi ${resultRecords} record hasil.`
          );
        }

        if (
          files.some(
            (item) =>
              !item.fileBase64 ||
              !item.fileName
          )
        ) {
          throw new Error(
            "Ada file hasil pemisahan yang tidak memiliki data file."
          );
        }

        setSplitFiles(
          files
        );

        setSplitSummary({
          originalRecords,
          resultRecords,
          fileCount,
          splitColumn:
            data.splitColumn ||
            "KOTA",
        });

        setResult(
          `Berhasil memisahkan ${originalRecords} record berdasarkan ${
            data.splitColumn ||
            "KOTA"
          } menjadi ${fileCount} file.`
        );

        addNotification({
          feature:
            "AI Document",
          title:
            "Dokumen berhasil dipisahkan",
          message:
            `${originalRecords} record berhasil dipisahkan menjadi ${fileCount} file berdasarkan ${
              data.splitColumn ||
              "KOTA"
            }.`,
          type:
            "success",
          result:
            `${fileCount} file`,
        });

        toast.success(
          `${fileCount} file berhasil dibuat.`
        );

        return;
      }

      /*
       * MODE TRANSFORM BIASA
       */
      if (
        !data.fileBase64
      ) {
        throw new Error(
          "File hasil pengolahan tidak dikirim oleh server."
        );
      }

      downloadFile(
        data.fileBase64,
        data.fileName,
        documentType
      );

      setResult(
        `Dokumen hasil pengolahan berhasil dibuat: ${
          data.fileName ||
          getDefaultFileName(
            documentType
          )
        }`
      );

      addNotification({
        feature:
          "AI Document",
        title:
          "Dokumen berhasil diolah",
        message:
          `Dokumen ${documentType.toUpperCase()} hasil pengolahan berhasil dibuat.`,
        type:
          "success",
        result:
          data.fileName ||
          getDefaultFileName(
            documentType
          ),
      });

      toast.success(
        "Dokumen berhasil diolah dan diunduh."
      );
    } catch (error) {
      console.error(
        "TRANSFORM DOCUMENT ERROR:",
        error
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "Gagal mengolah dokumen."
      );
    } finally {
      setLoading(false);
    }
  }

  /* =========================
     DOWNLOAD HELPER
  ========================== */

  function getDefaultFileName(
    type: DocumentType
  ) {
    if (type === "word") {
      return "AI-Document.docx";
    }

    if (type === "excel") {
      return "AI-Document.xlsx";
    }

    return "AI-Document.pdf";
  }

  function downloadFile(
    fileBase64: string,
    fileName: string | undefined,
    type: DocumentType
  ) {
    if (!fileBase64) {
      throw new Error(
        "File tidak tersedia."
      );
    }

    const binaryString =
      window.atob(
        fileBase64
      );

    const bytes =
      new Uint8Array(
        binaryString.length
      );

    for (
      let i = 0;
      i <
      binaryString.length;
      i++
    ) {
      bytes[i] =
        binaryString.charCodeAt(
          i
        );
    }

    let mimeType =
      "application/pdf";

    if (
      type === "word"
    ) {
      mimeType =
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    }

    if (
      type === "excel"
    ) {
      mimeType =
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    }

    const blob =
      new Blob(
        [bytes],
        {
          type: mimeType,
        }
      );

    const url =
      window.URL.createObjectURL(
        blob
      );

    const link =
      document.createElement(
        "a"
      );

    link.href = url;

    link.download =
      fileName ||
      getDefaultFileName(
        type
      );

    link.style.display =
      "none";

    document.body.appendChild(
      link
    );

    link.click();

    setTimeout(() => {
      document.body.removeChild(
        link
      );

      window.URL.revokeObjectURL(
        url
      );
    }, 1000);
  }

  /* =========================
     SPLIT DOWNLOAD
  ========================== */

  function downloadSplitFile(
    item: SplitFileResult
  ) {
    downloadFile(
      item.fileBase64,
      item.fileName,
      "excel"
    );
  }

  async function downloadAllSplitFiles() {
    if (
      splitFiles.length === 0
    ) {
      return;
    }

    for (
      let index = 0;
      index < splitFiles.length;
      index++
    ) {
      downloadSplitFile(
        splitFiles[index]
      );

      await new Promise(
        (resolve) =>
          setTimeout(
            resolve,
            250
          )
      );
    }

    toast.success(
      `${splitFiles.length} file berhasil dikirim untuk diunduh.`
    );
  }

  /* =========================
     CLEAR
  ========================== */

  function clearAll() {
    setFile(null);
    setPrompt("");
    setResult("");
    setSplitFiles([]);
    setSplitSummary(null);
    setDocumentType("pdf");
    setDocumentMode("analyze");

    toast.success(
      t.clear
    );
  }

  /* =========================
     COPY
  ========================== */

  async function copyResult() {
    if (
      !result &&
      splitFiles.length === 0
    ) {
      return;
    }

    try {
      const textToCopy =
        splitSummary
          ? [
              result,
              "",
              ...splitFiles.map(
                (item) =>
                  `${item.fileName} — ${item.recordCount} record`
              ),
            ].join("\n")
          : result;

      await navigator.clipboard.writeText(
        textToCopy
      );

      toast.success(
        t.copied
      );
    } catch (error) {
      console.error(error);

      toast.error(
        t.failedToCopy
      );
    }
  }

  /* =========================
     RENDER
  ========================== */

  return (
    <div className="space-y-5 lg:space-y-8">

      {/* HEADER */}

      <div className="rounded-2xl bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-700 p-5 shadow-xl lg:rounded-3xl lg:p-8">

        <div className="flex items-start gap-3 lg:items-center lg:gap-4">

          <div className="rounded-xl bg-white/10 p-2.5 backdrop-blur lg:rounded-2xl lg:p-3">

            <FileText
              size={26}
              className="text-white"
            />

          </div>

          <div>

            <h1 className="text-2xl font-bold text-white lg:text-4xl">
              {t.aiDocumentTitle}
            </h1>

            <p className="mt-2 text-sm text-white/80 lg:text-base">
              {t.aiDocumentDescription}
            </p>

          </div>

        </div>

      </div>

      {/* CONTENT */}

      <div className="grid gap-4 lg:gap-6 xl:grid-cols-2">

        {/* INPUT */}

        <div className="rounded-2xl border border-slate-800 bg-[#111827] p-4 shadow-xl lg:rounded-3xl lg:p-6">

          {/* MODE */}

          <div className="mb-4">

            <label
              htmlFor="document-mode"
              className="mb-2 block text-sm font-medium text-white"
            >
              Mode AI Document
            </label>

            <select
              id="document-mode"
              value={
                documentMode
              }
              onChange={(e) =>
                setDocumentMode(
                  e.target
                    .value as DocumentMode
                )
              }
              className="w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-white outline-none focus:border-cyan-500 lg:rounded-2xl lg:p-4"
            >

              <option value="analyze">
                Analisis Dokumen
              </option>

              <option value="create">
                Buat Dokumen
              </option>

              <option value="transform">
                Olah Dokumen
              </option>

            </select>

          </div>

          {/* UPLOAD */}

          {documentMode !==
            "create" && (
            <label className="mb-4 flex h-36 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-700 bg-slate-900 transition hover:border-cyan-500 lg:mb-5 lg:h-44 lg:rounded-2xl">

              <Upload
                size={34}
                className="mb-3 text-cyan-400"
              />

              <p className="font-semibold text-white">
                {documentMode ===
                "transform"
                  ? "Upload dokumen yang ingin diolah"
                  : t.uploadDocument}
              </p>

              <p className="mt-2 text-sm text-slate-400">
                PDF, Word, Excel, TXT
              </p>

              {file && (
                <p className="mt-4 break-all text-center text-sm text-cyan-400">
                  {file.name}
                </p>
              )}

              <input
                hidden
                type="file"
                accept=".pdf,.doc,.docx,.txt,.xls,.xlsx"
                onChange={(e) => {
                  setFile(
                    e.target.files?.[0] ??
                      null
                  );
                }}
              />

            </label>
          )}

          {/* PROMPT */}

          <textarea
            value={prompt}
            onChange={(e) =>
              setPrompt(
                e.target.value
              )
            }
            placeholder={
              documentMode ===
              "analyze"
                ? t.askAboutDocument
                : documentMode ===
                    "create"
                  ? "Contoh: Buatkan surat izin tidak masuk sekolah karena sakit..."
                  : "Contoh: Sortir data berdasarkan kota Sidoarjo, hanya READY, orientasi POTRAIT, lalu urutkan ukuran dari terbesar ke terkecil."
            }
            className="h-44 w-full resize-none rounded-xl border border-slate-700 bg-slate-900 p-4 text-white outline-none focus:border-cyan-500 lg:h-52 lg:rounded-2xl lg:p-5"
          />

          {/* OUTPUT FORMAT */}

          {documentMode !==
            "analyze" && (
            <div className="mt-4">

              <label
                htmlFor="document-type"
                className="mb-2 block text-sm font-medium text-white"
              >
                Format Output
              </label>

              <select
                id="document-type"
                value={
                  documentType
                }
                onChange={(e) =>
                  setDocumentType(
                    e.target
                      .value as DocumentType
                  )
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-white outline-none focus:border-cyan-500 lg:rounded-2xl lg:p-4"
              >

                <option value="pdf">
                  PDF
                </option>

                <option value="word">
                  Word
                </option>

                <option value="excel">
                  Excel
                </option>

              </select>

            </div>
          )}

          {/* BUTTONS */}

          <div className="mt-4 flex flex-col gap-3 lg:mt-5 lg:flex-row">

            {/* ANALYZE */}

            {documentMode ===
              "analyze" && (
              <button
                onClick={
                  analyze
                }
                disabled={
                  loading ||
                  !file
                }
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 font-medium text-white transition hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-50 lg:w-auto lg:rounded-2xl lg:px-6"
              >

                <Play
                  size={18}
                />

                {loading
                  ? t.analyzing
                  : t.analyze}

              </button>
            )}

            {/* CREATE */}

            {documentMode ===
              "create" && (
              <button
                onClick={
                  createDocument
                }
                disabled={
                  loading ||
                  !prompt.trim()
                }
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-500 px-5 py-3 font-medium text-white transition hover:bg-purple-600 disabled:cursor-not-allowed disabled:opacity-50 lg:w-auto lg:rounded-2xl lg:px-6"
              >

                <Download
                  size={18}
                />

                {loading
                  ? "Membuat..."
                  : "Buat Dokumen"}

              </button>
            )}

            {/* TRANSFORM */}

            {documentMode ===
              "transform" && (
              <button
                onClick={
                  transformDocument
                }
                disabled={
                  loading ||
                  !file ||
                  !prompt.trim()
                }
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 font-medium text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50 lg:w-auto lg:rounded-2xl lg:px-6"
              >

                <WandSparkles
                  size={18}
                />

                {loading
                  ? "Mengolah..."
                  : "Olah & Buat Dokumen"}

              </button>
            )}

            {/* CLEAR */}

            <button
              onClick={
                clearAll
              }
              disabled={
                !file &&
                !prompt &&
                !result &&
                splitFiles.length === 0
              }
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-500 px-5 py-3 font-medium text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50 lg:w-auto lg:rounded-2xl lg:px-6"
            >

              <Trash2
                size={18}
              />

              {t.clear}

            </button>

          </div>

        </div>

        {/* RESULT */}

        <div className="rounded-2xl border border-slate-800 bg-[#111827] p-4 shadow-xl lg:rounded-3xl lg:p-6">

          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-white">
              Hasil
            </h2>

            <button
              onClick={
                copyResult
              }
              disabled={
                !result &&
                splitFiles.length === 0
              }
              title={
                t.copied
              }
              className="rounded-xl border border-slate-700 bg-slate-900 p-2.5 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 lg:rounded-2xl lg:p-3"
            >
              <Copy
                size={18}
              />
            </button>
          </div>

          {splitSummary &&
          splitFiles.length > 0 ? (
            <div className="space-y-4">

              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
                  <p className="text-xs text-slate-400">
                    Record sumber
                  </p>
                  <p className="mt-1 text-xl font-bold text-white">
                    {
                      splitSummary.originalRecords
                    }
                  </p>
                </div>

                <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
                  <p className="text-xs text-slate-400">
                    Record hasil
                  </p>
                  <p className="mt-1 text-xl font-bold text-emerald-400">
                    {
                      splitSummary.resultRecords
                    }
                  </p>
                </div>

                <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
                  <p className="text-xs text-slate-400">
                    Jumlah file
                  </p>
                  <p className="mt-1 text-xl font-bold text-white">
                    {
                      splitSummary.fileCount
                    }
                  </p>
                </div>

                <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
                  <p className="text-xs text-slate-400">
                    Berdasarkan
                  </p>
                  <p className="mt-1 truncate text-xl font-bold text-cyan-400">
                    {
                      splitSummary.splitColumn
                    }
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-900/60 bg-emerald-950/30 p-4">
                <div>
                  <p className="font-semibold text-emerald-400">
                    Pemisahan berhasil
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    Semua record sumber tetap dipertahankan.
                  </p>
                </div>

                <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                  VALID
                </span>
              </div>

              <button
                onClick={
                  downloadAllSplitFiles
                }
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 font-semibold text-white transition hover:bg-cyan-600 lg:rounded-2xl"
              >
                <Download
                  size={18}
                />
                Download Semua File
              </button>

              <div className="h-[250px] space-y-2 overflow-auto rounded-xl border border-slate-700 bg-slate-900 p-3 lg:h-[390px] lg:rounded-2xl lg:p-4">
                {splitFiles.map(
                  (
                    item,
                    index
                  ) => (
                    <div
                      key={`${item.fileName}-${index}`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-[#111827] p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-white">
                          {item.fileName}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {
                            item.recordCount
                          }{" "}
                          record
                        </p>
                      </div>

                      <button
                        onClick={() =>
                          downloadSplitFile(
                            item
                          )
                        }
                        className="flex shrink-0 items-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-600"
                      >
                        <Download
                          size={16}
                        />
                        Download
                      </button>
                    </div>
                  )
                )}
              </div>

            </div>
          ) : result ? (

            <div className="h-[320px] overflow-auto rounded-xl border border-slate-700 bg-slate-900 p-5 lg:h-[500px] lg:rounded-2xl">
              <pre className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-300">
                {result}
              </pre>
            </div>

          ) : (

            <div className="flex h-[320px] items-center justify-center rounded-xl border-2 border-dashed border-slate-700 bg-slate-900 lg:h-[500px] lg:rounded-2xl">
              <div className="text-center">
                <FileText
                  size={64}
                  className="mx-auto mb-5 text-slate-600"
                />

                <h2 className="text-2xl font-bold text-white">
                  {t.aiDocumentAnalyzer}
                </h2>

                <p className="mt-3 text-slate-400">
                  {documentMode ===
                    "analyze"
                    ? t.uploadDocumentToAnalyze
                    : documentMode ===
                        "create"
                      ? "Tulis instruksi untuk membuat dokumen."
                      : "Upload dokumen dan tulis instruksi pengolahannya."}
                </p>
              </div>
            </div>

          )}


        </div>

      </div>

    </div>
  );
}