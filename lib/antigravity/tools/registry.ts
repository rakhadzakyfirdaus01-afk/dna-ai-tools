import fs from "fs/promises";
import path from "path";
import { exec } from "child_process";
import { SecurityGate } from "../security-gate";

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, { type: string; description: string; items?: any }>;
    required: string[];
  };
  execute: (args: any, grantedPermissions?: boolean) => Promise<ToolResult>;
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
  execute: async (args: { filePath: string; startLine?: number; endLine?: number }) => {
    const sec = SecurityGate.checkFileAccess(args.filePath, "read");
    if (!sec.allowed) {
      return { success: false, error: sec.reason };
    }

    try {
      const fullPath = path.resolve(SecurityGate.getWorkspaceRoot(), args.filePath);
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
  execute: async (args: { filePath: string; content: string }, granted?: boolean) => {
    const sec = SecurityGate.checkFileAccess(args.filePath, "write");
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
      const fullPath = path.resolve(SecurityGate.getWorkspaceRoot(), args.filePath);
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
  execute: async (args: { filePath: string; targetText: string; replacementText: string }, granted?: boolean) => {
    const sec = SecurityGate.checkFileAccess(args.filePath, "write");
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
      const fullPath = path.resolve(SecurityGate.getWorkspaceRoot(), args.filePath);
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
  execute: async (args: { command: string }, granted?: boolean) => {
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

    return new Promise((resolve) => {
      const shell = process.platform === "win32" ? "powershell.exe" : "/bin/bash";
      exec(
        args.command,
        {
          cwd: SecurityGate.getWorkspaceRoot(),
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
