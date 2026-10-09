import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import JSZip from "jszip";
import fs from "fs";
import path from "path";

import { authOptions } from "@/auth";

export type ExportFormat = "zip" | "apk" | "windows" | "linux" | "single-html";

type ExportFile = {
  path: string;
  content: string;
};

type ExportRequest = {
  projectName?: string;
  files?: ExportFile[];
  format?: ExportFormat;
};

const MAX_FILES = 100;
const MAX_PATH_LENGTH = 500;
const MAX_FILE_SIZE = 500000;
const MAX_TOTAL_SIZE = 5000000;

// Pre-compiled Standalone Native Windows Launcher (.exe) Base64
const WINDOWS_LAUNCHER_EXE_BASE64 =
  "TVqQAAMAAAAEAAAA//8AALgAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAA4fug4AtAnNIbgBTM0hVGhpcyBwcm9ncmFtIGNhbm5vdCBiZSBydW4gaW4gRE9TIG1vZGUuDQ0KJAAAAAAAAABQRQAATAEDAH/cyGoAAAAAAAAAAOAAAgELAQsAAAgAAAAIAAAAAAAA3icAAAAgAAAAQAAAAABAAAAgAAAAAgAABAAAAAAAAAAEAAAAAAAAAACAAAAAAgAAAAAAAAIAQIUAABAAABAAAAAAEAAAEAAAAAAAABAAAAAAAAAAAAAAAIQnAABXAAAAAEAAAAAFAAAAAAAAAAAAAAAAAAAAAAAAAGAAAAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAACAAAAAAAAAAAAAAACCAAAEgAAAAAAAAAAAAAAC50ZXh0AAAA5AcAAAAgAAAACAAAAAIAAAAAAAAAAAAAAAAAACAAAGAucnNyYwAAAAAFAAAAQAAAAAYAAAAKAAAAAAAAAAAAAAAAAABAAABALnJlbG9jAAAMAAAAAGAAAAACAAAAEAAAAAAAAAAAAAAAAAAAQAAAQgAAAAAAAAAAAAAAAAAAAADAJwAAAAAAAEgAAAACAAUAYCEAACQGAAABAAAAAQAABgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABswBADbAAAAAQAAESgEAAAKbwUAAAoKBnIBAABwKAYAAAoLBygHAAAKLRhyFwAAcHJ1AABwFh8wKAgAAAom3aMAAABymwAAcAcfXB8vbwkAAAooCgAACgxzCwAACg0Jcq0AAHBvDAAACglywwAAcAhy0wAAcCgNAAAKbw4AAAoJF28PAAAKCSgQAAAKJt5XJt4ACXIFAQBwbwwAAAoJKBAAAAom3kAm3gAIcxEAAAoTBBEEF28PAAAKEQQoEAAACibeIxMFchsBAHARBW8SAAAKKAoAAApyTQEAcBYfECgIAAAKJt4AKgABKAAAAAB6AAmDAAMBAAABAACGABSaAAMBAAABAAAAALe3ACMPAAABQlNKQgEAAQAAAAAADAAAAHY0LjAuMzAzMTkAAAAABQBsAAAAoAEAACN+AAAMAgAADAIAACNTdHJpbmdzAAAAABgEAABsAQAAI1VTAIQFAAAQAAAAI0dVSUQAAACUBQAAkAAAACNCbG9iAAAAAAAAAAIAAAFHFAIACQAAAAD6JTMAFgAAAQAAAA8AAAACAAAAAQAAABIAAAADAAAAAQAAAAEAAAADAAAAAAAKAAEAAAAAAAYARQA+AAYAcQBRAAYAlwBRAAYAxgA+AAYA2QA+AAYAEQEHAQYAHgEHAQoAPwEqAQoASgEqAQoAVwEqAQoAaQEqAQYAfQE+AA4ApgGTAQ4A5gGTAQYA9AE+AAAAAAABAAAAAAABAAEAgAEQAB8AJwAFAAEAAQBQIAAAAACRAEwACgABABEAkQAOABkAkQATACEAkQATACkA4wAcACkA9QAhADEAFgElADkAIwErAEEAeAEwAGEAhAE7AGEAjAElAGkAkQATAGkAtwFBAGEAjAFGAGkAxAFBAGkA0gFNAHEA7gFSAGkAkQBBAHkA/gEhACAAGwAXAC4ACwBlAC4AEwBuAFkABIAAAAAAAAAAAAAAAAAAAAAAtQAAAAQAAAAAAAAAAAAAAAEANQAAAAAABAAAAAAAAAAAAAAAAQAqAQAAAAAEAAAAAAAAAAAAAAABAD4AAAAAAAAAAAAAPE1vZHVsZT4AZG5hLWFwcC1sYXVuY2hlci5leGUAUHJvZ3JhbQBEbmFBaUxhdW5jaGVyAG1zY29ybGliAFN5c3RlbQBPYmplY3QATWFpbgBTeXN0ZW0uUnVudGltZS5Db21waWxlclNlcnZpY2VzAENvbXBpbGF0aW9uUmVsYXhhdGlvbnNBdHRyaWJ1dGUALmN0b3IAUnVudGltZUNvbXBhdGliaWxpdHlBdHRyaWJ1dGUAZG5hLWFwcC1sYXVuY2hlcgBTVEFUaHJlYWRBdHRyaWJ1dGUAQXBwRG9tYWluAGdldF9DdXJyZW50RG9tYWluAGdldF9CYXNlRGlyZWN0b3J5AFN5c3RlbS5JTwBQYXRoAENvbWJpbmUARmlsZQBFeGlzdHMAU3lzdGVtLldpbmRvd3MuRm9ybXMATWVzc2FnZUJveABEaWFsb2dSZXN1bHQATWVzc2FnZUJveEJ1dHRvbnMATWVzc2FnZUJveEljb24AU2hvdwBTdHJpbmcAUmVwbGFjZQBDb25jYXQAU3lzdGVtLkRpYWdub3N0aWNzAFByb2Nlc3NTdGFydEluZm8Ac2V0X0ZpbGVOYW1lAHNldF9Bcmd1bWVudHMAc2V0X1VzZVNoZWxsRXhlY3V0ZQBQcm9jZXNzAFN0YXJ0AEV4Y2VwdGlvbgBnZXRfTWVzc2FnZQAAAAAVaQBuAGQAZQB4AC4AaAB0AG0AbAAAXUYAaQBsAGUAIABpAG4AZABlAHgALgBoAHQAbQBsACAAdABpAGQAYQBrACAAZABpAHQAZQBtAHUAawBhAG4AIABkAGkAIABmAG8AbABkAGUAcgAgAGkAbgBpAC4AACVEAE4AQQAgAEEASQAgAEQAZQBzAGsAdABvAHAAIABBAHAAcAAAEWYAaQBsAGUAOgAvAC8ALwAAFW0AcwBlAGQAZwBlAC4AZQB4AGUAAA8tAC0AYQBwAHAAPQAiAAExIgAgAC0ALQB3AGkAbgBkAG8AdwAtAHMAaQB6AGUAPQAxADIAOAAwACwAOAAyADAAARVjAGgAcgBvAG0AZQAuAGUAeABlAAAxRwBhAGcAYQBsACAAbQBlAG0AYgB1AGsAYQAgAGEAcABsAGkAawBhAHMAaQA6ACAAAB1EAE4AQQAgAEEASQAgAEQAZQBzAGsAdABvAHAAAAC+b0Zvbx3BR7yQhQvNk8CLAAi3elxWGTTgiQMAAAEEIAEBCAMgAAEEAQAAAAQAABIVAyAADgUAAg4ODgQAAQIOCgAEESUODhEpES0FIAIOAwMEIAEBDgYAAw4ODg4EIAEBAgYAARI5EjULBwYODg4SNRI1Ej0IAQAIAAAAAAAeAQABAFQCFldyYXBOb25FeGNlcHRpb25UaHJvd3MBAAAArCcAAAAAAAAAAAAAzicAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAnAAAAAAAAAAAAAAAAAAAAAAAAAABfQ29yRXhlTWFpbgBtc2NvcmVlLmRsbAAAAAAA/yUAIEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAQAAAAIAAAgBgAAAA4AACAAAAAAAAAAAAAAAAAAAABAAEAAABQAACAAAAAAAAAAAAAAAAAAAABAAEAAABoAACAAAAAAAAAAAAAAAAAAAABAAAAAACAAAAAAAAAAAAAAAAAAAAAAAABAAAAAACQAAAAoEAAAGwCAAAAAAAAAAAAABBDAADqAQAAAAAAAAAAAABsAjQAAABWAFMAXwBWAEUAUgBTAEkATwBOAF8ASQBOAEYATwAAAAAAvQTv/gAAAQAAAAAAAAAAAAAAAAAAAAAAPwAAAAAAAAAEAAAAAQAAAAAAAAAAAAAAAAAAAEQAAAABAFYAYQByAEYAaQBsAGUASQBuAGYAbwAAAAAAJAAEAAAAVAByAGEAbgBzAGwAYQB0AGkAbwBuAAAAAAAAALAEzAEAAAEAUwB0AHIAaQBuAGcARgBpAGwAZQBJAG4AZgBvAAAAqAEAAAEAMAAwADAAMAAwADQAYgAwAAAALAACAAEARgBpAGwAZQBEAGUAcwBjAHIAaQBwAHQAaQBvAG4AAAAAACAAAAAwAAgAAQBGAGkAbABlAFYAZQByAHMAaQBvAG4AAAAAADAALgAwAC4AMAAuADAAAABMABUAAQBJAG4AdABlAHIAbgBhAGwATgBhAG0AZQAAAGQAbgBhAC0AYQBwAHAALQBsAGEAdQBuAGMAaABlAHIALgBlAHgAZQAAAAAAKAACAAEATABlAGcAYQBsAEMAbwBwAHkAcgBpAGcAaAB0AAAAIAAAAFQAFQABAE8AcgBpAGcAaQBuAGEAbABGAGkAbABlAG4AYQBtAGUAAABkAG4AYQAtAGEAcABwAC0AbABhAHUAbgBjAGgAZQByAC4AZQB4AGUAAAAAADQACAABAFAAcgBvAGQAdQBjAHQAVgBlAHIAcwBpAG8AbgAAADAALgAwAC4AMAAuADAAAAA4AAgAAQBBAHMAcwBlAG0AYgBsAHkAIABWAGUAcgBzAGkAbwBuAAAAMAAuADAALgAwAC4AMAAAAAAAAADvu788P3htbCB2ZXJzaW9uPSIxLjAiIGVuY29kaW5nPSJVVEYtOCIgc3RhbmRhbG9uZT0ieWVzIj8+DQo8YXNzZW1ibHkgeG1sbnM9InVybjpzY2hlbWFzLW1pY3Jvc29mdC1jb206YXNtLnYxIiBtYW5pZmVzdFZlcnNpb249IjEuMCI+DQogIDxhc3NlbWJseUlkZW50aXR5IHZlcnNpb249IjEuMC4wLjAiIG5hbWU9Ik15QXBwbGljYXRpb24uYXBwIi8+DQogIDx0cnVzdEluZm8geG1sbnM9InVybjpzY2hlbWFzLW1pY3Jvc29mdC1jb206YXNtLnYyIj4NCiAgICA8c2VjdXJpdHk+DQogICAgICA8cmVxdWVzdGVkUHJpdmlsZWdlcyB4bWxucz0idXJuOnNjaGVtYXMtbWljcm9zb2Z0LWNvbTphc20udjMiPg0KICAgICAgICA8cmVxdWVzdGVkRXhlY3V0aW9uTGV2ZWwgbGV2ZWw9ImFzSW52b2tlciIgdWlBY2Nlc3M9ImZhbHNlIi8+DQogICAgICA8L3JlcXVlc3RlZFByaXZpbGVnZXM+DQogICAgPC9zZWN1cml0eT4NCiAgPC90cnVzdEluZm8+DQo8L2Fzc2VtYmx5Pg0KAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAMAAAA4DcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

