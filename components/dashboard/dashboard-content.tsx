"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useLanguage } from "@/components/shared/language-provider";

import {
  Bug,
  Image,
  Palette,
  Activity,
  Clapperboard,
  FileText,
  ScanText,
  Languages,
} from "lucide-react";

import StatCard from "./stat-card";
import UsageChart from "./usage-chart";
import ActivityCard from "./activity-card";
import QuickAction from "./quick-action";

interface Stats {
  totalRequests: number;
  debugSessions: number;
  generatedImages: number;
  aiDesigns: number;
  aiAnimations: number;
  aiDocuments: number;
  aiOCR: number;
  aiTranslator: number;
}

export default function DashboardContent() {
  const { data: session } = useSession();
  const { t } = useLanguage();

  const [stats, setStats] = useState<Stats>({
    totalRequests: 0,
    debugSessions: 0,
    generatedImages: 0,
    aiDesigns: 0,
    aiAnimations: 0,
    aiDocuments: 0,
    aiOCR: 0,
    aiTranslator: 0,
  });

  useEffect(() => {
    async function getStats() {
      try {
        const res = await fetch("/api/dashboard/stats");
        const data = await res.json();

        setStats({
          totalRequests: data.totalRequests ?? 0,
          debugSessions: data.debugSessions ?? 0,
          generatedImages: data.generatedImages ?? 0,
          aiDesigns: data.aiDesigns ?? 0,
          aiAnimations: data.aiAnimations ?? 0,
          aiDocuments: data.aiDocuments ?? 0,
          aiOCR: data.aiOCR ?? 0,
          aiTranslator: data.aiTranslator ?? 0,
        });
      } catch (error) {
        console.log("Failed loading dashboard stats:", error);
      }
    }

    getStats();

    const interval = setInterval(getStats, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-8">
      {/* Welcome */}

      <div className="rounded-3xl bg-gradient-to-r from-cyan-600 to-blue-700 p-8">
        <p className="text-white/80">
          {t.welcomeBack}
        </p>

        <h1 className="mt-2 text-4xl font-bold text-white">
          {session?.user?.name ?? "User"}
        </h1>

        <p className="mt-2 text-white/80">
          {t.welcomeDescription}
        </p>

        <p className="mt-2 text-white/80">
          {session?.user?.email}
        </p>
      </div>

      {/* Stats */}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title={t.aiRequests}
          value={stats.totalRequests.toString()}
          description={t.totalAiRequests}
          icon={Activity}
        />

        <StatCard
          title={t.techAssistant}
          value={stats.debugSessions.toString()}
          description={t.techAssistantUsage}
          icon={Bug}
        />

        <StatCard
          title={t.generatedImages}
          value={stats.generatedImages.toString()}
          description={t.imagePromptUsage}
          icon={Image}
        />

        <StatCard
          title={t.aiDesigns}
          value={stats.aiDesigns.toString()}
          description={t.aiDesignUsage}
          icon={Palette}
        />

        <StatCard
          title={t.aiAnimation}
          value={stats.aiAnimations.toString()}
          description={t.animationGenerations}
          icon={Clapperboard}
        />

        <StatCard
          title={t.aiDocument}
          value={stats.aiDocuments.toString()}
          description={t.documentAnalysis}
          icon={FileText}
        />

        <StatCard
          title={t.aiOcr}
          value={stats.aiOCR.toString()}
          description={t.ocrAnalysis}
          icon={ScanText}
        />

        <StatCard
          title={t.aiTranslator}
          value={stats.aiTranslator.toString()}
          description={t.translationRequests}
          icon={Languages}
        />
      </div>

      {/* Chart */}

      <UsageChart />

      {/* Bottom Section */}

      <div className="grid gap-6 xl:grid-cols-2">
        <ActivityCard />
        <QuickAction />
      </div>
    </div>
  );
}