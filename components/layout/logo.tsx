import { Sparkles } from "lucide-react";

export default function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 via-blue-600 to-cyan-500 shadow-lg shadow-violet-500/20">
        <Sparkles className="h-5 w-5 text-white" />
      </div>

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