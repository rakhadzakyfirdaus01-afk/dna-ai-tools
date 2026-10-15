import path from "path";
import fs from "fs/promises";
import fsSync from "fs";
import os from "os";
import crypto from "crypto";

export interface WorkspaceInfo {
  userId: string;
  userWorkspaceHash: string;
  workspaceDir: string;
  isEphemeral: boolean;
}

export class WorkspaceManager {
  private static baseWorkspaceDir: string | null = null;

  /**
   * Mendapatkan basis direktori kerja yang terjamin dapat ditulisi (writable)
   * Di lingkungan Vercel serverless / AWS Lambda, hanya os.tmpdir() yang memiliki izin tulis (chmod rwx).
   */
  public static getBaseDir(): string {
    if (!this.baseWorkspaceDir) {
      const isCloudOrLinux = Boolean(
        process.env.AWS_LAMBDA_FUNCTION_NAME ||
        process.env.VERCEL ||
        process.platform === "linux" ||
        process.cwd().startsWith("/var/task") ||
        process.cwd().includes("vercel")
      );
      if (isCloudOrLinux) {
        this.baseWorkspaceDir = path.resolve(os.tmpdir(), "dna-workspaces");
      } else {
        this.baseWorkspaceDir = path.resolve(process.cwd(), ".dna-workspaces");
      }
    }
    return this.baseWorkspaceDir;
  }

  /**
   * Menghasilkan identifier yang aman dan stabil menggunakan hash kriptografis SHA-256
   * Mencegah penggunaan userId mentah yang berpotensi mengandung karakter path traversal atau informasi pribadi.
   */
  public static hashUserId(userId: string): string {
    const sanitized = (userId || "anonymous-guest").trim().toLowerCase();
    const hash = crypto.createHash("sha256").update(sanitized).digest("hex").slice(0, 16);
    return `ws-${hash}`;
  }

  /**
   * Memastikan direktori workspace terisolasi untuk user tersedia dan mengembalikan informasinya
   */
  public static async getOrCreateWorkspace(userId: string): Promise<WorkspaceInfo> {
    const userWorkspaceHash = this.hashUserId(userId);
    const workspaceDir = path.resolve(this.getBaseDir(), userWorkspaceHash);

    try {
      await fs.mkdir(workspaceDir, { recursive: true });
    } catch (err) {
      throw new Error(`Gagal menginisialisasi workspace direktori: ${(err as Error).message}`);
    }

    return {
      userId,
      userWorkspaceHash,
      workspaceDir,
      isEphemeral: Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME),
    };
  }

  /**
   * Mendapatkan workspace directory sinkron (untuk keperluan SecurityGate)
   */
  public static getWorkspaceDirSync(userId: string): string {
    const userWorkspaceHash = this.hashUserId(userId);
    const workspaceDir = path.resolve(this.getBaseDir(), userWorkspaceHash);
    if (!fsSync.existsSync(workspaceDir)) {
      try {
        fsSync.mkdirSync(workspaceDir, { recursive: true });
      } catch {}
    }
    return workspaceDir;
  }

  /**
   * Memvalidasi dan menyelesaikan path file di dalam workspace pengguna yang sah.
   * Mencegah Path Traversal dan Symbolic-Link Escape di luar workspace milik pengguna.
   */
  public static async resolveAndValidatePath(
    userId: string,
    targetPath: string
  ): Promise<{ resolvedPath: string; isWithinWorkspace: boolean; reason?: string }> {
    if (!targetPath || typeof targetPath !== "string") {
      return { resolvedPath: "", isWithinWorkspace: false, reason: "Path target tidak valid atau kosong." };
    }

    const workspace = await this.getOrCreateWorkspace(userId);
    const workspaceRoot = workspace.workspaceDir;

    // Selesaikan path relatif atau absolut terhadap workspace pengguna
    const candidatePath = path.isAbsolute(targetPath)
      ? path.resolve(targetPath)
      : path.resolve(workspaceRoot, targetPath);

    // 1. Validasi string prefix
    const relative = path.relative(workspaceRoot, candidatePath);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      return {
        resolvedPath: candidatePath,
        isWithinWorkspace: false,
        reason: `Akses ditolak: Path '${targetPath}' mencoba keluar dari workspace pengguna.`,
      };
    }

    // 2. Validasi symbolic-link escape jika file atau folder induk sudah ada
    try {
      let checkPath = candidatePath;
      // Jika file target belum ada (misal operasi create/write), periksa direktori induknya yang ada
      while (!fsSync.existsSync(checkPath) && checkPath !== path.dirname(checkPath)) {
        checkPath = path.dirname(checkPath);
      }

      if (fsSync.existsSync(checkPath)) {
        const realResolved = await fs.realpath(checkPath);
        const realWorkspaceRoot = await fs.realpath(workspaceRoot);
        const realRelative = path.relative(realWorkspaceRoot, realResolved);

        if (realRelative.startsWith("..") || path.isAbsolute(realRelative)) {
          return {
            resolvedPath: candidatePath,
            isWithinWorkspace: false,
            reason: `Akses ditolak: Terdeteksi symbolic link yang mengarah ke luar workspace pengguna.`,
          };
        }
      }
    } catch (err) {
      return {
        resolvedPath: candidatePath,
        isWithinWorkspace: false,
        reason: `Gagal memverifikasi integritas path: ${(err as Error).message}`,
      };
    }

    return { resolvedPath: candidatePath, isWithinWorkspace: true };
  }
}
