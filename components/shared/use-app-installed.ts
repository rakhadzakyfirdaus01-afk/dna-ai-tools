"use client";

import { useEffect, useState } from "react";

export function useIsAppInstalled() {
  const [isInstalled, setIsInstalled] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkInstallation = () => {
      // Hapus flag stale localStorage agar tidak macet saat aplikasi di-uninstall
      try {
        localStorage.removeItem("dna_ai_installed");
      } catch {}

      // Cek apakah saat ini sedang dibuka dari jendela aplikasi mandiri (standalone/PWA/Electron)
      const isStandaloneMode =
        window.matchMedia("(display-mode: standalone)").matches ||
        window.matchMedia("(display-mode: window-controls-overlay)").matches ||
        window.matchMedia("(display-mode: minimal-ui)").matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes("android-app://");

      setIsInstalled(isStandaloneMode);
    };

    checkInstallation();

    // Listener jika browser mendeteksi perubahan display mode
    const standaloneQuery = window.matchMedia("(display-mode: standalone)");
    const handleModeChange = (e: MediaQueryListEvent) => {
      setIsInstalled(e.matches);
    };

    // Event saat browser selesai menginstal aplikasi PWA
    const handleAppInstalled = () => {
      setIsInstalled(true);
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
