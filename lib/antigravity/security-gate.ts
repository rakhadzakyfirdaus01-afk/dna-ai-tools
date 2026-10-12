import path from "path";
import fs from "fs/promises";
import { exec } from "child_process";
import { WorkspaceManager } from "./workspace-manager";

export type SecurityLevel = "safe" | "requires_permission" | "blocked";

export interface SecurityCheckResult {
  allowed: boolean;
  level: SecurityLevel;
  reason?: string;
  resolvedPath?: string;
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

  public static getWorkspaceRoot(userId?: string): string {
    if (userId) {
      return WorkspaceManager.getWorkspaceDirSync(userId);
    }
    return this.workspaceRoot;
  }

  public static isPathWithinWorkspace(targetPath: string, userId?: string): boolean {
    const root = this.getWorkspaceRoot(userId);
    const resolved = path.resolve(root, targetPath);
    const relative = path.relative(root, resolved);
    // Jika relative dimulai dengan ".." atau berupa root absolut di luar workspace
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      return false;
    }
    // Pastikan prefix sesuai dengan root
    return resolved === root || resolved.startsWith(root + path.sep);
  }

  public static checkFileAccess(
    targetPath: string,
    mode: "read" | "write",
    userId?: string
  ): SecurityCheckResult {
    const root = this.getWorkspaceRoot(userId);
    const resolved = path.resolve(root, targetPath);

    // 1. Cek apakah di luar workspace
    if (!this.isPathWithinWorkspace(resolved, userId)) {
      return {
        allowed: false,
        level: "blocked",
        reason: `Akses ditolak: File '${targetPath}' berada di luar workspace proyek.`,
      };
    }

    // 2. Cek apakah menyentuh direktori terlarang atau file rahasia
    const relative = path.relative(root, resolved);
    const segments = relative.split(path.sep);

    for (const forbidden of this.forbiddenPaths) {
      if (segments.includes(forbidden) || relative.toLowerCase().includes(forbidden)) {
        if (mode === "write" || forbidden.startsWith(".env") || forbidden === ".git") {
          return {
            allowed: false,
            level: "blocked",
            reason: `Akses ditolak: Tidak dapat memodifikasi atau membaca direktori sensitif '${forbidden}'.`,
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
          resolvedPath: resolved,
        };
      }
    }

    return { allowed: true, level: "safe", resolvedPath: resolved };
  }

  public static checkTerminalCommand(command: string): SecurityCheckResult {
    const raw = command.trim();
    const lower = raw.toLowerCase();

    // 1. Cek bahaya destruktif mutlak
    const expandedDangers = [
      ...this.dangerousCommands,
      "format c:",
      "del /f /s /q",
      "rmdir /s /q c:\\",
      "net user",
      "net localgroup",
      "reg add",
      "reg delete",
      "diskpart",
      "attrib -r -s -h",
    ];

    for (const danger of expandedDangers) {
      if (lower.includes(danger)) {
        return {
          allowed: false,
          level: "blocked",
          reason: `Perintah diblokir: Terdeteksi instruksi berbahaya sistem ('${danger}').`,
        };
      }
    }

    // 2. Evaluasi chaining (misal: "git status ; rm -rf /")
    const segments = raw
      .split(/(?:&&|\|\||;|\||\n)/)
      .map((s) => s.trim())
      .filter(Boolean);

    // Cek setiap segmen perintah
    for (const seg of segments) {
      const segLower = seg.toLowerCase();
      for (const danger of expandedDangers) {
        if (segLower.includes(danger)) {
          return {
            allowed: false,
            level: "blocked",
            reason: `Perintah diblokir: Segmen '${seg}' mengandung instruksi berbahaya.`,
          };
        }
      }
    }

    // 3. Perintah aman read-only murni (hanya jika semua segmen berstatus aman dan tidak ada chaining mencurigakan)
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

    const isAllSegmentsSafe =
      segments.length > 0 &&
      segments.every((seg) =>
        safePrefixes.some((p) => seg.toLowerCase().startsWith(p.toLowerCase()))
      );

    if (isAllSegmentsSafe) {
      return { allowed: true, level: "safe" };
    }

    // 4. Perintah eksekusi, instalasi, pengujian, atau modifikasi memerlukan persetujuan izin
    return {
      allowed: true,
      level: "requires_permission",
      reason: `Perintah '${command}' dapat mengubah status lingkungan kerja atau dependensi.`,
    };
  }
}
