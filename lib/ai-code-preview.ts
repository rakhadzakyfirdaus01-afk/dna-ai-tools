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
  return html.replace(
    /<link\b[^>]*rel=["']stylesheet["'][^>]*>/gi,
    ""
  );
}

function removeExternalScripts(html: string): string {
  return html.replace(
    /<script\b[^>]*src=["'][^"']+["'][^>]*>\s*<\/script>/gi,
    ""
  );
}

function removeModuleScripts(html: string): string {
  return html.replace(
    /<script\b[^>]*type=["']module["'][^>]*>[\s\S]*?<\/script>/gi,
    ""
  );
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