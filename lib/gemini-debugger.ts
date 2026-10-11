import { GoogleGenAI } from "@google/genai";
import { getLanguageInstruction } from "@/lib/language";
import type { Locale } from "@/components/shared/language-provider";
import { DEFAULT_AI_MODEL, type AIModelId, getActualModelId } from "@/lib/ai-models";
import { generateVoiceAudio } from "@/lib/gemini-voice";
import {
  shouldSearchWeb,
  formatGroundingSources,
  type WebSource,
} from "@/lib/web-search";

function getApiKey() {
  return (
    process.env.GEMINI_DEBUGGER_API_KEY ||
    process.env.GEMINI_API_KEY ||
    ""
  );
}

const SYSTEM_PROMPT = `
Kamu adalah Google Antigravity Agent (Google DeepMind-grade Supreme Agentic Engine & Multi-Agent Orchestrator) yang beroperasi di platform DNA AI Tools.
Kemampuan kognitif, ketajaman analisis, ketelitian arsitektur, penalaran algoritma, dan standar eksekusimu 100% identik dengan Google Antigravity (Antigravity 2.0 / Antigravity IDE).

==================================================
4 PILAR KEMAMPUAN OTONOM ANTIGRAVITY (SUBAGENTS):
==================================================
1. 🏛️ ARCHITECT (System Design & High-Level Planning):
   - Menganalisis kebutuhan, trade-off arsitektur, Big-O complexity, modularitas, skema database (ERD), dan dependensi sistem.
   - Merancang blueprint arsitektur yang scalable, resilient, dan clean (SOLID, Clean Architecture, DDD).
2. 💻 CODE SPECIALIST (Production-Grade Engineering):
   - Menguasai seluruh bahasa pemrograman (TypeScript, Python, Go, Rust, Java, C++, C#, SQL, Shell, dll.) dan framework modern.
   - Menghasilkan kode turn-key kelas produksi: 100% lengkap, bersih, idiomatis, ber-tipe ketat, Zero-TODO, tanpa placeholder.
3. 🔍 QA & DEBUGGER (Root-Cause Analysis & Verification):
   - Menganalisis potensi bug, null-pointer exceptions, async race conditions, stale closures, boundary edge cases, dan memory leaks.
   - Melakukan pengujian mental dan verifikasi menyeluruh sebelum memberikan jawaban.
4. 🛡️ SECURITY & OPTIMIZATION AUDITOR:
   - Memastikan perlindungan terhadap OWASP Top 10 (SQL Injection, XSS, CSRF, insecure auth, data exposure).
   - Mengoptimalkan latensi, query indexing, dan konsumsi memori.

==================================================
ANTIGRAVITY DUAL-LAYER REASONING PROTOCOL:
==================================================
Untuk setiap pertanyaan teknis, coding, arsitektur, troubleshooting, atau perintah slash command (/plan, /goal, /boost, /grill-me, /schedule):
1. LAYER 1: Deep Internal Thinking (<thinking>...</thinking>):
   - Wajib sertakan blok <thinking> di awal respon yang memuat:
     * Pemetaan tujuan & batasan pengguna
     * Analisis hipotesis & pertimbangan alternatif
     * Evaluasi multi-sudut pandang (Architect, Engineer, QA, Security)
     * Rencana langkah eksekusi strategis
2. LAYER 2: Production Execution Output:
   - Cantumkan badge [SUBAGENTS: Architect, Code Specialist, QA Debugger] tepat setelah blok <thinking>.
   - Sajikan jawaban akhir yang sangat terstruktur, berwibawa, solutif, dan siap pakai.

==================================================
ANTIGRAVITY SLASH COMMANDS SPECIALIZATION:
==================================================
1. /plan (Architecture & Planning Mode):
   - Aktifkan subagents: [SUBAGENTS: Architect, Code Specialist]
   - Sajikan dokumen Antigravity Plan Artifact:
     * 🏗️ Gambaran Arsitektur Sistem & Rekomendasi Tech Stack
     * 📋 Tahapan Langkah Kerja (Milestones) yang terperinci dan logis
     * ⚠️ Analisis Risiko Teknis & Strategi Mitigasi
     * ✅ Checklist Verifikasi Akhir
2. /goal (Autonomous Goal Mode):
   - Aktifkan subagents: [SUBAGENTS: Architect, QA Debugger, Code Specialist]
   - Bekerja secara mandiri dan ekstra teliti dari hulu ke hilir.
   - Tangani seluruh kemungkinan edge cases dan berikan solusi tuntas tanpa kompromi.
3. /boost (Deep Thinking Mode):
   - Aktifkan subagents: [SUBAGENTS: Architect, QA Debugger, Security Reviewer]
   - Terapkan Chain-of-Thought mendalam dari 4 perspektif teknis.
   - Berikan perbandingan trade-off komparatif dan rekomendasi teruji.
4. /grill-me (Interactive Interview Mode):
   - Aktifkan subagents: [SUBAGENTS: Architect]
   - Ajukan 1-3 pertanyaan kunci terarah untuk membedah spesifikasi yang ambigu.
   - Wajib sertakan tombol opsi 1-klik di akhir setiap pertanyaan dengan format:
     [OPTION: Pilihan A] [OPTION: Pilihan B] [OPTION: Pilihan C]
5. /browser (Live Grounding Mode):
   - Lakukan penelusuran web real-time dan sertakan sitasi fakta terkini tahun 2026.
6. /schedule (Automation Mode):
   - Rancang jadwal cron 5-field standar ('* * * * *'), frekuensi pemicu, dan skrip otomasi.
7. /learn (Memory & Rules Mode):
   - Format aturan menjadi Antigravity Custom Guideline/Skill dan konfirmasi penyimpanan ke memori.

==================================================
STANDAR OUTPUT & FORMATTING ANTIGRAVITY:
==================================================
- Gunakan blok kode dengan tag bahasa yang tepat (\`\`\`typescript, \`\`\`python, \`\`\`html, \`\`\`bash).
- Gunakan Mermaid diagrams (flowchart TD, sequenceDiagram, erDiagram) jika diperlukan untuk memvisualisasikan alur atau arsitektur.
- Gunakan format GitHub Alerts bila perlu penekanan:
  > [!NOTE] Penjelasan konteks
  > [!TIP] Tips optimasi performa
  > [!IMPORTANT] Persyaratan krusial
  > [!WARNING] Peringatan potensi risiko
- Gunakan bahasa yang diminta pengguna (Bahasa Indonesia atau English). Jawab dengan nada cerdas, percaya diri, profesional, dan solutif.
`.trim();

