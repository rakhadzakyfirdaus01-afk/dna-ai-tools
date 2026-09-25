"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/shared/language-provider";
import {
  Paperclip,
  Send,
  X,
  FileText,
  Image as ImageIcon,
  Sparkles,
  Camera,
  Link2,
  ChevronDown,
  Check,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Plus,
  Download,
  Code2,
} from "lucide-react";

import { addNotification } from "@/components/notifications/notification-store";
import {
  requestNotificationPermission,
  sendBackgroundNotification,
} from "@/lib/push-notification";
import {
  speakNaturalVoice,
  stopNaturalVoice,
} from "@/lib/natural-voice";
import {
  VoiceModeOverlay,
  type VoiceModeStatus,
} from "@/components/voice/voice-mode-overlay";
import {
  compressImageFile,
  createThumbnailDataUrl,
} from "@/lib/image-compression";

import {
  AI_MODELS,
  AUTO_MODEL,
  DEFAULT_AI_MODEL,
  type AIModelId,
} from "@/lib/ai-models";

type Message = {
  id: number;
  role: "user" | "assistant";
  content: string;
  fileName?: string;
  imagePreview?: string;
};

type ModelOption = {
  id: AIModelId;
  name: string;
  description: string;
};

const MODEL_OPTIONS: ModelOption[] = [
  {
    id: AUTO_MODEL,
    name: "Auto (Rekomendasi)",
    description:
      "Otomatis beralih model jika kuota habis atau sibuk",
  },
  ...AI_MODELS.map((model) => ({
    id: model.id,
    name: model.name,
    description:
      "Model Gemini yang dikonfigurasi untuk AI Asisten",
  })),
];

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
}
function formatResetTime(resetAt: string) {
  const date = new Date(resetAt);

  if (Number.isNaN(date.getTime())) {
    return "waktu reset tidak diketahui";
  }

  return (
    new Intl.DateTimeFormat("id-ID", {
      timeZone: "Asia/Jakarta",
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date) + " WIB"
  );
}

function buildConversationContext(messages: Message[]) {
  const recentMessages = messages.slice(-20);

  const lines = recentMessages.map((message) => {
    const role =
      message.role === "user"
        ? "User"
        : "Assistant";

    const attachment =
      message.fileName
        ? ` [Lampiran: ${message.fileName}]`
        : "";

    return `${role}${attachment}: ${message.content}`;
  });

  const context = lines.join("\n\n");

  if (context.length <= 12000) {
    return context;
  }

  return context.slice(-12000);
}

export default function Page() {
  const { locale } = useLanguage();
  const isEnglish = locale === "en";
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imageUrlOpen, setImageUrlOpen] = useState(false);

  const [selectedModel, setSelectedModel] =
    useState<AIModelId>(DEFAULT_AI_MODEL);
  const [modelMenuOpen, setModelMenuOpen] =
    useState(false);
  const [toolMenuOpen, setToolMenuOpen] =
    useState(false);

  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] =
    useState(false);
  const [isInstalled, setIsInstalled] =
    useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef =
    useRef<MediaStream | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // ChatGPT-Style Voice Mode States
  const [voiceOverlayOpen, setVoiceOverlayOpen] = useState(false);
  const [voiceModeStatus, setVoiceModeStatus] =
    useState<VoiceModeStatus>("idle");
  const [voiceLevel, setVoiceLevel] = useState(0);
  const [isVoicePaused, setIsVoicePaused] = useState(false);
  const [latestVoiceReply, setLatestVoiceReply] = useState("");

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const isRecordingRef = useRef(false);
  const isVoicePausedRef = useRef(false);
  const voiceOverlayOpenRef = useRef(false);
  const hasSpokenRef = useRef(false);
  const lastSpeechTimeRef = useRef(0);
  const recordingStartTimeRef = useRef(0);

  const mediaRecorderRef =
    useRef<MediaRecorder | null>(null);
  const audioChunksRef =
    useRef<Blob[]>([]);
  const audioPlayerRef =
    useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    voiceOverlayOpenRef.current = voiceOverlayOpen;
  }, [voiceOverlayOpen]);

  useEffect(() => {
    isVoicePausedRef.current = isVoicePaused;
  }, [isVoicePaused]);

  const ui = {
    title: isEnglish ? "AI Assistant" : "AI Asisten",
    subtitle: isEnglish
      ? "One AI for all your needs"
      : "Satu AI untuk berbagai kebutuhanmu",
    camera: isEnglish ? "Camera" : "Kamera",
    cameraDescription: isEnglish
      ? "Take a photo to send to AI Assistant"
      : "Ambil foto untuk dikirim ke AI Asisten",
    cancel: isEnglish ? "Cancel" : "Batal",
    takePhoto: isEnglish ? "Take photo" : "Ambil foto",
    upload: isEnglish ? "Attach" : "Lampirkan",
    photoLink: isEnglish ? "Photo Link" : "Link Foto",
    cameraDesktopNote: isEnglish
      ? "Desktop only sends image URLs. File upload and camera are available on mobile."
      : "Desktop hanya mengirim URL gambar. Upload file dan kamera tersedia di HP.",
    placeholder: isEnglish ? "Ask anything..." : "Tanyakan apa saja...",
    heroTitle: isEnglish ? "How can I help?" : "Apa yang bisa saya bantu?",
    heroDescription: isEnglish
      ? "Ask anything. AI Assistant can help with programming, image prompts, documents, text recognition from images, and translation."
      : "Tanyakan apa saja. AI Asisten dapat membantu pemrograman, membuat prompt gambar, mengolah dokumen, membaca teks dari gambar, dan menerjemahkan bahasa.",
    techTitle: "🤖 AI Tech Assistant",
    techDescription: isEnglish
      ? "Debug code and solve technology problems."
      : "Debug kode dan bantu masalah teknologi.",
    imagePromptTitle: "🖼️ Image Prompt",
    imagePromptDescription: isEnglish
      ? "Create image prompts to match your needs."
      : "Buat prompt gambar sesuai kebutuhan.",
    documentTitle: isEnglish ? "📄 AI Document" : "📄 Dokumen AI",
    documentDescription: isEnglish
      ? "Analyze and work with various documents."
      : "Analisis dan olah berbagai dokumen.",
    ocrTranslatorTitle: isEnglish
      ? "🔎 Text Recognition & 🌐 Translator"
      : "🔎 Pengenal Teks & 🌐 Penerjemah",
    ocrTranslatorDescription: isEnglish
      ? "Read text from images and translate it."
      : "Baca teks dari gambar dan terjemahkan.",
    speaking: isEnglish ? "AI is speaking..." : "AI sedang berbicara...",
    attach: isEnglish ? "Attach" : "Lampirkan",
    askAnything: isEnglish ? "Ask anything..." : "Tanyakan apa saja...",
    aiNoAnswer: isEnglish ? "AI did not provide an answer." : "AI tidak memberikan jawaban.",
    sendPhoto: isEnglish ? "Sending photo..." : "Mengirim foto...",
    sentPhotoAlt: isEnglish ? "Sent photo" : "Foto yang dikirim",
    startRecording: isEnglish ? "Start recording" : "Mulai rekaman",
    stopRecording: isEnglish ? "Stop recording" : "Hentikan rekaman",
    voiceMessage: isEnglish ? "🎤 Voice message" : "🎤 Pesan suara",
    voiceProcessingError: isEnglish
      ? "Failed to process voice."
      : "Gagal memproses suara.",
    aiNoVoice: isEnglish
      ? "AI did not generate audio."
      : "AI tidak menghasilkan suara.",
    aiSpeakingStatus: isEnglish
      ? "🔊 AI is speaking..."
      : "🔊 AI sedang berbicara...",
    voiceFinishedTitle: isEnglish ? "AI Voice finished" : "AI Voice selesai",
    voiceFinishedMessage: isEnglish
      ? "The AI answer was successfully generated and played."
      : "Jawaban AI berhasil dibuat dan diputar.",
    voiceAudioFailed: isEnglish
      ? "⚠️ AI voice could not be played."
      : "⚠️ Suara AI gagal diputar.",
    voiceBlocked: isEnglish
      ? "⚠️ AI voice was blocked by the browser. Tap the screen and try again."
      : "⚠️ Suara AI diblokir browser. Coba ketuk layar lalu ulangi.",
    voiceGeneralError: isEnglish
      ? "Failed to process AI voice."
      : "Gagal memproses suara AI.",
    aiFinishedTitle: isEnglish ? "AI Assistant finished" : "AI Asisten selesai",
    aiFinishedMessage: isEnglish
      ? "The request was processed successfully and the AI answer is available."
      : "Permintaan berhasil diproses dan jawaban AI sudah tersedia.",
    aiGeneralError: isEnglish
      ? "An error occurred while processing the request."
      : "Terjadi kesalahan saat memproses permintaan.",
    cameraUnsupported: isEnglish
      ? "This browser does not support camera access."
      : "Browser ini tidak mendukung akses kamera.",
    micUnsupported: isEnglish
      ? "This browser does not support microphone access."
      : "Browser ini tidak mendukung mikrofon.",
    micDenied: isEnglish
      ? "Microphone access is blocked by Windows or your browser. Please check Windows Settings (Privacy & security > Microphone: ON) and click the lock/settings icon next to the URL to Allow microphone."
      : "Akses mikrofon diblokir oleh sistem Windows atau browser. Silakan aktifkan izin mikrofon di Pengaturan Windows (Privasi & keamanan > Mikrofon: ON) serta klik ikon gembok/setelan di samping URL browser lalu pilih Izinkan (Allow).",
    micNotFound: isEnglish
      ? "No microphone found on this device. Please connect a microphone and try again."
      : "Mikrofon tidak ditemukan pada perangkat ini. Sambungkan mikrofon lalu coba lagi.",
    micBusy: isEnglish
      ? "The microphone is currently in use by another app (e.g. Discord, Zoom, Game). Please close the other app and try again."
      : "Mikrofon sedang digunakan oleh aplikasi lain (seperti Discord, Zoom, atau Game). Silakan tutup aplikasi tersebut lalu coba lagi.",
    cameraDenied: isEnglish
      ? "Camera permission was denied. Allow camera access for this site and try again."
      : "Izin kamera ditolak. Izinkan kamera untuk situs ini lalu coba lagi.",
    cameraNotFound: isEnglish
      ? "No camera was found on this device."
      : "Kamera tidak ditemukan pada perangkat ini.",
    cameraBusy: isEnglish
      ? "The camera is being used by another application."
      : "Kamera sedang digunakan aplikasi lain.",
    cameraSecurity: isEnglish
      ? "Camera access is blocked by the browser or security settings."
      : "Akses kamera diblokir oleh browser atau pengaturan keamanan.",
    cameraGeneric: isEnglish
      ? "Could not access the camera."
      : "Tidak dapat mengakses kamera.",
    quotaMessage: isEnglish
      ? "⚠️ AI usage limit is currently reached.\\n\\nPlease try again after"
      : "⚠️ Batas penggunaan AI sedang tercapai.\n\nSilakan coba lagi setelah",
    voiceFeature: isEnglish ? "AI Assistant" : "AI Asisten",
    tools: isEnglish ? "Tools" : "Fitur",
    cameraTool: isEnglish ? "Camera" : "Kamera",
    attachTool: isEnglish ? "Attach" : "Lampirkan",
    designTool: isEnglish ? "AI Design" : "Desain AI",
    animationTool: isEnglish ? "AI Animation" : "Animasi AI",
    installApp: isEnglish
      ? "Install DNA AI"
      : "Install DNA AI",
  };

  useEffect(() => {
    const mediaQuery = window.matchMedia(
      "(display-mode: standalone)"
    );

    const checkInstalled = () => {
      const standalone =
        mediaQuery.matches ||
        (
          window.navigator as Navigator & {
            standalone?: boolean;
          }
        ).standalone === true;

      setIsInstalled(standalone);

      if (standalone) {
        setCanInstall(false);
      }
    };

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();

      const installEvent =
        event as BeforeInstallPromptEvent;

      setInstallPrompt(installEvent);

      if (!mediaQuery.matches) {
        setCanInstall(true);
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
      setInstallPrompt(null);
    };

    checkInstalled();

    window.addEventListener(
      "beforeinstallprompt",
      handleBeforeInstallPrompt
    );

    window.addEventListener(
      "appinstalled",
      handleAppInstalled
    );

    mediaQuery.addEventListener(
      "change",
      checkInstalled
    );

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );

      window.removeEventListener(
        "appinstalled",
        handleAppInstalled
      );

      mediaQuery.removeEventListener(
        "change",
        checkInstalled
      );
    };
  }, []);

  async function handleInstall() {
    if (!installPrompt) {
      return;
    }

    await installPrompt.prompt();

    const result =
      await installPrompt.userChoice;

    if (result.outcome === "accepted") {
      setInstallPrompt(null);
      setCanInstall(false);
      setIsInstalled(true);
    }
  }

  async function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const selectedFile =
      event.target.files?.[0] || null;

    if (!selectedFile) {
      setFile(null);
      return;
    }

    if (selectedFile.type.startsWith("image/")) {
      try {
        const optimized = await compressImageFile(selectedFile);
        setFile(optimized);
        return;
      } catch {
        setFile(selectedFile);
        return;
      }
    }

    setFile(selectedFile);
  }

  function removeFile() {
    setFile(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function openCamera() {
    try {
      setCameraLoading(true);

      if (
        typeof window === "undefined" ||
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        throw new Error(
          ui.cameraUnsupported
        );
      }

      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: {
              ideal: "environment",
            },
            width: {
              ideal: 1920,
            },
            height: {
              ideal: 1080,
            },
          },
          audio: false,
        });

      cameraStreamRef.current = stream;
      setCameraOpen(true);
    } catch (error) {
      console.error(
        "CAMERA ERROR:",
        error
      );

      const errorName =
        error instanceof DOMException
          ? error.name
          : "";

      let message =
        error instanceof Error
          ? error.message
          : ui.cameraGeneric;

      if (errorName === "NotAllowedError") {
        message =
          ui.cameraDenied;
      } else if (errorName === "NotFoundError") {
        message =
          ui.cameraNotFound;
      } else if (errorName === "NotReadableError") {
        message =
          ui.cameraBusy;
      } else if (errorName === "SecurityError") {
        message =
          ui.cameraSecurity;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          role: "assistant",
          content: `⚠️ ${message}`,
        },
      ]);
    } finally {
      setCameraLoading(false);
    }
  }

  function closeCamera() {
    if (cameraStreamRef.current) {
      cameraStreamRef.current
        .getTracks()
        .forEach((track) => track.stop());

      cameraStreamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraOpen(false);
  }

  function capturePhoto() {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    if (
      video.readyState <
      HTMLMediaElement.HAVE_CURRENT_DATA
    ) {
      return;
    }

    const canvas =
      document.createElement("canvas");

    canvas.width =
      video.videoWidth || 1280;

    canvas.height =
      video.videoHeight || 720;

    const context =
      canvas.getContext("2d");

    if (!context) {
      return;
    }

    context.drawImage(
      video,
      0,
      0,
      canvas.width,
      canvas.height
    );

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          return;
        }

        const photo = new File(
          [blob],
          `kamera-${Date.now()}.jpg`,
          {
            type: "image/jpeg",
          }
        );

        setFile(photo);

        closeCamera();
      },
      "image/jpeg",
      0.92
    );
  }

  useEffect(() => {
    if (!cameraOpen) {
      return;
    }

    const video = videoRef.current;
    const stream = cameraStreamRef.current;

    if (!video || !stream) {
      return;
    }

    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;

    const startVideo = async () => {
      try {
        await video.play();
      } catch (error) {
        console.error(
          "VIDEO PLAY ERROR:",
          error
        );
      }
    };

    startVideo();

    return () => {
      video.pause();
      video.srcObject = null;
    };
  }, [cameraOpen]);

  useEffect(() => {
    return () => {
      if (cameraStreamRef.current) {
        cameraStreamRef.current
          .getTracks()
          .forEach((track) =>
            track.stop()
          );

        cameraStreamRef.current = null;
      }
    };
  }, []);

  function cleanupAudioVisualizer() {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setVoiceLevel(0);
  }

  function stopAiSpeaking() {
    const player = audioPlayerRef.current;

    if (player) {
      player.pause();
      player.currentTime = 0;
      audioPlayerRef.current = null;
    }

    stopNaturalVoice();
    setIsSpeaking(false);
  }

  function speakWithNaturalEngine(text: string) {
    if (voiceOverlayOpenRef.current) {
      setVoiceModeStatus("speaking");
    }

    speakNaturalVoice({
      text,
      locale: locale === "en" ? "en" : "id",
      onStart: () => {
        setIsSpeaking(true);
        if (voiceOverlayOpenRef.current) {
          setVoiceModeStatus("speaking");
        }
      },
      onEnd: () => {
        setIsSpeaking(false);
        if (voiceOverlayOpenRef.current && !isVoicePausedRef.current) {
          // Percakapan terus-menerus tanpa henti ala ChatGPT
          setTimeout(() => {
            if (voiceOverlayOpenRef.current && !isVoicePausedRef.current) {
              void startVoiceRecording();
            }
          }, 350);
        } else if (voiceOverlayOpenRef.current) {
          setVoiceModeStatus("idle");
        }
      },
      onError: () => {
        setIsSpeaking(false);
        if (voiceOverlayOpenRef.current && !isVoicePausedRef.current) {
          setTimeout(() => {
            if (voiceOverlayOpenRef.current && !isVoicePausedRef.current) {
              void startVoiceRecording();
            }
          }, 400);
        } else if (voiceOverlayOpenRef.current) {
          setVoiceModeStatus("idle");
        }
      },
    });
  }

  function playAiVoice(base64Audio?: string | null, rawText?: string) {
    stopAiSpeaking();

    // 1. Coba putar audio WAV dari server jika tersedia
    if (base64Audio) {
      try {
        const audio = new Audio(
          `data:audio/wav;base64,${base64Audio}`
        );

        audio.volume = 1;

        audio.onplay = () => {
          setIsSpeaking(true);
          if (voiceOverlayOpenRef.current) {
            setVoiceModeStatus("speaking");
          }
        };

        audio.onended = () => {
          setIsSpeaking(false);
          audioPlayerRef.current = null;
          if (voiceOverlayOpenRef.current && !isVoicePausedRef.current) {
            setTimeout(() => {
              if (voiceOverlayOpenRef.current && !isVoicePausedRef.current) {
                void startVoiceRecording();
              }
            }, 350);
          } else if (voiceOverlayOpenRef.current) {
            setVoiceModeStatus("idle");
          }
        };

        audio.onerror = () => {
          setIsSpeaking(false);
          audioPlayerRef.current = null;
          if (rawText) {
            speakWithNaturalEngine(rawText);
          }
        };

        audioPlayerRef.current = audio;

        void audio.play().catch(() => {
          setIsSpeaking(false);
          audioPlayerRef.current = null;
          if (rawText) {
            speakWithNaturalEngine(rawText);
          }
        });

        return;
      } catch {
        // Fallback ke Natural Voice Engine
      }
    }

    // 2. Gunakan Natural Voice Engine (100% Free & Alami)
    if (rawText) {
      speakWithNaturalEngine(rawText);
    }
  }

  async function startVoiceRecording() {
    if (loading || isRecordingRef.current) {
      return;
    }

    stopAiSpeaking();

    try {
      if (
        typeof navigator === "undefined" ||
        !navigator.mediaDevices?.getUserMedia
      ) {
        throw new Error(
          ui.micUnsupported
        );
      }

      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

      // Hubungkan ke Web Audio API Analyser untuk gelembung dinamis & deteksi keheningan (silence detection)
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

        if (AudioCtx) {
          const audioCtx = new AudioCtx();
          if (audioCtx.state === "suspended") {
            await audioCtx.resume();
          }

          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 256;
          analyser.smoothingTimeConstant = 0.5;

          const source = audioCtx.createMediaStreamSource(stream);
          source.connect(analyser);

          audioContextRef.current = audioCtx;
          analyserRef.current = analyser;

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          hasSpokenRef.current = false;
          lastSpeechTimeRef.current = 0;
          recordingStartTimeRef.current = Date.now();

          const checkAudioActivity = () => {
            if (!isRecordingRef.current) return;

            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const average = sum / dataArray.length;
            const normalizedLevel = Math.min(100, Math.round((average / 128) * 100));
            setVoiceLevel(normalizedLevel);

            const now = Date.now();
            const SILENCE_THRESHOLD = 12; // Level threshold suara
            const SILENCE_DURATION = 1500; // 1.5 detik keheningan = user selesai bicara
            const MIN_SPEECH_DURATION = 800; // Minimal 800ms bicara agar batuk/klik tidak sengaja auto-kirim

            if (average > SILENCE_THRESHOLD) {
              if (!hasSpokenRef.current && now - recordingStartTimeRef.current > 300) {
                hasSpokenRef.current = true;
              }
              lastSpeechTimeRef.current = now;
            } else if (hasSpokenRef.current && lastSpeechTimeRef.current > 0) {
              const silenceElapsed = now - lastSpeechTimeRef.current;
              const totalElapsed = now - recordingStartTimeRef.current;
              if (silenceElapsed >= SILENCE_DURATION && totalElapsed >= MIN_SPEECH_DURATION) {
                // Pengguna telah selesai berbicara! Otomatis kirim tanpa harus tekan kirim
                stopVoiceRecording();
                return;
              }
            }

            animFrameRef.current = requestAnimationFrame(checkAudioActivity);
          };

          animFrameRef.current = requestAnimationFrame(checkAudioActivity);
        }
      } catch (audioErr) {
        console.warn("AudioContext visualization not available:", audioErr);
      }

      const mimeTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/mp4",
      ];

      const supportedMimeType =
        mimeTypes.find((type) =>
          MediaRecorder.isTypeSupported(type)
        ) ?? "";

      const recorder = supportedMimeType
        ? new MediaRecorder(
            stream,
            {
              mimeType:
                supportedMimeType,
            }
          )
        : new MediaRecorder(stream);

      audioChunksRef.current = [];

      recorder.ondataavailable = (
        event
      ) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(
            event.data
          );
        }
      };

      recorder.onstop = async () => {
        cleanupAudioVisualizer();

        stream
          .getTracks()
          .forEach((track) =>
            track.stop()
          );

        const mimeType =
          recorder.mimeType ||
          "audio/webm";

        const blob = new Blob(
          audioChunksRef.current,
          {
            type: mimeType,
          }
        );

        audioChunksRef.current = [];
        mediaRecorderRef.current = null;
        setIsRecording(false);
        isRecordingRef.current = false;

        if (!blob.size) {
          setLoading(false);
          if (voiceOverlayOpenRef.current) {
            setVoiceModeStatus("idle");
          }
          return;
        }

        const extension =
          mimeType.includes("ogg")
            ? "ogg"
            : mimeType.includes("mp4")
              ? "mp4"
              : "webm";

        const voiceFile = new File(
          [blob],
          `voice-${Date.now()}.${extension}`,
          {
            type: mimeType,
          }
        );

        await sendVoiceMessage(
          voiceFile
        );
      };

      mediaRecorderRef.current =
        recorder;

      recorder.start();

      setIsRecording(true);
      isRecordingRef.current = true;
      if (voiceOverlayOpenRef.current) {
        setVoiceModeStatus("listening");
      }
    } catch (error) {
      cleanupAudioVisualizer();
      console.error(
        "VOICE RECORDING ERROR:",
        error
      );

      setIsRecording(false);
      isRecordingRef.current = false;
      if (voiceOverlayOpenRef.current) {
        setVoiceModeStatus("idle");
      }

      const errorName =
        error instanceof DOMException
          ? error.name
          : "";

      const rawMsg =
        error instanceof Error
          ? error.message.toLowerCase()
          : "";

      let contentMsg =
        error instanceof Error
          ? `⚠️ ${error.message}`
          : "⚠️ Mikrofon tidak dapat digunakan.";

      if (
        errorName === "NotAllowedError" ||
        errorName === "PermissionDeniedError" ||
        rawMsg.includes("permission") ||
        rawMsg.includes("denied")
      ) {
        contentMsg = `⚠️ ${ui.micDenied}`;
      } else if (
        errorName === "NotFoundError" ||
        rawMsg.includes("not found")
      ) {
        contentMsg = `⚠️ ${ui.micNotFound}`;
      } else if (
        errorName === "NotReadableError" ||
        rawMsg.includes("busy") ||
        rawMsg.includes("in use")
      ) {
        contentMsg = `⚠️ ${ui.micBusy}`;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          role: "assistant",
          content: contentMsg,
        },
      ]);
    }
  }

  function stopVoiceRecording() {
    const recorder =
      mediaRecorderRef.current;

    if (!recorder) {
      return;
    }

    if (recorder.state === "recording") {
      recorder.stop();
    }
  }

  function handleOpenVoiceMode() {
    setVoiceOverlayOpen(true);
    setIsVoicePaused(false);
    isVoicePausedRef.current = false;
    setVoiceModeStatus("listening");
    setLatestVoiceReply("");
    stopAiSpeaking();

    // Beri jeda sejenak untuk transisi UI lalu aktifkan mikrofon
    setTimeout(() => {
      void startVoiceRecording();
    }, 200);
  }

  function handleCloseVoiceMode() {
    setVoiceOverlayOpen(false);
    setIsVoicePaused(false);
    isVoicePausedRef.current = false;
    setVoiceModeStatus("idle");
    stopVoiceRecording();
    stopAiSpeaking();
    cleanupAudioVisualizer();
  }

  function handleTogglePauseVoice() {
    if (isVoicePaused) {
      setIsVoicePaused(false);
      isVoicePausedRef.current = false;
      setVoiceModeStatus("listening");
      void startVoiceRecording();
    } else {
      setIsVoicePaused(true);
      isVoicePausedRef.current = true;
      setVoiceModeStatus("paused");
      stopVoiceRecording();
      stopAiSpeaking();
      cleanupAudioVisualizer();
    }
  }

  function handleSendNowVoice() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      stopVoiceRecording();
    }
  }

  async function sendVoiceMessage(
    voiceFile: File
  ) {
    requestNotificationPermission().catch(() => {});
    setLoading(true);
    if (voiceOverlayOpenRef.current) {
      setVoiceModeStatus("thinking");
    }

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        role: "user",
        content: ui.voiceMessage,
      },
    ]);

    try {
      const formData =
        new FormData();

      const conversationContext =
        buildConversationContext(messages);

      formData.append(
        "message",
        ""
      );

      formData.append(
        "conversation",
        conversationContext
      );

      formData.append(
        "voice",
        voiceFile
      );

      formData.append(
        "model",
        selectedModel
      );

      formData.append(
        "locale",
        locale
      );

      const response =
        await fetch(
          "/api/ai-assistant",
          {
            method: "POST",
            body: formData,
          }
        );

      let data: any = null;
      const rawText = await response.text();
      try {
        data = JSON.parse(rawText);
      } catch {
        if (
          response.status === 413 ||
          rawText.toLowerCase().includes("too large") ||
          rawText.toLowerCase().includes("request entity")
        ) {
          throw new Error(
            ui.voiceProcessingError
          );
        }
        throw new Error(
          rawText.slice(0, 180) || ui.voiceProcessingError
        );
      }

      if (!response.ok) {
        if (
          response.status === 429 &&
          data?.quota?.exhausted
        ) {
          const retryAt =
            data.quota.retryAt;

          const retryText = retryAt
            ? formatResetTime(retryAt)
            : "beberapa saat lagi";

          setMessages((prev) => [
            ...prev,
            {
              id: Date.now() + 1,
              role: "assistant",
              content:
                `⚠️ Batas penggunaan AI sedang tercapai.\n\n` +
                `Silakan coba lagi setelah ${retryText}.`,
            },
          ]);

          if (voiceOverlayOpenRef.current) {
            setVoiceModeStatus("idle");
          }
          return;
        }

        throw new Error(
          data.error ||
            ui.voiceProcessingError
        );
      }

      const aiReplyText =
        data.result || ui.aiNoAnswer;

      setLatestVoiceReply(aiReplyText);
      if (voiceOverlayOpenRef.current) {
        setVoiceModeStatus("speaking");
      }

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "assistant",
          content: aiReplyText,
        },
      ]);

      playAiVoice(data.audio, aiReplyText);

      addNotification({
        feature:
          data.feature ||
          "AI Asisten",
        title:
          ui.voiceFinishedTitle,
        message:
          ui.voiceFinishedMessage,
        type: "success",
        result:
          data.result || "",
      });

      // Kirim notifikasi HP jika pengguna sedang membuka game atau aplikasi lain
      if (typeof document !== "undefined" && document.hidden) {
        const previewText =
          data.result && typeof data.result === "string"
            ? data.result.replace(/[#*`_]/g, "").slice(0, 100) + "..."
            : "Jawaban suara AI untuk tugas Anda sudah siap. Ketuk untuk membuka kembali.";

        sendBackgroundNotification({
          title: "DNA AI - Jawaban Suara Siap! 🎙️",
          body: previewText,
          url: "/ai-assistant",
          tag: "dna-ai-voice-done",
        }).catch(() => {});
      }
    } catch (error) {
      console.error(
        "AI VOICE ERROR:",
        error
      );

      if (voiceOverlayOpenRef.current) {
        setVoiceModeStatus("idle");
      }

      if (typeof document !== "undefined" && document.hidden) {
        sendBackgroundNotification({
          title: "DNA AI - Pemberitahuan",
          body: "Terjadi kendala saat memproses pesan suara AI. Ketuk untuk memeriksa.",
          url: "/ai-assistant",
          tag: "dna-ai-voice-error",
        }).catch(() => {});
      }

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 2,
          role: "assistant",
          content:
            error instanceof Error
              ? error.message
              : ui.voiceGeneralError,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    return () => {
      stopAiSpeaking();
      cleanupAudioVisualizer();

      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !==
          "inactive"
      ) {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  async function sendMessage() {
    const text = input.trim();

    const currentImageUrl = imageUrl.trim();

    if (!text && !file && !currentImageUrl) {
      return;
    }

    // Minta izin notifikasi HP agar siap mengirim pemberitahuan saat user buka aplikasi lain
    requestNotificationPermission().catch(() => {});

    const currentFile = file;

    const imagePreview =
      currentFile &&
      currentFile.type.startsWith("image/")
        ? URL.createObjectURL(currentFile)
        : undefined;

    const userMessage: Message = {
      id: Date.now(),
      role: "user",
      content:
        text || ui.sendPhoto,
      fileName:
        currentFile?.name ||
        (currentImageUrl
          ? currentImageUrl
          : undefined),
      imagePreview,
    };

    setMessages((prev) => [
      ...prev,
      userMessage,
    ]);

    setInput("");
    setLoading(true);

    try {
      const formData =
        new FormData();

      const conversationContext =
        buildConversationContext([
          ...messages,
          userMessage,
        ]);

      formData.append(
        "message",
        text
      );

      formData.append(
        "conversation",
        conversationContext
      );

      let thumbnailDataUrl = "";
      if (currentFile) {
        let fileToSend = currentFile;
        if (currentFile.type.startsWith("image/")) {
          try {
            thumbnailDataUrl = await createThumbnailDataUrl(currentFile);
            fileToSend = await compressImageFile(currentFile);
          } catch {
            fileToSend = currentFile;
          }
        }
        formData.append(
          "file",
          fileToSend
        );
        if (thumbnailDataUrl) {
          formData.append(
            "imageThumbnail",
            thumbnailDataUrl
          );
        }
      }

      if (currentImageUrl) {
        formData.append(
          "imageUrl",
          currentImageUrl
        );
      }

      formData.append(
        "model",
        selectedModel
      );

      formData.append(
        "locale",
        locale
      );

      const response =
        await fetch(
          "/api/ai-assistant",
          {
            method: "POST",
            body: formData,
          }
        );

      let data: any = null;
      const rawText = await response.text();
      try {
        data = JSON.parse(rawText);
      } catch {
        if (
          response.status === 413 ||
          rawText.toLowerCase().includes("too large") ||
          rawText.toLowerCase().includes("request entity")
        ) {
          throw new Error(
            isEnglish
              ? "The uploaded file is too large for the server. DNA AI is automatically optimizing it, please try again."
              : "Ukuran file terlalu besar untuk diproses server. DNA AI mengoptimalkan gambar secara otomatis, silakan coba kirim lagi."
          );
        }
        if (!response.ok) {
          throw new Error(
            rawText.slice(0, 180) ||
              (isEnglish
                ? "Server responded with an error."
                : "Terjadi kesalahan respon dari server.")
          );
        }
      }

      if (!response.ok) {
        if (
          response.status === 429 &&
          data?.quota?.exhausted
        ) {
          const retryAt =
            data.quota.retryAt;

          const retryText = retryAt
            ? formatResetTime(retryAt)
            : "beberapa saat lagi";

          const quotaMessage: Message = {
            id: Date.now() + 1,
            role: "assistant",
            content:
              `⚠️ Batas penggunaan AI sedang tercapai.\n\n` +
              `Silakan coba lagi setelah ${retryText}.`,
          };

          setMessages((prev) => [
            ...prev,
            quotaMessage,
          ]);

          return;
        }

        throw new Error(
          data.error ||
            (isEnglish
              ? "An error occurred while contacting AI."
              : "Terjadi kesalahan saat menghubungi AI.")
        );
      }

      const assistantMessage: Message = {
        id: Date.now() + 1,
        role: "assistant",
        content:
          data.result ||
          ui.aiNoAnswer,
      };

      setMessages((prev) => [
        ...prev,
        assistantMessage,
      ]);

      if (typeof window !== "undefined" && data?.history?.id) {
        try {
          const historyChat = [
            {
              role: "user" as const,
              content: text || (isEnglish ? "Sent a photo" : "Foto yang dikirim"),
              image: thumbnailDataUrl || (currentFile && currentFile.type.startsWith("image/") ? imagePreview : undefined),
            },
            {
              role: "assistant" as const,
              content: data.result || ui.aiNoAnswer,
            },
          ];
          window.localStorage.setItem(
            `dna-ai-history-conversation:${data.history.id}`,
            JSON.stringify(historyChat)
          );
        } catch (storageErr) {
          console.warn("History localStorage cache warning:", storageErr);
        }
      }

      addNotification({
        feature:
          data.feature ||
          "AI Asisten",
        title:
          ui.aiFinishedTitle,
        message:
          ui.aiFinishedMessage,
        type: "success",
        result:
          data.result || "",
      });

      // Kirim notifikasi HP jika pengguna sedang membuka game atau aplikasi lain
      if (typeof document !== "undefined" && document.hidden) {
        const previewText =
          data.result && typeof data.result === "string"
            ? data.result.replace(/[#*`_]/g, "").slice(0, 100) + "..."
            : "Jawaban AI untuk tugas Anda sudah siap. Ketuk untuk melihat hasilnya.";

        sendBackgroundNotification({
          title: "DNA AI - Tugas Selesai! ✨",
          body: previewText,
          url: "/ai-assistant",
          tag: "dna-ai-task-done",
        }).catch(() => {});
      }

      setFile(null);
      setImageUrl("");
      setImageUrlOpen(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error(
        "AI ASSISTANT ERROR:",
        error
      );

      if (typeof document !== "undefined" && document.hidden) {
        sendBackgroundNotification({
          title: "DNA AI - Pemberitahuan",
          body: "Terjadi kendala saat memproses jawaban AI. Ketuk untuk memeriksa.",
          url: "/ai-assistant",
          tag: "dna-ai-task-error",
        }).catch(() => {});
      }

      const errorMessage: Message = {
        id: Date.now() + 1,
        role: "assistant",
        content:
          error instanceof Error
            ? error.message
            : ui.aiGeneralError,
      };

      setMessages((prev) => [
        ...prev,
        errorMessage,
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ) {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-2rem)] flex-col">

      {/* CAMERA MODAL */}

      {cameraOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">

          <div className="w-full max-w-3xl overflow-hidden rounded-3xl border border-border bg-card shadow-2xl">

            <div className="flex items-center justify-between border-b border-border px-5 py-4">

              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600">

                  <Camera
                    size={20}
                    className="text-white"
                  />

                </div>

                <div>

                  <h2 className="font-semibold text-foreground">
                    {ui.camera}
                  </h2>

                  <p className="text-xs text-muted-foreground">
                    {ui.cameraDescription}
                  </p>

                </div>

              </div>

              <button
                type="button"
                onClick={closeCamera}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
              >
                <X size={20} />
              </button>

            </div>


            <div className="bg-black">

              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                controls={false}
                disablePictureInPicture
                className="block min-h-[280px] max-h-[65vh] w-full object-contain"
              />

            </div>


            <div className="flex items-center justify-center gap-4 px-5 py-5">

              <button
                type="button"
                onClick={closeCamera}
                className="rounded-2xl border border-slate-700 px-5 py-3 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
              >
                {ui.cancel}
              </button>


              <button
                type="button"
                onClick={capturePhoto}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-slate-950 shadow-lg transition hover:scale-105"
                aria-label={ui.takePhoto}
              >

                <div className="flex h-12 w-12 items-center justify-center rounded-full border-4 border-slate-900">

                  <Camera size={22} />

                </div>

              </button>

            </div>

          </div>

        </div>
      )}


      {/* HEADER */}

      <div className="mb-6 flex items-center justify-between gap-3">

        <div className="flex items-center gap-3">

          <div className="flex h-11 w-11 items-center justify-center">
            <Image
              src="/logo-dna.png"
              alt="DNA AI"
              width={44}
              height={44}
              priority
              className="object-contain"
            />
          </div>

          <div>

            <h1 className="text-2xl font-bold text-foreground">
              {ui.title}
            </h1>

            <p className="text-sm text-muted-foreground">
              {ui.subtitle}
            </p>

          </div>

        </div>

        {!isInstalled && canInstall && (
          <button
            type="button"
            onClick={handleInstall}
            className="flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:scale-105 hover:shadow-xl"
          >
            <Download size={18} />

            <span className="hidden sm:inline">
              {ui.installApp}
            </span>
          </button>
        )}

      </div>


      {/* CHAT AREA */}

      <div className="flex flex-1 flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-xl">

        {/* MESSAGES */}

        <div className="flex-1 overflow-y-auto p-4 lg:p-8">

          {messages.length === 0 ? (

            <div className="flex min-h-[500px] items-center justify-center">

              <div className="max-w-2xl text-center">

                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20">
                  <Image
                    src="/logo-dna.png"
                    alt="DNA AI"
                    width={56}
                    height={56}
                    priority
                    className="object-contain"
                  />
                </div>


                <h2 className="text-3xl font-bold text-foreground">
                  {ui.heroTitle}
                </h2>


                <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
                  {ui.heroDescription}
                </p>


                <div className="mt-8 hidden grid-cols-1 gap-3 md:grid md:grid-cols-2">

                  <div className="rounded-2xl border border-border bg-secondary/70 p-4 text-left">

                    <p className="font-semibold text-foreground">
                      {ui.techTitle}
                    </p>

                    <p className="mt-1 text-sm text-muted-foreground">
                      {ui.techDescription}
                    </p>

                  </div>


                  <div className="rounded-2xl border border-border bg-secondary/70 p-4 text-left">

                    <p className="font-semibold text-foreground">
                      {ui.imagePromptTitle}
                    </p>

                    <p className="mt-1 text-sm text-muted-foreground">
                      {ui.imagePromptDescription}
                    </p>

                  </div>


                  <div className="rounded-2xl border border-border bg-secondary/70 p-4 text-left">

                    <p className="font-semibold text-foreground">
                      {ui.documentTitle}
                    </p>

                    <p className="mt-1 text-sm text-muted-foreground">
                      {ui.documentDescription}
                    </p>

                  </div>


                  <div className="rounded-2xl border border-border bg-secondary/70 p-4 text-left">

                    <p className="font-semibold text-foreground">
                      {ui.ocrTranslatorTitle}
                    </p>

                    <p className="mt-1 text-sm text-muted-foreground">
                      {ui.ocrTranslatorDescription}
                    </p>

                  </div>

                </div>

              </div>

            </div>

          ) : (

            <div className="mx-auto max-w-4xl space-y-6">

              {messages.map(
                (message) => (

                  <div
                    key={message.id}
                    className={`flex ${
                      message.role === "user"
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >

                    <div
                      className={`max-w-[85%] rounded-3xl px-5 py-4 ${
                        message.role === "user"
                          ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white"
                          : "border border-border bg-secondary text-foreground"
                      }`}
                    >

                      {message.imagePreview && (
                        <div className="mb-3 overflow-hidden rounded-2xl">
                          <img
                            src={message.imagePreview}
                            alt={
                              message.fileName ||
                              ui.sentPhotoAlt
                            }
                            className="max-h-[420px] max-w-full rounded-2xl object-contain"
                          />
                        </div>
                      )}

                      {message.fileName && (

                        <div className="mb-3 flex items-center gap-2 rounded-xl bg-black/20 px-3 py-2 text-sm">

                          {message.fileName.match(
                            /\.(png|jpe?g|webp)$/i
                          ) ? (

                            <ImageIcon size={16} />

                          ) : (

                            <FileText size={16} />

                          )}

                          <span className="truncate">
                            {message.fileName}
                          </span>

                        </div>

                      )}


                      <div className="whitespace-pre-wrap leading-7">
                        {message.content}
                      </div>

                      {message.role === "assistant" && (
                        <div className="mt-3 flex items-center gap-2 border-t border-border/40 pt-2 text-xs text-muted-foreground">
                          <button
                            type="button"
                            onClick={() => {
                              if (isSpeaking) {
                                stopAiSpeaking();
                              } else {
                                playAiVoice(null, message.content);
                              }
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 transition hover:bg-black/10 hover:text-cyan-400"
                            title={isSpeaking ? "Hentikan Suara" : "Dengarkan Suara Natural AI"}
                          >
                            <Volume2 size={13} className="text-cyan-400" />
                            <span>
                              {isSpeaking
                                ? isEnglish
                                  ? "Stop"
                                  : "Hentikan"
                                : isEnglish
                                ? "Listen"
                                : "Dengarkan suara"}
                            </span>
                          </button>
                        </div>
                      )}

                    </div>

                  </div>

                )
              )}


              {isSpeaking && (
                <div className="mb-3 flex items-center justify-between rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-2.5 text-sm text-cyan-300">
                  <div className="flex items-center gap-2">
                    <Volume2 size={18} className="animate-pulse text-cyan-400" />
                    <span className="font-medium">{ui.speaking}</span>
                  </div>
                  <button
                    type="button"
                    onClick={stopAiSpeaking}
                    className="flex items-center gap-1 text-xs text-red-400 transition hover:underline"
                  >
                    <VolumeX size={14} />
                    <span>{isEnglish ? "Stop" : "Hentikan"}</span>
                  </button>
                </div>
              )}

              {loading && (

                <div className="flex justify-start">

                  <div className="rounded-3xl border border-border bg-secondary px-5 py-4">

                    <div className="flex items-center gap-2">

                      <span className="h-2 w-2 animate-bounce rounded-full bg-cyan-400" />

                      <span
                        className="h-2 w-2 animate-bounce rounded-full bg-cyan-400"
                        style={{
                          animationDelay:
                            "120ms",
                        }}
                      />

                      <span
                        className="h-2 w-2 animate-bounce rounded-full bg-cyan-400"
                        style={{
                          animationDelay:
                            "240ms",
                        }}
                      />

                    </div>

                  </div>

                </div>

              )}

            </div>

          )}

        </div>


        {/* INPUT AREA */}

        <div className="border-t border-border bg-card p-4 lg:p-6">

          <div className="mx-auto max-w-4xl">

            {imageUrl.trim() && (

              <div className="mb-3 flex items-center justify-between rounded-2xl border border-cyan-500/30 bg-secondary px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Link2
                    size={18}
                    className="shrink-0 text-cyan-400"
                  />
                  <span className="truncate text-sm text-foreground">
                    {imageUrl}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setImageUrl("");
                    setImageUrlOpen(false);
                  }}
                  className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground"
                >
                  <X size={18} />
                </button>
              </div>
            )}

            {file && (

              <div className="mb-3 flex items-center justify-between rounded-2xl border border-border bg-secondary px-4 py-3">

                <div className="flex min-w-0 items-center gap-3">

                  {file.type.startsWith("image/") ? (

                    <ImageIcon
                      size={18}
                      className="shrink-0 text-cyan-400"
                    />

                  ) : (

                    <FileText
                      size={18}
                      className="shrink-0 text-cyan-400"
                    />

                  )}

                  <span className="truncate text-sm text-foreground">
                    {file.name}
                  </span>

                </div>

                <button
                  type="button"
                  onClick={removeFile}
                  className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground"
                >

                  <X size={18} />

                </button>

              </div>

            )}

            <div className="rounded-3xl border border-border bg-input p-2 shadow-lg focus-within:border-cyan-500">

              <textarea
                value={input}
                onChange={(event) =>
                  setInput(
                    event.target.value
                  )
                }
                onKeyDown={handleKeyDown}
                placeholder={ui.placeholder}
                rows={3}
                disabled={loading}
                className="w-full resize-none bg-transparent px-4 py-3 text-foreground outline-none placeholder:text-muted-foreground disabled:opacity-60"
              />

              <div className="relative mb-2 px-2">
                <button
                  type="button"
                  onClick={() =>
                    setModelMenuOpen((prev) => !prev)
                  }
                  disabled={loading}
                  className="flex items-center gap-2 rounded-xl border border-border bg-secondary px-3 py-2 text-left transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-foreground">
                      {
                        MODEL_OPTIONS.find(
                          (option) =>
                            option.id ===
                            selectedModel
                        )?.name ?? "Model"
                      }
                    </div>
                    <div className="hidden text-[11px] text-muted-foreground sm:block">
                      {
                        selectedModel === AUTO_MODEL
                          ? (isEnglish
                              ? "Auto fallback if quota is busy"
                              : "Fallback otomatis jika kuota habis")
                          : (isEnglish
                              ? "Gemini model for AI Assistant"
                              : "Model Gemini untuk AI Asisten")
                      }
                    </div>
                  </div>

                  <ChevronDown
                    size={16}
                    className={`shrink-0 text-slate-500 transition-transform ${
                      modelMenuOpen
                        ? "rotate-180"
                        : ""
                    }`}
                  />
                </button>

                {modelMenuOpen && (
                  <div className="absolute bottom-full left-2 z-50 mb-2 w-[310px] overflow-hidden rounded-2xl border border-slate-700 bg-[#111827] p-2 shadow-2xl">
                    {MODEL_OPTIONS.map(
                      (option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => {
                            setSelectedModel(
                              option.id
                            );
                            setModelMenuOpen(
                              false
                            );
                          }}
                          className={`flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition ${
                            selectedModel === option.id
                              ? "bg-slate-800/80 border border-cyan-500/30"
                              : "hover:bg-slate-800"
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-semibold ${
                                selectedModel === option.id ? "text-cyan-300" : "text-slate-200"
                              }`}>
                                {option.name}
                              </span>
                              {option.id === AUTO_MODEL && (
                                <span className="rounded-md bg-cyan-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-300">
                                  AUTO
                                </span>
                              )}
                            </div>

                            <p className="mt-1 text-xs text-slate-500">
                              {option.id === AUTO_MODEL
                                ? (isEnglish
                                    ? "Automatically switch models if quota is exhausted or busy"
                                    : "Otomatis beralih model jika kuota habis atau sibuk")
                                : (isEnglish
                                    ? "Gemini model configured for AI Assistant"
                                    : "Model Gemini yang dikonfigurasi untuk AI Asisten")}
                            </p>
                          </div>

                          {selectedModel ===
                            option.id && (
                            <Check
                              size={17}
                              className="mt-0.5 shrink-0 text-cyan-400"
                            />
                          )}
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between px-2 pb-1">

                <div className="relative">

                  <input
                    ref={fileInputRef}
                    type="file"
                    hidden
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg,.webp"
                    onChange={handleFileChange}
                    disabled={loading}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setToolMenuOpen((prev) => !prev)
                    }
                    disabled={loading}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-slate-400 transition hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label={ui.tools}
                    title={ui.tools}
                  >
                    <Plus
                      size={20}
                      className={`transition-transform ${
                        toolMenuOpen
                          ? "rotate-45"
                          : ""
                      }`}
                    />
                  </button>

                  {toolMenuOpen && (
                    <div className="absolute bottom-full left-0 z-50 mb-2 w-[270px] overflow-hidden rounded-2xl border border-slate-700 bg-[#111827] p-2 shadow-2xl">

                      <button
                        type="button"
                        onClick={() => {
                          setToolMenuOpen(false);
                          openCamera();
                        }}
                        disabled={loading || cameraLoading}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 md:hidden"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10">
                          <Camera size={18} className="text-cyan-400" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-white">
                            {ui.cameraTool}
                          </div>
                          <p className="text-xs text-slate-500">
                            {ui.cameraDescription}
                          </p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setToolMenuOpen(false);
                          fileInputRef.current?.click();
                        }}
                        disabled={loading}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-800">
                          <Paperclip size={18} className="text-slate-200" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-white">
                            {ui.attachTool}
                          </div>
                          <p className="text-xs text-slate-500">
                            {isEnglish
                              ? "Upload a file from your device"
                              : "Unggah file dari perangkat"}
                          </p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setToolMenuOpen(false);
                          router.push("/ai-code");
                        }}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-slate-800"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10">
                          <Code2
                            size={18}
                            className="text-emerald-400"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-white">
                            AI Code
                          </div>
                          <p className="text-xs text-slate-500">
                            {isEnglish
                              ? "Coding, web and game development"
                              : "Coding, pembuatan web, dan game"}
                          </p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setToolMenuOpen(false);
                          router.push("/ai-animation");
                        }}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-slate-800"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-500/10">
                          <span className="text-lg">🎬</span>
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-white">
                            {ui.animationTool}
                          </div>
                          <p className="text-xs text-slate-500">
                            {isEnglish
                              ? "Open AI Animation"
                              : "Buka fitur Animasi AI"}
                          </p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setToolMenuOpen(false);
                          router.push("/ai-design");
                        }}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-slate-800"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-pink-500/10">
                          <span className="text-lg">🎨</span>
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-white">
                            {ui.designTool}
                          </div>
                          <p className="text-xs text-slate-500">
                            {isEnglish
                              ? "Open AI Design"
                              : "Buka fitur Desain AI"}
                          </p>
                        </div>
                      </button>

                    </div>
                  )}

                </div>

                <button
                  type="button"
                  onClick={handleOpenVoiceMode}
                  disabled={loading}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-slate-400 transition hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label={isEnglish ? "Open Voice Mode" : "Buka Mode Suara"}
                  title={isEnglish ? "ChatGPT Voice Mode" : "Mode Suara ChatGPT"}
                >
                  <Mic size={18} />
                </button>

                <button
                  type="button"
                  onClick={sendMessage}
                  disabled={
                    loading ||
                    (!input.trim() &&
                      !file &&
                      !imageUrl.trim())
                  }
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40"
                >

                  <Send size={18} />

                </button>

              </div>

            </div>

            <p className="mt-3 text-center text-xs text-slate-600">
              {isEnglish
                ? "AI Assistant can use different functions based on the needs of the conversation."
                : "AI Asisten dapat menggunakan beberapa fungsi berdasarkan kebutuhan percakapan."}
            </p>

          </div>

        </div>

      </div>

      {/* ChatGPT-Style Voice Mode Overlay */}
      {voiceOverlayOpen && (
        <VoiceModeOverlay
          isOpen={voiceOverlayOpen}
          status={voiceModeStatus}
          voiceLevel={voiceLevel}
          isPaused={isVoicePaused}
          latestReply={latestVoiceReply}
          onClose={handleCloseVoiceMode}
          onTogglePause={handleTogglePauseVoice}
          onSendNow={handleSendNowVoice}
          onStopSpeaking={stopAiSpeaking}
          locale={locale === "en" ? "en" : "id"}
        />
      )}

    </div>
  );
}