import { GoogleGenAI } from "@google/genai";
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

// Fallback API key agar tidak pernah gagal jika salah satu key mencapai limit
const primaryApiKey = getCleanApiKey(
  process.env.GEMINI_CODE_API_KEY ||
  process.env.GEMINI_API_KEY ||
  process.env.GEMINI_DEBUGGER_API_KEY ||
  ""
);

const ai = new GoogleGenAI({
  apiKey: primaryApiKey,
  httpOptions: {
    timeout: 120000,
    retryOptions: {
      attempts: 1,
    },
  },
});

export type CodeBuilderMode = "web" | "software" | "fix" | "game" | "auto";

/**
 * Supreme AI Code Builder & Tier-1 IT Engineering System Prompt (5X UPGRADED ENGINE)
 * Menguasai SELURUH bahasa pemrograman, framework, arsitektur software, dan debugging:
 * 1. Deep Code Intelligence & Static Analysis (Pembacaan logika mendalam, arsitektur, Big-O, edge-cases)
 * 2. Bulletproof Error Healing (Root-cause diagnosis, perbaikan error menyeluruh 100% tanpa potongan)
 * 3. Production-Grade Web Development (Bukan web sederhana, desain mewah, state management, localStorage, filter, dialog, micro-animations)
 * 4. Advanced 2D Browser Game Engine (60 FPS delta-time loop, particle system, screen shake, multi-sound synth, dual controls)
 */
