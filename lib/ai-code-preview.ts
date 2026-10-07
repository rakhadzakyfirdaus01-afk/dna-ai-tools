export type PreviewFile = {
  path: string;
  content: string;
};

function normalizePath(path: string): string {
  return path
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
    .replace(/^\/+/, "")
    .replace(/\/+/g, "/")
    .trim();
}

function getFileName(path: string): string {
  const normalized = normalizePath(path);
  const parts = normalized.split("/");
  return parts[parts.length - 1] ?? normalized;
}

function getDirectory(path: string): string {
  const normalized = normalizePath(path);
  const lastSlash = normalized.lastIndexOf("/");

  if (lastSlash === -1) {
    return "";
  }

  return normalized.slice(0, lastSlash);
}

function findFile(
  files: PreviewFile[],
  name: string
): PreviewFile | undefined {
  const target = normalizePath(name).toLowerCase();

  return files.find(
    (file) =>
      normalizePath(file.path).toLowerCase() === target
  );
}

function findFileByName(
  files: PreviewFile[],
  name: string
): PreviewFile | undefined {
  const target = name.toLowerCase();

  return files.find(
    (file) =>
      getFileName(file.path).toLowerCase() === target
  );
}

function findFilesByExtension(
  files: PreviewFile[],
  extension: string
): PreviewFile[] {
  const normalizedExtension = extension.toLowerCase();

  return files.filter((file) =>
    normalizePath(file.path)
      .toLowerCase()
      .endsWith(normalizedExtension)
  );
}

function findHtmlFile(
  files: PreviewFile[]
): PreviewFile | undefined {
  return (
    findFile(files, "index.html") ??
    findFileByName(files, "index.html") ??
    files.find((file) =>
      normalizePath(file.path)
        .toLowerCase()
        .endsWith(".html")
    )
  );
}

function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildCss(files: PreviewFile[]): string {
  const cssFiles = findFilesByExtension(files, ".css");

  if (cssFiles.length === 0) {
    return "";
  }

  return cssFiles
    .map(
      (file) => `
/* =========================================
   ${normalizePath(file.path)}
   ========================================= */
${file.content}
`
    )
    .join("\n");
}

function buildJavaScript(files: PreviewFile[]): string {
  const jsFiles = findFilesByExtension(files, ".js");

  if (jsFiles.length === 0) {
    return "";
  }

  return jsFiles
    .map(
      (file) => `
/* =========================================
   ${normalizePath(file.path)}
   ========================================= */
${file.content}
`
    )
    .join("\n");
}

