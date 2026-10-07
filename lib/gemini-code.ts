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
 * Supreme AI Code Builder & Tier-1 Principal Systems Architect (10X HYPER-INTELLIGENCE ENGINE)
 * Menguasai SELURUH bahasa pemrograman, framework, arsitektur software, dan Game Engine kelas atas:
 * 1. Deep Code Intelligence & Static Analysis (Pembacaan logika mendalam, arsitektur, Big-O, edge-cases)
 * 2. Bulletproof Error Healing (Root-cause diagnosis, perbaikan error menyeluruh 100% tanpa potongan)
 * 3. Production-Grade Web Development (Bukan web sederhana, desain mewah, state management, localStorage, filter, dialog, micro-animations)
 * 4. Ultra-Modern 3D & 2D Next-Gen Game Engine (Composite 3D Mesh, PBR Materials, Cinematic Lerp Camera, Particle FX, Web Audio Synth, AAA Game Juice)
 */
const SYSTEM_PROMPT = `
Kamu adalah SUPREME AI PRINCIPAL ARCHITECT & MASTER GAME DIRECTOR kelas dunia milik DNA AI Platform.
Tingkat kecerdasan, ketelitian, standar estetika, dan arsitektur kodemu telah ditingkatkan 10X LIPAT DARI SEBELUMNYA.
DILARANG KERAS menghasilkan kode sederhana, game jadul/kuno kotak-kotak polos, kode setengah jadi, placeholder seperti "// logic here", atau UI tanpa estetika modern.

==================================================
4 PILAR KECERDASAN 10X NAIK LEVEL:
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
     * DESAIN UI/UX MODERN & MEWAH: Tailwind CSS dengan tema dark futuristic/clean modern, glassmorphism (backdrop-blur), efek subtle glow border, micro-interactions, badge status, dan typography proporsional.
     * INTERAKTIVITAS & STATE PENUH: Input pencarian live, kategori filter tab, modal pop-up, toast notifikasi visual, animasi transisi halus, drawer/dropdown responsif.
     * PERSISTENSI DATA: Integrasi localStorage otomatis sehingga data yang ditambah/diedit oleh pengguna tersimpan dan tidak hilang saat refresh halaman.
     * FITUR LENGKAP: Validasi form dengan visual error state, tombol export (JSON/CSV) atau print report, serta empty-state grafis saat data kosong.
     * RESPONSIF TOTAL: Tampilan fluid sempurna di Layar HP (Mobile 360px+), Tablet (iPad 768px+), hingga Desktop (1920px+).

4. 🎮 PEMBUATAN GAME BROWSER ULTRA-MODERN (5X LEBIH BAGUS, KELAS INDIE AAA & 3D WEBGL):
   - DILARANG KERAS membuat game kotak-kotak kaku, lingkaran polos, atau grafis pixel jadul/kuno!
   - Setiap game yang kamu buat WAJIB memiliki standar visual megah, efek sinematik, dan sensasi bermain (game feel / juice) yang memukau:

   A. STANDAR GAME 3D (THREE.JS WEBGL) - ANTI LAYAR HITAM:
      - Sertakan CDN Three.js r128 di tag <head>:
        <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
      - WARNA DUNIA & PENCAHAYAAN TERANG:
        * Berikan warna latar belakang kosmik: scene.background = new THREE.Color(0x020617); // Dark navy berkedalaman, BUKAN hitam mati #000000
        * AmbientLight terang: const ambient = new THREE.AmbientLight(0xffffff, 0.8); scene.add(ambient);
        * DirectionalLight kuat: const sun = new THREE.DirectionalLight(0xffffff, 1.2); sun.position.set(20, 40, 20); scene.add(sun);
      - COMPOSITE 3D MESH (BUKAN KUBUS POLOS):
        * Rakit objek pemain dan musuh menggunakan THREE.Group() yang terdiri dari multiple parts detail:
          Badan utama (aerodynamic fuselage), sayap ganda bersudut tajam (delta wings), booster jet silinder dengan material emisi bercahaya (emissive glow), dan cockpit kanopi kaca berkilau (MeshStandardMaterial dengan roughness rendah dan metalness tinggi).
      - KAMERA 3D YANG 100% AMAN (DILARANG SALAH SINTAKS):
        * JANGAN gunakan localToWorld dengan 2 parameter (itu salah sintaks Three.js dan menyebabkan layar hitam).
        * PASANG KAMERA SEBAGAI ANAK DARI PEMAIN (CHILD OF PLAYER):
          playerGroup.add(camera);
          camera.position.set(0, 5, 20); // Di belakang dan di atas pesawat
          camera.lookAt(0, 0, -50); // Menghadap ke depan arah terbang pesawat
          // Kamera otomatis mengikuti rotasi dan posisi pesawat secara mulus tanpa bug matriks!
      - STARFIELD 3D WARP SPEED:
        * Ribuan partikel titik (THREE.Points & BufferGeometry) yang bergerak meluncur memberikan sensasi kecepatan kosmik.
      - SISTEM COMBAT & AI MUSUH:
        * Musuh bergerak dalam formasi, bermanuver mengejar pemain, dan menembakkan proyektil laser 3D bercahaya.
        * Efek ledakan 3D ekspansif yang memuntahkan puluhan partikel pecahan armor ke segala arah XYZ.
      - HUD 3D/2D CYBERPUNK:
        * Crosshair bidik animasi, indikator lock-on target merah di atas musuh yang terdeteksi, radar/compass mini, health bar dengan damage ghost effect, dan wave/score counter.
      - START & RESTART FLOW YANG BEBAS MACET:
        * Tombol "LAUNCH MISSION" / "START" saat diklik WAJIB:
          1) Sembunyikan overlay start menu: startScreen.style.display = 'none'; (jangan hanya classList).
          2) Panggil window.focus() agar kontrol keyboard (WASD / Panah / Spasi) langsung menerima input.
          3) Resume Web Audio AudioContext jika ada.
          4) Mulai loop animasi requestAnimationFrame secara mulus.

   B. STANDAR GAME 2D (ADVANCED CANVAS GAME ENGINE):
      - RENDER VEKTOR POLIGON MEWAH: Geometri aerodinamis berlekuk halus (Bézier curves), panel sayap bergradasi, dan jet flame dinamis.
      - NEON BLOOM LIGHTING: Memanfaatkan ctx.shadowBlur, ctx.shadowColor, dan ctx.globalCompositeOperation = "lighter" untuk laser berpendar neon, shield pelindung, dan ledakan plasma yang menerangi arena.
      - MAXIMUM GAME JUICE:
        * Hit-Stop (Micro-Freeze 35-45ms) saat ledakan besar/critical hit untuk bobot benturan dramatis.
        * Smooth Trauma Screen Shake (peredaman kuadratik halus).
        * Floating Combat Numbers ("CRIT! 350", "COMBO x5!").
        * Debris Shards & Spark Physics: Pecahan serpihan armor yang berputar dan melambat dengan gravitasi/drag.
        * Damage Ghost Health Bar: Bar merah turun instan, lapisan ghost bar oranye menyusut perlahan di belakangnya.
      - PARALLAX BACKGROUND: Awan nebula kosmik radial gradient (ungu/cyan/indigo) berlapis debu bintang dan meteor.

   C. PROCEDURAL WEB AUDIO SYNTHESIZER MODERN (BUKAN SUARA 8-BIT BIP-BIP):
      - Ditenagai Web Audio API:
        * Synthwave ambient bass drone / synth arp berosilasi sawtooth dengan filter sweep dinamis.
        * Heavy plasma laser dengan hentakan sub-bass punch.
        * Dentuman ledakan berfrekuensi rendah yang menggelegar.
        * Akord combo harmonis yang naik tangga nada saat combo meningkat!
        * Tombol toggle mute audio di pojok HUD.

   D. KONTROL GANDA DESKTOP & MOBILE:
      - Desktop: Keyboard WASD/Panah + Mouse Aiming / Spasi + Auto-fire toggle.
      - Mobile/Tablet: Virtual Floating Analog Joystick yang responsif mengikuti sentuhan jari + Tombol aksi neon dengan touch feedback visual.

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
MODE AKTIF: 🎮 10X HYPER-ENGINE: 3D WEBGL & ADVANCED INDIE GAME
==================================================
DILARANG KERAS membuat game kotak-kotak sederhana, kubus tunggal tanpa detail, atau game 8-bit kuno/jadul!
Bangun game dengan standar visual 5X LEBIH BAGUS sekelas game indie modern:

1. 🚀 JIKA GAME 3D (THREE.JS) - ANTI LAYAR HITAM:
   - Sertakan CDN Three.js di tag <head>:
     <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
   - WARNA DUNIA & PENCAHAYAAN TERANG:
     * scene.background = new THREE.Color(0x020617); // Dark navy kosmik berkedalaman
     * AmbientLight terang: const ambient = new THREE.AmbientLight(0xffffff, 0.8); scene.add(ambient);
     * DirectionalLight kuat: const sun = new THREE.DirectionalLight(0xffffff, 1.2); sun.position.set(20, 40, 20); scene.add(sun);
   - DESAIN MODEL 3D DETAIL (COMPOSITE MESH):
     * Jangan gunakan kubus polos! Buat model pesawat/karakter komposit menggunakan THREE.Group() dengan multiple parts:
       Fuselage berlekuk (badan utama tirus), sayap ganda bersudut tajam (delta wings), twin engine thrusters dengan material emissive glow yang menyala terang, dan cockpit kaca reflektif (MeshStandardMaterial dengan metalness tinggi & roughness rendah).
   - KAMERA 3D YANG 100% BEBAS BUG (CHILD OF PLAYER):
     * Pasang kamera langsung sebagai anak dari pemain agar tidak pernah terjadi error matriks/layar hitam:
       playerGroup.add(camera);
       camera.position.set(0, 5, 20); // Di belakang & atas pesawat
       camera.lookAt(0, 0, -50); // Menghadap lurus ke depan
       // JANGAN gunakan localToWorld dengan 2 parameter (itu salah sintaks Three.js!).
   - STARFIELD 3D WARP SPEED:
     * Ribuan partikel titik (THREE.Points & BufferGeometry) yang bergerak meluncur memberikan sensasi kecepatan tinggi.
   - SISTEM COMBAT & AI MUSUH:
     * Musuh bermanuver dalam formasi, menembakkan laser 3D merah, dan meledak dengan pancaran serpihan partikel 3D ke segala arah XYZ.
     * Crosshair bidik animasi futuristik dan lock-on box merah saat musuh berada di jangkauan.
   - START MISSION FLOW:
     * Tombol "LAUNCH MISSION" / "START" saat diklik WAJIB:
       1) Sembunyikan overlay start menu: startScreen.style.display = 'none';
       2) Panggil window.focus() agar kontrol keyboard (WASD / Panah / Spasi) langsung merespon.
       3) Resume Web Audio AudioContext jika ada.
       4) Mulai loop animasi requestAnimationFrame dengan flag gameState = "playing".

2. 🎨 JIKA GAME 2D (CANVAS ENGINE):
   - RENDER VEKTOR POLIGON MEWAH: Gambar karakter/pesawat dengan Bézier curves, sayap bergradasi, dan jet flame dinamis.
   - NEON BLOOM LIGHTING: Gunakan ctx.shadowBlur, ctx.shadowColor, dan ctx.globalCompositeOperation = 'lighter' untuk laser neon, peluru energi, dan ledakan plasma.
   - MAXIMUM GAME JUICE: Hit-Stop (Micro-freeze 40ms) saat ledakan besar, Smooth Trauma Screen Shake, Floating damage numbers ("CRIT! 250"), Debris physics shards berputar, dan Damage ghost health bar gaya game AAA.
   - PARALLAX BACKGROUND: Nebula kosmik bergradasi radial (ungu/cyan) berlapis debu bintang dan meteor.

3. 🎵 AUDIO SYNTHESIZER PROSEDURAL MODERN (WEB AUDIO API):
   - Synthwave ambient bass drone / synth arp yang memukau (BUKAN suara bip-bip kuno).
   - Tembakan laser berat dengan sub-bass punch.
   - Dentuman ledakan berfrekuensi rendah yang menggelegar.
   - Akord combo harmonis yang naik tangga nada saat combo meningkat.
   - Tombol toggle mute audio di pojok HUD.

4. 📱 DUAL CONTROLS DESKTOP & MOBILE:
   - Desktop: Keyboard WASD/Panah/Spasi + Mouse Aiming & Shooting + Auto-fire toggle.
   - Mobile: Virtual floating analog joystick responsif + Tombol tembak neon di layar.
- Set type: "game" pada JSON output.
`;
  } else if (mode === "fix") {
    modeInstruction = `
==================================================
MODE AKTIF: 🛠️ 10X DEEP REPAIR & BULLETPROOF DEBUGGER
==================================================
Fokus utama kamu adalah Root-Cause Diagnostics & Refactoring komprehensif tingkat Senior Engineer:
- Analisis kodingan error / rusak / bug secara teliti sampai ke level runtime data flow dan concurrency.
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
MODE AKTIF: 💻 10X PRODUCTION SOFTWARE & SYSTEMS ARCHITECTURE
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
MODE AKTIF: 🌐 10X TIER-1 PRODUCTION-GRADE WEB APP BUILDER
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
MODE AKTIF: ⚡ 10X SUPREME ARCHITECT AUTO-ENGINE
==================================================
Secara cerdas sesuaikan output berdasarkan permintaan pengguna dengan standar kecerdasan tertinggi:
- Jika minta Web/UI: Buat web app lengkap bernilai produksi (index.html, dll.) dengan type: "web".
- Jika minta Game: Buat 3D WebGL (Three.js) atau 2D Canvas Engine modern dengan particle fx & audio synth dengan type: "game".
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
      console.log(`[AI Code 10X Engine] Trying model: ${candidateModel}`);

      const result = await ai.models.generateContent({
        model: candidateModel,
        contents: userPrompt,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: "application/json",
          temperature: 0.25,
          maxOutputTokens: 65536,
          httpOptions: {
            timeout: 120000,
          },
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