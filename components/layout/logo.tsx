import Image from "next/image";

export default function Logo() {
  return (
    <div className="flex items-center gap-3">
      <img
        src="/logo-dna.png"
        alt="DNA AI Logo"
        className="h-11 w-11 rounded-2xl object-cover shadow-lg shadow-violet-500/20"
      />

      <div>
        <h1 className="text-lg font-bold tracking-wide text-white">
          DNA AI
        </h1>

        <p className="text-xs text-zinc-400">
          Advertising Tools
        </p>
      </div>
    </div>
  );
}