function removeExternalStylesheets(html: string): string {
  // Hanya hapus stylesheet relatif lokal (karena sudah di-inline oleh buildCssWithAssets).
  // Pertahankan link stylesheet CDN eksternal (Google Fonts, CDN CSS, dll.).
  return html.replace(
    /<link\b[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi,
    (match, href) => {
      const trimmed = href.trim();
      if (
        trimmed.startsWith("http://") ||
        trimmed.startsWith("https://") ||
        trimmed.startsWith("//")
      ) {
        return match;
      }
      return "";
    }
  );
}

function removeExternalScripts(html: string): string {
  // Hanya hapus script tag yang mengarah ke file relatif lokal (karena sudah di-inline oleh buildJavaScript).
  // JANGAN PERNAH menghapus script CDN eksternal seperti Three.js, Tone.js, Tailwind, FontAwesome, dll.!
  return html.replace(
    /<script\b([^>]*)src=["']([^"']+)["']([^>]*)>\s*<\/script>/gi,
    (match, _before, src, _after) => {
      const trimmed = src.trim();
      if (
        trimmed.startsWith("http://") ||
        trimmed.startsWith("https://") ||
        trimmed.startsWith("//")
      ) {
        return match;
      }
      return "";
    }
  );
}

function removeModuleScripts(html: string): string {
  // Pertahankan module scripts karena penting untuk library modern & Three.js ES modules
  return html;
}

function removeDuplicatePreviewAssets(html: string): string {
  return html
    .replace(
      /<style\b[^>]*data-ai-code-preview=["']true["'][^>]*>[\s\S]*?<\/style>/gi,
      ""
    )
    .replace(
      /<script\b[^>]*data-ai-code-preview=["']true["'][^>]*>[\s\S]*?<\/script>/gi,
      ""
    )
    .replace(
      /<script\b[^>]*data-ai-code-preview-runtime=["']true["'][^>]*>[\s\S]*?<\/script>/gi,
      ""
    )
    .replace(
      /<script\b[^>]*data-ai-code-preview-storage=["']true["'][^>]*>[\s\S]*?<\/script>/gi,
      ""
    );
}

function removeUnsupportedExternalAssets(html: string): string {
  let result = html;

  result = result.replace(
    /<link\b[^>]*href=["']https?:\/\/[^"']+["'][^>]*>/gi,
    (match) => {
      if (
        /\brel=["']icon["']/i.test(match) ||
        /\brel=["']manifest["']/i.test(match)
      ) {
        return "";
      }

      return match;
    }
  );

  return result;
}

function normalizeHtml(html: string): string {
  const trimmed = html.trim();

  if (
    /<!doctype\s+html/i.test(trimmed) ||
    /<html[\s>]/i.test(trimmed)
  ) {
    return trimmed;
  }

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />
  <title>AI Code Preview</title>
  <style>
    html,
    body {
      margin: 0;
      padding: 0;
      min-height: 100%;
    }

    body {
      min-height: 100vh;
    }
  </style>
</head>
<body>
${trimmed}
</body>
</html>
`.trim();
}

function injectCss(
  html: string,
  css: string
): string {
  if (!css.trim()) {
    return html;
  }

  const styleBlock = `
<style data-ai-code-preview="true">
${css}
</style>
`;

  if (/<\/head>/i.test(html)) {
    return html.replace(
      /<\/head>/i,
      `${styleBlock}\n</head>`
    );
  }

  return `
<head>
${styleBlock}
</head>
${html}
`;
}

function injectTailwindAndFonts(html: string): string {
  let result = html;

  const fontAndTailwindBlock = `
  <!-- DNA AI Sandbox Modern Runtime: Tailwind & Fonts -->
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            cyber: {
              cyan: '#06B6D4',
              neon: '#22D3EE',
              dark: '#0B1120',
              card: '#0F172A',
            }
          }
        }
      }
    }
  </script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Orbitron:wght@500;700;900&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
    }
    .font-cyber {
      font-family: 'Orbitron', monospace, sans-serif;
    }
  </style>
`;

  if (/<\/head>/i.test(result)) {
    return result.replace(/<\/head>/i, `${fontAndTailwindBlock}\n</head>`);
  } else if (/<head[\s>]/i.test(result)) {
    return result.replace(/<head([^>]*)>/i, `<head$1>\n${fontAndTailwindBlock}`);
  } else if (/<body[\s>]/i.test(result)) {
    return result.replace(/<body([^>]*)>/i, `<head>${fontAndTailwindBlock}</head>\n<body$1>`);
  }

  return `${fontAndTailwindBlock}\n${result}`;
}


function injectPreviewStorage(html: string): string {
  const storageScript = `
<script data-ai-code-preview-storage="true">
(function () {
  "use strict";

  function createMemoryStorage() {
    var data = Object.create(null);

    return {
      getItem: function (key) {
        key = String(key);

        return Object.prototype.hasOwnProperty.call(data, key)
          ? data[key]
          : null;
      },

      setItem: function (key, value) {
        data[String(key)] = String(value);
      },

      removeItem: function (key) {
        delete data[String(key)];
      },

      clear: function () {
        data = Object.create(null);
      },

      key: function (index) {
        var keys = Object.keys(data);
        return keys[index] || null;
      },

      get length() {
        return Object.keys(data).length;
      }
    };
  }

  var memoryStorage = createMemoryStorage();

  try {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      enumerable: true,
      value: memoryStorage
    });
  } catch (error) {
    try {
      window.localStorage = memoryStorage;
    } catch (assignmentError) {
      console.warn(
        "[AI Code Preview] localStorage fallback could not be installed.",
        assignmentError
      );
    }
  }

  try {
    Object.defineProperty(window, "sessionStorage", {
      configurable: true,
      enumerable: true,
      value: memoryStorage
    });
  } catch (error) {
    try {
      window.sessionStorage = memoryStorage;
    } catch (assignmentError) {
      console.warn(
        "[AI Code Preview] sessionStorage fallback could not be installed.",
        assignmentError
      );
    }
  }
})();
</script>
`;

  if (/<head[\s>]/i.test(html)) {
    if (/<\/head>/i.test(html)) {
      return html.replace(
        /<\/head>/i,
        `${storageScript}\n</head>`
      );
    }

    return html.replace(
      /<head([^>]*)>/i,
      `<head$1>${storageScript}`
    );
  }

  return `${storageScript}\n${html}`;
}

function injectJavaScript(
  html: string,
  javascript: string
): string {
  if (!javascript.trim()) {
    return html;
  }

  const scriptBlock = `
<script data-ai-code-preview="true">
${javascript}
</script>
`;

  if (/<\/body>/i.test(html)) {
    return html.replace(
      /<\/body>/i,
      `${scriptBlock}\n</body>`
    );
  }

  return `${html}\n${scriptBlock}`;
}

function injectPreviewRuntime(html: string): string {
  const runtime = `
<script data-ai-code-preview-runtime="true">
(function () {
  // 1. Tangani CSS .hidden override agar modal game tertutup sempurna
  try {
    const style = document.createElement("style");
    style.textContent = ".hidden { display: none !important; }";
    document.head.appendChild(style);
  } catch (e) {}

  // 2. Klik pada canvas/layar otomatis fokuskan iframe agar keyboard WASD/Panah/Spasi langsung aktif
  window.addEventListener("pointerdown", function () {
    try { window.focus(); } catch (e) {}
  });

  // 3. Polyfill protektif Three.js (Mencegah Layar Hitam dari Bug Matrix/localToWorld)
  function setupThreeGuards() {
    if (window.THREE && window.THREE.Object3D) {
      // Patch localToWorld jika dipanggil dengan 2 parameter oleh AI (offset, target)
      const origLocalToWorld = window.THREE.Object3D.prototype.localToWorld;
      window.THREE.Object3D.prototype.localToWorld = function (vector, target) {
        const res = origLocalToWorld.call(this, vector);
        if (target && typeof target.copy === "function") {
          target.copy(res);
        }
        return res;
      };

      // Patch Camera.lookAt agar tidak menghasilkan NaN jika kamera lookAt ke koordinat dirinya sendiri
      if (window.THREE.Camera) {
        const origLookAt = window.THREE.Camera.prototype.lookAt;
        window.THREE.Camera.prototype.lookAt = function (x, y, z) {
          try {
            let target;
            if (x && typeof x === "object") {
              target = x;
            } else {
              target = new window.THREE.Vector3(x, y, z);
            }
            if (this.position.distanceTo(target) < 0.0001) {
              return; // Mencegah zero-length direction vector yang merusak matriks jadi NaN
            }
          } catch (e) {}
          return origLookAt.apply(this, arguments);
        };
      }
    } else {
      setTimeout(setupThreeGuards, 50);
    }
  }
  setupThreeGuards();

  window.addEventListener(
    "error",
    function (event) {
      console.error(
        "[AI Code Preview]",
        event.error || event.message
      );
    }
  );

  window.addEventListener(
    "unhandledrejection",
    function (event) {
      console.error(
        "[AI Code Preview]",
        event.reason
      );
    }
  );
})();
</script>
`;

  if (/<\/body>/i.test(html)) {
    return html.replace(
      /<\/body>/i,
      `${runtime}\n</body>`
    );
  }

  return `${html}\n${runtime}`;
}

function resolveRelativePath(
  fromFile: string,
  targetPath: string
): string {
  const cleanTarget = targetPath
    .split("?")[0]
    .split("#")[0]
    .replace(/\\/g, "/");

  if (
    cleanTarget.startsWith("http://") ||
    cleanTarget.startsWith("https://") ||
    cleanTarget.startsWith("data:") ||
    cleanTarget.startsWith("blob:") ||
    cleanTarget.startsWith("mailto:") ||
    cleanTarget.startsWith("tel:") ||
    cleanTarget.startsWith("#")
  ) {
    return cleanTarget;
  }

  const fromDirectory = getDirectory(fromFile);

  const combined = fromDirectory
    ? `${fromDirectory}/${cleanTarget}`
    : cleanTarget;

  const parts = combined.split("/");
  const resolved: string[] = [];

  for (const part of parts) {
    if (!part || part === ".") {
      continue;
    }

    if (part === "..") {
      resolved.pop();
      continue;
    }

    resolved.push(part);
  }

  return resolved.join("/");
}

function createFileLookup(
  files: PreviewFile[]
): Map<string, PreviewFile> {
  const lookup = new Map<string, PreviewFile>();

  for (const file of files) {
    const normalized =
      normalizePath(file.path).toLowerCase();

    lookup.set(normalized, file);
  }

  return lookup;
}

function findMatchingFile(
  lookup: Map<string, PreviewFile>,
  requestedPath: string
): PreviewFile | undefined {
  const normalized =
    normalizePath(requestedPath).toLowerCase();

  const direct = lookup.get(normalized);

  if (direct) {
    return direct;
  }

  const withoutDotSlash =
    normalized.replace(/^\.\//, "");

  const second =
    lookup.get(withoutDotSlash);

  if (second) {
    return second;
  }

  return undefined;
}

function inlineLocalCssUrls(
  css: string,
  cssFile: PreviewFile,
  files: PreviewFile[],
  lookup: Map<string, PreviewFile>
): string {
  return css.replace(
    /url\(\s*(['"]?)([^'")]+)\1\s*\)/gi,
    (
      fullMatch,
      _quote,
      url
    ) => {
      const target = String(url).trim();

      if (
        !target ||
        target.startsWith("data:") ||
        target.startsWith("http://") ||
        target.startsWith("https://") ||
        target.startsWith("//") ||
        target.startsWith("#")
      ) {
        return fullMatch;
      }

      const resolvedPath =
        resolveRelativePath(
          cssFile.path,
          target
        );

      const targetFile =
        findMatchingFile(
          lookup,
          resolvedPath
        );

      if (!targetFile) {
        return fullMatch;
      }

      const extension =
        getFileName(targetFile.path)
          .split(".")
          .pop()
          ?.toLowerCase();

      if (extension === "svg") {
        const svg =
          targetFile.content.trim();

        if (svg.startsWith("<svg")) {
          return `url("data:image/svg+xml,${encodeURIComponent(
            svg
          )}")`;
        }
      }

      return fullMatch;
    }
  );
}