function getWindowsLauncherBuffer(): Buffer {
  const launcherPath = path.join(
    process.cwd(),
    "public",
    "templates",
    "dna-app-launcher.exe"
  );
  try {
    if (fs.existsSync(launcherPath)) {
      return fs.readFileSync(launcherPath);
    }
  } catch {}
  return Buffer.from(WINDOWS_LAUNCHER_EXE_BASE64, "base64");
}

function normalizePath(
  path: string
): string {
  return path
    .replace(/\\/g, "/")
    .replace(/^\.\/+/g, "")
    .replace(/^\/+/g, "")
    .replace(/\/+/g, "/")
    .trim();
}

function isSafePath(
  path: string
): boolean {
  if (!path) {
    return false;
  }

  if (
    path.includes("\0")
  ) {
    return false;
  }

  if (
    path.startsWith("/")
  ) {
    return false;
  }

  if (
    /^[a-zA-Z]:\//.test(path)
  ) {
    return false;
  }

  if (
    path.includes("://")
  ) {
    return false;
  }

  const segments =
    path.split("/");

  return !segments.some(
    (segment) =>
      segment === ".."
  );
}

function sanitizeProjectName(
  name: string
): string {
  const cleaned = name
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^\.+/, "")
    .replace(/\.+$/, "");

  return (
    cleaned.slice(0, 100) ||
    "ai-project"
  );
}

