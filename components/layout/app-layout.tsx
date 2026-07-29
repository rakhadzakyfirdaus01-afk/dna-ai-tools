"use client";

import { ReactNode } from "react";
import Sidebar from "./sidebar";
import Header from "./header";
import Footer from "./footer";


interface AppLayoutProps {
  children: ReactNode;
}



export default function AppLayout({ children }: AppLayoutProps) {

  return (

    <div className="flex h-screen bg-[#0B1120] text-white overflow-hidden">


      <Sidebar />



      <div className="flex flex-1 flex-col overflow-hidden">


        <Header />



        <main className="flex-1 overflow-y-auto p-6 space-y-8">


          {children}



          <Footer />


        </main>



      </div>


    </div>

  );

}