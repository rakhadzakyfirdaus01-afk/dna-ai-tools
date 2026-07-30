"use client";


export default function AIAnimationPage() {


  function openVeo() {

    window.open(
      "https://deepmind.google/models/veo/",
      "_blank"
    );

  }



  return (

    <div className="min-h-screen bg-[#020617] p-8 text-white">



      <div className="mb-8">


        <h1 className="text-3xl font-bold">

          AI Animation

        </h1>



        <p className="mt-2 text-slate-400">

          Create professional AI videos using Google Veo.

        </p>



      </div>







      <div className="rounded-2xl border border-slate-800 bg-[#111827] p-8">



        <h2 className="text-xl font-semibold">

          Google Veo AI Animation

        </h2>



        <p className="mt-3 text-slate-400">

          Generate advanced AI videos with Google's video generation technology.

        </p>







        <button


          onClick={openVeo}


          className="mt-6 rounded-xl bg-cyan-500 px-6 py-3 font-semibold text-white transition hover:bg-cyan-600"


        >


          Open Google Veo


        </button>




      </div>





    </div>


  );

}