function parseRequestBody(
  body: unknown
): {
  projectName: string;
  files: ExportFile[];
  format: ExportFormat;
} {
  if (
    typeof body !== "object" ||
    body === null ||
    Array.isArray(body)
  ) {
    throw new Error(
      "Request body tidak valid."
    );
  }

  const request =
    body as ExportRequest;

  const projectName =
    typeof request.projectName ===
    "string"
      ? request.projectName
      : "ai-project";

  if (
    !Array.isArray(
      request.files
    )
  ) {
    throw new Error(
      "Daftar file project tidak ditemukan."
    );
  }

  if (
    request.files.length ===
    0
  ) {
    throw new Error(
      "Project tidak memiliki file."
    );
  }

  if (
    request.files.length >
    MAX_FILES
  ) {
    throw new Error(
      `Project memiliki terlalu banyak file. Maksimal ${MAX_FILES} file.`
    );
  }

  const files: ExportFile[] =
    [];

  const usedPaths =
    new Set<string>();

  let totalSize = 0;

  for (
    let index = 0;
    index <
    request.files.length;
    index++
  ) {
    const file =
      request.files[index];

    if (
      typeof file !==
        "object" ||
      file === null ||
      Array.isArray(file)
    ) {
      throw new Error(
        `File ke-${index + 1} tidak valid.`
      );
    }

    const rawPath =
      typeof file.path ===
      "string"
        ? file.path.trim()
        : "";

    const content =
      typeof file.content ===
      "string"
        ? file.content
        : "";

    if (!rawPath) {
      throw new Error(
        `File ke-${index + 1} tidak memiliki path.`
      );
    }

    if (
      rawPath.length >
      MAX_PATH_LENGTH
    ) {
      throw new Error(
        `Path file "${rawPath}" terlalu panjang.`
      );
    }

    if (!content) {
      throw new Error(
        `File "${rawPath}" tidak memiliki content.`
      );
    }

    if (
      content.length >
      MAX_FILE_SIZE
    ) {
      throw new Error(
        `File "${rawPath}" terlalu besar.`
      );
    }

    const path =
      normalizePath(
        rawPath
      );

    if (
      !isSafePath(path)
    ) {
      throw new Error(
        `Path file "${rawPath}" tidak aman.`
      );
    }

    const pathKey =
      path.toLowerCase();

    if (
      usedPaths.has(
        pathKey
      )
    ) {
      throw new Error(
        `File "${path}" terduplikasi.`
      );
    }

    usedPaths.add(
      pathKey
    );

    totalSize +=
      content.length;

    if (
      totalSize >
      MAX_TOTAL_SIZE
    ) {
      throw new Error(
        "Ukuran total project terlalu besar."
      );
    }

    files.push({
      path,
      content,
    });
  }

    const format: ExportFormat =
      request.format === "apk" ||
      request.format === "windows" ||
      request.format === "linux" ||
      request.format === "single-html"
        ? request.format
        : "zip";

    return {
      projectName:
        sanitizeProjectName(
          projectName
        ),
      files,
      format,
    };
  }

