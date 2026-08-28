"use client";

import { useEffect, useState } from "react";

import {
  Bug,
  ImageIcon,
  Palette,
  CheckCircle2,
} from "lucide-react";

import { useLanguage } from "@/components/shared/language-provider";

type Activity = {
  title: string;
  feature: string;
  createdAt: string;
};

const defaultActivities = [
  {
    titleId: "React useEffect diperbaiki",
    titleEn: "React useEffect fixed",
    timeId: "2 menit yang lalu",
    timeEn: "2 minutes ago",
    icon: Bug,
    color: "text-red-400",
  },

  {
    titleId: "Prompt gambar dibuat",
    titleEn: "Image prompt generated",
    timeId: "12 menit yang lalu",
    timeEn: "12 minutes ago",
    icon: ImageIcon,
    color: "text-cyan-400",
  },

  {
    titleId: "Landing page dibuat",
    titleEn: "Landing page designed",
    timeId: "1 jam yang lalu",
    timeEn: "1 hour ago",
    icon: Palette,
    color: "text-purple-400",
  },

  {
    titleId: "Project diekspor",
    titleEn: "Project exported",
    timeId: "Hari ini",
    timeEn: "Today",
    icon: CheckCircle2,
    color: "text-green-400",
  },
];

export default function ActivityCard() {
  const { locale } = useLanguage();

  const [activities, setActivities] = useState<
    {
      title: string;
      time: string;
      icon: typeof Bug;
      color: string;
    }[]
  >(
    defaultActivities.map((item) => ({
      title:
        locale === "id"
          ? item.titleId
          : item.titleEn,
      time:
        locale === "id"
          ? item.timeId
          : item.timeEn,
      icon: item.icon,
      color: item.color,
    }))
  );

  useEffect(() => {
    async function getActivities() {
      try {
        const response = await fetch(
          "/api/dashboard/activity"
        );

        const data: Activity[] =
          await response.json();

        setActivities(
          data.map((item) => ({
            title: item.title,

            time: new Date(
              item.createdAt
            ).toLocaleString(
              locale === "id"
                ? "id-ID"
                : "en-US"
            ),

            icon:
              item.feature === "AI Debugger"
                ? Bug
                : item.feature === "Image Prompt"
                ? ImageIcon
                : item.feature === "AI Design"
                ? Palette
                : CheckCircle2,

            color:
              item.feature === "AI Debugger"
                ? "text-red-400"
                : item.feature === "Image Prompt"
                ? "text-cyan-400"
                : item.feature === "AI Design"
                ? "text-purple-400"
                : "text-green-400",
          }))
        );
      } catch (error) {
        console.log(
          "Failed loading activity:",
          error
        );
      }
    }

    getActivities();
  }, [locale]);

  return (
    <div className="rounded-2xl border border-slate-800 bg-[#111827] p-4 transition duration-300 hover:-translate-y-1 hover:shadow-xl lg:p-6">

      <h2 className="mb-4 text-lg font-semibold text-white lg:mb-6 lg:text-xl">
        {locale === "id"
          ? "Aktivitas Terbaru"
          : "Recent Activity"}
      </h2>

      <div className="space-y-3 lg:space-y-5">

        {activities.map((item, index) => {
          const Icon = item.icon;

          return (
            <div
              key={index}
              className="flex items-start gap-3 rounded-xl p-2 transition duration-300 hover:bg-slate-900 lg:gap-4"
            >

              <div className="rounded-lg bg-slate-900 p-2.5 lg:rounded-xl lg:p-3">

                <Icon
                  size={18}
                  className={item.color}
                />

              </div>

              <div className="flex-1 border-b border-slate-800 pb-4">

                <h3 className="text-sm font-medium text-white lg:text-base">
                  {item.title}
                </h3>

                <p className="mt-1 text-xs text-slate-500 lg:text-sm">
                  {item.time}
                </p>

              </div>

            </div>
          );
        })}

      </div>

    </div>
  );
}