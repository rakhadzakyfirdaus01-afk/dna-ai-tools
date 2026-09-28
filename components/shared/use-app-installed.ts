"use client";

import { useEffect, useState } from "react";

export function useIsAppInstalled() {
  const [isInstalled, setIsInstalled] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkInstallation = () => {
      // 1. Cek mode tampilan standalone / window-controls-overlay / minimal-ui
      const isStandaloneMode =
        window.matchMedia("(display-mode: standalone)").matches ||
        window.matchMedia("(display-mode: window-controls-overlay)").matches ||
        window.matchMedia("(display-mode: minimal-ui)").matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes("android-app://");

      // 2. Cek apakah pernah terpasang via event 'appinstalled'
      const wasInstalled = localStorage.getItem("dna_ai_installed") === "true";

      if (isStandaloneMode || wasInstalled) {
        setIsInstalled(true);
        if (isStandaloneMode) {
          localStorage.setItem("dna_ai_installed", "true");
        }
      } else {
        setIsInstalled(false);
      }
    };

    checkInstallation();

    // Listener jika browser mendeteksi perubahan display mode
    const standaloneQuery = window.matchMedia("(display-mode: standalone)");
    const handleModeChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsInstalled(true);
        localStorage.setItem("dna_ai_installed", "true");
      }
    };

    // Event saat browser selesai menginstal aplikasi PWA
    const handleAppInstalled = () => {
      setIsInstalled(true);
      localStorage.setItem("dna_ai_installed", "true");
    };

    try {
      standaloneQuery.addEventListener("change", handleModeChange);
    } catch {
      standaloneQuery.addListener?.(handleModeChange);
    }

    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      try {
        standaloneQuery.removeEventListener("change", handleModeChange);
      } catch {
        standaloneQuery.removeListener?.(handleModeChange);
      }
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  return isInstalled;
}
