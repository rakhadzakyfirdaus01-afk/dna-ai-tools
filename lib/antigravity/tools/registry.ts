import fs from "fs/promises";
import path from "path";
import { exec } from "child_process";
import { SecurityGate } from "../security-gate";

export interface ToolExecutionContext {
  userId?: string;
  grantedPermissions?: boolean;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, { type: string; description: string; items?: any }>;
    required: string[];
  };
  execute: (args: any, grantedPermissions?: boolean, context?: ToolExecutionContext) => Promise<ToolResult>;
}

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  requiresPermission?: boolean;
  permissionReason?: string;
  commandToGrant?: string;
}

export class ToolRegistry {
  private static tools: Map<string, ToolDefinition> = new Map();
  private static activeUserId: string | null = null;

  public static setActiveUserId(userId: string | null) {
    this.activeUserId = userId;
  }

  public static getActiveUserId(): string | undefined {
    return this.activeUserId || undefined;
  }

  public static registerTool(tool: ToolDefinition) {
    this.tools.set(tool.name, tool);
  }

  public static getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  public static getAllTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  public static getToolDeclarations() {
    return this.getAllTools().map((t) => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    }));
  }
}

// ==========================================
// 1. TOOL: read_file
// ==========================================
ToolRegistry.registerTool({
  name: "read_file",
  description: "Membaca isi file teks dari workspace proyek dengan opsi slice baris.",
  parameters: {
    type: "object",
    properties: {
      filePath: { type: "string", description: "Path relatif file dari root workspace" },
      startLine: { type: "number", description: "Baris awal (1-indexed, opsional)" },
      endLine: { type: "number", description: "Baris akhir (1-indexed, opsional)" },
    },
    required: ["filePath"],
  },
  execute: async (
    args: { filePath: string; startLine?: number; endLine?: number },
    granted?: boolean,
    context?: ToolExecutionContext
  ) => {
    if (!args || typeof args.filePath !== "string" || !args.filePath.trim()) {
      return { success: false, error: "Parameter 'filePath' harus berupa string yang tidak kosong." };
    }

    const userId = context?.userId || ToolRegistry.getActiveUserId();
    const sec = SecurityGate.checkFileAccess(args.filePath, "read", userId);
    if (!sec.allowed) {
      return { success: false, error: sec.reason };
    }

    try {
      let fullPath = sec.resolvedPath || path.resolve(SecurityGate.getWorkspaceRoot(userId), args.filePath);
      if (userId) {
        try {
          await fs.access(fullPath);
        } catch {
          const projectCandidate = path.resolve(SecurityGate.getWorkspaceRoot(), args.filePath);
          const projectSec = SecurityGate.checkFileAccess(args.filePath, "read");
          if (projectSec.allowed) {
            fullPath = projectCandidate;
          }
        }
      }
      const content = await fs.readFile(fullPath, "utf-8");
      const lines = content.split("\n");

      if (args.startLine !== undefined || args.endLine !== undefined) {
        const start = Math.max(1, args.startLine || 1) - 1;
        const end = Math.min(lines.length, args.endLine || lines.length);
        const sliced = lines.slice(start, end).join("\n");
        return {
          success: true,
          data: {
            filePath: args.filePath,
            totalLines: lines.length,
            showingRange: `${start + 1}-${end}`,
            content: sliced,
          },
        };
      }

      return {
        success: true,
        data: {
          filePath: args.filePath,
          totalLines: lines.length,
          content,
        },
      };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  },
});

// ==========================================
// 2. TOOL: write_file
// ==========================================
ToolRegistry.registerTool({
  name: "write_file",
  description: "Membuat atau menimpa file di dalam workspace proyek.",
  parameters: {
    type: "object",
    properties: {
      filePath: { type: "string", description: "Path relatif file dari root workspace" },
      content: { type: "string", description: "Konten lengkap yang akan ditulis ke file" },
    },
    required: ["filePath", "content"],
  },
  execute: async (
    args: { filePath: string; content: string },
    granted?: boolean,
    context?: ToolExecutionContext
  ) => {
    if (!args || typeof args.filePath !== "string" || !args.filePath.trim()) {
      return { success: false, error: "Parameter 'filePath' harus berupa string yang tidak kosong." };
    }
    if (typeof args.content !== "string") {
      return { success: false, error: "Parameter 'content' harus berupa string." };
    }

    const userId = context?.userId || ToolRegistry.getActiveUserId();
    const sec = SecurityGate.checkFileAccess(args.filePath, "write", userId);
    if (!sec.allowed) {
      return { success: false, error: sec.reason };
    }

    if (sec.level === "requires_permission" && !granted) {
      return {
        success: false,
        requiresPermission: true,
        permissionReason: sec.reason,
        commandToGrant: `write_file: ${args.filePath}`,
      };
    }

    try {
      const fullPath = sec.resolvedPath || path.resolve(SecurityGate.getWorkspaceRoot(userId), args.filePath);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, args.content, "utf-8");
      return {
        success: true,
        data: { filePath: args.filePath, bytesWritten: Buffer.byteLength(args.content) },
      };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  },
});

// ==========================================
// 3. TOOL: patch_file (Precise Replacement)
// ==========================================
ToolRegistry.registerTool({
  name: "patch_file",
  description: "Mengganti substring unik tertentu di dalam file tanpa menulis ulang seluruh file.",
  parameters: {
    type: "object",
    properties: {
      filePath: { type: "string", description: "Path relatif file" },
      targetText: { type: "string", description: "Teks persis yang akan diganti" },
      replacementText: { type: "string", description: "Teks baru pengganti" },
    },
    required: ["filePath", "targetText", "replacementText"],
  },
  execute: async (
    args: { filePath: string; targetText: string; replacementText: string },
    granted?: boolean,
    context?: ToolExecutionContext
  ) => {
    if (!args || typeof args.filePath !== "string" || !args.filePath.trim()) {
      return { success: false, error: "Parameter 'filePath' harus berupa string yang tidak kosong." };
    }
    if (typeof args.targetText !== "string" || !args.targetText) {
      return { success: false, error: "Parameter 'targetText' harus berupa string yang tidak kosong." };
    }
    if (typeof args.replacementText !== "string") {
      return { success: false, error: "Parameter 'replacementText' harus berupa string." };
    }

    const userId = context?.userId || ToolRegistry.getActiveUserId();
    const sec = SecurityGate.checkFileAccess(args.filePath, "write", userId);
    if (!sec.allowed) {
      return { success: false, error: sec.reason };
    }

    if (sec.level === "requires_permission" && !granted) {
      return {
        success: false,
        requiresPermission: true,
        permissionReason: sec.reason,
        commandToGrant: `patch_file: ${args.filePath}`,
      };
    }

    try {
      const fullPath = sec.resolvedPath || path.resolve(SecurityGate.getWorkspaceRoot(userId), args.filePath);
      const original = await fs.readFile(fullPath, "utf-8");

      if (!original.includes(args.targetText)) {
        return {
          success: false,
          error: `Target text tidak ditemukan di dalam '${args.filePath}'. Pastikan spasi dan indentasi sesuai.`,
        };
      }

      const occurrences = original.split(args.targetText).length - 1;
      if (occurrences > 1) {
        return {
          success: false,
          error: `Target text ditemukan lebih dari 1 kali (${occurrences} kali). Sertakan konteks baris lebih banyak agar unik.`,
        };
      }

      const updated = original.replace(args.targetText, args.replacementText);
      await fs.writeFile(fullPath, updated, "utf-8");
      return {
        success: true,
        data: { filePath: args.filePath, status: "Patched successfully" },
      };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  },
});

// ==========================================
// 4. TOOL: search_codebase
// ==========================================
ToolRegistry.registerTool({
  name: "search_codebase",
  description: "Mencari pola kata kunci atau regex di dalam file proyek (eksklusif node_modules dan .git).",
  parameters: {
    type: "object",
    properties: {
      query: { type: "string", description: "Kata kunci atau teks pencarian" },
      targetDirectory: { type: "string", description: "Sub-folder spesifik (opsional, default: root)" },
      fileExtension: { type: "string", description: "Filter ekstensi file (misal: .ts, .tsx, .json)" },
    },
    required: ["query"],
  },
  execute: async (args: { query: string; targetDirectory?: string; fileExtension?: string }) => {
    try {
      const root = path.resolve(SecurityGate.getWorkspaceRoot(), args.targetDirectory || ".");
      const matches: Array<{ file: string; line: number; snippet: string }> = [];

      async function scanDir(currentDir: string) {
        if (matches.length >= 25) return;
        const entries = await fs.readdir(currentDir, { withFileTypes: true });

        for (const entry of entries) {
          if (matches.length >= 25) break;
          const fullPath = path.join(currentDir, entry.name);
          const relative = path.relative(SecurityGate.getWorkspaceRoot(), fullPath);

          if (entry.isDirectory()) {
            if (["node_modules", ".git", ".next", ".vercel", "dist"].includes(entry.name)) {
              continue;
            }
            await scanDir(fullPath);
          } else if (entry.isFile()) {
            if (args.fileExtension && !entry.name.endsWith(args.fileExtension)) {
              continue;
            }

            try {
              const content = await fs.readFile(fullPath, "utf-8");
              const lines = content.split("\n");
              lines.forEach((line, idx) => {
                if (matches.length < 25 && line.toLowerCase().includes(args.query.toLowerCase())) {
                  matches.push({
                    file: relative.replace(/\\/g, "/"),
                    line: idx + 1,
                    snippet: line.trim().slice(0, 160),
                  });
                }
              });
            } catch {}
          }
        }
      }

      await scanDir(root);
      return {
        success: true,
        data: { query: args.query, matchCount: matches.length, matches },
      };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  },
});

// ==========================================
// 5. TOOL: run_terminal_command
// ==========================================
ToolRegistry.registerTool({
  name: "run_terminal_command",
  description: "Menjalankan perintah terminal di workspace lokal proyek dengan batas waktu 20 detik.",
  parameters: {
    type: "object",
    properties: {
      command: { type: "string", description: "Perintah shell/PowerShell yang akan dijalankan" },
    },
    required: ["command"],
  },
  execute: async (
    args: { command: string },
    granted?: boolean,
    context?: ToolExecutionContext
  ) => {
    if (!args || typeof args.command !== "string" || !args.command.trim()) {
      return { success: false, error: "Parameter 'command' harus berupa string yang tidak kosong." };
    }

    const sec = SecurityGate.checkTerminalCommand(args.command);
    if (!sec.allowed) {
      return { success: false, error: sec.reason };
    }

    if (sec.level === "requires_permission" && !granted) {
      return {
        success: false,
        requiresPermission: true,
        permissionReason: sec.reason,
        commandToGrant: args.command,
      };
    }

    const userId = context?.userId || ToolRegistry.getActiveUserId();
    const workspaceRoot = SecurityGate.getWorkspaceRoot(userId);

    return new Promise((resolve) => {
      const shell = process.platform === "win32" ? "powershell.exe" : "/bin/bash";
      exec(
        args.command,
        {
          cwd: workspaceRoot,
          shell,
          timeout: 20000,
          maxBuffer: 1024 * 1024 * 2,
          env: { ...process.env, PAGER: "cat" },
        },
        (error, stdout, stderr) => {
          const exitCode = error ? (typeof error.code === "number" ? error.code : 1) : 0;
          resolve({
            success: exitCode === 0,
            data: {
              command: args.command,
              stdout: stdout || "",
              stderr: stderr || (error && !stdout ? error.message : ""),
              exitCode,
            },
          });
        }
      );
    });
  },
});

// ==========================================
// 6. TOOL: verify_project_build
// ==========================================
ToolRegistry.registerTool({
  name: "verify_project_build",
  description: "Menjalankan verifikasi tipe TypeScript (tsc --noEmit) untuk memastikan tidak ada kesalahan kompilasi.",
  parameters: {
    type: "object",
    properties: {},
    required: [],
  },
  execute: async () => {
    return new Promise((resolve) => {
      exec(
        "npx tsc --noEmit",
        {
          cwd: SecurityGate.getWorkspaceRoot(),
          timeout: 45000,
          maxBuffer: 1024 * 1024 * 2,
        },
        (error, stdout, stderr) => {
          const exitCode = error ? (typeof error.code === "number" ? error.code : 1) : 0;
          resolve({
            success: exitCode === 0,
            data: {
              passed: exitCode === 0,
              stdout: stdout || (exitCode === 0 ? "TypeScript check passed with 0 errors." : ""),
              stderr: stderr || "",
              exitCode,
            },
          });
        }
      );
    });
  },
});

// ==========================================
// 7. TOOL: analyze_codebase
// ==========================================
ToolRegistry.registerTool({
  name: "analyze_codebase",
  description: "Menganalisis arsitektur proyek secara otomatis, memetakan folder, entry point, API route, dan relasi impor.",
  parameters: {
    type: "object",
    properties: {},
    required: [],
  },
  execute: async () => {
    try {
      const { CodebaseIntelligence } = await import("../codebase-intelligence");
      const analysis = await CodebaseIntelligence.analyzeWorkspace();
      return {
        success: true,
        data: {
          structure: analysis.structure,
          summary: analysis.summaryText,
          topSymbolsCount: analysis.symbols.length,
        },
      };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  },
});

// ==========================================
// 8. TOOL: find_symbols
// ==========================================
ToolRegistry.registerTool({
  name: "find_symbols",
  description: "Mencari deklarasi simbol seperti fungsi, class, interface, tipe, atau konstanta export di seluruh codebase.",
  parameters: {
    type: "object",
    properties: {
      query: { type: "string", description: "Nama simbol atau fungsi yang dicari" },
    },
    required: ["query"],
  },
  execute: async (args: { query: string }) => {
    if (!args || typeof args.query !== "string" || !args.query.trim()) {
      return { success: false, error: "Parameter 'query' harus berupa string yang tidak kosong." };
    }
    try {
      const { CodebaseIntelligence } = await import("../codebase-intelligence");
      const symbols = await CodebaseIntelligence.findSymbols(args.query);
      return {
        success: true,
        data: {
          query: args.query,
          matchCount: symbols.length,
          symbols,
        },
      };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  },
});

// ==========================================
// 9. TOOL: browser_navigate
// ==========================================
ToolRegistry.registerTool({
  name: "browser_navigate",
  description: "Membuka URL di lingkungan browser headless yang terisolasi dengan proteksi SSRF.",
  parameters: {
    type: "object",
    properties: {
      url: { type: "string", description: "URL lengkap yang akan dibuka (http:// atau https://)" },
    },
    required: ["url"],
  },
  execute: async (args: { url: string }) => {
    if (!args || typeof args.url !== "string" || !args.url.trim()) {
      return { success: false, error: "Parameter 'url' harus berupa string yang valid." };
    }
    try {
      const { BrowserEngine } = await import("../browser/engine");
      const engine = BrowserEngine.getInstance();
      const page = await engine.navigate(args.url);
      return {
        success: true,
        data: {
          url: page.url,
          status: page.status,
          statusText: page.statusText,
          title: page.title,
          loadTimeMs: page.loadTimeMs,
          headings: page.headings,
          buttonsCount: page.buttons.length,
          formsCount: page.forms.length,
          linksCount: page.links.length,
          alerts: page.alerts,
        },
      };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  },
});

// ==========================================
// 10. TOOL: browser_query
// ==========================================
ToolRegistry.registerTool({
  name: "browser_query",
  description: "Mencari elemen interaktif di halaman browser aktif berdasarkan teks, role, tag, atau id.",
  parameters: {
    type: "object",
    properties: {
      text: { type: "string", description: "Teks parsial yang dicari di dalam elemen (opsional)" },
      role: { type: "string", description: "Role ARIA elemen (contoh: button, link) (opsional)" },
      tag: { type: "string", description: "Nama tag HTML (contoh: button, a, input) (opsional)" },
      id: { type: "string", description: "ID elemen HTML (opsional)" },
    },
    required: [],
  },
  execute: async (args: { text?: string; role?: string; tag?: string; id?: string }) => {
    try {
      const { BrowserEngine } = await import("../browser/engine");
      const engine = BrowserEngine.getInstance();
      const elements = engine.findElements(args || {});
      return {
        success: true,
        data: {
          matchCount: elements.length,
          elements,
        },
      };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  },
});

// ==========================================
// 11. TOOL: browser_click
// ==========================================
ToolRegistry.registerTool({
  name: "browser_click",
  description: "Mengklik elemen tombol atau tautan navigasi pada halaman aktif.",
  parameters: {
    type: "object",
    properties: {
      text: { type: "string", description: "Teks pada tombol atau link yang ingin diklik" },
      tag: { type: "string", description: "Tag elemen (button atau a) (opsional)" },
      id: { type: "string", description: "ID elemen (opsional)" },
    },
    required: [],
  },
  execute: async (args: { text?: string; tag?: string; id?: string }) => {
    try {
      const { BrowserEngine } = await import("../browser/engine");
      const engine = BrowserEngine.getInstance();
      const result = await engine.clickElement(args || {});
      return {
        success: true,
        data: {
          clickedTag: result.clicked.tag,
          clickedText: result.clicked.text,
          actionType: result.actionType,
          currentUrl: result.newPage.url,
          status: result.newPage.status,
          pageTitle: result.newPage.title,
        },
      };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  },
});

// ==========================================
// 12. TOOL: browser_fill_form
// ==========================================
ToolRegistry.registerTool({
  name: "browser_fill_form",
  description: "Mengisi data form pada halaman aktif dan mengirimkannya (submit).",
  parameters: {
    type: "object",
    properties: {
      formSelector: { type: "string", description: "ID atau bagian action dari form target (opsional)" },
      fields: { type: "object", description: "Key-value field yang akan diisi" },
      submit: { type: "boolean", description: "Kirimkan form setelah diisi (default: true)" },
    },
    required: ["fields"],
  },
  execute: async (args: { formSelector?: string; fields: Record<string, string>; submit?: boolean }) => {
    if (!args || !args.fields || typeof args.fields !== "object") {
      return { success: false, error: "Parameter 'fields' harus berupa objek key-value." };
    }
    try {
      const { BrowserEngine } = await import("../browser/engine");
      const engine = BrowserEngine.getInstance();
      const page = await engine.fillForm(
        args.formSelector || "",
        args.fields,
        args.submit !== false
      );
      return {
        success: true,
        data: {
          url: page.url,
          status: page.status,
          title: page.title,
          alerts: page.alerts,
        },
      };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  },
});

// ==========================================
// 13. TOOL: browser_snapshot
// ==========================================
ToolRegistry.registerTool({
  name: "browser_snapshot",
  description: "Menangkap visual wireframe snapshot dari halaman browser dan menyimpannya sebagai file artefak verifikasi.",
  parameters: {
    type: "object",
    properties: {
      label: { type: "string", description: "Label atau nama inspeksi snapshot (opsional)" },
    },
    required: [],
  },
  execute: async (args?: { label?: string }) => {
    try {
      const { BrowserEngine } = await import("../browser/engine");
      const engine = BrowserEngine.getInstance();
      const snapshot = await engine.captureVisualSnapshot(args?.label || "Visual Verification Snapshot");
      return {
        success: true,
        data: snapshot,
      };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  },
});

// ==========================================
// 14. TOOL: browser_close
// ==========================================
ToolRegistry.registerTool({
  name: "browser_close",
  description: "Menutup sesi browser dan membersihkan seluruh resource memori serta riwayat navigasi.",
  parameters: {
    type: "object",
    properties: {},
    required: [],
  },
  execute: async () => {
    try {
      const { BrowserEngine } = await import("../browser/engine");
      const engine = BrowserEngine.getInstance();
      engine.closeSession();
      return {
        success: true,
        data: { message: "Sesi browser berhasil ditutup dan memori dibersihkan." },
      };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  },
});

// ==========================================
// 15. TOOL: get_git_diff (Review Changes & Diffs)
// ==========================================
ToolRegistry.registerTool({
  name: "get_git_diff",
  description: "Melihat diff perubahan file terkini yang belum di-commit di dalam workspace untuk memverifikasi akurasi modifikasi dan mendeteksi perubahan yang tidak terkait.",
  parameters: {
    type: "object",
    properties: {
      filePath: { type: "string", description: "Filter perubahan pada berkas tertentu saja (opsional)" },
    },
    required: [],
  },
  execute: async (args?: { filePath?: string }) => {
    return new Promise((resolve) => {
      const targetArg = args?.filePath ? ` "${args.filePath}"` : "";
      const cmd = `git diff${targetArg}`;

      exec(
        cmd,
        {
          cwd: SecurityGate.getWorkspaceRoot(),
          timeout: 10000,
          maxBuffer: 1024 * 512, // 512 KB
        },
        (error, stdout, stderr) => {
          if (error) {
            resolve({
              success: false,
              error: `Gagal membaca git diff: ${stderr || error.message}`,
            });
            return;
          }

          resolve({
            success: true,
            data: {
              diff: stdout || "Tidak ada perubahan git yang terdeteksi (working tree bersih).",
              hasChanges: Boolean(stdout.trim()),
            },
          });
        }
      );
    });
  },
});

// ==========================================
// 16. TOOL: analyze_dna_survey_recap
// ==========================================
ToolRegistry.registerTool({
  name: "analyze_dna_survey_recap",
  description: "Menganalisis skor kepuasan survei klien PT DNA Advertising berdasarkan formula standar (21-105 poin) dengan 3 kategori: Pelayanan & Komunikasi Tim (Q1-Q16), Kualitas Media Reklame (Q17-Q20), dan Kesesuaian Biaya (Q21).",
  parameters: {
    type: "object",
    properties: {
      answers: {
        type: "object",
        description: "Objek jawaban 21 soal (q1 sampai q21 dengan nilai 'Sangat Puas', 'Puas', 'Cukup Puas', 'Kurang Puas', atau angka 1-5)",
      },
      clientName: { type: "string", description: "Nama klien atau PIC perusahaan" },
      companyName: { type: "string", description: "Nama instansi/perusahaan klien" },
    },
    required: ["answers"],
  },
  execute: async (args: { answers: Record<string, string | number>; clientName?: string; companyName?: string }) => {
    try {
      const scoreMap: Record<string, number> = {
        "sangat puas": 5,
        "puas": 4,
        "cukup puas": 3,
        "kurang puas": 2,
        "tidak puas": 2,
        "kurang": 2,
        "sangat tidak puas": 1,
      };

      let totalScore = 0;
      let q1_16_sum = 0;
      let q17_20_sum = 0;
      let q21_score = 0;

      for (let i = 1; i <= 21; i++) {
        const raw = args.answers[`q${i}`] ?? args.answers[String(i)] ?? 4;
        let num = 4;
        if (typeof raw === "number") {
          num = Math.max(1, Math.min(5, Math.round(raw)));
        } else if (typeof raw === "string") {
          const lower = raw.trim().toLowerCase();
          num = scoreMap[lower] || parseInt(lower, 10) || 4;
        }

        totalScore += num;
        if (i <= 16) q1_16_sum += num;
        else if (i <= 20) q17_20_sum += num;
        else q21_score = num;
      }

      const percentage = Math.round((totalScore / 105) * 100);
      let predicate = "Memuaskan";
      if (totalScore >= 95) predicate = "Sangat Memuaskan (A+)";
      else if (totalScore >= 80) predicate = "Memuaskan (A)";
      else if (totalScore >= 65) predicate = "Cukup Memuaskan (B)";
      else if (totalScore >= 45) predicate = "Perlu Perbaikan (C)";
      else predicate = "Kritis / Tidak Puas (D)";

      return {
        success: true,
        data: {
          client: args.clientName || "Klien DNA",
          company: args.companyName || "-",
          totalScore,
          maxScore: 105,
          minScore: 21,
          percentage: `${percentage}%`,
          predicate,
          breakdown: {
            pelayananDanKomunikasi: {
              score: q1_16_sum,
              max: 80,
              percentage: `${Math.round((q1_16_sum / 80) * 100)}%`,
            },
            kualitasMediaReklame: {
              score: q17_20_sum,
              max: 20,
              percentage: `${Math.round((q17_20_sum / 20) * 100)}%`,
            },
            kesesuaianBiaya: {
              score: q21_score,
              max: 5,
              percentage: `${Math.round((q21_score / 5) * 100)}%`,
            },
          },
        },
      };
    } catch (err: any) {
      return { success: false, error: "Gagal menghitung rekap survei DNA: " + err.message };
    }
  },
});

// ==========================================
// 17. TOOL: generate_dna_excel_report
// ==========================================
ToolRegistry.registerTool({
  name: "generate_dna_excel_report",
  description: "Membuat file rekap survei PT DNA Advertising dalam format CSV/Excel ke workspace pengguna.",
  parameters: {
    type: "object",
    properties: {
      fileName: { type: "string", description: "Nama file output (misal: 'rekap-survei-dna.csv')" },
      rows: {
        type: "array",
        description: "Daftar baris rekap klien (nama, perusahaan, layanan, skor, predikat)",
        items: { type: "object" },
      },
    },
    required: ["fileName", "rows"],
  },
  execute: async (
    args: { fileName: string; rows: Array<Record<string, any>> },
    granted?: boolean,
    context?: ToolExecutionContext
  ) => {
    try {
      const userId = context?.userId || ToolRegistry.getActiveUserId();
      const workspaceRoot = SecurityGate.getWorkspaceRoot(userId);
      const targetPath = path.resolve(workspaceRoot, args.fileName || "rekap-survei-dna.csv");

      const header = ["No", "Nama Klien", "Perusahaan/Instansi", "Layanan", "Total Skor (21-105)", "Predikat Kepuasan"];
      const lines = [header.join(",")];

      args.rows.forEach((row, idx) => {
        lines.push(
          [
            idx + 1,
            `"${(row.name || "").replace(/"/g, '""')}"`,
            `"${(row.company || "").replace(/"/g, '""')}"`,
            `"${(row.service || "Reklame & Advertising").replace(/"/g, '""')}"`,
            row.score || 105,
            `"${(row.predicate || "Sangat Memuaskan").replace(/"/g, '""')}"`,
          ].join(",")
        );
      });

      await fs.writeFile(targetPath, lines.join("\n"), "utf-8");

      return {
        success: true,
        data: {
          path: targetPath,
          totalRows: args.rows.length,
          message: `File rekap Excel/CSV survei PT DNA Advertising berhasil dibuat di ${args.fileName}`,
        },
      };
    } catch (err: any) {
      return { success: false, error: "Gagal membuat berkas rekap Excel: " + err.message };
    }
  },
});



