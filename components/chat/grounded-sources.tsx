"use client";

import React from "react";
import { Globe, ExternalLink, ShieldCheck } from "lucide-react";

export interface GroundedSourceItem {
  title: string;
  url: string;
  domain?: string;
}

interface GroundedSourcesProps {
  sources: GroundedSourceItem[];
  isEnglish?: boolean;
}

/**
 * Extract clean hostname / domain from URL.
 */
function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return "web";
  }
}

/**
 * Helper to parse markdown formatted grounding sources from assistant text.
 */
export function extractSourcesFromMarkdown(content: string): {
  cleanText: string;
  sources: GroundedSourceItem[];
} {
  const sources: GroundedSourceItem[] = [];
  const lines = content.split("\n");
  const filteredLines: string[] = [];

  let inSourceSection = false;

  for (const line of lines) {
    if (
      line.includes("🌐 Sumber Web Terkini:") ||
      line.includes("🌐 Sources & References:") ||
      line.includes("**🌐 Sumber Web Terkini:**") ||
      line.includes("**🌐 Sources & References:**")
    ) {
      inSourceSection = true;
      continue;
    }

    if (inSourceSection) {
      const match = line.match(/^\s*[-*]\s*\[(.*?)\]\((https?:\/\/[^\s)]+)\)/i);
      if (match) {
        sources.push({
          title: match[1].trim(),
          url: match[2].trim(),
          domain: extractDomain(match[2].trim()),
        });
        continue;
      }
      if (line.trim().startsWith("---")) {
        continue;
      }
    }

    filteredLines.push(line);
  }

  return {
    cleanText: filteredLines.join("\n").trim(),
    sources,
  };
}

export function GroundedSources({
  sources,
  isEnglish = false,
}: GroundedSourcesProps) {
  if (!sources || sources.length === 0) return null;

  // Filter unique sources by URL
  const seenUrls = new Set<string>();
  const uniqueSources: GroundedSourceItem[] = [];

  for (const item of sources) {
    if (!item.url || seenUrls.has(item.url)) continue;
    seenUrls.add(item.url);
    uniqueSources.push({
      ...item,
      domain: item.domain || extractDomain(item.url),
    });
  }

  if (uniqueSources.length === 0) return null;

  return (
    <div className="mt-3.5 space-y-2 rounded-2xl border border-cyan-500/25 bg-gradient-to-r from-cyan-950/20 via-zinc-900/60 to-slate-900/50 p-3.5 shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-cyan-300">
          <Globe size={14} className="text-cyan-400 animate-pulse" />
          <span>
            {isEnglish
              ? `Verified Web Citations (${uniqueSources.length})`
              : `Sumber Web Terverifikasi (${uniqueSources.length})`}
          </span>
        </div>
        <div className="flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
          <ShieldCheck size={11} className="text-emerald-400" />
          <span>{isEnglish ? "Fact Grounded 2026" : "Grounded Terkini"}</span>
        </div>
      </div>

      {/* Grid of Citation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
        {uniqueSources.map((source, idx) => {
          const domain = source.domain || extractDomain(source.url);
          const faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(
            domain
          )}&sz=32`;

          return (
            <a
              key={idx}
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-2.5 rounded-xl border border-zinc-800 bg-zinc-900/90 hover:bg-zinc-800/90 p-2.5 transition-all duration-200 hover:border-cyan-500/40 hover:shadow-lg hover:-translate-y-0.5"
            >
              {/* Favicon or fallback globe */}
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-800 border border-zinc-700/80 p-1 group-hover:border-cyan-500/50 transition">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={faviconUrl}
                  alt={domain}
                  className="h-4 w-4 rounded-sm object-contain"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
              </div>

              {/* Title & Domain */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-mono text-cyan-400 font-medium truncate">
                    {domain}
                  </span>
                  <ExternalLink
                    size={11}
                    className="text-zinc-500 group-hover:text-cyan-300 shrink-0 transition"
                  />
                </div>
                <p className="text-xs font-medium text-zinc-200 line-clamp-2 leading-snug group-hover:text-white transition mt-0.5">
                  {source.title || domain}
                </p>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
