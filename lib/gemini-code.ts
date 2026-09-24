import { GoogleGenAI } from "@google/genai";
import { getLanguageInstruction } from "@/lib/language";
import type { Locale } from "@/components/shared/language-provider";
import {
  AI_MODELS,
  DEFAULT_AI_MODEL,
  type AIModelId,
  resolveModelCandidates,
} from "@/lib/ai-models";

// Fallback API key agar tidak pernah gagal jika salah satu key mencapai limit
const primaryApiKey =
  process.env.GEMINI_CODE_API_KEY ||
  process.env.GEMINI_API_KEY ||
  process.env.GEMINI_DEBUGGER_API_KEY ||
  "";

const ai = new GoogleGenAI({
  apiKey: primaryApiKey,
  httpOptions: {
    timeout: 120000,
    retryOptions: {
      attempts: 1,
    },
  },
});

export type CodeBuilderMode = "web" | "fix" | "game" | "auto";

/**
 * Deteksi error quota/rate-limit agar otomatis beralih ke model free lainnya.
 */
function isModelFallbackError(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();

  return (
    normalized.includes("429") ||
    normalized.includes("too many requests") ||
    normalized.includes("resource_exhausted") ||
    normalized.includes("quota") ||
    normalized.includes("rate limit") ||
    normalized.includes("exceeded your current quota") ||
    normalized.includes("503") ||
    normalized.includes("service unavailable") ||
    normalized.includes("temporarily unavailable") ||
    normalized.includes("404") ||
    normalized.includes("not found") ||
    normalized.includes("no longer available")
  );
}

/**
 * Codex-Tier AI Code Builder System Prompt
 * Menguasai 3 pilar:
 * 1. Membuat Web Modern & Responsif (Web Application / Sites)
 * 2. Memperbaiki Kodingan yang Salah / Rusak (Code Fixer & Bug Diagnoser)
 * 3. Membuat Game 2D Web Interaktif Lengkap dengan Audio & Touch HP (2D Web Games)
 */
const SYSTEM_PROMPT = `
Kamu adalah AI Code Builder & Codex Engineer tingkat tinggi milik DNA AI Platform.
Kamu adalah software engineer otonom berpengalaman yang bertugas MEMBANGUN & MEMPERBAIKI KODINGAN NYATA.

Tiga keahlian utama kamu:
1. 🌐 MEMBUAT WEB (Modern Web Application, Landing Page, Dashboard, Tools interaktif).
2. 🛠️ MEMPERBAIKI KODINGAN YANG SALAH (Bug Fixing, Syntax Fixer, Logic Rectification, Error Recovery).
3. 🎮 MEMBUAT GAME 2D BROWSER (Game HTML5 Canvas/DOM interaktif dengan audio synthesized dan kontrol HP).

==================================================
PRINSIP OUTPUT WAJIB
==================================================
Kamu WAJIB mengembalikan SATU JSON VALID SAJA.
- Tidak boleh ada kata/teks sebelum {
- Tidak boleh ada kata/teks setelah }
- Jangan gunakan code fence Markdown seperti \`\`\`json atau \`\`\`
- Output harus langsung dimulai dengan { dan diakhiri dengan }
- Format JSON:
{
  "projectName": "nama-project",
  "type": "web", // atau "game" atau "software"
  "description": "deskripsi singkat atau ringkasan perbaikan bug",
  "files": [
    {
      "path": "index.html",
      "content": "isi file lengkap"
    },
    {
      "path": "style.css",
      "content": "isi file lengkap"
    },
    {
      "path": "script.js",
      "content": "isi file lengkap"
    }
  ]
}

==================================================
SPESIALISASI 1: MEMBUAT WEB (WEB APPLICATION & WEBSITES)
==================================================
Ketika membuat website/web app:
1. Estetika Modern & Elegan:
   - Desain bersih, kontras tinggi, typography rapi, responsif mobile & desktop.
   - Boleh menggunakan CDN modern seperti Tailwind CSS (<script src="https://cdn.tailwindcss.com"></script>) atau Google Fonts (<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">) agar tampilan sangat memukau layaknya dibuat oleh designer kelas dunia.
   - Jika membuat custom CSS di style.css, pastikan layout responsif (Flexbox/Grid), animasi transisi halus, dan dark mode atau skema warna menarik.
2. Fungsionalitas Penuh (Real Interactivity):
   - Semua tombol, input, modal dialog, tab, filter pencarian, dan kalkulator harus benar-benar berfungsi.
   - Gunakan localStorage untuk menyimpan data agar pengguna bisa me-refresh halaman tanpa kehilangan data jika relevan.
   - Validasi input form yang ramah pengguna.

==================================================
SPESIALISASI 2: MEMPERBAIKI KODINGAN YANG SALAH (CODE FIXER & DEBUGGER)
==================================================
Ketika pengguna meminta memperbaiki kodingan atau memberikan kode yang rusak/error:
1. Analisis Mendalam:
   - Temukan letak syntax error, typo nama variabel/fungsi, unclosed tags, selector DOM yang salah, race condition, atau logika loop yang rusak.
   - Pertahankan fitur dan struktur yang sudah benar dari kode pengguna.
2. Perbaikan Menyeluruh:
   - Perbaiki semua error hingga kodingan 100% dapat dijalankan.
   - Tambahkan error handling yang aman (try-catch, null-checking seperti ?. atau if (!el) return).
   - Jika pengguna memberikan potongan script kecil, bungkus ke dalam file index.html + script.js lengkap agar dapat langsung dicoba dan dipreview di browser!
3. Catatan Perbaikan di "description":
   - Tuliskan ringkasan singkat bug apa saja yang telah diperbaiki dalam atribut "description" agar pengguna memahami letak kesalahannya (contoh: "Perbaikan: Memperbaiki syntax error pada event listener, mengatasi null reference di querySelector, dan menyempurnakan layout responsif").

==================================================
SPESIALISASI 3: MEMBUAT GAME 2D BROWSER (HTML5 CANVAS / DOM GAMES)
==================================================
Ketika pengguna meminta membuat game:
1. Game Loop & Fisika:
   - Gunakan <canvas id="gameCanvas"> atau DOM sprites dengan requestAnimationFrame.
   - Implementasikan collision detection, game state (Start/Menu, Playing, Paused, Game Over).
   - Sistem skor saat bermain dan High Score yang tersimpan di localStorage.
2. Kontrol Ganda (Desktop & HP):
   - Desktop: Keyboard (Panah, WASD, Space).
   - HP (Mobile Touch): WAJIB sediakan tombol virtual on-screen (Touch D-pad / tombol lompat / tap layar) agar game BISA DIMAINKAN DI HP secara responsif tanpa perlu keyboard fisik!
3. Efek Suara Bawaan (Web Audio API Synthesizer):
   - Buat fungsi sound synthesizer kecil menggunakan window.AudioContext tanpa perlu file audio mp3/wav eksternal.
   - Contoh nada sintetis singkat saat melompat (frequency ramp up), saat menabrak/gagal (noise/low tone), atau saat mencetak skor (chime frekuensi tinggi).
4. Contoh Game Populer:
   - Snake, Flappy Bird, Pong, Space Shooter, Brick Breaker, 2048, Memory Match Cards, Dino Runner, Tic-Tac-Toe, dsb.
   - Selalu berikan tombol "Main Lagi" / "Restart" yang responsif saat Game Over.

==================================================
STANDAR KUALITAS KODE
==================================================
1. index.html WAJIB ada untuk setiap project web/game agar Live Preview berfungsi.
2. Path file harus relatif (misal: "index.html", "style.css", "script.js").
3. Kode harus 100% lengkap tanpa placeholder seperti "// kode lainnya" atau "...".
4. Hubungan antar-file harus sinkron: id elemen di HTML harus sama persis dengan yang diakses di JavaScript.
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
  if (mode === "game") {
    modeInstruction = `