function buildCssWithAssets(
  files: PreviewFile[]
): string {
  const cssFiles =
    findFilesByExtension(files, ".css");

  if (cssFiles.length === 0) {
    return "";
  }

  const lookup =
    createFileLookup(files);

  return cssFiles
    .map((file) => {
      const css =
        inlineLocalCssUrls(
          file.content,
          file,
          files,
          lookup
        );

      return `
/* =========================================
   ${normalizePath(file.path)}
   ========================================= */
${css}
`;
    })
    .join("\n");
}

function inlineHtmlSvgImages(
  html: string,
  htmlFile: PreviewFile,
  files: PreviewFile[]
): string {
  const lookup =
    createFileLookup(files);

  return html.replace(
    /(<img\b[^>]*\bsrc=["'])([^"']+)(["'][^>]*>)/gi,
    (
      fullMatch,
      prefix,
      src,
      suffix
    ) => {
      const target =
        String(src).trim();

      if (
        target.startsWith("data:") ||
        target.startsWith("http://") ||
        target.startsWith("https://") ||
        target.startsWith("//")
      ) {
        return fullMatch;
      }

      const resolvedPath =
        resolveRelativePath(
          htmlFile.path,
          target
        );

      const targetFile =
        findMatchingFile(
          lookup,
          resolvedPath
        );

      if (!targetFile) {
        return fullMatch;
      }

      if (
        !getFileName(targetFile.path)
          .toLowerCase()
          .endsWith(".svg")
      ) {
        return fullMatch;
      }

      const svg =
        targetFile.content.trim();

      if (!svg.startsWith("<svg")) {
        return fullMatch;
      }

      const dataUrl =
        `data:image/svg+xml,${encodeURIComponent(svg)}`;

      return `${prefix}${escapeHtmlAttribute(
        dataUrl
      )}${suffix}`;
    }
  );
}

