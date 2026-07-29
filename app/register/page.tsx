"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";


export default function RegisterPage() {

  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");


  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();


    const res = await fetch("/api/auth/register", {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        name,
        email,
        password,
      }),
    });


    const data = await res.json();


    if (res.ok) {
      router.push("/login");
    } else {
      alert(data.error || "Register failed");
    }
  }


  return (
    <main className="min-h-screen flex items-center justify-center bg-[#020617]">


      <form
        onSubmit={handleRegister}
        className="w-[400px] rounded-2xl border border-slate-700 bg-[#111827] p-8 shadow-xl"
      >


        <div className="text-center mb-6">


          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-cyan-500/20 text-2xl">
            ✨
          </div>


          <h1 className="text-3xl font-bold text-white">
            DNA AI Tools
          </h1>


          <p className="mt-2 text-sm text-slate-400">
            Create your account.
          </p>


        </div>



        <div className="space-y-4">


          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}

            className="w-full rounded-lg border border-slate-700 bg-[#1e293b] p-3 text-white placeholder:text-slate-400 outline-none focus:border-cyan-500"
          />



          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}

            className="w-full rounded-lg border border-slate-700 bg-[#1e293b] p-3 text-white placeholder:text-slate-400 outline-none focus:border-cyan-500"
          />



          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}

            className="w-full rounded-lg border border-slate-700 bg-[#1e293b] p-3 text-white placeholder:text-slate-400 outline-none focus:border-cyan-500"
          />



          <button
            type="submit"

            className="w-full rounded-lg bg-cyan-500 py-3 font-semibold text-white transition hover:bg-cyan-400"
          >
            Register
          </button>


        </div>



        <p className="mt-6 text-center text-sm text-slate-400">

          Already have an account?{" "}

          <button
            type="button"
            onClick={() => router.push("/login")}
            className="text-cyan-400 hover:underline"
          >
            Sign In
          </button>

        </p>


      </form>


    </main>
  );
}