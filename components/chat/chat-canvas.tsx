"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  X,
  RotateCw,
  Copy,
  Check,
  Download,
  Maximize2,
  Minimize2,
  Code2,
  Eye,
  Monitor,
  Tablet,
  Smartphone,
  ExternalLink,
  Sparkles,
} from "lucide-react";

export interface CanvasArtifact {
  id?: string;
  title: string;
  code: string;
  language: string;
}

interface ChatCanvasProps {
  isOpen: boolean;
  onClose: () => void;
  artifact: CanvasArtifact | null;
  onUpdateCode?: (code: string) => void;
  isEnglish?: boolean;
}

type DeviceMode = "desktop" | "tablet" | "mobile";

export function ChatCanvas({
  isOpen,
  onClose,
  artifact,
  onUpdateCode,
  isEnglish = false,
}: ChatCanvasProps) {
  const [activeTab, setActiveTab] = useState<"preview" | "code">("preview");
  const [deviceMode, setDeviceMode] = useState<DeviceMode>("desktop");
  const [isMaximized, setIsMaximized] = useState(false);
  const [copied, setCopied] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Reset tab to preview when artifact changes
  useEffect(() => {
    if (artifact) {
      setActiveTab("preview");
      setIframeKey((prev) => prev + 1);
    }
  }, [artifact?.code]);

  if (!isOpen || !artifact) return null;

  const { title, code, language } = artifact;
  const isReactOrJsx =
    language.toLowerCase().includes("react") ||
    language.toLowerCase().includes("jsx") ||
    language.toLowerCase().includes("tsx") ||
    code.includes("import React") ||
    code.includes("export default function") ||
    code.includes("const [") ||
    code.includes("return (");

  const isSvg =
    language.toLowerCase() === "svg" ||
    (code.trim().startsWith("<svg") && code.trim().endsWith("</svg>"));

  // Build the live sandboxed HTML srcDoc
  const previewHtml = useMemo(() => {
    if (isSvg) {
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #0f172a;
      background-image: radial-gradient(#1e293b 1px, transparent 1px);
      background-size: 16px 16px;
      padding: 24px;
    }
    svg {
      max-width: 100%;
      max-height: 80vh;
      filter: drop-shadow(0 10px 25px rgba(0,0,0,0.5));
    }
  </style>
</head>
<body>
  ${code}
</body>
</html>`;
    }

    if (isReactOrJsx) {
      // Clean export/import statements for standalone in-browser Babel execution
      const cleanReactCode = code
        .replace(/import\s+.*?from\s+['"].*?['"];?/g, "")
        .replace(/export\s+default\s+function\s+(\w+)/g, "function $1")
        .replace(/export\s+default\s+(\w+);?/g, "const __RootComponent = $1;")
        .replace(/export\s+/g, "");

      // Extract component name or default
      const funcMatch = cleanReactCode.match(/function\s+([A-Z]\w*)/);
      const rootComponentName = funcMatch ? funcMatch[1] : "__RootComponent";

      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title || "Live Canvas Preview"}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background-color: #ffffff;
      color: #0f172a;
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    try {
      const { useState, useEffect, useRef, useMemo, useCallback } = React;
      ${cleanReactCode}

      const Target = typeof ${rootComponentName} !== "undefined" ? ${rootComponentName} : (typeof App !== "undefined" ? App : null);
      if (Target) {
        ReactDOM.createRoot(document.getElementById('root')).render(<Target />);
      } else {
        document.getElementById('root').innerHTML = '<div style="padding: 20px; color: red;">Error: No React root component found.</div>';
      }
    } catch (err) {
      document.getElementById('root').innerHTML = '<div style="padding: 24px; color: #dc2626; font-family: monospace;"><b>Runtime Error:</b><br>' + err.message + '</div>';
    }
  </script>
</body>
</html>`;
    }

    // Standard HTML with Tailwind & CSS/JS
    let fullHtml = code;
    if (!code.includes("<html") && !code.includes("<body")) {
      fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title || "Canvas Preview"}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body {
      margin: 0;
      padding: 16px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
  </style>
</head>
<body>
  ${code}
</body>
</html>`;
    } else if (!code.includes("cdn.tailwindcss.com")) {
      // Inject Tailwind into head if not present
      fullHtml = fullHtml.replace(
        /<head>/i,
        `<head><script src="https://cdn.tailwindcss.com"></script>`
      );
    }

    return fullHtml;
  }, [code, isReactOrJsx, isSvg, title]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleDownload = () => {
    const ext = isReactOrJsx ? "tsx" : isSvg ? "svg" : "html";
    const mime = isSvg ? "image/svg+xml" : "text/plain";
    const blob = new Blob([code], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(title || "canvas-artifact").replace(/[^a-zA-Z0-9_-]/g, "_")}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Device width constraints for preview simulator
  const deviceWidthClass = {
    desktop: "w-full",
    tablet: "w-[768px] max-w-full shadow-2xl rounded-xl border border-zinc-700/80 my-4",
    mobile: "w-[375px] max-w-full shadow-2xl rounded-2xl border border-zinc-700/80 my-4",
  }[deviceMode];

  return (
    <div
      className={`fixed lg:relative inset-y-0 right-0 z-50 lg:z-10 flex flex-col bg-[#18181b] border-l border-zinc-800 shadow-2xl transition-all duration-300 ${
        isMaximized
          ? "w-full lg:w-[85vw]"
          : "w-full sm:w-[540px] xl:w-[680px]"
      } h-full overflow-hidden`}
    >
      {/* 1. Header Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#1f1f23] border-b border-zinc-800/90 text-zinc-200">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Sparkles size={14} className="animate-pulse" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-semibold text-zinc-100 truncate flex items-center gap-1.5">
              <span>{title || (isEnglish ? "Canvas Artifact" : "Live Canvas")}</span>
              <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-mono text-zinc-400 uppercase">
                {language || "HTML"}
              </span>
            </h3>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1">
          {/* Refresh Preview */}
          {activeTab === "preview" && (
            <button
              type="button"
              onClick={() => setIframeKey((k) => k + 1)}
              className="p-1.5 text-zinc-400 hover:text-zinc-100 rounded-lg hover:bg-zinc-800 transition"
              title={isEnglish ? "Reload Preview" : "Muat Ulang Preview"}
            >
              <RotateCw size={14} />
            </button>
          )}

          {/* Copy Code */}
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 text-xs text-zinc-300 hover:text-white rounded-lg hover:bg-zinc-800 transition"
            title={isEnglish ? "Copy Code" : "Salin Kode"}
          >
            {copied ? (
              <>
                <Check size={13} className="text-emerald-400" />
                <span className="text-[11px] text-emerald-400 font-medium">
                  {isEnglish ? "Copied" : "Tersalin"}
                </span>
              </>
            ) : (
              <>
                <Copy size={13} />
                <span className="text-[11px] hidden sm:inline">
                  {isEnglish ? "Copy" : "Salin"}
                </span>
              </>
            )}
          </button>

          {/* Download */}
          <button
            type="button"
            onClick={handleDownload}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 rounded-lg hover:bg-zinc-800 transition"
            title={isEnglish ? "Download file" : "Unduh File"}
          >
            <Download size={14} />
          </button>

          {/* Maximize Toggle */}
          <button
            type="button"
            onClick={() => setIsMaximized((prev) => !prev)}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 rounded-lg hover:bg-zinc-800 transition hidden sm:inline-flex"
            title={isMaximized ? (isEnglish ? "Restore" : "Kecilkan") : (isEnglish ? "Maximize" : "Perbesar")}
          >
            {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>

          {/* Close Canvas */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition ml-1"
            title={isEnglish ? "Close Canvas" : "Tutup Canvas"}
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* 2. Sub-Header: Mode Switcher (Preview vs Code) + Device Simulator */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#18181b] border-b border-zinc-800/70 text-xs">
        {/* Tab Buttons */}
        <div className="flex items-center gap-1 rounded-lg bg-zinc-900/90 p-0.5 border border-zinc-800">
          <button
            type="button"
            onClick={() => setActiveTab("preview")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition ${
              activeTab === "preview"
                ? "bg-zinc-800 text-cyan-300 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Eye size={13} />
            <span>{isEnglish ? "Preview" : "Pratinjau Live"}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("code")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition ${
              activeTab === "code"
                ? "bg-zinc-800 text-cyan-300 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Code2 size={13} />
            <span>{isEnglish ? "Code" : "Kode"}</span>
          </button>
        </div>

        {/* Device Simulator (in Preview Mode) */}
        {activeTab === "preview" && (
          <div className="flex items-center gap-1 text-zinc-400">
            <button
              type="button"
              onClick={() => setDeviceMode("desktop")}
              className={`p-1 rounded hover:bg-zinc-800 transition ${
                deviceMode === "desktop" ? "text-cyan-400 bg-zinc-800/80" : ""
              }`}
              title="Desktop View"
            >
              <Monitor size={14} />
            </button>
            <button
              type="button"
              onClick={() => setDeviceMode("tablet")}
              className={`p-1 rounded hover:bg-zinc-800 transition ${
                deviceMode === "tablet" ? "text-cyan-400 bg-zinc-800/80" : ""
              }`}
              title="Tablet View (768px)"
            >
              <Tablet size={14} />
            </button>
            <button
              type="button"
              onClick={() => setDeviceMode("mobile")}
              className={`p-1 rounded hover:bg-zinc-800 transition ${
                deviceMode === "mobile" ? "text-cyan-400 bg-zinc-800/80" : ""
              }`}
              title="Mobile View (375px)"
            >
              <Smartphone size={14} />
            </button>
          </div>
        )}
      </div>

      {/* 3. Canvas Content Body */}
      <div className="flex-1 min-h-0 bg-[#09090b] relative overflow-hidden flex flex-col items-center justify-center">
        {activeTab === "preview" ? (
          <div className="w-full h-full flex items-center justify-center overflow-auto bg-zinc-950 p-0 sm:p-2">
            <iframe
              key={iframeKey}
              ref={iframeRef}
              srcDoc={previewHtml}
              title={title || "Artifact Preview"}
              sandbox="allow-scripts allow-modals allow-forms allow-same-origin"
              className={`h-full bg-white transition-all duration-200 ${deviceWidthClass}`}
            />
          </div>
        ) : (
          <div className="w-full h-full overflow-auto p-4 bg-[#0d1117] text-zinc-200 font-mono text-xs leading-relaxed custom-scrollbar">
            <pre className="whitespace-pre-wrap break-all">
              <code>{code}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