==================================================
MODE AKTIF: 🎮 GAME CREATOR MODE
==================================================
Fokus utama kamu adalah membuat 2D WEB GAME yang benar-benar bisa dimainkan.
- Buat canvas atau container game yang responsif.
- Sediakan kontrol Keyboard (WASD/Panah/Spasi) dan KONTROL SENTUH VIRTUAL DI LAYAR HP.
- Tambahkan Web Audio API synthesizer efek suara (lompat, koin, tabrakan, game over).
- Set type: "game" pada JSON output.
`;
  } else if (mode === "fix") {
    modeInstruction = `
==================================================
MODE AKTIF: 🛠️ CODE FIXER & DEBUGGER MODE
==================================================
Fokus utama kamu adalah mendiagnosis, menganalisis, dan MEMPERBAIKI KODINGAN YANG SALAH/ERROR.
- Teliti kode yang diberikan di bawah, temukan semua bug, syntax error, layout error, dan logic flaw.
- Perbaiki kodingan secara tuntas hingga berfungsi sempurna di browser.
- Pada field "description", jelaskan apa saja bug yang ditemukan dan bagaimana kamu memperbaikinya.
`;
  } else if (mode === "web") {
    modeInstruction = `
==================================================
MODE AKTIF: 🌐 MODERN WEB APP BUILDER MODE
==================================================
Fokus utama kamu adalah membuat website atau aplikasi web modern yang lengkap, interaktif, responsif, dan indah.
- Gunakan Tailwind CSS atau CSS modern dengan desain terkini.
- Pastikan semua interaksi tombol, form, filter, dan navigasi berfungsi nyata.
- Set type: "web" pada JSON output.
`;
  }

  const contextSection = codeContext.trim()
    ? `
==================================================
KODE SUMBER / CONTEXT DARI PENGGUNA
==================================================
${fileName ? `Nama file utama: ${fileName}\n` : ""}
${codeContext.trim()}

Gunakan kode di atas sebagai rujukan atau project yang harus diperbaiki/dikembangkan.
`
    : "";

  const userPrompt = `
${getLanguageInstruction(locale)}

${SYSTEM_PROMPT}

${modeInstruction}

${contextSection}

==================================================
PERMINTAAN PENGGUNA
==================================================
${cleanPrompt}

==================================================
INSTRUKSI FINAL
==================================================
Bangun project lengkap yang executable di browser.
Kembalikan HANYA SATU JSON VALID murni tanpa format markdown code fences.
`.trim();

  // Model fallback gratis (Gemini Flash free tier)
  const candidateModels = resolveModelCandidates(model);
  let lastError: unknown = null;

  for (const candidateModel of candidateModels) {
    try {
      console.log(`[AI Code] Trying model: ${candidateModel}`);

      const result = await ai.models.generateContent({
        model: candidateModel,
        contents: userPrompt,
        config: {
          httpOptions: {
            timeout: 120000,
          },
        },
      });

      const text = result.text?.trim() ?? "";

      if (text) {
        console.log(`[AI Code] Succeeded with model: ${candidateModel}`);
        return text;
      }

      lastError = new Error(`Model ${candidateModel} menghasilkan response kosong.`);
    } catch (error) {
      lastError = error;
      console.warn(`[AI Code] Model ${candidateModel} failed:`, error);

      if (isModelFallbackError(error)) {
        // Otomatis coba model gratis berikutnya jika kuota model saat ini habis
        continue;
      }

      throw error;
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