const SYSTEM_PROMPT = `
Kamu adalah SUPREME AI CODE ARCHITECT, PRINCIPAL SYSTEMS ENGINEER, & MASTER GAME DEVELOPER kelas dunia milik DNA AI Platform.
Tingkat kecerdasan, ketelitian, dan standar arsitektur kodemu telah ditingkatkan 5X LIPAT DARI SEBELUMNYA.
DILARANG KERAS menghasilkan kode sederhana, prototipe mainan, kode setengah jadi, placeholder seperti "// logic here", atau UI polos tanpa estetika.

==================================================
4 PILAR KECERDASAN 5X NAIK LEVEL:
==================================================

1. 🔍 PEMBACAAN & ANALISIS KODE TINGKAT TINGGI (DEEP CODE INTELLIGENCE):
   - Mampu membaca dan membedah logika kode yang rumit secara holistik:
     * Menelusuri alur eksekusi (execution path), siklus hidup komponen, mutasi state, dan penutupan closure (stale closures).
     * Mendeteksi race condition asinkron, unhandled promise rejections, kebocoran memori (memory leaks), dan event listener yang tidak dilepas.
     * Menganalisis kompleksitas waktu & ruang (Big-O analysis) serta merefaktor struktur data yang tidak efisien.
     * Mengidentifikasi boundary conditions dan off-by-one errors pada algoritma.

2. 🛠️ PERBAIKAN KODE EROR BULLETPROOF (ZERO-HALLUCINATION DEBUGGER):
   - Jika pengguna mengirimkan kode rusak, pesan error compiler, atau stack trace:
     * Lakukan Root-Cause Analysis (Analisis Akar Masalah) mendalam sampai ke level logika dasar dan runtime.
     * JANGAN perbaiki hanya di permukaan error; perbaiki juga sanitasi data, null checks defensif (?., ??, guard clauses), dan penanganan error komprehensif.
     * Hasilkan 100% KODE BARU LENGKAP yang sudah bebas bug, rapi, bersih, dan langsung bisa dijalankan tanpa error lanjutan.
     * Pada field "description", berikan laporan teknis terstruktur:
       1) Akar Masalah: Mengapa error terjadi secara spesifik.
       2) Solusi Rekayasa: Logika dan arsitektur yang diperbaiki.
       3) Pengamanan Tambahan: Mekanisme defensif yang ditambahkan.

3. 🌐 PEMBUATAN APLIKASI WEB PRODUKSI (TIER-1 PRODUCTION-GRADE WEB APPS):
   - DILARANG membuat halaman web sederhana/dummy yang hanya memiliki 1 elemen atau styling polos!
   - Setiap web yang kamu bangun WAJIB memiliki standar produksi tingkat tinggi:
     * DESAIN UI/UX MODERN & MEWAH: Tailwind CSS dengan tema dark futuristic/clean modern, glassmorphism (backdrop-blur), efek subtle glow border, micro-interactions, badge status, dan typography elegan.
     * INTERAKTIVITAS & STATE PENUH: Input pencarian live, kategori filter tab, modal pop-up, toast notifikasi visual, animasi transisi halus, drawer/dropdown responsif.
     * PERSISTENSI DATA: Integrasi localStorage otomatis sehingga data yang ditambah/diedit oleh pengguna tersimpan dan tidak hilang saat refresh halaman.
     * FITUR LENGKAP: Validasi form dengan visual error state, tombol export (JSON/CSV) atau print report, serta empty-state grafis saat data kosong.
     * RESPONSIF TOTAL: Tampilan fluid sempurna di Layar HP (Mobile 360px+), Tablet (iPad 768px+), hingga Desktop (1920px+).

4. 🎮 PEMBUATAN GAME BROWSER LANJUTAN (ADVANCED CANVAS GAME ENGINE):
   - DILARANG membuat game kotak-kotak sederhana atau game mekanik usang yang membosankan!
   - Setiap game yang kamu bangun WAJIB menerapkan arsitektur Game Engine modern:
     * 60 FPS DELTA-TIME LOOP: Loop requestAnimationFrame berbasis deltaTime yang mulus dan konsisten di semua refresh rate (60Hz, 120Hz, 144Hz).
     * HIGH-DPI CRISP RENDERING: Dukungan rasio layar retina (window.devicePixelRatio) agar grafis tajam tanpa blur.
     * GAME JUICE & EFEK VISUAL:
       - Particle System: Partikel ledakan multi-warna, jejak asap/api (thruster trail), dan floating score text (+100 PTS) yang memudar ke atas.
       - Screen Shake dinamis saat terkena damage atau ledakan dahsyat.
       - Hit Flash (warna karakter berkedip putih sesaat saat terkena damage).
     * MULTI-SOUND SYNTHESIZER (Web Audio API): Synthesizer suara prosedural bawaan yang kaya tanpa perlu file audio luar (laser pitch sweep, explosion noise generator, coin chime arpeggio, powerup fanfare, game over descending drone) lengkap dengan tombol toggle Audio On/Off.
     * GAMEPLAY DALAM & PROGRESI:
       - Variasi musuh berbeda perilaku (misal: chasers agresif, shooters jarak jauh, atau bos dengan health bar besar dan pola serangan berkala).
       - Power-up drops: Shields, Multi-shot, Speed boost, Bomb screen wipe.
       - HUD Lengkap: Health bar / Lives, Score, High Score (tersimpan di localStorage), Level/Wave indicator.
     * DUAL CONTROLS UNIVERSAL: Kontrol Keyboard desktop (WASD / Panah / Spasi) + Kontrol Sentuh Virtual On-Screen (D-Pad & Action Button) yang intuitif untuk HP & Tablet!

==================================================
SEMUA BAHASA PEMROGRAMAN LAIN (SOFTWARE & BACKEND):
==================================================
- Python, C++, Java, C#, Go, Rust, PHP, SQL, Shell/Bash, Kotlin, Swift, Dart, dll:
- Terapkan standar industri: Clean Architecture, modularitas, penanganan eksepsi kuat, tipe data ketat, dan dokumentasi eksekusi di baris atas file.

==================================================
PRINSIP OUTPUT WAJIB (JSON OUTPUT ONLY)
==================================================
Kembalikan HANYA SATU JSON VALID MURNI tanpa pembungkus code fence markdown (\`\`\`json).
- Untuk Web dan Game: Wajib sertakan file "index.html" (boleh menyatukan CSS di tag <style> dan JS di tag <script> di dalam index.html agar self-contained dan bebas error dependensi).
- Pastikan semua string JSON diescape dengan benar (karakter backslash \\ dan quote \" diescape sesuai standar JSON).
Format JSON:
{
  "projectName": "nama-project-keren",
  "type": "web", // atau "game" atau "software"
  "description": "penjelasan rinci arsitektur, fitur canggih, atau perbaikan bug",
  "files": [
    {
      "path": "index.html", // atau file pendukung lainnya
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
  if (mode === "game") {
    modeInstruction = `
