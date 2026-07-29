import Link from "next/link";
import {
  Bug,
  ImageIcon,
  Palette,
  ArrowRight,
} from "lucide-react";


const actions = [

  {
    title: "AI Debugger",
    description: "Analyze and fix your code instantly.",
    href: "/ai-debugger",
    icon: Bug,
  },


  {
    title: "Image Prompt",
    description: "Generate prompts for AI image models.",
    href: "/image-prompt",
    icon: ImageIcon,
  },


  {
    title: "AI Design",
    description: "Create modern UI/UX ideas with AI.",
    href: "/ai-design",
    icon: Palette,
  },

];



export default function QuickAction() {

  return (

    <div className="rounded-2xl border border-slate-800 bg-[#111827] p-6">


      <h2 className="mb-6 text-xl font-semibold text-white">
        Quick Actions
      </h2>



      <div className="space-y-4">


        {actions.map((item) => {

          const Icon = item.icon;


          return (

            <Link
              key={item.href}
              href={item.href}
              className="group flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 p-4 transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-cyan-500 hover:bg-slate-800"
            >


              <div className="flex items-center gap-4">


                <div className="rounded-xl bg-cyan-500/10 p-3">

                  <Icon
                    className="text-cyan-400"
                    size={22}
                  />

                </div>



                <div>

                  <h3 className="font-medium text-white">
                    {item.title}
                  </h3>


                  <p className="text-sm text-slate-400">
                    {item.description}
                  </p>


                </div>


              </div>




              <ArrowRight
                size={20}
                className="text-slate-500 transition group-hover:translate-x-1 group-hover:text-cyan-400"
              />



            </Link>

          );

        })}



      </div>


    </div>

  );

}