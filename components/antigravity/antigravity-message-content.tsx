"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  BrainCircuit,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Sparkles,
  Bot,
  Copy,
  Check,
  Code2,
} from "lucide-react";

interface AntigravityMessageContentProps {
  content: string;
  onSelectOption?: (optionText: string) => void;
  isEnglish?: boolean;
}

function CopyCodeButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex items-center gap-1 rounded-md bg-slate-800/80 hover:bg-slate-700 px-2 py-0.5 text-[11px] text-slate-300 hover:text-white transition"
      title="Salin kode"
    >
      {copied ? (
        <>
          <Check size={12} className="text-emerald-400" />
          <span className="text-emerald-400 font-medium">Tersalin!</span>
        </>
      ) : (
        <>
          <Copy size={12} />
          <span>Salin</span>
        </>
      )}
    </button>
  );
}

export function AntigravityMessageContent({
  content,
  onSelectOption,
  isEnglish = false,
}: AntigravityMessageContentProps) {
  const [thinkingExpanded, setThinkingExpanded] = useState(false);

  // 1. Ekstrak Thinking Block (<thinking>...</thinking> atau [THINKING]...[/THINKING])
  let thinkingContent: string | null = null;
  let cleanContent = content;

  const thinkingRegex = /<thinking>([\s\S]*?)<\/thinking>/i;
  const thinkingMatch = cleanContent.match(thinkingRegex);

  if (thinkingMatch) {
    thinkingContent = thinkingMatch[1].trim();
    cleanContent = cleanContent.replace(thinkingRegex, "").trim();
  } else {
    const bracketThinkingRegex = /\[THINKING\]([\s\S]*?)\[\/THINKING\]/i;
    const bracketMatch = cleanContent.match(bracketThinkingRegex);
    if (bracketMatch) {
      thinkingContent = bracketMatch[1].trim();
      cleanContent = cleanContent.replace(bracketThinkingRegex, "").trim();
    }
  }

  // 2. Ekstrak Subagents Collaboration ([SUBAGENTS: Architect, QA Debugger])
  let subagents: string[] = [];
  const subagentRegex = /\[SUBAGENTS?:\s*([^\]]+)\]/i;
  const subagentMatch = cleanContent.match(subagentRegex);

  if (subagentMatch) {
    subagents = subagentMatch[1]
      .split(/[,|]/)
      .map((s) => s.trim())
      .filter(Boolean);
    cleanContent = cleanContent.replace(subagentRegex, "").trim();
  }

  // 3. Ekstrak Interactive Options ([OPTION: Label Pilihan])
  const options: string[] = [];
  const optionRegex = /\[OPTION:\s*([^\]]+)\]/gi;
  let optMatch: RegExpExecArray | null;

  while ((optMatch = optionRegex.exec(cleanContent)) !== null) {
    if (optMatch[1]) {
      options.push(optMatch[1].trim());
    }
  }

  if (options.length > 0) {
    cleanContent = cleanContent.replace(optionRegex, "").trim();
  }

  // Formatter untuk GitHub Alerts (> [!NOTE], > [!TIP], etc)
  const formatAlerts = (text: string) => {
    return text
      .replace(
        />\s*\[!NOTE\]\s*(.*)/gi,
        "> ℹ️ **NOTE:** $1"
      )
      .replace(
        />\s*\[!TIP\]\s*(.*)/gi,
        "> 💡 **TIP:** $1"
      )
      .replace(
        />\s*\[!IMPORTANT\]\s*(.*)/gi,
        "> 🟣 **IMPORTANT:** $1"
      )
      .replace(
        />\s*\[!WARNING\]\s*(.*)/gi,
        "> ⚠️ **WARNING:** $1"
      )
      .replace(
        />\s*\[!CAUTION\]\s*(.*)/gi,
        "> 🛑 **CAUTION:** $1"
      );
  };

  const processedContent = formatAlerts(cleanContent);

  return (
    <div className="space-y-3.5">
      {/* ========================================================
          A. SUBAGENTS ORCHESTRATION BANNER
      ======================================================== */}
      {subagents.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/40 via-slate-900/70 to-blue-950/40 px-3.5 py-2 text-xs shadow-sm">
          <div className="flex items-center gap-1.5 font-semibold text-cyan-300">
            <Bot size={14} className="text-cyan-400 animate-pulse" />
            <span>Subagents:</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {subagents.map((agent, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded-full border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-0.5 text-[11px] font-medium text-cyan-200"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping" />
                <span>{agent}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================
          B. ANTIGRAVITY THINKING PROCESS (CHAIN OF THOUGHT)
      ======================================================== */}
      {thinkingContent && (
        <div className="rounded-2xl border border-indigo-500/30 bg-slate-950/80 shadow-md overflow-hidden">
          <button
            type="button"
            onClick={() => setThinkingExpanded((prev) => !prev)}
            className="flex w-full items-center justify-between px-3.5 py-2.5 text-left text-xs font-semibold text-indigo-300 transition hover:bg-indigo-500/10"
          >
            <div className="flex items-center gap-2">
              <BrainCircuit size={15} className="text-indigo-400 animate-pulse" />
              <span>
                {isEnglish ? "Thinking Process & Hypotheses" : "Proses Penalaran & Rencana Eksekusi"}
              </span>
              <span className="rounded bg-indigo-500/20 px-1.5 py-0.5 text-[10px] text-indigo-200 border border-indigo-500/30 font-mono">
                Deep CoT
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-indigo-400">
              <span>{thinkingExpanded ? (isEnglish ? "Sembunyikan" : "Tutup") : (isEnglish ? "Lihat detail" : "Lihat proses")}</span>
              {thinkingExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </div>
          </button>

          {thinkingExpanded && (
            <div className="border-t border-indigo-500/20 bg-slate-900/60 p-3.5 text-xs text-indigo-200/90 leading-relaxed font-mono whitespace-pre-wrap animate-in fade-in duration-150">
              {thinkingContent}
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          C. MAIN MARKDOWN RESPONSE WITH CODE COPY & STYLING
      ======================================================== */}
      <div className="prose prose-invert max-w-none text-sm leading-7 break-words [&>p]:mb-3 [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5 [&>h1]:text-lg [&>h2]:text-base [&>h3]:text-sm [&>h1]:font-bold [&>h2]:font-bold [&>h3]:font-semibold [&>h1]:mt-4 [&>h2]:mt-3 [&>h3]:mt-2">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            a: ({ node, ...props }) => (
              <a
                {...props}
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 underline decoration-cyan-500/40 hover:text-cyan-300 hover:decoration-cyan-400 font-medium inline-flex items-center gap-0.5 transition"
              />
            ),
            blockquote: ({ children, ...props }) => (
              <blockquote
                className="my-3 border-l-4 border-cyan-500/60 bg-slate-900/50 py-1.5 px-3.5 rounded-r-xl text-slate-300 not-italic shadow-sm"
                {...props}
              >
                {children}
              </blockquote>
            ),
            pre: ({ children, ...props }) => (
              <div className="not-prose my-3 overflow-hidden rounded-2xl border border-slate-700/80 bg-[#0d1117] shadow-xl">
                {children}
              </div>
            ),
            code: ({ className, children, ...props }) => {
              const match = /language-(\w+)/.exec(className || "");
              const isInline = !match && !String(children).includes("\n");

              if (isInline) {
                return (
                  <code
                    className="rounded bg-slate-800/80 px-1.5 py-0.5 font-mono text-xs text-cyan-300 border border-slate-700/50"
                    {...props}
                  >
                    {children}
                  </code>
                );
              }

              const lang = match ? match[1] : "code";
              const codeText = String(children).replace(/\n$/, "");

              return (
                <div>
                  <div className="flex items-center justify-between border-b border-slate-800 bg-[#161b22] px-4 py-2 text-xs text-slate-400">
                    <div className="flex items-center gap-1.5 font-mono font-semibold uppercase tracking-wider text-cyan-400">
                      <Code2 size={13} />
                      <span>{lang}</span>
                    </div>
                    <CopyCodeButton text={codeText} />
                  </div>
                  <pre className="overflow-x-auto p-4 text-xs font-mono leading-relaxed text-slate-200 custom-scrollbar">
                    <code>{children}</code>
                  </pre>
                </div>
              );
            },
          }}
        >
          {processedContent}
        </ReactMarkdown>
      </div>

      {/* ========================================================
          D. INTERACTIVE DECISION & CLARIFICATION BUTTONS
      ======================================================== */}
      {options.length > 0 && (
        <div className="mt-3 rounded-2xl border border-cyan-500/30 bg-slate-950/70 p-3 shadow-inner">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-cyan-300">
            <Sparkles size={13} className="text-cyan-400 animate-pulse" />
            <span>
              {isEnglish
                ? "Pilih opsi untuk melanjutkan langsung:"
                : "Pilih jawaban untuk merespon instan (1-Klik):"}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {options.map((opt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onSelectOption && onSelectOption(opt)}
                className="flex items-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/25 px-3 py-1.5 text-xs font-medium text-cyan-200 transition hover:border-cyan-400 active:scale-95 shadow-sm"
              >
                <CheckCircle2 size={13} className="text-cyan-400" />
                <span>{opt}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
