"use client";


interface AnimationPreviewProps {

  videoUrl?: string;

}



export default function AnimationPreview({

  videoUrl,

}: AnimationPreviewProps) {


  return (

    <div className="rounded-2xl border border-slate-800 bg-[#111827] p-6">


      <h2 className="text-xl font-semibold text-white">

        Animation Preview

      </h2>




      <div className="mt-6 flex min-h-[250px] items-center justify-center rounded-xl bg-slate-900">


        {videoUrl ? (


          <video

            src={videoUrl}

            controls

            className="max-h-[400px] rounded-xl"

          />


        ) : (


          <p className="text-slate-500">

            No animation generated yet.

          </p>


        )}



      </div>



    </div>

  );

}