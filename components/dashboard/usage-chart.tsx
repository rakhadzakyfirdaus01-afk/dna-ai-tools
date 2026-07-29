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


      const response = await fetch(
        "/api/dashboard/usage"
      );


      const result = await response.json();


      setData(result);


    }



    getUsage();



    const interval = setInterval(() => {

      getUsage();

    }, 5000);



    return () => clearInterval(interval);



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
              r:5
            }}

          />



        </LineChart>


      </ResponsiveContainer>


    </div>

  );

}