"use client";

import { useRef, useState } from "react";
import {
  Bug,
  Play,
  Copy,
  Trash2,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
} from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/components/shared/language-provider";
import { addNotification } from "@/components/notifications/notification-store";

export default function DebuggerPage() {
  const { locale, t } = useLanguage();

  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [audioPlayer, setAudioPlayer] = useState<HTMLAudioElement | null>(null);

  const recognitionRef = useRef<any>(null);
  const voiceQuestionRef = useRef(false);

  /*
   * Chrome/Windows dapat menjaga SpeechSynthesis dalam keadaan
   * belum aktif sampai ada interaksi user. Kita "unlock" engine
   * tepat saat tombol Bicara ditekan.
   */
  function unlockSpeechSynthesis() {
    if (
      typeof window === "undefined" ||
      !("speechSynthesis" in window) ||
      typeof SpeechSynthesisUtterance === "undefined"
    ) {
      return;
    }

    const synth = window.speechSynthesis;

    try {
      synth.cancel();
      synth.resume();

      const unlockUtterance =
        new SpeechSynthesisUtterance(".");

      unlockUtterance.volume = 0;
      unlockUtterance.rate = 10;
      unlockUtterance.lang =
        locale === "id"
          ? "id-ID"
          : "en-US";

      synth.speak(
        unlockUtterance
      );
    } catch (error) {
      console.warn(
        "DNA AI TTS unlock gagal:",
        error
      );
    }
  }

  function speakResult(text: string) {
    if (
      typeof window === "undefined" ||
      !("speechSynthesis" in window) ||
      typeof SpeechSynthesisUtterance === "undefined"
    ) {
      toast.error(
        locale === "id"
          ? "Text-to-Speech tidak tersedia di browser ini."
          : "Text-to-Speech is not available in this browser."
      );
      return;
    }

    const synth =
      window.speechSynthesis;

    const cleanText = text
      .replace(
        /```[\s\S]*?```/g,
        " "
      )
      .replace(
        /[*#`_~]/g,
        ""
      )
      .replace(
        /\s+/g,
        " "
      )
      .trim();

    if (!cleanText) {
      return;
    }

    const language =
      locale === "id"
        ? "id-ID"
        : "en-US";

    const startSpeaking = () => {
      try {
        synth.cancel();
        synth.resume();

        const voices =
          synth.getVoices();

        const prefix =
          language
            .toLowerCase()
            .split("-")[0];

        /*
         * Voice bahasa target adalah pilihan pertama.
         * Jika tidak ada, jangan memaksa voice tertentu:
         * SpeechSynthesis akan memakai voice default browser.
         */
        const matchingVoice =
          voices.find(
            (voice) =>
              voice.lang
                .toLowerCase()
                .startsWith(prefix)
          ) ??
          voices.find(
            (voice) =>
              voice.default
          ) ??
          voices[0];

        /*
         * Pecah teks panjang. Chrome lebih stabil jika
         * setiap utterance tidak terlalu panjang.
         */
        const chunks =
          cleanText.match(
            /[^.!?]+[.!?]+|[^.!?]+$/g
          ) ?? [cleanText];

        let index = 0;

        const speakNext = () => {
          if (
            index >=
            chunks.length
          ) {
            setIsSpeaking(false);
            return;
          }

          const part =
            chunks[index]
              .trim();

          if (!part) {
            index += 1;
            speakNext();
            return;
          }

          const utterance =
            new SpeechSynthesisUtterance(
              part
            );

          utterance.lang =
            matchingVoice?.lang ??
            language;

          if (matchingVoice) {
            utterance.voice =
              matchingVoice;
          }

          utterance.volume = 1;
          utterance.rate =
            locale === "id"
              ? 0.95
              : 0.98;
          utterance.pitch = 1;

          utterance.onstart = () => {
            setIsSpeaking(true);

            console.log(
              "DNA AI: TTS mulai berbicara",
              {
                language:
                  utterance.lang,
                voice:
                  utterance.voice?.name ??
                  "browser-default",
              }
            );
          };

          utterance.onend = () => {
            index += 1;

            setTimeout(
              speakNext,
              40
            );
          };

          utterance.onerror = (
            event
          ) => {
            console.error(
              "DNA AI TTS ERROR:",
              event.error,
              event
            );

            setIsSpeaking(false);

            /*
             * Coba sekali lagi tanpa memaksa voice tertentu.
             * Ini menangani kasus voice Windows tertentu
             * gagal walaupun SpeechSynthesis tersedia.
             */
            if (
              index === 0 &&
              utterance.voice
            ) {
              index = 0;

              const retry =
                new SpeechSynthesisUtterance(
                  part
                );

              retry.lang =
                language;
              retry.volume = 1;
              retry.rate =
                locale === "id"
                  ? 0.95
                  : 0.98;
              retry.pitch = 1;

              retry.onstart = () => {
                setIsSpeaking(
                  true
                );
              };

              retry.onend = () => {
                index += 1;
                setTimeout(
                  speakNext,
                  40
                );
              };

              retry.onerror = (
                retryEvent
              ) => {
                console.error(
                  "DNA AI TTS RETRY ERROR:",
                  retryEvent
                );
                setIsSpeaking(
                  false
                );
              };

              synth.cancel();
              synth.resume();

              setTimeout(
                () =>
                  synth.speak(
                    retry
                  ),
                100
              );

              return;
            }
          };

          setTimeout(
            () => {
              synth.resume();
              synth.speak(
                utterance
              );
            },
            100
          );
        };

        speakNext();
      } catch (error) {
        console.error(
          "DNA AI TTS EXCEPTION:",
          error
        );
        setIsSpeaking(false);
      }
    };

    /*
     * Chrome kadang baru mengisi daftar voice setelah
     * event voiceschanged. Kalau sudah tersedia, langsung
     * bicara; kalau belum, tunggu sebentar.
     */
    if (
      synth.getVoices()
        .length > 0
    ) {
      startSpeaking();
      return;
    }

    let done = false;

    const onVoicesChanged =
      () => {
        if (done) {
          return;
        }

        done = true;

        synth.removeEventListener(
          "voiceschanged",
          onVoicesChanged
        );

        startSpeaking();
      };

    synth.addEventListener(
      "voiceschanged",
      onVoicesChanged
    );

    setTimeout(() => {
      if (done) {
        return;
      }

      done = true;

      synth.removeEventListener(
        "voiceschanged",
        onVoicesChanged
      );

      startSpeaking();
    }, 700);
  }

  function playServerAudio(audioData: string) {
    if (typeof window === "undefined" || !audioData) return;

    if (audioPlayer) {
      audioPlayer.pause();
      audioPlayer.currentTime = 0;
    }

    try {
      const player = new Audio(audioData);
      player.volume = 1;
      player.onplay = () => setIsSpeaking(true);
      player.onended = () => { setIsSpeaking(false); setAudioPlayer(null); };
      player.onerror = (event) => {
        console.error("DNA AI AUDIO ERROR:", event);
        setIsSpeaking(false);
        setAudioPlayer(null);
        speakResult(result);
      };
      setAudioPlayer(player);
      player.play().catch((error) => {
        console.error("DNA AI AUDIO PLAY ERROR:", error);
        setAudioPlayer(null);
        setIsSpeaking(false);
        speakResult(result);
      });
    } catch (error) {
      console.error("DNA AI AUDIO EXCEPTION:", error);
      speakResult(result);
    }
  }

  function stopSpeaking() {
    if (
      typeof window === "undefined"
    ) {
      return;
    }

    if (audioPlayer) {
      audioPlayer.pause();
      audioPlayer.currentTime = 0;
      setAudioPlayer(null);
    }

    if (
      "speechSynthesis" in window
    ) {
      window.speechSynthesis.cancel();
    }

    setIsSpeaking(false);
  }

  function startVoice() {
    if (
      typeof window === "undefined"
    ) {
      return;
    }

    setVoiceMode(true);

    /*
     * Aktifkan SpeechSynthesis dalam konteks user gesture.
     * Ini penting untuk Chrome yang dapat menolak output
     * speech setelah proses async/fetch selesai.
     */
    unlockSpeechSynthesis();

    if (isSpeaking) {
      stopSpeaking();
    }

    const SpeechRecognition =
      (window as any)
        .SpeechRecognition ||
      (window as any)
        .webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error(
        locale === "id"
          ? "Input suara tidak didukung browser ini. Gunakan Google Chrome."
          : "Voice input is not supported by this browser. Use Google Chrome."
      );

      setVoiceMode(false);
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }

    const recognition =
      new SpeechRecognition();

    recognition.lang =
      locale === "id"
        ? "id-ID"
        : "en-US";

    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
      voiceQuestionRef.current =
        true;

      toast.success(
        locale === "id"
          ? "Silakan bicara..."
          : "Speak now..."
      );
    };

    recognition.onresult = async (
      event: any
    ) => {
      const transcript =
        event.results?.[0]?.[0]?.transcript?.trim();

      if (!transcript) {
        return;
      }

      setPrompt(transcript);

      /*
       * Sangat penting: hentikan microphone sebelum request AI.
       * Jika recognition masih aktif ketika speechSynthesis.speak()
       * dipanggil, Chrome/Windows dapat tidak mengeluarkan suara.
       */
      try {
        recognition.stop();
      } catch {}

      setIsListening(false);

      /*
       * Beri waktu event onend recognition selesai sebelum
       * AI mulai memproses dan nanti mengeluarkan suara.
       */
      await new Promise(
        (resolve) =>
          setTimeout(
            resolve,
            250
          )
      );

      await analyze(
        transcript,
        true
      );
    };

    recognition.onerror = (
      event: any
    ) => {
      const errorCode =
        event?.error ?? "unknown";

      setIsListening(false);
      voiceQuestionRef.current =
        false;

      if (
        errorCode === "not-allowed"
      ) {
        toast.error(
          locale === "id"
            ? "Akses mikrofon ditolak. Izinkan mikrofon untuk website ini."
            : "Microphone access was denied. Allow microphone access for this website."
        );

        return;
      }

      if (
        errorCode === "no-speech"
      ) {
        toast(
          locale === "id"
            ? "Mohon bicara lebih jelas. Saya belum dapat mendengar suara Anda."
            : "Please speak more clearly. I couldn't hear you."
        );

        return;
      }

      if (
        errorCode ===
        "audio-capture"
      ) {
        toast.error(
          locale === "id"
            ? "Mikrofon tidak ditemukan atau sedang digunakan aplikasi lain."
            : "No microphone was found or it is being used by another application."
        );

        return;
      }

      if (
        errorCode === "network"
      ) {
        toast.error(
          locale === "id"
            ? "Speech Recognition mengalami masalah jaringan."
            : "Speech Recognition encountered a network problem."
        );

        return;
      }

      if (
        errorCode === "aborted"
      ) {
        return;
      }

      toast.error(
        locale === "id"
          ? `Gagal menangkap suara (${errorCode}).`
          : `Failed to capture voice (${errorCode}).`
      );
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current =
        null;
    };

    recognitionRef.current =
      recognition;

    try {
      recognition.start();
    } catch (error) {
      setIsListening(false);
      recognitionRef.current =
        null;
    }
  }

  async function analyze(
    inputText?: string,
    fromVoice = false
  ) {
    const textToAnalyze =
      inputText !== undefined
        ? inputText
        : prompt;

    if (!textToAnalyze.trim()) {
      toast.error(
        locale === "id"
          ? "Silakan masukkan pertanyaan atau tempel kode!"
          : "Please enter a question or paste your code!"
      );

      return;
    }

    try {
      setLoading(true);

      const res = await fetch(
        "/api/debugger",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            code: textToAnalyze,
            locale,
          }),
        }
      );

      const data =
        await res.json();

      if (!res.ok) {
        throw new Error(
          data.error ||
            "Request failed"
        );
      }

      setResult(data.result);

      addNotification({
        feature:
          "AI Tech Assistant",
        title:
          locale === "id"
            ? "AI Tech Assistant selesai"
            : "AI Tech Assistant completed",
        message:
          locale === "id"
            ? "Jawaban AI berhasil dibuat dan siap dilihat."
            : "The AI response has been generated and is ready to view.",
        type: "success",
        result: data.result,
      });

      if (fromVoice) {
        if (data.audio) {
          setTimeout(() => {
            playServerAudio(data.audio);
          }, 150);
        } else {
          setTimeout(() => {
            speakResult(data.result);
          }, 150);
        }
      }

      toast.success(
        locale === "id"
          ? "Jawaban AI berhasil dibuat!"
          : "Response generated!"
      );
    } catch (error) {
      console.error(error);

      toast.error(
        locale === "id"
          ? "Gagal mendapatkan jawaban AI!"
          : "Failed to get AI response!"
      );
    } finally {
      setLoading(false);
      voiceQuestionRef.current =
        false;
    }
  }

  function clearAll() {
    stopSpeaking();

    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current =
        null;
    }

    setIsListening(false);
    setPrompt("");
    setResult("");

    toast.success(
      locale === "id"
        ? "Dibersihkan!"
        : "Cleared!"
    );
  }

  async function copyResult() {
    if (!result) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        result
      );

      toast.success(
        locale === "id"
          ? "Jawaban berhasil disalin!"
          : "Response copied!"
      );
    } catch (error) {
      console.error(error);

      toast.error(
        locale === "id"
          ? "Gagal menyalin jawaban!"
          : "Failed to copy response!"
      );
    }
  }

  return (
    <>
      {/* VOICE MODE */}

      {voiceMode && (
        <div className="fixed inset-0 z-[100] flex min-h-screen items-center justify-center bg-slate-950">

          <div className="w-full max-w-md px-6 text-center">

            {/* DNA LOGO */}

            <div className="flex justify-center">

              <div
                className={`flex h-32 w-32 items-center justify-center rounded-full bg-slate-900 ${
                  isListening ||
                  isSpeaking
                    ? "shadow-[0_0_80px_rgba(34,211,238,0.35)]"
                    : "shadow-[0_0_45px_rgba(34,211,238,0.18)]"
                }`}
              >

                <img
                  src="/logo-dna.png"
                  alt="DNA AI"
                  className="h-24 w-24 rounded-full object-contain"
                />

              </div>

            </div>

            {/* STATUS */}

            <h2 className="mt-8 text-2xl font-bold text-white">
              DNA AI Assistant
            </h2>

            <p className="mt-3 text-sm text-slate-400">

              {isListening
                ? locale === "id"
                  ? "Mendengarkan..."
                  : "Listening..."
                : isSpeaking
                  ? locale === "id"
                    ? "Sedang berbicara..."
                    : "Speaking..."
                  : locale === "id"
                    ? "Siap mendengarkan"
                    : "Ready to listen"}

            </p>

            {/* VOICE BUTTON */}

            <button
              type="button"
              onClick={startVoice}
              disabled={loading}
              className={`mx-auto mt-10 flex h-16 w-16 items-center justify-center rounded-full text-white transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50 ${
                isListening
                  ? "bg-red-500 hover:bg-red-600"
                  : "bg-purple-500 hover:bg-purple-600"
              }`}
            >

              {isListening ? (
                <MicOff
                  size={24}
                />
              ) : (
                <Mic
                  size={24}
                />
              )}

            </button>

            {/* CLOSE */}

            <button
              type="button"
              onClick={() => {
                stopSpeaking();

                if (
                  recognitionRef.current
                ) {
                  recognitionRef.current.stop();
                  recognitionRef.current =
                    null;
                }

                setIsListening(false);
                setVoiceMode(false);
              }}
              className="mx-auto mt-6 block text-sm text-slate-500 transition hover:text-white"
            >

              {locale === "id"
                ? "Tutup"
                : "Close"}

            </button>

          </div>

        </div>
      )}

      {/* MAIN PAGE */}

      <div className="space-y-5 lg:space-y-8">

        {/* HEADER */}

        <div className="rounded-2xl bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-700 p-5 shadow-xl lg:rounded-3xl lg:p-8">

          <div className="flex items-start gap-3 lg:items-center lg:gap-4">

            <div className="rounded-xl bg-white/10 p-2.5 backdrop-blur lg:rounded-2xl lg:p-3">

              <Bug
                className="text-white"
                size={26}
              />

            </div>

            <div>

              <h1 className="text-2xl font-bold text-white lg:text-4xl">
                {t.debugger}
              </h1>

              <p className="mt-2 text-sm text-white/80 lg:text-base">

                {locale === "id"
                  ? "Tanyakan apa saja tentang pemrograman, software, Windows, hardware, jaringan, database, API, atau tempel kode untuk diperbaiki."
                  : "Ask anything about programming, software, Windows, hardware, networking, databases, APIs, or paste code to debug."}

              </p>

            </div>

          </div>

        </div>

        {/* INPUT & RESULT */}

        <div className="grid gap-4 lg:gap-6 xl:grid-cols-2">

          {/* INPUT */}

          <div className="rounded-2xl border border-slate-800 bg-[#111827] p-4 shadow-xl lg:rounded-3xl lg:p-6">

            <textarea
              value={prompt}
              onChange={(e) => {
                setPrompt(
                  e.target.value
                );

                voiceQuestionRef.current =
                  false;
              }}
              spellCheck={false}
              placeholder={
                locale === "id"
                  ? "Masukkan pertanyaan atau tempel kode di sini..."
                  : "Ask a question or paste your code here..."
              }
              className="h-[320px] w-full resize-none rounded-xl border border-slate-700 bg-slate-900 p-4 font-mono text-sm text-white outline-none transition-all duration-300 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 lg:h-[500px] lg:rounded-2xl lg:p-5"
            />

            <div className="mt-4 flex flex-col gap-3 lg:mt-5 lg:flex-row">

              {/* VOICE */}

              <button
                onClick={
                  startVoice
                }
                disabled={loading}
                className={`flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 font-medium text-white transition-all duration-300 hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50 lg:w-auto lg:rounded-2xl lg:px-6 ${
                  isListening
                    ? "bg-red-500 hover:bg-red-600"
                    : "bg-purple-500 hover:bg-purple-600"
                }`}
              >

                {isListening ? (
                  <>
                    <MicOff
                      size={18}
                    />

                    {locale === "id"
                      ? "Berhenti"
                      : "Stop"}
                  </>
                ) : (
                  <>
                    <Mic
                      size={18}
                    />

                    {locale === "id"
                      ? "Bicara"
                      : "Speak"}
                  </>
                )}

              </button>

              {/* ASK AI */}

              <button
                onClick={() =>
                  analyze()
                }
                disabled={
                  loading ||
                  isListening
                }
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 font-medium text-white transition-all duration-300 hover:scale-[1.02] hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-50 lg:w-auto lg:rounded-2xl lg:px-6"
              >

                <Play size={18} />

                {loading
                  ? locale === "id"
                    ? "Memproses..."
                    : "Thinking..."
                  : locale === "id"
                    ? "Tanya AI"
                    : "Ask AI"}

              </button>

              {/* CLEAR */}

              <button
                onClick={
                  clearAll
                }
                disabled={
                  !prompt &&
                  !result &&
                  !isListening &&
                  !isSpeaking
                }
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-500 px-5 py-3 font-medium text-white transition-all duration-300 hover:scale-[1.02] hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50 lg:w-auto lg:rounded-2xl lg:px-6"
              >

                <Trash2
                  size={18}
                />

                {locale === "id"
                  ? "Bersihkan"
                  : "Clear"}

              </button>

            </div>

          </div>

          {/* RESULT */}

          <div className="rounded-2xl border border-slate-800 bg-[#111827] p-4 shadow-xl lg:rounded-3xl lg:p-6">

            {/* RESULT ACTIONS */}

            <div className="mb-3 flex justify-end gap-2 lg:mb-4">

              {/* SPEAK / STOP */}

              {result && (
                <button
                  onClick={() =>
                    isSpeaking
                      ? stopSpeaking()
                      : speakResult(
                          result
                        )
                  }
                  title={
                    isSpeaking
                      ? locale === "id"
                        ? "Hentikan suara"
                        : "Stop speaking"
                      : locale === "id"
                        ? "Bacakan jawaban"
                        : "Read response aloud"
                  }
                  className="rounded-xl border border-slate-700 bg-slate-900 p-2.5 transition-all duration-300 hover:bg-slate-800 lg:rounded-2xl lg:p-3"
                >

                  {isSpeaking ? (
                    <VolumeX
                      size={18}
                    />
                  ) : (
                    <Volume2
                      size={18}
                    />
                  )}

                </button>
              )}

              {/* COPY */}

              <button
                onClick={
                  copyResult
                }
                disabled={!result}
                title={
                  locale === "id"
                    ? "Salin jawaban"
                    : "Copy response"
                }
                className="rounded-xl border border-slate-700 bg-slate-900 p-2.5 transition-all duration-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 lg:rounded-2xl lg:p-3"
              >

                <Copy
                  size={18}
                />

              </button>

            </div>

            {/* HAS RESULT */}

            {result ? (

              <div className="h-[320px] overflow-auto rounded-xl border border-slate-700 bg-slate-900 p-4 lg:h-[500px] lg:rounded-2xl lg:p-5">

                <pre className="whitespace-pre-wrap break-words font-mono text-sm leading-7 text-slate-300">
                  {result}
                </pre>

              </div>

            ) : (

              /* EMPTY RESULT */

              <div className="flex h-[320px] items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-900 lg:h-[500px] lg:rounded-2xl">

                <div className="text-center">

                  <Bug
                    size={48}
                    className="mx-auto mb-5 text-slate-600"
                  />

                  <h3 className="text-base font-semibold text-slate-300 lg:text-lg">

                    {locale === "id"
                      ? "Mulai Bertanya ke AI"
                      : "Start Asking AI"}

                  </h3>

                  <p className="mt-2 text-xs text-slate-500 lg:text-sm">

                    {locale === "id"
                      ? "Jawaban AI akan muncul di sini."
                      : "Your AI response will appear here."}

                  </p>

                </div>

              </div>
            )}

          </div>

        </div>

      </div>
    </>
  );
}