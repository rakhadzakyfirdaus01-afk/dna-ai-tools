"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";


export default function ProfilePage() {


  const { data: session } = useSession();



  const [selectedImage, setSelectedImage] = useState<File | null>(null);


  const [profileImage, setProfileImage] = useState(
    session?.user?.image ?? "/logo-dna.png"
  );





  async function uploadImage() {


    if (!selectedImage) return;




    const formData = new FormData();



    formData.append(
      "image",
      selectedImage
    );






    const response = await fetch("/api/profile", {


      method: "POST",


      body: formData,


    });






    const data = await response.json();





    if (data.image) {


      setProfileImage(data.image);


    }



  }






  return (

    <div className="space-y-8">



      <div className="rounded-3xl border border-slate-800 bg-[#111827] p-8">


        <h1 className="text-3xl font-bold text-white">

          Profile User

        </h1>



        <p className="mt-2 text-slate-400">

          Manage your account information.

        </p>



      </div>








      <div className="rounded-2xl border border-slate-800 bg-[#111827] p-8">


        <div className="flex items-center gap-6">



          <Image



            src={profileImage}



            alt="Profile"



            width={100}



            height={100}



            className="rounded-full object-cover"



          />







          <div>



            <h2 className="text-2xl font-semibold text-white">


              {session?.user?.name ?? "User"}


            </h2>





            <p className="mt-2 text-slate-400">


              {session?.user?.email}


            </p>




          </div>




        </div>








        <div className="mt-6">



          <input



            type="file"



            accept="image/*"



            onChange={(e) =>



              setSelectedImage(


                e.target.files?.[0] ?? null


              )


            }



            className="text-sm text-slate-400"



          />








          <button



            onClick={uploadImage}



            className="mt-3 rounded-xl bg-cyan-500 px-5 py-2 text-white transition hover:bg-cyan-600"



          >



            Upload Photo



          </button>





        </div>





      </div>





    </div>

  );

}