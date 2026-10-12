import fs from "fs/promises";
import path from "path";
import { SecurityGate } from "./security-gate";

export interface CodeSymbol {
  name: string;
  kind: "function" | "class" | "interface" | "type" | "const" | "export";
  file: string;
  line: number;
}

export interface CodebaseAnalysisResult {
  structure: {
    totalFiles: number;
    directories: string[];
    entryPoints: string[];
    configFiles: string[];
    apiRoutes: string[];
  };
  symbols: CodeSymbol[];
  dependencies: Record<string, string[]>;
  summaryText: string;
}

export class CodebaseIntelligence {
  private static workspaceRoot = SecurityGate.getWorkspaceRoot();
  private static ignoreDirs = new Set([
    "node_modules",
    ".git",
    ".next",
    ".vercel",
    ".antigravity-tasks",
    "dist",
    "build",
    "android",
  ]);

  public static async analyzeWorkspace(): Promise<CodebaseAnalysisResult> {
    const directories: string[] = [];
    const entryPoints: string[] = [];
    const configFiles: string[] = [];
    const apiRoutes: string[] = [];
    const symbols: CodeSymbol[] = [];
    const dependencies: Record<string, string[]> = {};
    let totalFiles = 0;

    async function walk(currentDir: string) {
      if (totalFiles > 800) return;
      const entries = await fs.readdir(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        if (totalFiles > 800) break;
        const fullPath = path.join(currentDir, entry.name);
        const relPath = path.relative(CodebaseIntelligence.workspaceRoot, fullPath).replace(/\\/g, "/");

        if (entry.isDirectory()) {
          if (CodebaseIntelligence.ignoreDirs.has(entry.name)) continue;
          directories.push(relPath);
          await walk(fullPath);
        } else if (entry.isFile()) {
          totalFiles++;

          // Identifikasi Config files
          if (
            entry.name.includes("config") ||
            entry.name.endsWith(".json") ||
            entry.name.endsWith(".prisma")
          ) {
            configFiles.push(relPath);
          }

          // Identifikasi API routes
          if (relPath.startsWith("app/api/")) {
            apiRoutes.push(relPath);
          }

          // Identifikasi Entry points
          if (
            relPath === "app/layout.tsx" ||
            relPath === "app/page.tsx" ||
            relPath.endsWith("middleware.ts")
          ) {
            entryPoints.push(relPath);
          }

          // Analisis simbol pada TypeScript / JavaScript file (maksimal 80 file utama)
          if (
            (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) &&
            !entry.name.endsWith(".d.ts") &&
            symbols.length < 120
          ) {
            try {
              const content = await fs.readFile(fullPath, "utf-8");
              const parsed = CodebaseIntelligence.extractSymbols(content, relPath);
              symbols.push(...parsed);

              // Ekstrak imports antarmodul
              const imports = CodebaseIntelligence.extractImports(content);
              if (imports.length > 0) {
                dependencies[relPath] = imports;
              }
            } catch {}
          }
        }
      }
    }

    try {
      await walk(this.workspaceRoot);
    } catch {}

    const summaryText = `
[CODEBASE INTELLIGENCE SUMMARY]
- Total Proyek: ${totalFiles} file di ${directories.length} folder.
- Entry Points: ${entryPoints.join(", ") || "app/(dashboard)/ai-assistant/page.tsx"}
- Rute API: ${apiRoutes.slice(0, 10).join(", ")}${apiRoutes.length > 10 ? ` (+${apiRoutes.length - 10} lainnya)` : ""}
- Konfigurasi Inti: ${configFiles.slice(0, 6).join(", ")}
- Simbol Terindeks: ${symbols.length} functions/classes/interfaces
`.trim();

    return {
      structure: {
        totalFiles,
        directories: directories.slice(0, 25),
        entryPoints,
        configFiles,
        apiRoutes,
      },
      symbols: symbols.slice(0, 80),
      dependencies,
      summaryText,
    };
  }

  public static async findSymbols(query: string): Promise<CodeSymbol[]> {
    const q = query.toLowerCase().trim();
    const symbols: CodeSymbol[] = [];

    // Telusuri file kode di lib/ dan app/ untuk menemukan simbol secara presisi
    async function searchDir(dir: string) {
      if (symbols.length >= 30) return;
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (symbols.length >= 30) break;
          const fullPath = path.join(dir, entry.name);
          const relPath = path.relative(CodebaseIntelligence.workspaceRoot, fullPath).replace(/\\/g, "/");

          if (entry.isDirectory()) {
            if (CodebaseIntelligence.ignoreDirs.has(entry.name)) continue;
            await searchDir(fullPath);
          } else if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))) {
            try {
              const content = await fs.readFile(fullPath, "utf-8");
              if (content.toLowerCase().includes(q)) {
                const extracted = CodebaseIntelligence.extractSymbols(content, relPath);
                const matched = extracted.filter((s) => s.name.toLowerCase().includes(q));
                symbols.push(...matched);
              }
            } catch {}
          }
        }
      } catch {}
    }

    await searchDir(path.resolve(this.workspaceRoot, "lib"));
    if (symbols.length < 30) {
      await searchDir(path.resolve(this.workspaceRoot, "app"));
    }

    return symbols;
  }

  private static extractSymbols(content: string, filePath: string): CodeSymbol[] {
    const symbols: CodeSymbol[] = [];
    const lines = content.split("\n");

    const functionRegex = /(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_$]+)/;
    const classRegex = /(?:export\s+)?class\s+([A-Za-z0-9_$]+)/;
    const interfaceRegex = /(?:export\s+)?interface\s+([A-Za-z0-9_$]+)/;
    const typeRegex = /(?:export\s+)?type\s+([A-Za-z0-9_$]+)/;
    const constExportRegex = /export\s+const\s+([A-Za-z0-9_$]+)/;

    lines.forEach((line, index) => {
      if (symbols.length >= 10) return;
      const l = line.trim();

      let match = l.match(functionRegex);
      if (match) {
        symbols.push({ name: match[1], kind: "function", file: filePath, line: index + 1 });
        return;
      }
      match = l.match(classRegex);
      if (match) {
        symbols.push({ name: match[1], kind: "class", file: filePath, line: index + 1 });
        return;
      }
      match = l.match(interfaceRegex);
      if (match) {
        symbols.push({ name: match[1], kind: "interface", file: filePath, line: index + 1 });
        return;
      }
      match = l.match(typeRegex);
      if (match) {
        symbols.push({ name: match[1], kind: "type", file: filePath, line: index + 1 });
        return;
      }
      match = l.match(constExportRegex);
      if (match) {
        symbols.push({ name: match[1], kind: "export", file: filePath, line: index + 1 });
        return;
      }
    });

    return symbols;
  }

  private static extractImports(content: string): string[] {
    const imports: string[] = [];
    const importRegex = /import\s+.*?from\s+["'](.*?)["']/g;
    let match: RegExpExecArray | null;
    while ((match = importRegex.exec(content)) !== null) {
      if (match[1] && (match[1].startsWith(".") || match[1].startsWith("@/"))) {
        imports.push(match[1]);
      }
    }
    return imports.slice(0, 15);
  }
}
