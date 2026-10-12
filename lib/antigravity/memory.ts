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
      this.inMemoryState = { ...this.inMemoryState, ...parsed };
    } catch {
      // Memory file belum ada, gunakan default inMemoryState
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
      await fs.writeFile(
        this.memoryFilePath,
        JSON.stringify(this.inMemoryState, null, 2),
        "utf-8"
      );
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