function inlineHtmlLocalImages(
  html: string,
  htmlFile: PreviewFile,
  files: PreviewFile[]
): string {
  const lookup =
    createFileLookup(files);

  return html.replace(
    /(<img\b[^>]*\bsrc=["'])([^"']+)(["'][^>]*>)/gi,
    (
      fullMatch,
      _prefix,
      src,
      _suffix
    ) => {
      const target =
        String(src).trim();

      if (
        target.startsWith("data:") ||
        target.startsWith("http://") ||
        target.startsWith("https://") ||
        target.startsWith("//")
      ) {
        return fullMatch;
      }

      const resolvedPath =
        resolveRelativePath(
          htmlFile.path,
          target
        );

      const targetFile =
        findMatchingFile(
          lookup,
          resolvedPath
        );

      if (!targetFile) {
        return fullMatch;
      }

      const lowerName =
        getFileName(
          targetFile.path
        ).toLowerCase();

      if (lowerName.endsWith(".svg")) {
        return fullMatch;
      }

      return fullMatch;
    }
  );
}

function cleanupGeneratedHtml(
  html: string
): string {
  let result = html;

  result =
    removeDuplicatePreviewAssets(result);

  result =
    removeExternalStylesheets(result);

  result =
    removeExternalScripts(result);

  result =
    removeModuleScripts(result);

  result =
    removeUnsupportedExternalAssets(result);

  return result;
}

