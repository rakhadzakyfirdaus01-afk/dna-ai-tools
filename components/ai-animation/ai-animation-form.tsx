"use client";

import { useState } from "react";


interface AnimationFormProps {

  onGenerated?: (videoUrl: string) => void;

}



export default function AnimationForm({

  onGenerated,

}: AnimationFormProps) {



  const [prompt, setPrompt] = useState("");

  const [file, setFile] = useState<File | null>(null);


  const [loading, setLoading] = useState(false);





  async function generateAnimation() {


    if (!file) return;



    setLoading(true);




    const formData = new FormData();



    formData.append(
      "file",
      file
    );



    formData.append(
      "prompt",
      prompt
    );






    const response = await fetch("/api/ai-animation", {


      method: "POST",


      body: formData,


    });





    const data = await response.json();






    if (data.animation?.videoUrl) {


      onGenerated?.(
        data.animation.videoUrl
      );


    }






    setLoading(false);



  }







  return (

    <div className="space-y-4">



      <input

        type="file"

        accept="image/*,video/*"

        onChange={(e) =>

          setFile(

            e.target.files?.[0] ?? null

          )

        }

        className="block w-full text-sm text-slate-400"

      />







      <textarea

        value={prompt}

        onChange={(e) =>

          setPrompt(e.target.value)

        }

        placeholder="Describe your animation..."

        className="h-32 w-full rounded-xl border border-slate-700 bg-slate-900 p-4 text-white outline-none"

      />







      <button

        onClick={generateAnimation}

        disabled={loading}

        className="rounded-xl bg-cyan-500 px-6 py-3 font-semibold text-white transition hover:bg-cyan-600 disabled:opacity-50"

      >


        {loading

          ? "Generating..."

          : "Generate Animation"

        }


      </button>




    </div>

  );

}