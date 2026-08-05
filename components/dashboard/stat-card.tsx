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
      rounded-xl
      border
      bg-card
      text-card-foreground
      p-4
      transition
      duration-300
      hover:border-cyan-500
      hover:-translate-y-1
      hover:shadow-xl
      lg:rounded-2xl
      lg:p-6
      "
    >



      <div className="flex items-start justify-between lg:items-center">



        <div>



          <p className="text-xs opacity-70 lg:text-sm">

            {title}

          </p>




          <h2 className="mt-2 text-2xl font-bold lg:mt-3 lg:text-3xl">

            {value}

          </h2>




          <p className="mt-2 text-xs opacity-60 lg:mt-3 lg:text-sm">

            {description}

          </p>



        </div>





        <div
  className="
          rounded-lg
          bg-cyan-500/10
          p-2.5
          text-cyan-400
          lg:rounded-xl
          lg:p-3
          "
>


        <Icon size={20} className="lg:h-6 lg:w-6" />


        </div>



      </div>



    </div>

  );

}