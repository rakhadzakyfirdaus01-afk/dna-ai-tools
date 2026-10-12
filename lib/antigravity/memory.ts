import fs from "fs/promises";
import path from "path";
import { SecurityGate } from "./security-gate";

export interface ProjectDecision {
  id: string;
  timestamp: number;
  topic: string;
  decision: string;
  rationale: string;
  filesAffected: string[];
}

export interface ProjectContextSummary {
  framework: string;
  keyDirectories: string[];
  recentDecisions: ProjectDecision[];
  knownIssues: string[];
}

export class ProjectMemory {
  private static memoryFilePath = path.resolve(
    SecurityGate.getWorkspaceRoot(),
    ".antigravity-memory.json"
  );

  private static inMemoryState: ProjectContextSummary = {
    framework: "Next.js 16 (App Router) + Tailwind CSS + Prisma",
    keyDirectories: [
      "app/(dashboard)/ai-assistant",
      "components/antigravity",
      "lib/antigravity",
      "prisma",
    ],
    recentDecisions: [],
    knownIssues: [],
  };

  public static async load(): Promise<ProjectContextSummary> {
    try {
      const raw = await fs.readFile(this.memoryFilePath, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        this.inMemoryState = {
          ...this.inMemoryState,
          ...parsed,
          recentDecisions: Array.isArray(parsed.recentDecisions) ? parsed.recentDecisions : [],
          knownIssues: Array.isArray(parsed.knownIssues) ? parsed.knownIssues : [],
        };
      }
    } catch {
      // Memory file belum ada atau format JSON korup, pertahankan inMemoryState default
    }
    return this.inMemoryState;
  }

  public static async saveDecision(decision: Omit<ProjectDecision, "id" | "timestamp">) {
    const record: ProjectDecision = {
      id: "dec-" + Date.now(),
      timestamp: Date.now(),
      ...decision,
    };
    this.inMemoryState.recentDecisions.unshift(record);
    if (this.inMemoryState.recentDecisions.length > 20) {
      this.inMemoryState.recentDecisions = this.inMemoryState.recentDecisions.slice(0, 20);
    }

    try {
      // Tulis atomik ke file sementara dulu lalu timpa
      const tempPath = this.memoryFilePath + ".tmp";
      await fs.writeFile(
        tempPath,
        JSON.stringify(this.inMemoryState, null, 2),
        "utf-8"
      );
      await fs.rename(tempPath, this.memoryFilePath);
    } catch (err) {
      console.warn("[ProjectMemory] Failed to write memory file:", err);
    }
  }

  public static getMemoryContextPrompt(): string {
    const decisions = this.inMemoryState.recentDecisions
      .slice(0, 5)
      .map((d) => `- [${d.topic}]: ${d.decision} (${d.rationale})`)
      .join("\n");

    return `
KONTEKS MEMORI PROYEK (ANTIGRAVITY WORKING MEMORY):
- Framework: ${this.inMemoryState.framework}
- Direktori Inti: ${this.inMemoryState.keyDirectories.join(", ")}
${decisions ? `\nKeputusan Teknis Terakhir:\n${decisions}` : ""}
`.trim();
  }
}
