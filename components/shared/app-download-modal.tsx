"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/components/shared/language-provider";
import {
  Smartphone,
  Laptop,
  Apple,
  Download,
  Sparkles,
  CheckCircle2,
  X,
  ExternalLink,
  Share2,
  PlusSquare,
  ShieldCheck,
  RefreshCw,
  Globe,
  Layers,
} from "lucide-react";

interface AppDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type DeviceType = "android" | "windows" | "ios" | "mac" | "other";

export default function AppDownloadModal({
  isOpen,
  onClose,
}: AppDownloadModalProps) {
  const { locale } = useLanguage();
  const isId = locale === "id";

  const [activeTab, setActiveTab] = useState<DeviceType>("android");
  const [detectedDevice, setDetectedDevice] = useState<DeviceType>("android");
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  // Deteksi perangkat pengguna saat komponen dimuat
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Cek apakah sudah berjalan dalam mode standalone (aplikasi terpasang)
    const isRunningStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(isRunningStandalone);

    const ua = navigator.userAgent.toLowerCase();
    let detected: DeviceType = "windows";

    if (/iphone|ipad|ipod/.test(ua)) {
      detected = "ios";
    } else if (/android/.test(ua)) {
      detected = "android";
    } else if (/macintosh|mac os x/.test(ua)) {
      detected = "mac";
    } else if (/windows|win32/.test(ua)) {
      detected = "windows";
    }

    setDetectedDevice(detected);
    setActiveTab(detected);

    // Tangkap event sebelum instalasi PWA
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
    };
  }, []);

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setInstallSuccess(true);
      }
      setDeferredPrompt(null);
    } else {
      // Jika browser tidak menyediakan prompt otomatis (misal sudah pernah ditolak atau mode tertentu)
      alert(
        isId
          ? "Silakan klik ikon 'Install' di bilah alamat browser Anda (sebelah kanan URL) atau gunakan menu opsi browser (titik 3) -> 'Instal DNA AI'."
          : "Please click the 'Install' icon in your browser address bar or check the browser menu (3 dots) -> 'Install DNA AI'."
      );
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 p-3 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-700/80 bg-[#0B1120] text-slate-100 shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="relative border-b border-slate-800/80 bg-gradient-to-r from-cyan-950/40 via-slate-900 to-blue-950/40 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20">
                <Smartphone className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                    {isId ? "Download DNA AI App" : "Download DNA AI App"}
                  </h2>
                  <span className="rounded-full bg-cyan-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-cyan-300 border border-cyan-500/30">
                    {isId ? "Semua Perangkat" : "All Devices"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-400 sm:text-sm">
                  {isId
                    ? "Gunakan di HP, Laptop, PC, Mac, atau Tablet tanpa batasan."
                    : "Install on Phone, Laptop, PC, Mac, or Tablet seamlessly."}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="rounded-xl border border-slate-700/50 bg-slate-800/60 p-2 text-slate-400 transition hover:bg-slate-700 hover:text-white"
              aria-label="Tutup"
            >
              <X size={20} />
            </button>
          </div>

          {/* ACTIVE DEVICE DETECTOR BADGE */}
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-slate-850/80 px-3 py-2 border border-slate-700/50 text-xs text-slate-300">
            <Sparkles size={14} className="text-cyan-400 shrink-0" />
            <span>
              {isId ? "Perangkat Anda saat ini:" : "Your current device:"}{" "}
              <strong className="text-cyan-300 capitalize">
                {detectedDevice === "android"
                  ? "Android (HP / Tablet)"
                  : detectedDevice === "windows"
                  ? "Windows (Laptop / PC)"
                  : detectedDevice === "ios"
                  ? "Apple iOS (iPhone / iPad)"
                  : "Apple Mac"}
              </strong>
            </span>
          </div>

          {/* DEVICE TABS */}
          <div className="mt-4 grid grid-cols-4 gap-1 rounded-2xl bg-slate-900/90 p-1 border border-slate-800">
            <button
              onClick={() => setActiveTab("android")}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition ${
                activeTab === "android"
                  ? "bg-gradient-to-r from-emerald-600 to-cyan-600 text-white shadow-md"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Smartphone size={15} />
              <span>Android</span>
            </button>

            <button
              onClick={() => setActiveTab("windows")}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition ${
                activeTab === "windows"
                  ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Laptop size={15} />
              <span>Windows</span>
            </button>

            <button
              onClick={() => setActiveTab("ios")}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition ${
                activeTab === "ios"
                  ? "bg-gradient-to-r from-slate-700 to-slate-600 text-white shadow-md"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Apple size={15} />
              <span>iPhone/iPad</span>
            </button>

            <button
              onClick={() => setActiveTab("mac")}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition ${
                activeTab === "mac"
                  ? "bg-gradient-to-r from-purple-700 to-indigo-600 text-white shadow-md"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Layers size={15} />
              <span>MacBook</span>
            </button>
          </div>
        </div>

        {/* BODY CONTENT */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* TAB: ANDROID */}
          {activeTab === "android" && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/10 p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-emerald-300 text-sm sm:text-base">
                      {isId
                        ? "Pilihan Instalasi untuk Android (HP & Tablet)"
                        : "Installation Options for Android Phone & Tablet"}
                    </h3>
                    <p className="mt-1 text-xs text-slate-300">
                      {isId
                        ? "Aplikasi berjalan layar penuh (fullscreen) tanpa bilah browser, hemat memori, dan otomatis sinkronisasi."
                        : "Runs full-screen with no browser address bar, low storage footprint, and real-time sync."}
                    </p>
                  </div>
                </div>
              </div>

              {/* ACTION BUTTONS FOR ANDROID */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {/* Opsi 1: Pasang Instan (WebAPK) */}
                <div className="flex flex-col justify-between rounded-2xl border border-cyan-500/30 bg-gradient-to-b from-cyan-950/20 to-slate-900/60 p-4">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-bold text-cyan-300 uppercase">
                        {isId ? "Rekomendasi" : "Recommended"}
                      </span>
                      <Smartphone className="h-4 w-4 text-cyan-400" />
                    </div>
                    <h4 className="mt-2 font-bold text-white text-sm sm:text-base">
                      {isId ? "1. Pasang Instan (WebAPK)" : "1. Instant Install"}
                    </h4>
                    <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                      {isId
                        ? "Pasang langsung ke menu aplikasi HP dalam 1 detik tanpa download file manual."
                        : "Installs directly to your home screen and app launcher in 1 second."}
                    </p>
                  </div>

                  <button
                    onClick={handleInstallPWA}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-3 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:brightness-110 active:scale-[0.98]"
                  >
                    <Smartphone size={16} />
                    <span>{isId ? "Pasang ke HP Sekarang" : "Install to Phone"}</span>
                  </button>
                </div>

                {/* Opsi 2: Download APK File */}
                <div className="flex flex-col justify-between rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-300 uppercase">
                        {isId ? "File Mandiri" : "Standalone File"}
                      </span>
                      <Download className="h-4 w-4 text-slate-400" />
                    </div>
                    <h4 className="mt-2 font-bold text-white text-sm sm:text-base">
                      {isId ? "2. Unduh Paket APK (.apk)" : "2. Download APK (.apk)"}
                    </h4>
                    <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                      {isId
                        ? "Unduh file paket instalasi DNA AI untuk disimpan atau dibagikan ke HP lain."
                        : "Download the standalone package installer to keep or share."}
                    </p>
                  </div>

                  <a
                    href="/dna-ai.apk"
                    download="DNA-AI-Platform.apk"
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-xs sm:text-sm font-semibold text-white transition hover:bg-slate-700 active:scale-[0.98]"
                  >
                    <Download size={16} />
                    <span>{isId ? "Download File APK" : "Download APK File"}</span>
                  </a>
                </div>
              </div>

              {/* PETUNJUK ANDROID */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-2">
                <h5 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  {isId ? "💡 Cara Pemasangan di Android:" : "💡 How to Install on Android:"}
                </h5>
                <ol className="space-y-1.5 text-xs text-slate-400 list-decimal list-inside leading-relaxed">
                  <li>
                    {isId
                      ? "Klik tombol 'Pasang ke HP Sekarang' atau 'Download File APK'."
                      : "Click 'Install to Phone' or 'Download APK File'."}
                  </li>
                  <li>
                    {isId
                      ? "Jika browser meminta izin 'Izinkan instalasi dari sumber ini', ketuk Izinkan (Allow)."
                      : "If prompted with 'Allow from this source', tap Allow."}
                  </li>
                  <li>
                    {isId
                      ? "Buka DNA AI dari layar utama HP Anda — aplikasi akan terbuka penuh tanpa toolbar Chrome!"
                      : "Open DNA AI from your home screen — enjoy full screen with zero browser bars!"}
                  </li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB: WINDOWS */}
          {activeTab === "windows" && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="rounded-2xl border border-blue-500/20 bg-blue-950/10 p-4">
                <div className="flex items-start gap-3">
                  <Laptop className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-blue-300 text-sm sm:text-base">
                      {isId
                        ? "Aplikasi Desktop Windows (PC & Laptop)"
                        : "Windows Desktop App (PC & Laptop)"}
                    </h3>
                    <p className="mt-1 text-xs text-slate-300">
                      {isId
                        ? "Terpasang langsung di Start Menu, Taskbar, dan Desktop seperti software asli Windows (.exe). Buka dalam jendela mandiri tanpa address bar browser."
                        : "Pins to Start Menu, Taskbar, and Desktop like a native Windows app. Opens in a clean borderless window."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-b from-cyan-950/20 to-slate-900/60 p-5 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-xl shadow-cyan-500/20 mb-3">
                  <Laptop className="h-7 w-7" />
                </div>
                <h4 className="font-bold text-white text-base sm:text-lg">
                  {isId
                    ? "Pasang DNA AI di Laptop / PC Anda"
                    : "Install DNA AI on your Laptop / PC"}
                </h4>
                <p className="mt-1 text-xs text-slate-400 max-w-md mx-auto">
                  {isId
                    ? "Nikmati pengalaman multitasking dengan jendela terpisah, performa tinggi, dan akses cepat dari Taskbar."
                    : "Experience smooth multitasking in a standalone native window, accessible anytime from your taskbar."}
                </p>

                <button
                  onClick={handleInstallPWA}
                  className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/25 transition hover:brightness-110 active:scale-[0.98]"
                >
                  <Download size={16} />
                  <span>
                    {isId
                      ? "Pasang Aplikasi di Windows"
                      : "Install Windows App"}
                  </span>
                </button>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-2">
                <h5 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  {isId ? "📌 Alternatif Pasang Cepat:" : "📌 Quick Install Tip:"}
                </h5>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {isId
                    ? "Di browser Chrome atau Edge, Anda juga bisa langsung mengklik ikon [Pasang / Install] di sebelah kanan kolom URL (address bar), lalu klik 'Instal'."
                    : "In Chrome or Edge, you can also click the [Install] icon on the right side of the address bar, then confirm Install."}
                </p>
              </div>
            </div>
          )}

          {/* TAB: IOS */}
          {activeTab === "ios" && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="rounded-2xl border border-purple-500/20 bg-purple-950/10 p-4">
                <div className="flex items-start gap-3">
                  <Apple className="h-5 w-5 text-purple-400 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-purple-300 text-sm sm:text-base">
                      {isId
                        ? "Cara Pasang di Apple iOS (iPhone & iPad)"
                        : "How to Install on iPhone & iPad"}
                    </h3>
                    <p className="mt-1 text-xs text-slate-300">
                      {isId
                        ? "Apple mengizinkan pemasangan aplikasi web secara langsung melalui Safari tanpa perlu bayar App Store!"
                        : "Apple allows direct installation through Safari with no App Store fees!"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 flex flex-col items-center text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-cyan-400 mb-2">
                    <Globe size={20} />
                  </div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase">
                    {isId ? "Langkah 1" : "Step 1"}
                  </span>
                  <p className="mt-1 text-xs text-slate-300">
                    {isId
                      ? "Buka website DNA AI menggunakan browser Safari."
                      : "Open DNA AI website in Safari browser."}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 flex flex-col items-center text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-cyan-400 mb-2">
                    <Share2 size={20} />
                  </div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase">
                    {isId ? "Langkah 2" : "Step 2"}
                  </span>
                  <p className="mt-1 text-xs text-slate-300">
                    {isId
                      ? "Ketuk tombol Bagikan (Share) di bagian bawah layar Safari."
                      : "Tap the Share button at the bottom of Safari."}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 flex flex-col items-center text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-cyan-400 mb-2">
                    <PlusSquare size={20} />
                  </div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase">
                    {isId ? "Langkah 3" : "Step 3"}
                  </span>
                  <p className="mt-1 text-xs text-slate-300">
                    {isId
                      ? "Pilih 'Tambah ke Layar Utama' (Add to Home Screen), lalu 'Tambah'."
                      : "Select 'Add to Home Screen', then tap 'Add'."}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-400 leading-relaxed">
                ✨ {isId
                  ? "Ikon DNA AI akan langsung muncul di Layar Utama iPhone/iPad Anda dan berjalan dalam mode layar penuh (tanpa bilah Safari) layaknya aplikasi App Store!"
                  : "DNA AI icon will appear on your iPhone home screen and run standalone with zero Safari navigation bars!"}
              </div>
            </div>
          )}

          {/* TAB: MAC */}
          {activeTab === "mac" && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="rounded-2xl border border-indigo-500/20 bg-indigo-950/10 p-4">
                <div className="flex items-start gap-3">
                  <Layers className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-indigo-300 text-sm sm:text-base">
                      {isId
                        ? "Aplikasi untuk Apple macOS (MacBook & iMac)"
                        : "App for Apple macOS (MacBook & iMac)"}
                    </h3>
                    <p className="mt-1 text-xs text-slate-300">
                      {isId
                        ? "Jalankan DNA AI langsung dari Dock macOS dengan jendela mandiri yang elegan."
                        : "Run DNA AI right from your macOS Dock in a dedicated window."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-2">
                  <h4 className="font-bold text-white text-sm">
                    {isId ? "Di Safari macOS Sonoma:" : "In Safari (macOS Sonoma):"}
                  </h4>
                  <ol className="space-y-1.5 text-xs text-slate-300 list-decimal list-inside leading-relaxed">
                    <li>{isId ? "Buka DNA AI di Safari" : "Open DNA AI in Safari"}</li>
                    <li>{isId ? "Klik menu Berkas (File) di kiri atas" : "Click File menu on top left"}</li>
                    <li>
                      {isId
                        ? "Pilih 'Tambahkan ke Dock...' (Add to Dock)"
                        : "Select 'Add to Dock...'"}
                    </li>
                  </ol>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-2">
                  <h4 className="font-bold text-white text-sm">
                    {isId ? "Di Google Chrome / Edge:" : "In Google Chrome / Edge:"}
                  </h4>
                  <ol className="space-y-1.5 text-xs text-slate-300 list-decimal list-inside leading-relaxed">
                    <li>{isId ? "Buka DNA AI di Chrome/Edge" : "Open DNA AI in Chrome/Edge"}</li>
                    <li>
                      {isId
                        ? "Klik ikon Install di kolom URL"
                        : "Click the Install icon in the URL bar"}
                    </li>
                    <li>
                      {isId
                        ? "Pilih 'Instal DNA AI Platform'"
                        : "Select 'Install DNA AI Platform'"}
                    </li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* BENEFIT / GUARANTEE HIGHLIGHTS */}
          <div className="grid grid-cols-1 gap-3 border-t border-slate-800/80 pt-4 sm:grid-cols-3">
            <div className="flex items-center gap-2.5 rounded-xl bg-slate-900/50 p-2.5">
              <RefreshCw size={16} className="text-cyan-400 shrink-0" />
              <div>
                <p className="text-[11px] font-bold text-slate-200">
                  {isId ? "Auto-Update Realtime" : "Auto Realtime Updates"}
                </p>
                <p className="text-[10px] text-slate-400">
                  {isId ? "Selalu update otomatis" : "Always updated automatically"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 rounded-xl bg-slate-900/50 p-2.5">
              <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
              <div>
                <p className="text-[11px] font-bold text-slate-200">
                  {isId ? "100% Gratis Selamanya" : "100% Free Forever"}
                </p>
                <p className="text-[10px] text-slate-400">
                  {isId ? "Bebas biaya langganan" : "Zero subscription fees"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 rounded-xl bg-slate-900/50 p-2.5">
              <Layers size={16} className="text-blue-400 shrink-0" />
              <div>
                <p className="text-[11px] font-bold text-slate-200">
                  {isId ? "Hemat Memori & Cepat" : "Ultra Light & Fast"}
                </p>
                <p className="text-[10px] text-slate-400">
                  {isId ? "Hanya beberapa MB" : "Lightweight footprint"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER: TETAP GUNAKAN VERSI WEB */}
        <div className="border-t border-slate-800/80 bg-slate-950/60 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-400 text-center sm:text-left">
            {isId
              ? "Tidak ingin mengunduh? Anda tetap bisa menggunakan DNA AI di browser web tanpa batas."
              : "Prefer not to download? You can keep using DNA AI in your browser with zero limits."}
          </p>

          <button
            onClick={onClose}
            className="w-full sm:w-auto shrink-0 rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-700 hover:text-white"
          >
            {isId ? "🌐 Tetap Gunakan Versi Web" : "🌐 Continue on Web"}
          </button>
        </div>
      </div>
    </div>
  );
}
