"use client";

import { ReactNode, useState } from "react";
import Sidebar from "./sidebar";
import Header from "./header";
import Footer from "./footer";

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({
  children,
}: AppLayoutProps) {

  const [mobileMenu, setMobileMenu] = useState(false);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#0B1120] text-white lg:flex">

      {/* Sidebar Desktop */}

      <div className="hidden lg:block">

        <Sidebar />

      </div>

      {/* Sidebar Mobile */}

      {mobileMenu && (

        <div
          className="fixed inset-0 z-50 bg-black/60 lg:hidden"
          onClick={() => setMobileMenu(false)}
        >

            <div
           className="h-screen w-72 bg-[#0B1120]"
            onClick={(e) => e.stopPropagation()}
           >

            <Sidebar
             onNavigate={() => setMobileMenu(false)}
           />

          </div>

        </div>

      )}

      {/* Content */}

      <div className="flex min-h-screen min-w-0 flex-1 flex-col overflow-hidden">

        <Header
          mobileMenu={mobileMenu}
          setMobileMenu={setMobileMenu}
        />

        <main className="flex-1 space-y-5 overflow-y-auto p-3 lg:space-y-8 lg:p-6">

          {children}

          <Footer />

        </main>

      </div>

    </div>
  );
}