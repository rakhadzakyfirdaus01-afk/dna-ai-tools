import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { exec } from "child_process";
import path from "path";
import { authOptions } from "@/auth";

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

    const body = await req.json();
    const command = typeof body.command === "string" ? body.command.trim() : "";
    const requestedCwd = typeof body.cwd === "string" ? body.cwd.trim() : "";

    if (!command) {
      return NextResponse.json(
        { error: "Command tidak boleh kosong." },
        { status: 400 }
      );
    }

    // Workspace working directory
    const workspaceDir = requestedCwd ? path.resolve(requestedCwd) : process.cwd();

    // Jalankan perintah terminal secara aman dengan timeout 20 detik
    const result = await new Promise<{
      stdout: string;
      stderr: string;
      exitCode: number;
    }>((resolve) => {
      // Gunakan PowerShell di Windows
      const shell = process.platform === "win32" ? "powershell.exe" : "/bin/bash";

      const child = exec(
        command,
        {
          cwd: workspaceDir,
          shell,
          timeout: 20000,
          maxBuffer: 1024 * 1024 * 2, // 2MB buffer
          env: {
            ...process.env,
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

    return NextResponse.json({
      success: result.exitCode === 0,
      command,
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
      cwd: workspaceDir,
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
