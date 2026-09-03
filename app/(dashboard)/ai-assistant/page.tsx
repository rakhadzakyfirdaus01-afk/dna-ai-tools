"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
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
} from "lucide-react";

import { addNotification } from "@/components/notifications/notification-store";

import {
  AI_MODELS,
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

const MODEL_OPTIONS: ModelOption[] = AI_MODELS.map(
  (model) => ({
    id: model.id,
    name: model.name,
    description:
      "Model Gemini yang dikonfigurasi untuk AI Asisten",
  })
);

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

export default function Page() {
  const { locale } = useLanguage();
  const isEnglish = locale === "en";

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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef =
    useRef<MediaStream | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const mediaRecorderRef =
    useRef<MediaRecorder | null>(null);
  const audioChunksRef =
    useRef<Blob[]>([]);
  const audioPlayerRef =
    useRef<HTMLAudioElement | null>(null);

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
  };

  function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const selectedFile =
      event.target.files?.[0] || null;

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

  function stopAiSpeaking() {
    const player = audioPlayerRef.current;

    if (player) {
      player.pause();
      player.currentTime = 0;
      audioPlayerRef.current = null;
    }

    setIsSpeaking(false);
  }

  function playAiVoice(base64Audio: string) {
    if (!base64Audio) {
      return;
    }

    stopAiSpeaking();

    const audio = new Audio(
      `data:audio/wav;base64,${base64Audio}`
    );

    audio.volume = 1;

    audio.onplay = () => {
      setIsSpeaking(true);
    };

    audio.onended = () => {
      setIsSpeaking(false);
      audioPlayerRef.current = null;
    };

    audio.onerror = (event) => {
      console.error(
        "AI VOICE AUDIO ERROR:",
        event
      );

      setIsSpeaking(false);
      audioPlayerRef.current = null;

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 2,
          role: "assistant",
          content:
            ui.voiceAudioFailed,
        },
      ]);
    };

    audioPlayerRef.current = audio;

    void audio.play().catch((error) => {
      console.error(
        "AI VOICE PLAY ERROR:",
        error
      );

      setIsSpeaking(false);
      audioPlayerRef.current = null;

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 2,
          role: "assistant",
          content:
            ui.voiceBlocked,
        },
      ]);
    });
  }

  async function startVoiceRecording() {
    if (loading || isRecording) {
      return;
    }

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
          audio: true,
        });

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

        if (!blob.size) {
          setLoading(false);
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
    } catch (error) {
      console.error(
        "VOICE RECORDING ERROR:",
        error
      );

      setIsRecording(false);

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          role: "assistant",
          content:
            error instanceof Error
              ? `⚠️ ${error.message}`
              : "⚠️ Mikrofon tidak dapat digunakan.",
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

  async function sendVoiceMessage(
    voiceFile: File
  ) {
    setLoading(true);

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

      formData.append(
        "message",
        ""
      );

      formData.append(
        "voice",
        voiceFile
      );

      formData.append(
        "model",
        selectedModel
      );

      const response =
        await fetch(
          "/api/ai-assistant",
          {
            method: "POST",
            body: formData,
          }
        );

      const data =
        await response.json();

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

          return;
        }

        throw new Error(
          data.error ||
            ui.voiceProcessingError
        );
      }

      if (!data.audio) {
        throw new Error(
          ui.aiNoVoice
        );
      }

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "assistant",
          content:
            ui.aiSpeakingStatus,
        },
      ]);

      playAiVoice(data.audio);

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
    } catch (error) {
      console.error(
        "AI VOICE ERROR:",
        error
      );

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

      formData.append(
        "message",
        text
      );

      if (currentFile) {
        formData.append(
          "file",
          currentFile
        );
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

      const response =
        await fetch(
          "/api/ai-assistant",
          {
            method: "POST",
            body: formData,
          }
        );

      const data =
        await response.json();

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
            isEnglish ? "An error occurred while contacting AI." : "Terjadi kesalahan saat menghubungi AI."
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

          <div className="w-full max-w-3xl overflow-hidden rounded-3xl border border-slate-700 bg-[#0B1120] shadow-2xl">

            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">

              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600">

                  <Camera
                    size={20}
                    className="text-white"
                  />

                </div>

                <div>

                  <h2 className="font-semibold text-white">
                    {ui.camera}
                  </h2>

                  <p className="text-xs text-slate-500">
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

      <div className="mb-6 flex items-center gap-3">

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

          <h1 className="text-2xl font-bold text-white">
            {ui.title}
          </h1>

          <p className="text-sm text-slate-400">
            {ui.subtitle}
          </p>

        </div>

      </div>


      {/* CHAT AREA */}

      <div className="flex flex-1 flex-col overflow-hidden rounded-3xl border border-slate-800 bg-[#0B1120] shadow-xl">

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


                <h2 className="text-3xl font-bold text-white">
                  {ui.heroTitle}
                </h2>


                <p className="mx-auto mt-4 max-w-xl text-slate-400">
                  {ui.heroDescription}
                </p>


                <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">

                  <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-left">

                    <p className="font-semibold text-white">
                      {ui.techTitle}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      {ui.techDescription}
                    </p>

                  </div>


                  <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-left">

                    <p className="font-semibold text-white">
                      {ui.imagePromptTitle}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      {ui.imagePromptDescription}
                    </p>

                  </div>


                  <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-left">

                    <p className="font-semibold text-white">
                      {ui.documentTitle}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      {ui.documentDescription}
                    </p>

                  </div>


                  <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-left">

                    <p className="font-semibold text-white">
                      {ui.ocrTranslatorTitle}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
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
                          : "border border-slate-800 bg-[#111827] text-slate-200"
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

                    </div>

                  </div>

                )
              )}


              {isSpeaking && (
                <div className="mb-3 flex items-center gap-2 text-sm text-cyan-400">
                  <Volume2 size={16} />
                  <span>{ui.speaking}</span>
                </div>
              )}

              {loading && (

                <div className="flex justify-start">

                  <div className="rounded-3xl border border-slate-800 bg-[#111827] px-5 py-4">

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

        <div className="border-t border-slate-800 bg-[#0B1120] p-4 lg:p-6">

          <div className="mx-auto max-w-4xl">

            {imageUrl.trim() && (

              <div className="mb-3 flex items-center justify-between rounded-2xl border border-cyan-500/30 bg-slate-900 px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Link2
                    size={18}
                    className="shrink-0 text-cyan-400"
                  />
                  <span className="truncate text-sm text-slate-300">
                    {imageUrl}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setImageUrl("");
                    setImageUrlOpen(false);
                  }}
                  className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-800 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>
            )}

            {file && (

              <div className="mb-3 flex items-center justify-between rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3">

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

                  <span className="truncate text-sm text-slate-300">
                    {file.name}
                  </span>

                </div>


                <button
                  type="button"
                  onClick={removeFile}
                  className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-800 hover:text-white"
                >

                  <X size={18} />

                </button>

              </div>

            )}


            {imageUrlOpen && (
              <div className="mb-3 hidden rounded-2xl border border-slate-700 bg-slate-900 p-3 md:block">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-300">
                  <Link2 size={16} className="text-cyan-400" />
                  Link Foto
                </div>

                <input
                  type="url"
                  value={imageUrl}
                  onChange={(event) =>
                    setImageUrl(event.target.value)
                  }
                  disabled={loading}
                  placeholder="https://contoh.com/foto.jpg"
                  className="w-full rounded-xl border border-slate-700 bg-[#111827] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-500 disabled:opacity-60"
                />

                <p className="mt-2 text-xs text-slate-600">
                  {ui.cameraDesktopNote}
                </p>
              </div>
            )}

            <div className="rounded-3xl border border-slate-700 bg-[#111827] p-2 shadow-lg focus-within:border-cyan-500">

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
                className="w-full resize-none bg-transparent px-4 py-3 text-white outline-none placeholder:text-slate-500 disabled:opacity-60"
              />


            <div className="relative mb-2 px-2">
              <button
                type="button"
                onClick={() =>
                  setModelMenuOpen((prev) => !prev)
                }
                disabled={loading}
                className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-left transition hover:border-slate-600 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-200">
                    {
                      MODEL_OPTIONS.find(
                        (option) =>
                          option.id ===
                          selectedModel
                      )?.name ?? "Model"
                    }
                  </div>
                  <div className="hidden text-[11px] text-slate-500 sm:block">
                    {
                      isEnglish
                        ? "Gemini model for AI Assistant"
                        : "Model Gemini untuk AI Asisten"
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
                <div className="absolute bottom-full left-2 z-50 mb-2 w-[290px] overflow-hidden rounded-2xl border border-slate-700 bg-[#111827] p-2 shadow-2xl">
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
                        className="flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-slate-800"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-200">
                              {option.name}
                            </span>
                          </div>

                          <p className="mt-1 text-xs text-slate-500">
                            {option.description}
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

                <div className="flex items-center gap-1">

                  <input
                    ref={fileInputRef}
                    type="file"
                    hidden
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg,.webp"
                    onChange={handleFileChange}
                    disabled={loading}
                  />


                  {/* MOBILE: upload file */}
                  <button
                    type="button"
                    onClick={() =>
                      fileInputRef.current?.click()
                    }
                    disabled={loading}
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-slate-400 transition hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >

                    <Paperclip size={18} />

                    <span className="text-sm">
                      {ui.attach}
                    </span>

                  </button>


                  {/* DESKTOP: image URL only */}
                  <button
                    type="button"
                    onClick={() =>
                      setImageUrlOpen((prev) => !prev)
                    }
                    disabled={loading}
                    className="hidden items-center gap-2 rounded-xl px-3 py-2 text-slate-400 transition hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 md:flex"
                  >

                    <Link2 size={18} />

                    <span className="text-sm">
                      {ui.photoLink}
                    </span>

                  </button>


                  <button
                    type="button"
                    onClick={openCamera}
                    disabled={
                      loading ||
                      cameraLoading
                    }
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-slate-400 transition hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 md:hidden"
                  >

                    <Camera size={18} />

                    <span className="text-sm">
                      Kamera
                    </span>

                  </button>

                </div>


                <button
                  type="button"
                  onClick={
                    isRecording
                      ? stopVoiceRecording
                      : startVoiceRecording
                  }
                  disabled={loading}
                  className={`flex h-10 w-10 items-center justify-center rounded-xl transition ${
                    isRecording
                      ? "bg-red-500 text-white"
                      : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white"
                  } disabled:cursor-not-allowed disabled:opacity-40`}
                  aria-label={
                    isRecording
                      ? ui.stopRecording
                      : ui.startRecording
                  }
                >
                  {isRecording ? (
                    <MicOff size={18} />
                  ) : (
                    <Mic size={18} />
                  )}
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

    </div>
  );
}