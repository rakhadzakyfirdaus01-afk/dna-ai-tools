import path from "path";
import fs from "fs/promises";
import { exec } from "child_process";

export type SecurityLevel = "safe" | "requires_permission" | "blocked";

export interface SecurityCheckResult {
  allowed: boolean;
  level: SecurityLevel;
  reason?: string;
}

export class SecurityGate {
  private static workspaceRoot = path.resolve(process.cwd());

  // Direktori terlarang yang tidak boleh diubah
  private static forbiddenPaths = [
    ".git",
    "node_modules",
    ".env",
    ".env.local",
    ".env.production",
  ];

  // Perintah terminal berisiko tinggi yang diblokir mutlak
  private static dangerousCommands = [
    "rm -rf /",
    "del /s /q c:\\",
    "format",
    "drop database",
    ":(){ :|:& };:",
    "shutdown",
    "mkfs",
  ];

  public static getWorkspaceRoot(): string {
    return this.workspaceRoot;
  }

  public static isPathWithinWorkspace(targetPath: string): boolean {
    const resolved = path.resolve(this.workspaceRoot, targetPath);
    return (
      resolved.startsWith(this.workspaceRoot) &&
      !resolved.includes("..")
    );
  }

  public static checkFileAccess(
    targetPath: string,
    mode: "read" | "write"
  ): SecurityCheckResult {
    const resolved = path.resolve(this.workspaceRoot, targetPath);

    // 1. Cek apakah di luar workspace
    if (!this.isPathWithinWorkspace(resolved)) {
      return {
        allowed: false,
        level: "blocked",
        reason: `Akses ditolak: File '${targetPath}' berada di luar workspace proyek.`,
      };
    }

    // 2. Cek apakah menyentuh direktori terlarang atau file rahasia
    const relative = path.relative(this.workspaceRoot, resolved);
    const segments = relative.split(path.sep);

    for (const forbidden of this.forbiddenPaths) {
      if (segments.includes(forbidden) || relative.toLowerCase().includes(forbidden)) {
        if (mode === "write" || forbidden.startsWith(".env")) {
          return {
            allowed: false,
            level: "blocked",
            reason: `Akses ditolak: Tidak dapat memodifikasi atau membaca file sensitif '${forbidden}'.`,
          };
        }
      }
    }

    // 3. Operasi penulisan membutuhkan izin jika mengubah file konfigurasi inti
    if (mode === "write") {
      const isConfigFile = [
        "package.json",
        "tsconfig.json",
        "next.config.ts",
        "prisma/schema.prisma",
      ].some((cfg) => relative.toLowerCase().endsWith(cfg.toLowerCase()));

      if (isConfigFile) {
        return {
          allowed: true,
          level: "requires_permission",
          reason: `Perubahan pada konfigurasi inti (${relative}) memerlukan izin pengguna.`,
        };
      }
    }

    return { allowed: true, level: "safe" };
  }

  public static checkTerminalCommand(command: string): SecurityCheckResult {
    const lower = command.toLowerCase().trim();

    // 1. Cek bahaya destruktif mutlak
    for (const danger of this.dangerousCommands) {
      if (lower.includes(danger)) {
        return {
          allowed: false,
          level: "blocked",
          reason: `Perintah diblokir: Terdeteksi instruksi berbahaya sistem ('${danger}').`,
        };
      }
    }

    // 2. Perintah aman read-only
    const safePrefixes = [
      "git status",
      "git log",
      "git branch",
      "git diff",
      "node -v",
      "npm -v",
      "dir",
      "ls",
      "pwd",
      "Get-ChildItem",
    ];

    if (safePrefixes.some((p) => lower.startsWith(p.toLowerCase()))) {
      return { allowed: true, level: "safe" };
    }

    // 3. Perintah eksekusi, instalasi, atau modifikasi memerlukan persetujuan
    return {
      allowed: true,
      level: "requires_permission",
      reason: `Perintah '${command}' dapat mengubah status lingkungan kerja atau dependensi.`,
    };
  }
}
