"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function StudioRedirectInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") || "staging";

  useEffect(() => {
    router.replace(`/ai-design?tab=${encodeURIComponent(tab)}`);
  }, [router, tab]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
      <p className="text-sm text-slate-400">Mengalihkan ke AI Design...</p>
    </div>
  );
}

export default function AIStudioRedirectPage() {
  return (
    <Suspense fallback={null}>
      <StudioRedirectInner />
    </Suspense>
  );
}