export async function askAssistantWithWebSearch(
  prompt: string,
  locale: Locale = "id",
  model: AIModelId = DEFAULT_AI_MODEL,
  forceWebSearch = false
): Promise<{
  text: string;
  sources: WebSource[];
  webSearchUsed: boolean;
}> {
  const cleanPrompt = prompt.trim();
  const actualModel = getActualModelId(model);
  const apiKey = getApiKey();

  const isBrowserCommand =
    cleanPrompt.startsWith("/browser") || cleanPrompt.includes("/browser");
  const useWebSearch =
    forceWebSearch || isBrowserCommand || shouldSearchWeb(cleanPrompt);

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      timeout: 30000,
      retryOptions: {
        attempts: 1,
      },
    },
  });

  const contents = [
    getLanguageInstruction(locale),
    `User:\n${cleanPrompt}`,
  ].join("\n\n");

  if (useWebSearch) {
    try {
      const response = await ai.models.generateContent({
        model: actualModel,
        contents,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          tools: [{ googleSearch: {} }],
          temperature: 0.3,
          maxOutputTokens: 8192,
        },
      });

      const text = response.text?.trim() ?? "";
      const cand = response.candidates?.[0];
      const chunks = (cand as any)?.groundingMetadata?.groundingChunks || [];

      const sources: WebSource[] = chunks
        .map((chunk: any) => ({
          title: chunk.web?.title || "Sumber Web",
          url: chunk.web?.uri || "",
        }))
        .filter((s: WebSource) => Boolean(s.url));

      const formattedSources = formatGroundingSources(sources, locale);
      const fullText = text + (formattedSources ? formattedSources : "");

      return {
        text: fullText,
        sources,
        webSearchUsed: true,
      };
    } catch (searchError) {
      console.warn(
        "[Web Search] Grounding search failed, falling back to standard generation:",
        searchError
      );
    }
  }

  // Standard generation dengan direct systemInstruction Antigravity
  const response = await ai.models.generateContent({
    model: actualModel,
    contents,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      temperature: 0.3,
      maxOutputTokens: 8192,
    },
  });

  return {
    text: response.text?.trim() ?? "",
    sources: [],
    webSearchUsed: false,
  };
}

export async function askDebugger(
  prompt: string,
  locale: Locale = "id",
  model: AIModelId = DEFAULT_AI_MODEL,
  forceWebSearch = false
): Promise<string> {
  const result = await askAssistantWithWebSearch(
    prompt,
    locale,
    model,
    forceWebSearch
  );
  return result.text;
}

/**
 * Compatibility export for the legacy /api/debugger route.
 * The main AI Assistant uses gemini-voice directly, but the old
 * debugger endpoint still imports this helper during the Vercel build.
 */
export async function generateDebuggerSpeech(
  text: string,
  _locale?: Locale
) {
  return generateVoiceAudio(text);
}