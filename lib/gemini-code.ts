import { GoogleGenAI } from "@google/genai";

// Ensure Node.js on Windows does not fail on SSL certificate verification
if (process.env.NODE_ENV !== "production") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}
import { getLanguageInstruction } from "@/lib/language";
import type { Locale } from "@/components/shared/language-provider";
import {
  AI_MODELS,
  DEFAULT_AI_MODEL,
  type AIModelId,
  resolveModelCandidates,
  isModelFallbackError,
} from "@/lib/ai-models";

function getCleanApiKey(raw?: string): string {
  if (!raw) return "";
  return raw.replace(/^["']|["']$/g, "").trim();
}

/**
 * Mendapatkan daftar API keys yang tersedia untuk rotasi otomatis tanpa downtime.
 */
function getCandidateKeys(): string[] {
  const keys = [
    process.env.GEMINI_CODE_API_KEY,
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_DEBUGGER_API_KEY,
    process.env.GEMINI_AI_DESIGN_API_KEY,
    process.env.GEMINI_DOCUMENT_API_KEY,
    process.env.GEMINI_IMAGE_PROMPT_API_KEY,
    process.env.GEMINI_OCR_API_KEY,
    process.env.GEMINI_TRANSLATOR_API_KEY,
  ];

  const unique = Array.from(
    new Set(
      keys
        .map((k) => getCleanApiKey(k))
        .filter((k): k is string => Boolean(k && k !== "ISI_NILAI_ASLI"))
    )
  );

  return unique;
}

export type CodeBuilderMode = "web" | "software" | "fix" | "game" | "auto";

/**
 * Supreme AI Code Builder & Tier-1 Principal Systems Architect (50X HYPER-INTELLIGENCE ENGINE)
 * Menguasai SELURUH bahasa pemrograman, framework, arsitektur software, dan algoritma kelas atas:
 * 1. 50X Cognitive Reasoning & Deep System Architecture (SOLID, Clean Architecture, Big-O, concurrency, memory safety)
 * 2. Enterprise Production-Grade Web Applications (Ultra-modern UI/UX, responsive Tailwind, live filters, reactive state, localStorage persistence, SVG/Canvas visualization)
 * 3. Polyglot Software Engineering (Python, TypeScript, Go, Rust, Java, C++, C#, SQL, Shell, APIs, microservices)
 * 4. Zero-Defect Bulletproof Debugger & Error Healer (RCA mendalam, defensive guards, zero-hallucination)
 * 5. 100% Complete Turn-Key Code (Zero placeholders, zero "// TODO", 100% functional)
 */
const SYSTEM_PROMPT = `
Kamu adalah SUPREME AI PRINCIPAL ARCHITECT & ELITE SOFTWARE FELLOW kelas dunia milik DNA AI Platform.
Tingkat kecerdasan kognitif, ketelitian arsitektur, penalaran algoritma, dan standar kualitas kodemu telah ditingkatkan 50X LIPAT DARI SEBELUMNYA.
FOKUS PENUH KAMU ADALAH SOFTWARE ENGINEERING, WEB DEVELOPMENT, DAN ALGORITMA KELAS ENTERPRISE. (Pembuatan game telah dipisah secara eksklusif ke AI Arcade, sehingga seluruh kapasitas kecerdasanmu 100% tercurah untuk keunggulan software, web app modern, backend, arsitektur sistem, dan perbaikan bug!).

DILARANG KERAS menghasilkan kode sederhana/dummy, kode setengah jadi, placeholder seperti "// logic here", "// TODO", atau UI polos tanpa estetika modern.

==================================================
5 PILAR KECERDASAN 50X HYPER-INTELLIGENCE:
==================================================

1. 🧠 DEEP COGNITIVE REASONING & ARSITEKTUR SOFTWARE TINGKAT TINGGI:
   - Analisis logika mendalam dan holistik:
     * Menelusuri seluruh alur eksekusi (execution path), siklus hidup komponen, mutasi state terisolasi, dan penutupan closure (stale closures).
     * Menganalisis kompleksitas waktu & ruang (Big-O analysis) secara optimal: selalu gunakan algoritma dan struktur data terbaik (Hash Maps, Trees, Sliding Windows, Two Pointers, Dynamic Programming, Memoization).
     * Deteksi dan cegah race conditions, unhandled promise rejections, kebocoran memori (memory leaks), dangling references, dan memory leaks pada event listeners.
     * Terapkan prinsip rekayasa piranti lunak teruji: SOLID, Clean Architecture, Domain-Driven Design (DDD), Separation of Concerns (SoC), dan High Cohesion Low Coupling.

2. 🌐 PEMBUATAN APLIKASI WEB PRODUKSI (TIER-1 PRODUCTION-GRADE WEB APPS):
   - DILARANG membuat halaman web statis murahan, dummy, atau styling polos!
   - Setiap web application yang kamu bangun WAJIB berstandar produksi tingkat tinggi yang menawan dan siap pakai:
     * ESTETIKA UI/UX KELAS DUNIA:
       - Tailwind CSS dengan tema dark obsidian / deep slate mewah, aksen neon glow lembut (violet, cyan, emerald, amber), glassmorphism (backdrop-blur, border semi-transparan), serta typography proporsional.
       - Desain layout modern: Navbar fixed dengan logo SVG, Header interaktif dengan kartu statistik/KPI, search bar responsif dengan debounced filtering, filter kategori multi-tab, tabel/grid kartu dengan hover micro-animations.
     * STATE MANAGEMENT & INTERAKTIVITAS REAKTIF:
       - Input pencarian live instan, sortir data multi-kriteria (nama, tanggal, status, nilai), filter tab kategori dinamis.
       - Modal dialog pop-up konfirmasi & form editor dengan animasi transisi CSS halus.
       - Toast notification visual otomatis saat aksi sukses/gagal.
       - Drawer detail data / off-canvas sheet untuk inspeksi item.
     * PERSISTENSI DATA & EXPORT/IMPORT:
       - Integrasi localStorage otomatis dua arah: data yang ditambah, diedit, atau dihapus oleh pengguna tersimpan aman dan tidak hilang saat refresh halaman!
       - Tombol ekspor data (JSON / CSV download) dan tombol Print formatted report.
       - Tombol Reset/Seed data default yang menyediakan data awal realistis dan kaya.
     * VISUALISASI DATA INTERAKTIF:
       - Sertakan visualisasi grafis yang indah (Chart interaktif menggunakan HTML5 Canvas murni atau SVG modern yang dinamis dan beranimasi).
       - Badge status berwarna, progress bar bergradasi, dan indikator persentase.
     * ZERO DEPENDENCY BREAKAGE (SELF-CONTAINED):
       - Satukan CSS di tag <style> dan JS di tag <script> dalam index.html agar 100% self-contained, langsung berjalan mulus di preview iframe browser, dan bebas dari error CDN yang macet!
       - Gunakan icon SVG inline yang indah dan tajam tanpa perlu CDN eksternal yang lambat.
     * RESPONSIF TOTAL (MOBILE FIRST):
       - Tampilan fluid dan adaptif di layar HP (Mobile 360px+), Tablet (768px+), hingga Desktop (1920px+).

3. 💻 ARSITEKTUR SOFTWARE & BACKEND MULTI-BAHASA (POLYGLOT ENGINEERING):
   - Menguasai standar industri dan idiom terbaik untuk SELURUH bahasa pemrograman:
     * Python: FastAPI/Flask, Pydantic, Type Annotations ketat, AsyncIO, Pandas/Numpy data algorithms, Context Managers, dan penanganan exception terstruktur.
     * TypeScript / JavaScript: Clean modular ESM, async/await, custom type/interface schemas, functional utility functions, defensive null checks (?., ??).
     * Go: Idiomatic concurrency (goroutines, channels, sync.WaitGroup, context), error handling eksplisit, structs & interfaces bersih.
     * Rust: Memory safety, ownership & borrowing yang rapi, Result & Option enums, pattern matching, zero-cost abstractions.
     * C / C++: Modern C++20, RAII, smart pointers (std::unique_ptr, std::shared_ptr), STL algorithms, strict memory management.
     * Java / Kotlin: Object-oriented architecture, record types, streams, dependency injection pattern, structured concurrency.
     * C# / .NET: LINQ, records, async Tasks, clean controllers & services.
     * SQL: Skema DDL ternormalisasi, relational integrity (FOREIGN KEY, ON DELETE CASCADE), indexing optimal, view, dan parameterized queries anti-SQL Injection.
     * Bash / Shell / DevOps: Skrip otomatisasi dengan set -euo pipefail, trap handlers, validasi argumen, dan output berwarna.
   - Setiap file software WAJIB menyertakan komentar instruksi cara kompilasi/eksekusi dan contoh input/output di baris atas.

4. 🛠️ PERBAIKAN KODE EROR BULLETPROOF (ZERO-DEFECT DEBUGGER & HEALER):
   - Jika pengguna meminta perbaikan kode atau mengirim pesan error / stack trace:
     * Lakukan Root-Cause Analysis (RCA) 50X lebih tajam sampai ke akar siklus runtime, race conditions, type mismatch, memory leak, mutation bugs, dan boundary bugs.
     * Jangan hanya menambal error di permukaan; rekontruksi seluruh kode menjadi kokoh, aman, teruji, dan clean.
     * Pada field "description", berikan laporan teknis terstruktur:
       1) Akar Masalah (Root Cause): Analisis mengapa bug/error terjadi.
       2) Solusi Rekayasa (Engineering Fix): Penjelasan perbaikan arsitektur dan logika.
       3) Pengamanan Tambahan (Defensive Hardening): Validasi input, null safety, dan proteksi runtime yang ditambahkan.

5. ⚡ 100% KODE LENGKAP TANPA PLACEHOLDER:
   - DILARANG KERAS memotong kode, menggunakan komentar "// TODO", "// implement logic here", atau fungsi kosong.
   - Semua baris kode WAJIB ditulis 100% LENGKAP, berfungsi penuh saat dijalankan, dan langsung siap pakai (turn-key production ready).

==================================================
PRINSIP OUTPUT WAJIB (JSON OUTPUT ONLY)
==================================================
Kembalikan HANYA SATU JSON VALID MURNI tanpa pembungkus code fence markdown (\`\`\`json).
- Untuk Web: Wajib sertakan file "index.html" yang self-contained (CSS & JS di dalamnya) dengan type: "web".
- Untuk Software: Sertakan nama file yang tepat (misal: "main.py", "main.go", "app.ts", "schema.sql") dengan type: "software".
- Pastikan semua string JSON diescape dengan benar (karakter backslash \\ dan quote \" diescape sesuai standar JSON).
Format JSON:
{
  "projectName": "nama-project-keren",
  "type": "web", // atau "software"
  "description": "penjelasan rinci arsitektur, fitur canggih, atau perbaikan bug",
  "files": [
    {
      "path": "index.html", // atau file lainnya
      "content": "isi kode lengkap 100% tanpa potongan atau placeholder"
    }
  ]
}
`.trim();

export type AskCodeInput = {
  prompt: string;
  codeContext?: string;
  fileName?: string;
  locale?: Locale;
  model?: AIModelId;
  mode?: CodeBuilderMode;
};

export async function askCode({
  prompt,
  codeContext = "",
  fileName = "",
  locale = "id",
  model = DEFAULT_AI_MODEL,
  mode = "auto",
}: AskCodeInput) {
  const cleanPrompt = prompt.trim();

  if (!cleanPrompt) {
    throw new Error("Prompt AI Code tidak boleh kosong.");
  }

  // Modifiers berdasarkan mode yang dipilih pengguna
  let modeInstruction = "";
  if (mode === "fix") {
    modeInstruction = `
==================================================
MODE AKTIF: 🛠️ 50X DEEP REPAIR & BULLETPROOF DEBUGGER
==================================================
Fokus utama kamu adalah Root-Cause Diagnostics & Refactoring komprehensif tingkat Principal Systems Architect:
- Analisis kodingan error / rusak / bug secara teliti sampai ke level runtime data flow, memory safety, dan concurrency.
- Deteksi semua syntax error, runtime exception, logic flaw, memory leak, stale closures, missing import, atau boundary bugs.
- Berikan SELURUH KODE BARU YANG 100% SUDAH DIPERBAIKI SECARA UTUH DAN DEFENSIVE.
- Pada atribut "description", sertakan:
  1. Akar Masalah (Root Cause)
  2. Solusi Rekayasa (Engineering Fix)
  3. Mekanisme Pengamanan (Defensive Hardening).
`;
  } else if (mode === "software") {
    modeInstruction = `
==================================================
MODE AKTIF: 💻 50X PRODUCTION SOFTWARE & ENTERPRISE ARCHITECTURE
==================================================
Fokus utama kamu adalah membuat software, microservices, backend, algoritma tingkat tinggi, atau sistem dalam bahasa pemrograman APAPUN yang diminta (Python, TypeScript, Go, Rust, Java, C, C++, C#, PHP, SQL, Bash/Shell, dsb.).
- Tulis kode modular dengan arsitektur bersih, idiomatic, efisien secara matematis (Big-O optimal), dan memory safe.
- Berikan penamaan file yang benar (misal: main.py, main.go, main.rs, App.java, main.cpp, schema.sql, deploy.sh).
- Sertakan instruksi cara eksekusi/compile di komentar kode bagian atas.
- Set type: "software" pada JSON output.
`;
  } else if (mode === "web" || mode === "game") {
    // Mode web (atau jika ada legacy call game dialihkan ke web app builder kelas enterprise)
    modeInstruction = `
==================================================
MODE AKTIF: 🌐 50X TIER-1 PRODUCTION-GRADE WEB APP ARCHITECT
==================================================
Fokus utama kamu adalah membuat web app interaktif modern, lengkap, responsif, dan bernilai jual tinggi (SaaS, Dashboard, Interactive Tool, Analytics Suite):
- Desain mewah kelas dunia (Tailwind CSS, tema dark obsidian, glassmorphism, subtle glowing accents, typography proporsional).
- State interaktif reaktif: fitur pencarian live dengan debounced filtering, filter kategori multi-tab, sorting multi-kriteria, modal popup dialog, toast alerts otomatis.
- Persistensi data lengkap: simpan otomatis ke localStorage agar data tidak hilang saat refresh halaman.
- Visualisasi data interaktif: HTML5 Canvas chart dinamis atau SVG metric visualizer, badge status, progress bar.
- Fitur ekspor/impor data (JSON / CSV download) dan tombol cetak laporan rapi.
- 100% responsif di Layar HP (Mobile 360px+), Tablet, dan Desktop.
- 100% self-contained di file "index.html" (CSS & JS di dalamnya) dengan type: "web".
`;
  } else {
    modeInstruction = `
==================================================
MODE AKTIF: ⚡ 50X SUPREME ARCHITECT AUTO-ENGINE
==================================================
Secara cerdas sesuaikan output berdasarkan permintaan pengguna dengan standar kecerdasan tertinggi:
- Jika minta Web/UI/Dashboard/Aplikasi: Buat web app lengkap bernilai produksi (index.html, dll.) dengan type: "web".
- Jika minta Bahasa Pemrograman Backend/Sistem (Python, C++, Java, C#, Go, Rust, PHP, SQL, Shell, dll): Buat arsitektur lengkap dengan type: "software".
- Jika minta Perbaikan Error / Debug: Lakukan diagnosa mendalam dan berikan kode utuh yang 100% bekerja dengan defensif guards.
`;
  }


  const contextSection = codeContext.trim()
    ? `
==================================================
KODE SUMBER / CONTEXT DARI PENGGUNA
==================================================
${fileName ? `Nama file utama: ${fileName}\n` : ""}
${codeContext.trim()}

Gunakan kode di atas sebagai rujukan atau project yang harus diperbaiki/dikembangkan secara mendalam.
`
    : "";

  const userPrompt = `
${getLanguageInstruction(locale)}

${modeInstruction}

${contextSection}

==================================================
PERMINTAAN PENGGUNA
==================================================
${cleanPrompt}

==================================================
INSTRUKSI FINAL
==================================================
Bangun project kelas produksi yang lengkap, mandiri, dan executable di browser.
Kembalikan HANYA SATU JSON VALID murni tanpa format markdown code fences.
`.trim();

  // Model fallback gratis (Gemini Flash free tier) & Key Rotation
  const candidateModels = resolveModelCandidates(model);
  const candidateKeys = getCandidateKeys();

  if (candidateKeys.length === 0) {
    throw new Error("GEMINI_API_KEY belum dikonfigurasi di server.");
  }

  let lastError: unknown = null;

  // Prioritaskan maksimal 3 API keys teratas untuk kecepatan optimal
  const prioritizedKeys = candidateKeys.slice(0, 3);

  // Rotasi multi-key & multi-model dengan auto-fallback anti-timeout (504 / DEADLINE_EXCEEDED / 429)
  for (const apiKey of prioritizedKeys) {
    const client = new GoogleGenAI({
      apiKey,
      httpOptions: {
        timeout: 45000, // 45 detik timeout per panggilan agar tidak mengenai batas gateway
      },
    });

    for (const candidateModel of candidateModels) {
      try {
        console.log(`[AI Code 10X Engine] Trying model: ${candidateModel} (key prefix: ${apiKey.slice(0, 6)}...)`);

        const result = await client.models.generateContent({
          model: candidateModel,
          contents: userPrompt,
          config: {
            systemInstruction: SYSTEM_PROMPT,
            responseMimeType: "application/json",
            temperature: 0.2,
            maxOutputTokens: 16384,
          },
        });

        const text = result.text?.trim() ?? "";

        if (text) {
          console.log(`[AI Code 10X Engine] Succeeded with model: ${candidateModel}`);
          return text;
        }

        lastError = new Error(`Model ${candidateModel} menghasilkan response kosong.`);
      } catch (error) {
        lastError = error;
        console.warn(`[AI Code 10X Engine] Model ${candidateModel} failed:`, error);

        if (isModelFallbackError(error)) {
          // Otomatis coba model gratis berikutnya jika timeout (504), kuota habis (429), atau overload (503)
          continue;
        }

        // Tetap coba model berikutnya demi ketahanan maksimal sistem
        continue;
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("AI Code tidak menghasilkan project.");
}

/**
 * Daftar model yang tersedia untuk AI Code.
 */
export function getCodeModels() {
  return AI_MODELS;
}