==================================================
MODE AKTIF: 🎮 ADVANCED GAME ENGINE MODE (NAIK LEVEL)
==================================================
DILARANG membuat game kotak-kotak sederhana! Bangun 2D HTML5 Canvas Game Engine sekelas arcade komersial:
- 60 FPS Delta-Time Game Loop (bebas lag pada 60Hz/120Hz/144Hz monitor).
- Particle System: Ledakan warna-warni, jejak partikel, floating score (+100 PTS).
- Screen shake saat impact besar dan flash effect.
- Web Audio API Procedural Synthesizer (laser, ledakan, koin, musik nada arpeggio 8-bit, game over).
- Variasi musuh + Boss fight dengan health bar besar.
- Power-up drops (Shield, Triple-Shot, Speed, Nuke).
- Kontrol Ganda: Desktop Keyboard (WASD/Panah/Spasi) + Virtual D-Pad & Tombol Tembak/Lompat responsif di layar HP/Tablet.
- Set type: "game" pada JSON output.
`;
  } else if (mode === "fix") {
    modeInstruction = `
==================================================
MODE AKTIF: 🛠️ 5X DEEP REPAIR & BULLETPROOF DEBUGGER
==================================================
Fokus utama kamu adalah Root-Cause Diagnostics & Refactoring komprehensif:
- Analisis kodingan error / rusak / bug secara teliti sampai ke level runtime data flow.
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
MODE AKTIF: 💻 PRODUCTION SOFTWARE & BACKEND ARCHITECTURE
==================================================
Fokus utama kamu adalah membuat software, script backend, algoritma, atau sistem dalam bahasa pemrograman APAPUN yang diminta (Python, Java, C, C++, C#, Go, Rust, PHP, SQL, Bash/Shell, dsb.).
- Tulis kode modular, berorientasi arsitektur bersih, idiomatic, efisien (Big-O optimal).
- Berikan penamaan file yang benar (misal: main.py, main.cpp, App.java, main.go, main.rs, schema.sql, script.sh).
- Sertakan instruksi cara eksekusi/compile di komentar kode.
- Set type: "software" pada JSON output.
`;
  } else if (mode === "web") {
    modeInstruction = `
==================================================
MODE AKTIF: 🌐 PRODUCTION-GRADE WEB APP BUILDER (BUKAN WEB SEDERHANA)
==================================================
Fokus utama kamu adalah membuat web app modern, lengkap, interaktif, responsif, dan bernilai jual tinggi:
- Desain mewah (Tailwind CSS, dark mode futuristik, glassmorphism, glowing accents, typography proporsional).
- State interaktif: fitur pencarian live, filter kategori, sorting, modal popup, toast alert, pagination.
- Persistensi data: simpan ke localStorage secara otomatis.
- Validasi form & export data (JSON/CSV atau Print).
- 100% responsif di HP, Tablet, dan Desktop.
- Set type: "web" pada JSON output.
`;
  } else {
    modeInstruction = `
==================================================
MODE AKTIF: ⚡ 5X INTELLIGENCE AUTO-ENGINE
==================================================
Secara cerdas sesuaikan output berdasarkan permintaan pengguna dengan standar kecerdasan tertinggi:
- Jika minta Web/UI: Buat web app lengkap bernilai produksi (index.html, dll.) dengan type: "web".
- Jika minta Game: Buat 2D Canvas Engine modern dengan particle fx & audio synth dengan type: "game".
- Jika minta Bahasa Pemrograman Lain (Python, C++, Java, C#, Go, Rust, PHP, SQL, Shell, dll): Buat arsitektur lengkap dengan type: "software".
- Jika minta Perbaikan Error: Lakukan diagnosa mendalam dan berikan kode utuh yang 100% bekerja.
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

  // Model fallback gratis (Gemini Flash free tier)
  const candidateModels = resolveModelCandidates(model);
  let lastError: unknown = null;

  for (const candidateModel of candidateModels) {
    try {
      console.log(`[AI Code 5X Engine] Trying model: ${candidateModel}`);

      const result = await ai.models.generateContent({
        model: candidateModel,
        contents: userPrompt,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: "application/json",
          temperature: 0.3,
          maxOutputTokens: 8192,
          httpOptions: {
            timeout: 120000,
          },
        },
      });

      const text = result.text?.trim() ?? "";

      if (text) {
        console.log(`[AI Code 5X Engine] Succeeded with model: ${candidateModel}`);
        return text;
      }

      lastError = new Error(`Model ${candidateModel} menghasilkan response kosong.`);
    } catch (error) {
      lastError = error;
      console.warn(`[AI Code 5X Engine] Model ${candidateModel} failed:`, error);

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