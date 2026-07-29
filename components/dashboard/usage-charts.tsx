"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";


const data = [
  {
    day: "Mon",
    usage: 3,
  },
  {
    day: "Tue",
    usage: 5,
  },
  {
    day: "Wed",
    usage: 2,
  },
  {
    day: "Thu",
    usage: 8,
  },
  {
    day: "Fri",
    usage: 4,
  },
  {
    day: "Sat",
    usage: 6,
  },
  {
    day: "Sun",
    usage: 10,
  },
];


export default function UsageChart() {

  return (

    <div className="w-full h-[300px]">

      <ResponsiveContainer width="100%" height="100%">

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
            dataKey="usage"
            stroke="#06b6d4"
            strokeWidth={3}
          />

        </LineChart>

      </ResponsiveContainer>

    </div>

  );
}