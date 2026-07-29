"use client";


import { LucideIcon } from "lucide-react";


interface StatCardProps {

  title: string;

  value: string;

  description: string;

  icon: LucideIcon;

}



export default function StatCard({

  title,

  value,

  description,

  icon: Icon,

}: StatCardProps) {



  return (

    <div
      className="
      rounded-2xl
      border
      bg-card
      text-card-foreground
      p-6
      transition
      duration-300
      hover:border-cyan-500
      hover:-translate-y-1
      hover:shadow-xl
      "
    >



      <div className="flex items-center justify-between">



        <div>



          <p className="text-sm opacity-70">

            {title}

          </p>




          <h2 className="mt-3 text-3xl font-bold">

            {value}

          </h2>




          <p className="mt-3 text-sm opacity-60">

            {description}

          </p>



        </div>





        <div
          className="
          rounded-xl
          bg-cyan-500/10
          p-3
          text-cyan-400
          "
        >


          <Icon size={24}/>


        </div>



      </div>



    </div>

  );

}