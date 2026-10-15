import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import { authOptions } from "@/auth";
import { WorkspaceManager } from "@/lib/antigravity/workspace-manager";
import { SecurityGate } from "@/lib/antigravity/security-gate";

export const dynamic = "force-dynamic";

export interface WorkspaceFileEntry {
  name: string;
  path: string; // Relatif dari workspace root
  isDirectory: boolean;
  size?: number;
  updatedAt?: number;
  children?: WorkspaceFileEntry[];
}

/**
 * Scan direktori workspace pengguna secara rekursif
 */
async function scanWorkspaceTree(dir: string, baseDir: string, depth = 0): Promise<WorkspaceFileEntry[]> {
  if (depth > 6) return [];
  const entries: WorkspaceFileEntry[] = [];

  try {
    const dirEntries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of dirEntries) {
      if (entry.name.startsWith(".git") || entry.name === "node_modules" || entry.name === ".next") {
        continue;
      }

      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, "/");

      if (entry.isDirectory()) {
        const children = await scanWorkspaceTree(fullPath, baseDir, depth + 1);
        entries.push({
          name: entry.name,
          path: relativePath,
          isDirectory: true,
          children,
        });
      } else if (entry.isFile()) {
        try {
          const stat = await fs.stat(fullPath);
          entries.push({
            name: entry.name,
            path: relativePath,
            isDirectory: false,
            size: stat.size,
            updatedAt: stat.mtimeMs,
          });
        } catch {
          entries.push({
            name: entry.name,
            path: relativePath,
            isDirectory: false,
          });
        }
      }
    }
  } catch {}

  // Sort directories first, then alphabetically
  return entries.sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    return a.name.localeCompare(b.name);
  });
}

/**
 * GET: Mengambil struktur pohon berkas di dalam workspace pengguna
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.email || (session?.user as any)?.id || "dev-user";

    const workspace = await WorkspaceManager.getOrCreateWorkspace(userId);
    const tree = await scanWorkspaceTree(workspace.workspaceDir, workspace.workspaceDir);

    return NextResponse.json({
      success: true,
      workspaceId: workspace.userWorkspaceHash,
      workspaceDir: workspace.workspaceDir,
      isEphemeral: workspace.isEphemeral,
      tree,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * POST: Operasi file di dalam workspace (read, write, create, delete)
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.email || (session?.user as any)?.id || "dev-user";
    const body = await req.json();
    const action = body.action || "read";
    const filePath = typeof body.filePath === "string" ? body.filePath.trim() : "";

    if (!filePath) {
      return NextResponse.json({ success: false, error: "Path file tidak boleh kosong." }, { status: 400 });
    }

    // Validasi keamanan traversal
    const pathValidation = await WorkspaceManager.resolveAndValidatePath(userId, filePath);
    if (!pathValidation.isWithinWorkspace) {
      return NextResponse.json({ success: false, error: pathValidation.reason || "Akses ke luar workspace ditolak." }, { status: 403 });
    }

    const resolvedPath = pathValidation.resolvedPath;

    // 1. READ FILE
    if (action === "read") {
      let targetPath = resolvedPath;
      if (!fsSync.existsSync(targetPath)) {
        // Fallback ke project root (read-only) jika file tidak ada di sandbox
        const projectCandidate = path.resolve(process.cwd(), filePath);
        const sec = SecurityGate.checkFileAccess(filePath, "read");
        if (sec.allowed && fsSync.existsSync(projectCandidate)) {
          targetPath = projectCandidate;
        } else {
          return NextResponse.json({ success: false, error: `Berkas '${filePath}' tidak ditemukan di workspace.` }, { status: 404 });
        }
      }

      const content = await fs.readFile(targetPath, "utf-8");
      return NextResponse.json({
        success: true,
        filePath,
        content,
        resolvedPath: targetPath,
      });
    }

    // 2. WRITE FILE
    if (action === "write") {
      const content = typeof body.content === "string" ? body.content : "";
      const sec = SecurityGate.checkFileAccess(filePath, "write", userId);
      if (!sec.allowed) {
        return NextResponse.json({ success: false, error: sec.reason }, { status: 403 });
      }

      await fs.mkdir(path.dirname(resolvedPath), { recursive: true });
      await fs.writeFile(resolvedPath, content, "utf-8");

      return NextResponse.json({
        success: true,
        filePath,
        bytesWritten: Buffer.byteLength(content),
      });
    }

    // 3. CREATE FILE / FOLDER
    if (action === "create") {
      const isDirectory = Boolean(body.isDirectory);
      if (isDirectory) {
        await fs.mkdir(resolvedPath, { recursive: true });
      } else {
        await fs.mkdir(path.dirname(resolvedPath), { recursive: true });
        if (!fsSync.existsSync(resolvedPath)) {
          await fs.writeFile(resolvedPath, body.content || "", "utf-8");
        }
      }
      return NextResponse.json({ success: true, filePath, isDirectory });
    }

    // 4. DELETE FILE
    if (action === "delete") {
      if (fsSync.existsSync(resolvedPath)) {
        const stat = await fs.stat(resolvedPath);
        if (stat.isDirectory()) {
          await fs.rm(resolvedPath, { recursive: true, force: true });
        } else {
          await fs.unlink(resolvedPath);
        }
      }
      return NextResponse.json({ success: true, filePath });
    }

    return NextResponse.json({ success: false, error: `Aksi '${action}' tidak dikenal.` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
