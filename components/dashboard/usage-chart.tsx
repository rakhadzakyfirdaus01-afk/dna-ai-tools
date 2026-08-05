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

    const result = await response.json();

    console.log("USAGE:", result);

    setData(result);
  } catch (err) {
    console.error(err);
  }
}


    getUsage();



    const interval = setInterval(() => {

      getUsage();

    }, 5000);



    return () => clearInterval(interval);



  }, []);





  return (

    <div className="h-[260px] w-full rounded-2xl border border-slate-800 bg-[#111827] p-3 lg:h-[300px] lg:p-5">


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
  tick={{
    fontSize: 12,
  }}
/>



          <YAxis
  tick={{
    fontSize: 12,
  }}
/>



          <Tooltip
  contentStyle={{
    borderRadius: 12,
    border: "none",
  }}
/>



          <Line

            type="monotone"

            dataKey="value"

            stroke="#06b6d4"

            strokeWidth={3}

            dot={{
  r: 4,
}}

          />



        </LineChart>


      </ResponsiveContainer>


    </div>

  );

}