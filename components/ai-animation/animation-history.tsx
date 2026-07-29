"use client";


interface AnimationItem {

  id: number;

  name: string;

  prompt: string;

  status: string;

  date: string;

}



export default function AnimationHistory() {



  const animations: AnimationItem[] = [];





  return (


    <div className="mt-6 rounded-2xl border border-slate-800 bg-[#111827] p-6">



      <h2 className="text-xl font-semibold text-white">

        Animation History

      </h2>






      <div className="mt-6 space-y-4">



        {animations.length === 0 ? (



          <div className="rounded-xl bg-slate-900 p-6 text-center">


            <p className="text-slate-500">

              No animation history yet.

            </p>



          </div>



        ) : (



          animations.map((animation) => (



            <div

              key={animation.id}

              className="rounded-xl bg-slate-900 p-4"

            >



              <h3 className="font-semibold text-white">

                {animation.name}

              </h3>



              <p className="text-sm text-slate-400">

                {animation.prompt}

              </p>



              <p className="mt-2 text-xs text-cyan-400">

                {animation.status} • {animation.date}

              </p>



            </div>



          ))



        )}



      </div>




    </div>


  );

}