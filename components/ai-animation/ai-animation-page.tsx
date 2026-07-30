"use client";

import { useState } from "react";

import AnimationForm from "@/components/ai-animation/ai-animation-form";
import AnimationPreview from "@/components/ai-animation/animation-preview";
import AnimationHistory from "@/components/ai-animation/animation-history";



export default function AIAnimationPage() {



  const [videoUrl, setVideoUrl] = useState<string>();





  return (


    <div className="min-h-screen bg-[#020617] p-8 text-white">



      <div className="mb-8">


        <h1 className="text-3xl font-bold">

          AI Animation

        </h1>



        <p className="mt-2 text-slate-400">

          Create animations from images and videos using AI.

        </p>



      </div>







      <div className="rounded-2xl border border-slate-800 bg-[#111827] p-6">



        <h2 className="text-xl font-semibold">

          Animation Generator

        </h2>




        <p className="mt-2 text-sm text-slate-400">

          Upload image or video and generate AI animation.

        </p>







        <div className="mt-6">



          <AnimationForm

            onGenerated={(url: string) => setVideoUrl(url)}

          />



        </div>



      </div>







      <div className="mt-6">



        <AnimationPreview

          videoUrl={videoUrl}

        />




        <AnimationHistory />



      </div>





    </div>


  );

}