function normalizeProjectFiles(
  files: PreviewFile[]
): PreviewFile[] {
  if (!Array.isArray(files)) {
    return [];
  }

  return files
    .filter(
      (file) =>
        file &&
        typeof file.path === "string" &&
        typeof file.content === "string" &&
        file.path.trim() !== ""
    )
    .map((file) => ({
      path: normalizePath(file.path),
      content: file.content,
    }));
}

export function buildPreviewHtml(
  files: PreviewFile[]
): string {
  const normalizedFiles =
    normalizeProjectFiles(files);

  if (normalizedFiles.length === 0) {
    return "";
  }

  const htmlFile =
    findHtmlFile(normalizedFiles);

  if (!htmlFile) {
    return "";
  }

  let html =
    normalizeHtml(htmlFile.content);

  html =
    cleanupGeneratedHtml(html);

  html =
    inlineHtmlSvgImages(
      html,
      htmlFile,
      normalizedFiles
    );

  html =
    inlineHtmlLocalImages(
      html,
      htmlFile,
      normalizedFiles
    );

  /*
   * Jangan menggunakan <base href="/">
   * di Live Preview.
   *
   * Jika digunakan, link seperti:
   *   href="#games"
   *
   * dapat diarahkan ke halaman utama
   * aplikasi DNA AI Tools.
   *
   * Karena CSS dan JavaScript project
   * sudah di-inline ke dalam preview,
   * base URL tidak diperlukan.
   */

  const css =
    buildCssWithAssets(normalizedFiles);

  const javascript =
    buildJavaScript(normalizedFiles);

  html =
    injectTailwindAndFonts(html);

  html =
    injectCss(
      html,
      css
    );


  /*
   * Storage fallback harus masuk
   * SEBELUM JavaScript project dijalankan.
   */
  html =
    injectPreviewStorage(html);

  html =
    injectJavaScript(
      html,
      javascript
    );

  html =
    injectPreviewRuntime(html);

  return html.trim();
}

export function getInitialPreviewFile(
  files: PreviewFile[]
): PreviewFile | null {
  const normalizedFiles =
    normalizeProjectFiles(files);

  if (normalizedFiles.length === 0) {
    return null;
  }

  return (
    findHtmlFile(normalizedFiles) ??
    normalizedFiles[0] ??
    null
  );
}

export function canPreviewProject(
  files: PreviewFile[]
): boolean {
  const normalizedFiles =
    normalizeProjectFiles(files);

  if (normalizedFiles.length === 0) {
    return false;
  }

  return normalizedFiles.some(
    (file) =>
      normalizePath(file.path)
        .toLowerCase()
        .endsWith(".html")
  );
}

export function getPreviewFiles(
  files: PreviewFile[]
): PreviewFile[] {
  return normalizeProjectFiles(files);
}