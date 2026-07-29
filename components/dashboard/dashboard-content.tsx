"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

import {
  Bug,
  Image,
  Palette,
  Activity,
  Clapperboard,
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
}


export default function DashboardContent() {

  const { data: session } = useSession();


  const [stats, setStats] = useState<Stats>({
    totalRequests: 0,
    debugSessions: 0,
    generatedImages: 0,
    aiDesigns: 0,
    aiAnimations: 0,
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

        });


      } catch (error) {

        console.log(
          "Failed loading dashboard stats:",
          error
        );

      }

    }



    getStats();


    // update live setiap 5 detik
    const interval = setInterval(() => {

      getStats();

    }, 5000);



    return () => clearInterval(interval);



  }, []);




  return (

    <div className="space-y-8">


      {/* Welcome */}

      <div className="rounded-3xl bg-gradient-to-r from-cyan-600 to-blue-700 p-8">

        <p className="text-white/80">
          Welcome back
        </p>


        <h1 className="mt-2 text-4xl font-bold text-white">
          {session?.user?.name ?? "User"}
        </h1>


        <p className="mt-2 text-white/80">
          {session?.user?.email}
        </p>


      </div>




      {/* Stats */}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-5">



        <StatCard

          title="AI Requests"

          value={stats.totalRequests.toString()}

          description="Total AI requests"

          icon={Activity}

        />



        <StatCard

          title="Debug Sessions"

          value={stats.debugSessions.toString()}

          description="AI Debugger usage"

          icon={Bug}

        />



        <StatCard

          title="Generated Images"

          value={stats.generatedImages.toString()}

          description="Image generations"

          icon={Image}

        />



        <StatCard

          title="AI Designs"

          value={stats.aiDesigns.toString()}

          description="AI Design usage"

          icon={Palette}

        />



        <StatCard

          title="AI Animation"

          value={stats.aiAnimations.toString()}

          description="Animation generations"

          icon={Clapperboard}

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