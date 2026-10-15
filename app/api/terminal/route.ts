import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { exec } from "child_process";
import path from "path";
import { authOptions } from "@/auth";
import { WorkspaceManager } from "@/lib/antigravity/workspace-manager";
import { SecurityGate } from "@/lib/antigravity/security-gate";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const isDev = process.env.NODE_ENV !== "production";
    if (!session?.user && !isDev) {
      return NextResponse.json(
        { error: "Unauthorized. Silakan login terlebih dahulu." },
        { status: 401 }
      );
    }

    const userId = session?.user?.email || (session?.user as any)?.id || "dev-user";
    const body = await req.json();
    const command = typeof body.command === "string" ? body.command.trim() : "";
    const requestedCwd = typeof body.cwd === "string" ? body.cwd.trim() : "";

    if (!command) {
      return NextResponse.json(
        { error: "Command tidak boleh kosong." },
        { status: 400 }
      );
    }

    // 1. Validasi keamanan perintah melalui SecurityGate
    const sec = SecurityGate.checkTerminalCommand(command);
    if (!sec.allowed) {
      return NextResponse.json(
        { error: sec.reason || "Perintah diblokir oleh Security Gate." },
        { status: 403 }
      );
    }

    // 2. Dapatkan workspace per-user yang terisolasi dan writable
    const userWorkspace = await WorkspaceManager.getOrCreateWorkspace(userId);
    let effectiveCwd = userWorkspace.workspaceDir;

    // 3. Jika user meminta cwd kustom, validasi ketat agar tidak keluar dari workspace per-user
    if (requestedCwd) {
      const pathValidation = await WorkspaceManager.resolveAndValidatePath(userId, requestedCwd);
      if (!pathValidation.isWithinWorkspace) {
        return NextResponse.json(
          { error: pathValidation.reason || "Cwd berada di luar batas workspace pengguna." },
          { status: 403 }
        );
      }
      effectiveCwd = pathValidation.resolvedPath;
    }

    // 4. Pastikan direktori kerja fisik tersedia di disk
    const fsSync = await import("fs");
    if (!fsSync.existsSync(effectiveCwd)) {
      fsSync.mkdirSync(effectiveCwd, { recursive: true });
    }

    // 5. Jalankan perintah terminal secara aman dengan batas timeout 20 detik dan buffer 2MB
    let result = await new Promise<{
      stdout: string;
      stderr: string;
      exitCode: number;
    }>((resolve) => {
      const shell = process.platform === "win32" ? "cmd.exe" : "/bin/bash";

      const child = exec(
        command,
        {
          cwd: effectiveCwd,
          shell,
          timeout: 20000,
          maxBuffer: 1024 * 1024 * 2, // 2MB buffer
          env: {
            ...process.env,
            PWD: effectiveCwd,
            HOME: effectiveCwd,
            TMPDIR: effectiveCwd,
            PAGER: "cat",
          },
        },
        (error, stdout, stderr) => {
          const exitCode = error ? (typeof error.code === "number" ? error.code : 1) : 0;
          resolve({
            stdout: stdout || "",
            stderr: stderr || (error && !stdout ? error.message : ""),
            exitCode,
          });
        }
      );
    });

    // Self-Healing Fallback: Jika stderr mendeteksi EROFS, re-route ke os.tmpdir() workspace dan jalankan ulang
    if (result.stderr.includes("EROFS") || result.stderr.includes("read-only file system")) {
      const os = await import("os");
      const fallbackDir = path.resolve(os.tmpdir(), "dna-workspaces", userWorkspace.userWorkspaceHash);
      fsSync.mkdirSync(fallbackDir, { recursive: true });
      effectiveCwd = fallbackDir;

      result = await new Promise<{
        stdout: string;
        stderr: string;
        exitCode: number;
      }>((resolve) => {
        const shell = process.platform === "win32" ? "cmd.exe" : "/bin/bash";
        exec(
          command,
          {
            cwd: fallbackDir,
            shell,
            timeout: 20000,
            maxBuffer: 1024 * 1024 * 2,
            env: {
              ...process.env,
              PWD: fallbackDir,
              HOME: fallbackDir,
              TMPDIR: fallbackDir,
              PAGER: "cat",
            },
          },
          (error, stdout, stderr) => {
            const exitCode = error ? (typeof error.code === "number" ? error.code : 1) : 0;
            resolve({
              stdout: stdout || "",
              stderr: stderr || (error && !stdout ? error.message : ""),
              exitCode,
            });
          }
        );
      });
    }

    return NextResponse.json({
      success: result.exitCode === 0,
      command,
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
      cwd: effectiveCwd,
      workspaceId: userWorkspace.userWorkspaceHash,
      isEphemeral: userWorkspace.isEphemeral,
      timestamp: Date.now(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Terjadi kesalahan pada terminal execution.",
      },
      { status: 500 }
    );
  }
}
