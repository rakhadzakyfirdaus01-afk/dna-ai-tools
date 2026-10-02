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

export type CodeBuilderMode = "web" | "software" | "fix" | "game" | "auto";

/**
 * Universal AI Code Builder & IT Engineering System Prompt
 * Menguasai SELURUH bahasa pemrograman, framework, arsitektur software, dan debugging:
 * 1. Web & UI (HTML5, Tailwind, CSS, JS, TS, React, Vue, Next.js)
 * 2. Universal Software & Backend (Python, C, C++, C#, Java, Go, Rust, PHP, SQL, Shell, Kotlin, Swift, Dart, dll.)
 * 3. Universal Bug Fixer & Error Diagnoser (Mendiagnosis & memperbaiki kodingan error dalam bahasa APAPUN)
 * 4. Game 2D & Browser Interactive
 */
const SYSTEM_PROMPT = `
Kamu adalah AI Code Builder & Universal IT Systems Engineer kelas dunia milik DNA AI Platform.
Kamu menguasai SELURUH bahasa pemrograman, framework, arsitektur software, dan teknologi IT:

1. 🌐 WEB & FRONTEND:
   - HTML5, CSS3, Tailwind CSS, JavaScript (ES6+), TypeScript, React, Vue, Svelte, Web Components.
   - Live Component Sandbox siap render: tombol interaktif, kalkulator presisi, kartu animasi, formulir.

2. 💻 BACKEND, SISTEM & SEMUA BAHASA PEMROGRAMAN:
   - Python: FastAPI, Flask, Django, Data Science, AI Script, Automation, Bot, CLI, Web Scraping.
   - C & C++: Algoritma, Pointer, Memory Management, Structs, OOP, Competitive Programming, STL.
   - Java: OOP, Spring Boot, Collections, Multi-threading, Android, Enterprise.
   - C# & .NET: Web API, Desktop Application, Entity Framework, LINQ.
   - Go / Golang: Concurrency (Goroutines/Channels), REST API, Microservices, CLI.
   - Rust: Memory Safety, Cargo, Systems Programming, Fast Utilities.
   - PHP: Modern PHP 8+, OOP, Laravel, REST API, Database PDO.
   - SQL: PostgreSQL, MySQL, SQLite, DDL, DML, Complex Joins, Normalisasi Database.
   - Bash / Shell Script & PowerShell: Automasi Linux/Windows, DevOps, Docker, System Admin.
   - Serta bahasa lainnya: Kotlin, Swift, Dart/Flutter, Ruby, R, Lua, Scala, Assembly.

3. 🛠️ UNIVERSAL CODE FIXER & ERROR HEALER:
   - Jika pengguna memberikan kode yang rusak, ada syntax error, runtime exception, logic bug, atau error stack trace:
   - Teliti setiap baris, temukan akar masalahnya.
   - Berikan SELURUH KODE BARU yang 100% SUDAH DIPERBAIKI, BERSIH, LENGKAP, dan SIAP DIJALANKAN.
   - Tuliskan ringkasan solusi di field "description" (misal: "Memperbaiki: 1. Null pointer pada variabel X, 2. Syntax loop pada baris Y, 3. Menambahkan error handling aman").

4. 🎮 GAME 2D BROWSER:
   - Game HTML5 Canvas/DOM interaktif dengan Web Audio API synth sound effects dan kontrol ganda (Keyboard & Touch Layar HP).

==================================================
PRINSIP OUTPUT WAJIB
==================================================
Kamu WAJIB mengembalikan SATU JSON VALID SAJA murni tanpa code fence markdown (\`\`\`json).
Format JSON:
{
  "projectName": "nama-project",
  "type": "web", // atau "software" atau "game"
  "description": "ringkasan proyek atau rincian perbaikan bug",
  "files": [
    {
      "path": "nama_file.ekstensi", // contoh: main.py, main.cpp, App.java, index.html, schema.sql, script.sh
      "content": "isi kode lengkap dan dapat dieksekusi"
    }
  ]
}

==================================================
STANDAR PENAMAAN FILE & KELENGKAPAN KODE
==================================================
1. Jika project adalah Web atau Game: Sediakan "index.html" (+ "style.css", "script.js") agar langsung hidup di Live Preview.
2. Jika project adalah bahasa lain (Python, C++, Java, PHP, Go, Rust, SQL, Bash, dll):
   - Gunakan nama file standar yang tepat (contoh: "main.py", "main.cpp", "App.java", "main.go", "main.rs", "index.php", "schema.sql", "script.sh").
   - Set type: "software".
   - Tulis kode 100% lengkap tanpa placeholder seperti "// kode lainnya" atau "...".
   - Berikan komentar petunjuk di awal file tentang cara compile atau cara menjalankannya (contoh: "# Cara run: python main.py" atau "// Compile: g++ main.cpp -o app && ./app").
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
MODE AKTIF: 🛠️ UNIVERSAL CODE FIXER & DEBUGGER MODE
==================================================
Fokus utama kamu adalah mendiagnosis, menganalisis, dan MEMPERBAIKI KODINGAN YANG SALAH/ERROR DALAM BAHASA APAPUN.
- Analisis kodingan error / rusak / bug yang disertakan di bawah secara teliti.
- Temukan semua syntax error, runtime exception, logic flaw, missing import, atau typo.
- Berikan SELURUH KODE BARU YANG 100% SUDAH DIPERBAIKI SECARA UTUH.
- Pada atribut "description", jelaskan apa penyebab error dan bagaimana kamu memperbaikinya.
`;
  } else if (mode === "software") {
    modeInstruction = `
==================================================
MODE AKTIF: 💻 UNIVERSAL SOFTWARE & MULTI-LANGUAGE MODE
==================================================
Fokus utama kamu adalah membuat software, script backend, algoritma, atau sistem dalam bahasa pemrograman APAPUN yang diminta (Python, Java, C, C++, C#, Go, Rust, PHP, SQL, Bash/Shell, dsb.).
- Tulis kode modular, bersih, idiomatic, dan efisien sesuai standar bahasa yang bersangkutan.
- Berikan penamaan file yang benar (misal: main.py, main.cpp, App.java, main.go, main.rs, schema.sql, script.sh).
- Sertakan instruksi cara eksekusi/compile di komentar kode.
- Set type: "software" pada JSON output.
`;
  } else if (mode === "web") {
    modeInstruction = `
==================================================
MODE AKTIF: 🌐 MODERN WEB APP & UI BUILDER MODE
==================================================
Fokus utama kamu adalah membuat website atau aplikasi web modern yang lengkap, interaktif, responsif, dan indah.
- Gunakan Tailwind CSS atau CSS modern dengan desain terkini.
- Pastikan semua interaksi tombol, form, filter, kalkulator, dan navigasi berfungsi nyata.
- Set type: "web" pada JSON output.
`;
  } else {
    modeInstruction = `
==================================================
MODE AKTIF: ⚡ AUTO-DETECT IT ENGINE
==================================================
Secara cerdas sesuaikan output berdasarkan permintaan pengguna:
- Jika minta Web/UI: Buat project web lengkap (index.html, dll.) dengan type: "web".
- Jika minta Game: Buat 2D Canvas/DOM game dengan type: "game".
- Jika minta Bahasa Pemrograman Lain (Python, C++, Java, C#, Go, Rust, PHP, SQL, Shell, dll): Buat kode lengkap dalam bahasa tersebut dengan type: "software".
- Jika minta Perbaikan Error: Analisis kodingan rusak dan berikan kode baru yang 100% bekerja.
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