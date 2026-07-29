"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Image from "next/image";

import {
  Search,
  Bell,
  Moon,
  Settings,
  Sparkles,
} from "lucide-react";


export default function Header() {


  const router = useRouter();


  const { data: session } = useSession();



  console.log("SESSION:", session);




  const today = new Date().toLocaleDateString("id-ID", {

    weekday: "long",

    day: "numeric",

    month: "long",

    year: "numeric",

  });





  const [search, setSearch] = useState("");

  const [open, setOpen] = useState(false);





  const menus = [

    {
      name: "Dashboard",
      path: "/dashboard",
    },

    {
      name: "AI Debugger",
      path: "/ai-debugger",
    },

    {
      name: "Image Prompt",
      path: "/image-prompt",
    },

    {
      name: "AI Design",
      path: "/ai-design",
    },

    {
      name: "AI Animation",
      path: "/ai-animation",
    },

    {
      name: "History",
      path: "/history",
    },

    {
      name: "Settings",
      path: "/settings",
    },

  ];





  const result = menus.filter((item) =>

    item.name
      .toLowerCase()
      .includes(search.toLowerCase())

  );






  return (

    <header className="sticky top-0 z-40 border-b border-slate-800 bg-[#0F172A]/90 backdrop-blur">


      <div className="flex h-20 items-center justify-between px-8">



        <div>


          <p className="text-sm text-slate-400">

            {today}

          </p>



          <h1 className="mt-1 text-2xl font-bold text-white">

            DNA AI Platform

          </h1>



        </div>






        <div className="flex items-center gap-4">



          <div className="relative">


            <div className="flex h-11 w-80 items-center gap-3 rounded-xl border border-slate-700 bg-slate-900 px-4">


              <Search
                size={18}
                className="text-slate-500"
              />



              <input

                value={search}

                onChange={(e) => {

                  setSearch(e.target.value);

                  setOpen(true);

                }}

                onFocus={() => setOpen(true)}

                placeholder="Search..."

                className="w-full bg-transparent text-white outline-none"

              />



            </div>





            {
              open && search && (

                <div className="absolute top-14 left-0 w-80 rounded-xl border border-slate-700 bg-[#0F172A] p-2">


                  {
                    result.map((item) => (

                      <button

                        key={item.path}

                        onClick={() => {

                          router.push(item.path);

                          setSearch("");

                          setOpen(false);

                        }}

                        className="w-full rounded-lg px-4 py-3 text-left text-white hover:bg-slate-800"

                      >

                        {item.name}

                      </button>


                    ))
                  }


                </div>

              )
            }


          </div>






          <button className="rounded-xl bg-slate-900 p-3">

            <Bell size={20}/>

          </button>




          <button className="rounded-xl bg-slate-900 p-3">

            <Moon size={20}/>

          </button>




          <button className="rounded-xl bg-slate-900 p-3">

            <Settings size={20}/>

          </button>






          <button className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 font-semibold">


            <Sparkles size={18}/>


            Gemini Ready


          </button>









          <div className="flex items-center gap-3">



            <div className="text-right">


              <p className="text-sm font-semibold text-white">


                {session?.user?.name ?? "User"}


              </p>




              <p className="text-xs text-cyan-400">


               USER


              </p>





              <button

                onClick={() =>
                  signOut({
                    callbackUrl: "/login",
                  })
                }


                className="text-xs text-red-400"

              >

                Logout

              </button>



            </div>







            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-lg font-bold">


              {session?.user?.image ? (


                <Image

                  src={session.user.image}

                  alt="Profile"

                  width={48}

                  height={48}

                  className="h-full w-full object-cover"

                />


              ) : (


                session?.user?.name?.charAt(0) ?? "U"


              )}



            </div>





          </div>






        </div>



      </div>



    </header>

  );

}