export async function POST(
  req: Request
) {
  try {
    const session =
      await getServerSession(
        authOptions
      );

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          error:
            "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    let body: unknown;

    try {
      body =
        await req.json();
    } catch {
      return NextResponse.json(
        {
          error:
            "Request body tidak valid.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      projectName,
      files,
      format,
    } =
      parseRequestBody(
        body
      );

    // ==========================================
    // 1. FORMAT: SINGLE STANDALONE HTML (.html)
    // ==========================================
    if (format === "single-html") {
      const htmlFile = files.find((f) => f.path.toLowerCase().endsWith(".html")) || files[0];
      const content = htmlFile?.content || "<!DOCTYPE html><html><body><h1>DNA AI App</h1></body></html>";
      const encoder = new TextEncoder();
      const htmlBuffer = encoder.encode(content);

      return new NextResponse(htmlBuffer as BodyInit, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition": `attachment; filename="${projectName}.html"`,
          "Content-Length": String(htmlBuffer.byteLength),
          "Cache-Control": "no-store",
        },
      });
    }

    // ==========================================
    // 2. FORMAT: ANDROID APK (.apk)
    // ==========================================
    if (format === "apk") {
      const apkPath = path.join(process.cwd(), "public", "dna-ai.apk");
      let apkBuffer: Uint8Array | null = null;

      if (fs.existsSync(apkPath)) {
        try {
          const templateBuffer = await fs.promises.readFile(apkPath);
          const zip = await JSZip.loadAsync(templateBuffer);

          // Masukkan seluruh project files ke dalam assets/www/ dan assets/
          for (const file of files) {
            zip.file(`assets/www/${file.path}`, file.content);
            zip.file(`assets/${file.path}`, file.content);
          }

          // Metadata aplikasi DNA AI
          zip.file(
            "assets/app-meta.json",
            JSON.stringify(
              {
                appName: projectName,
                package: `com.dnaai.${projectName.toLowerCase().replace(/[^a-z0-9]/g, "")}`,
                version: "1.0.0",
                exportedAt: new Date().toISOString(),
                generator: "DNA AI Universal Mobile Exporter",
              },
              null,
              2
            )
          );

          apkBuffer = await zip.generateAsync({
            type: "uint8array",
            compression: "DEFLATE",
            compressionOptions: { level: 6 },
          });
        } catch (apkErr) {
          console.warn("[Export APK] Failed to patch APK template, falling back to bundle:", apkErr);
        }
      }

      if (apkBuffer) {
        return new NextResponse(apkBuffer as BodyInit, {
          status: 200,
          headers: {
            "Content-Type": "application/vnd.android.package-archive",
            "Content-Disposition": `attachment; filename="${projectName}.apk"`,
            "Content-Length": String(apkBuffer.byteLength),
            "Cache-Control": "no-store",
          },
        });
      }

      // Fallback jika template tidak terbaca: buat Android PWA & Standalone WebAPK bundle
      const pwaZip = new JSZip();
      for (const file of files) {
        pwaZip.file(file.path, file.content);
      }
      pwaZip.file(
        "manifest.webmanifest",
        JSON.stringify(
          {
            name: projectName,
            short_name: projectName.slice(0, 12),
            start_url: "./index.html",
            display: "standalone",
            background_color: "#020617",
            theme_color: "#06B6D4",
          },
          null,
          2
        )
      );
      pwaZip.file(
        "README-ANDROID-INSTALL.txt",
        `=========================================================\nPANDUAN INSTALASI APLIKASI ANDROID (DNA AI)\n=========================================================\nNama Aplikasi : ${projectName}\n\nCARA MEMASANG DI HP ANDROID:\n1. Buka file index.html di browser Chrome di HP Android Anda.\n2. Klik menu titik tiga (⋮) di pojok kanan atas Chrome.\n3. Pilih "Tambahkan ke Layar Utama" (Install App).\n4. Aplikasi akan terpasang di HP Anda seperti aplikasi APK asli!\n\nGenerated with DNA AI Tools.\n`
      );

      const pwaBuffer = await pwaZip.generateAsync({
        type: "uint8array",
        compression: "DEFLATE",
      });

      return new NextResponse(pwaBuffer as BodyInit, {
        status: 200,
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="${projectName}-android-app.zip"`,
          "Content-Length": String(pwaBuffer.byteLength),
          "Cache-Control": "no-store",
        },
      });
    }

    // ==========================================
    // 3. FORMAT: WINDOWS DESKTOP APP (.zip)
    // ==========================================
    if (format === "windows") {
      const winZip = new JSZip();
      for (const file of files) {
        winZip.file(file.path, file.content);
      }

      // Injeksi Native Windows Executable (.exe) langsung siap pakai tanpa console
      const exeBuffer = getWindowsLauncherBuffer();
      winZip.file(`${projectName}.exe`, exeBuffer);

      // One-click batch launcher (native standalone frameless app mode)
      winZip.file(
        `run-${projectName}.bat`,
        `@echo off\r\ntitle ${projectName} - DNA AI Desktop App\r\ncd /d "%~dp0"\r\necho ===================================================\r\necho   Membuka Aplikasi Desktop: ${projectName}\r\necho   DNA AI Universal Desktop Runtime (Offline 100%%)\r\necho ===================================================\r\nstart "" "${projectName}.exe" || start msedge.exe --app="file:///%CD%/index.html" --window-size=1280,820 || start chrome.exe --app="file:///%CD%/index.html" --window-size=1280,820 || start index.html\r\nexit\r\n`
      );

      // Silent VBScript launcher (no black cmd window)
      winZip.file(
        `run-silent.vbs`,
        `Set WshShell = CreateObject("WScript.Shell")\r\nDim fso, currentDir\r\nSet fso = CreateObject("Scripting.FileSystemObject")\r\ncurrentDir = fso.GetAbsolutePathName(".")\r\ncurrentDir = Replace(currentDir, "\\", "/")\r\nWshShell.Run "cmd /c start msedge.exe --app=""file:///" & currentDir & "/index.html"" --window-size=1280,820", 0, False\r\n`
      );

      winZip.file(
        "package.json",
        JSON.stringify(
          {
            name: projectName.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
            version: "1.0.0",
            description: `${projectName} Desktop App generated by DNA AI Tools`,
            main: "index.html",
            author: "DNA AI Tools",
            scripts: {
              start: `start "" "${projectName}.exe"`,
            },
          },
          null,
          2
        )
      );

      winZip.file(
        "README-WINDOWS.txt",
        `=========================================================\r\nPANDUAN APLIKASI DESKTOP WINDOWS (DNA AI TOOLS)\r\n=========================================================\r\nNama Aplikasi : ${projectName}\r\nPlatform      : Windows 10 / 11 (Offline 100%%)\r\nExecutable    : ${projectName}.exe (Native Standalone)\r\n\r\nCARA MENJALANKAN (SANGAT MUDAH):\r\n1. Ekstrak seluruh isi file ZIP ini ke folder pilihan Anda di laptop/PC.\r\n2. KLIK GANDA LANGSUNG PADA FILE: ${projectName}.exe\r\n   Aplikasi langsung terbuka sebagai software desktop native mandiri!\r\n3. Alternatif: Anda juga bisa mengklik run-${projectName}.bat atau run-silent.vbs.\r\n\r\nFitur:\r\n- 100%% Offline tanpa perlu koneksi internet.\r\n- Tampilan frameless desktop mandiri (tanpa address bar browser).\r\n- Tanpa perlu install Node.js, Python, atau compiler apapun.\r\n\r\nGenerated with love by DNA AI Tools.\r\n`
      );

      const winBuffer = await winZip.generateAsync({
        type: "uint8array",
        compression: "DEFLATE",
        compressionOptions: { level: 6 },
      });

      return new NextResponse(winBuffer as BodyInit, {
        status: 200,
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="${projectName}-windows-app.zip"`,
          "Content-Length": String(winBuffer.byteLength),
          "Cache-Control": "no-store",
        },
      });
    }

    // ==========================================
    // 4. FORMAT: LINUX DESKTOP APP (.zip)
    // ==========================================
    if (format === "linux") {
      const linuxZip = new JSZip();
      for (const file of files) {
        linuxZip.file(file.path, file.content);
      }

      linuxZip.file(
        `run-${projectName}.sh`,
        `#!/usr/bin/env bash\nDIR="$( cd "$( dirname "\${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"\necho "Menjalankan aplikasi ${projectName}..."\nif command -v google-chrome &> /dev/null; then\n    google-chrome --app="file://$DIR/index.html" --window-size=1280,820 &\nelif command -v chromium &> /dev/null; then\n    chromium --app="file://$DIR/index.html" --window-size=1280,820 &\nelif command -v brave-browser &> /dev/null; then\n    brave-browser --app="file://$DIR/index.html" --window-size=1280,820 &\nelif command -v xdg-open &> /dev/null; then\n    xdg-open "$DIR/index.html" &\nelse\n    firefox "$DIR/index.html" &\nfi\n`
      );

      linuxZip.file(
        `${projectName}.desktop`,
        `[Desktop Entry]\nName=${projectName}\nComment=Aplikasi Desktop dibuat dengan DNA AI Tools\nExec=bash -c "$(dirname %k)/run-${projectName}.sh"\nIcon=applications-internet\nTerminal=false\nType=Application\nCategories=Utility;Application;\n`
      );

      linuxZip.file(
        "README-LINUX.txt",
        `=========================================================\nPANDUAN APLIKASI DESKTOP LINUX (DNA AI TOOLS)\n=========================================================\nNama Aplikasi : ${projectName}\nPlatform      : Linux (Ubuntu / Debian / Arch / Fedora)\n\nCARA MENJALANKAN:\n1. Ekstrak file ini di Linux Anda.\n2. Buka terminal di folder hasil ekstrak.\n3. Berikan izin eksekusi:\n   chmod +x run-${projectName}.sh\n4. Jalankan aplikasi:\n   ./run-${projectName}.sh\n\nGenerated with love by DNA AI Tools.\n`
      );

      const linuxBuffer = await linuxZip.generateAsync({
        type: "uint8array",
        compression: "DEFLATE",
        compressionOptions: { level: 6 },
      });

      return new NextResponse(linuxBuffer as BodyInit, {
        status: 200,
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="${projectName}-linux-app.zip"`,
          "Content-Length": String(linuxBuffer.byteLength),
          "Cache-Control": "no-store",
        },
      });
    }

    // ==========================================
    // 5. FORMAT: ZIP (Default Full Source Code)
    // ==========================================
    const zip =
      new JSZip();

    for (const file of files) {
      zip.file(
        file.path,
        file.content
      );
    }

    const zipBuffer =
      await zip.generateAsync({
        type: "uint8array",
        compression:
          "DEFLATE",
        compressionOptions: {
          level: 6,
        },
      });

    return new NextResponse(
      zipBuffer as BodyInit,
      {
        status: 200,

        headers: {
          "Content-Type":
            "application/zip",

          "Content-Disposition":
            `attachment; filename="${projectName}.zip"`,

          "Content-Length":
            String(
              zipBuffer.byteLength
            ),

          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "AI CODE EXPORT ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal membuat file ZIP project.",
      },
      {
        status: 500,
      }
    );
  }
}