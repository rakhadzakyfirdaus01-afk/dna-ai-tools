"use client";

import { useEffect, useState } from "react";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type UsageData = {
  day: string;
  value: number;
};

export default function UsageChart() {
  const [data, setData] = useState<UsageData[]>([]);

  useEffect(() => {
    async function getUsage() {
      try {
        const response = await fetch("/api/dashboard/usage", {
          cache: "no-store",
        });

        if (!response.ok) {
          setData([]);
          return;
        }

        const result = await response.json();

        // Pastikan data yang masuk ke Recharts selalu berupa array
        if (Array.isArray(result)) {
          setData(result);
        } else if (Array.isArray(result.data)) {
          setData(result.data);
        } else if (Array.isArray(result.usage)) {
          setData(result.usage);
        } else {
          setData([]);
        }
      } catch (error) {
        console.error("Failed loading usage chart:", error);
        setData([]);
      }
    }

    getUsage();
  }, []);

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer
        width="100%"
        height="100%"
      >
        <LineChart data={data}>
          <CartesianGrid
            strokeDasharray="3 3"
          />

          <XAxis
            dataKey="day"
          />

          <YAxis />

          <Tooltip />

          <Line
            type="monotone"
            dataKey="value"
            stroke="#06b6d4"
            strokeWidth={3}
            dot={{
              r: 5,
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}