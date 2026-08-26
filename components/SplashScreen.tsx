"use client";

import { useEffect, useState } from "react";

export default function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const exitTimer = setTimeout(() => {
      setExiting(true);
    }, 2800);

    const hideTimer = setTimeout(() => {
      setVisible(false);
    }, 3500);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[99999] flex items-center justify-center overflow-hidden bg-black ${
        exiting ? "splash-exit" : ""
      }`}
    >
      {/* Background glow kiri */}
      <div className="absolute left-[20%] top-[35%] h-[320px] w-[320px] rounded-full bg-blue-900/10 blur-[120px]" />

      {/* Background glow kanan */}
      <div className="absolute right-[20%] bottom-[25%] h-[280px] w-[280px] rounded-full bg-red-900/10 blur-[120px]" />

      {/* Ambient glow tengah */}
      <div className="absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-950/10 blur-[140px]" />

      {/* Garis dekorasi */}
      <div className="absolute left-0 top-1/2 h-px w-[30%] bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />

      <div className="absolute right-0 top-1/2 h-px w-[30%] bg-gradient-to-l from-transparent via-red-500/20 to-transparent" />

      {/* Konten utama */}
      <div className="relative flex flex-col items-center">

        {/* Logo + nama */}
        <div className="splash-content flex items-center">

          {/* Logo */}
          <div className="logo-wrapper relative flex h-[82px] w-[82px] items-center justify-center">
            
            {/* Glow logo */}
            <div className="absolute inset-0 rounded-full bg-blue-600/20 blur-2xl" />

            <img
              src="/logo-dna.png"
              alt="DNA AI Tools"
              className="relative h-[64px] w-[64px] object-contain logo-appear"
            />
          </div>

          {/* Divider */}
          <div className="mx-6 h-[58px] w-px bg-gradient-to-b from-transparent via-white/20 to-transparent divider-appear" />

          {/* Brand */}
          <div className="brand-appear">
            <h1 className="font-serif text-[42px] font-bold tracking-wide text-white">
              DNA AI Tools
            </h1>

            <p className="mt-1 text-[13px] font-medium tracking-[0.42em] text-slate-400">
              ARTIFICIAL INTELLIGENCE
            </p>
          </div>
        </div>

        {/* Loading */}
        <div className="mt-24 flex items-center gap-2 loading-appear">
          <span className="loading-dot" />
          <span className="loading-dot animation-delay-200" />
          <span className="loading-dot animation-delay-400" />
        </div>

        {/* Text kecil */}
        <p className="mt-5 text-[11px] tracking-[0.25em] text-slate-600 loading-text">
          INITIALIZING PLATFORM
        </p>
      </div>

      {/* Sudut dekorasi */}
      <div className="absolute left-8 top-8 h-12 w-12 border-l border-t border-white/[0.04]" />

      <div className="absolute right-8 top-8 h-12 w-12 border-r border-t border-white/[0.04]" />

      <div className="absolute bottom-8 left-8 h-12 w-12 border-b border-l border-white/[0.04]" />

      <div className="absolute bottom-8 right-8 h-12 w-12 border-b border-r border-white/[0.04]" />

      <style jsx>{`
        .splash-content {
          opacity: 0;
          transform: translateY(12px);
          animation: contentIn 1s ease-out 0.15s forwards;
        }

        .logo-appear {
          opacity: 0;
          transform: scale(0.65);
          animation: logoIn 1s cubic-bezier(0.22, 1, 0.36, 1) 0.25s forwards;
        }

        .divider-appear {
          opacity: 0;
          transform: scaleY(0);
          animation: dividerIn 0.7s ease-out 0.75s forwards;
        }

        .brand-appear {
          opacity: 0;
          transform: translateX(18px);
          animation: brandIn 0.8s ease-out 0.75s forwards;
        }

        .loading-appear {
          opacity: 0;
          animation: fadeIn 0.8s ease-out 1.4s forwards;
        }

        .loading-text {
          opacity: 0;
          animation: fadeIn 0.8s ease-out 1.6s forwards;
        }

        .loading-dot {
          display: block;
          width: 6px;
          height: 6px;
          border-radius: 9999px;
          background: #3b82f6;
          box-shadow: 0 0 12px rgba(59, 130, 246, 0.7);
          animation: pulse 1.2s ease-in-out infinite;
        }

        .animation-delay-200 {
          animation-delay: 0.2s;
        }

        .animation-delay-400 {
          animation-delay: 0.4s;
        }

        .splash-exit {
          animation: splashExit 0.7s ease-in-out forwards;
        }

        @keyframes contentIn {
          from {
            opacity: 0;
            transform: translateY(12px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes logoIn {
          0% {
            opacity: 0;
            transform: scale(0.65) rotate(-8deg);
          }

          60% {
            opacity: 1;
            transform: scale(1.08) rotate(2deg);
          }

          100% {
            opacity: 1;
            transform: scale(1) rotate(0);
          }
        }

        @keyframes dividerIn {
          from {
            opacity: 0;
            transform: scaleY(0);
          }

          to {
            opacity: 1;
            transform: scaleY(1);
          }
        }

        @keyframes brandIn {
          from {
            opacity: 0;
            transform: translateX(18px);
          }

          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }

          to {
            opacity: 1;
          }
        }

        @keyframes pulse {
          0%,
          100% {
            opacity: 0.3;
            transform: translateY(0);
          }

          50% {
            opacity: 1;
            transform: translateY(-3px);
          }
        }

        @keyframes splashExit {
          from {
            opacity: 1;
            transform: scale(1);
          }

          to {
            opacity: 0;
            transform: scale(1.025);
            visibility: hidden;
          }
        }

        @media (max-width: 640px) {
          .splash-content {
            transform: scale(0.82);
          }

          h1 {
            font-size: 30px;
          }

          .brand-appear p {
            font-size: 9px;
            letter-spacing: 0.3em;
          }

          .logo-wrapper {
            width: 65px;
            height: 65px;
          }

          .logo-wrapper img {
            width: 52px;
            height: 52px;
          }

          .divider-appear {
            margin-left: 16px;
            margin-right: 16px;
            height: 45px;
          }
        }
      `}</style>
    </div>
  );
}