"use client";

import { useState } from "react";
import {
  Languages,
  Play,
  Copy,
  Trash2,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
} from "lucide-react";
import { toast } from "sonner";
import { addNotification } from "@/components/notifications/notification-store";
import { useLanguage } from "@/components/shared/language-provider";

const TARGET_LANGUAGES = [
  "Abkhaz",
  "Aceh",
  "Acoli",
  "Afar",
  "Afrikaans",
  "Akan",
  "Albania",
  "Alur",
  "Amharik",
  "Arab",
  "Armenia",
  "Assam",
  "Avar",
  "Awadhi",
  "Aymara",
  "Azerbaijani",
  "Bali",
  "Baluchi",
  "Bambara",
  "Baoulé",
  "Bashkir",
  "Basque",
  "Batak Karo",
  "Batak Simalungun",
  "Batak Toba",
  "Belanda",
  "Belarusia",
  "Bemba",
  "Bengali",
  "Betawi",
  "Bhojpuri",
  "Bikol",
  "Bosnia",
  "Breton",
  "Bulgaria",
  "Buriat",
  "Burma",
  "Cebuano",
  "Ceko",
  "Chamorro",
  "Chechen",
  "China (Aks. Sederhana)",
  "China (Aks. Tradisional)",
  "Chuuke",
  "Chuvash",
  "Dansk",
  "Dari",
  "Dinka",
  "Divehi",
  "Dogri",
  "Dombe",
  "Dyula",
  "Dzongkha",
  "Esperanto",
  "Estonia",
  "Ewe",
  "Faroe",
  "Fiji",
  "Fon",
  "Frisia Barat",
  "Friuli",
  "Fulani",
  "Ga",
  "Gaelik Skotlandia",
  "Galisia",
  "Ganda",
  "Georgia",
  "Guarani",
  "Gujarat",
  "Hakha Chin",
  "Hausa",
  "Hawaii",
  "Hiligaynon",
  "Hindi",
  "Hmong",
  "Hungaria",
  "Hunsrik",
  "Iban",
  "Ibrani",
  "Igbo",
  "Iloko",
  "Indonesia",
  "Inggris",
  "Irlandia",
  "Islandia",
  "Italia",
  "Jamaika Patois",
  "Jawa",
  "Jepang",
  "Jerman",
  "Jingpo",
  "Kalaallisut",
  "Kannada",
  "Kanton",
  "Kanuri",
  "Katalan",
  "Kazakh",
  "Khasi",
  "Khmer",
  "Kiga",
  "Kinyarwanda",
  "Kirgiz",
  "Kituba",
  "Kok Borok",
  "Komi",
  "Kongo",
  "Konkani",
  "Korea",
  "Korsika",
  "Kreol Haiti",
  "Krio",
  "Kroasia",
  "Kurdi",
  "Kurdi Sorani",
  "Lao",
  "Latgalian",
  "Latin",
  "Latvia",
  "Liguria",
  "Limburgia",
  "Lingala",
  "Lituania",
  "Lombard",
  "Luksemburg",
  "Luo",
  "Madura",
  "Maithili",
  "Makasar",
  "Makedonia",
  "Malagasi",
  "Malayalam",
  "Malta",
  "Mam",
  "Manipuri (Meitei Mayek)",
  "Manx",
  "Maori",
  "Marathi",
  "Marshall",
  "Marwari",
  "Maya Yukatek",
  "Meadow Mari",
  "Melayu",
  "Melayu (Arab)",
  "Minangkabau",
  "Mizo",
  "Mongolia",
  "Morisien",
  "Nahuatl (Huasteca Timur)",
  "Ndau",
  "Ndebele Selatan",
  "Nepal Bhasa (Newari)",
  "Nepali",
  "NKo",
  "Norwegia",
  "Nuer",
  "Nyanja",
  "Oriya",
  "Oromo",
  "Ositania",
  "Ossetia",
  "Pampanga",
  "Pangasina",
  "Papiamento",
  "Pashto",
  "Persia",
  "Polski",
  "Portugis",
  "Portugis (Portugal)",
  "Prancis",
  "Punjabi",
  "Punjabi (Arab)",
  "Q'eqchi'",
  "Quechua",
  "Romani",
  "Rumania",
  "Rundi",
  "Rusia",
  "Sakha",
  "Sami Utara",
  "Samoa",
  "Sango",
  "Sanskerta",
  "Santali (Latin)",
  "Serbia",
  "Seselwa Kreol Prancis",
  "Shan",
  "Shona",
  "Silesia",
  "Sindhi",
  "Sinhala",
  "Sisilia",
  "Slovak",
  "Slovenia",
  "Somalia",
  "Sotho Selatan",
  "Sotho Utara",
  "Spanyol",
  "Sunda",
  "Suomi",
  "Susu",
  "Swahili",
  "Swati",
  "Swedia",
  "Tagalog",
  "Tahiti",
  "Tajik",
  "Tamazight",
  "Tamazight (Tifinagh)",
  "Tamil",
  "Tatar",
  "Tatar Krimea",
  "Telugu",
  "Tetun",
  "Thai",
  "Tibet",
  "Tigrinya",
  "Tiv",
  "Tok Pisin",
  "Tonga",
  "Tsonga",
  "Tswana",
  "Tulu",
  "Tumbuka",
  "Turki",
  "Turkmen",
  "Tuvinia",
  "Udmurt",
  "Ukraina",
  "Urdu",
  "Uyghur",
  "Uzbek",
  "Venda",
  "Venesia",
  "Vietnam",
  "Warai",
  "Welsh",
  "Wolof",
  "Xhosa",
  "Yiddish",
  "Yoruba",
  "Yunani",
  "Zapotek",
  "Zulu",
];

const SPEECH_LANGUAGES = [
  { label: "Indonesia", value: "id-ID" },
  { label: "Inggris", value: "en-US" },
  { label: "China (Sederhana)", value: "zh-CN" },
  { label: "China (Tradisional)", value: "zh-TW" },
  { label: "Jepang", value: "ja-JP" },
  { label: "Korea", value: "ko-KR" },
  { label: "Arab", value: "ar-SA" },
  { label: "Hindi", value: "hi-IN" },
  { label: "Jerman", value: "de-DE" },
  { label: "Prancis", value: "fr-FR" },
  { label: "Spanyol", value: "es-ES" },
  { label: "Portugis (Brasil)", value: "pt-BR" },
  { label: "Portugis (Portugal)", value: "pt-PT" },
  { label: "Italia", value: "it-IT" },
  { label: "Belanda", value: "nl-NL" },
  { label: "Rusia", value: "ru-RU" },
  { label: "Turki", value: "tr-TR" },
  { label: "Thai", value: "th-TH" },
  { label: "Vietnam", value: "vi-VN" },
  { label: "Polski", value: "pl-PL" },
  { label: "Ukraina", value: "uk-UA" },
  { label: "Swedia", value: "sv-SE" },
  { label: "Dansk", value: "da-DK" },
  { label: "Norwegia", value: "no-NO" },
  { label: "Finlandia", value: "fi-FI" },
  { label: "Yunani", value: "el-GR" },
  { label: "Ibrani", value: "he-IL" },
  { label: "Rumania", value: "ro-RO" },
  { label: "Hungaria", value: "hu-HU" },
  { label: "Ceko", value: "cs-CZ" },
  { label: "Slovak", value: "sk-SK" },
  { label: "Bulgaria", value: "bg-BG" },
  { label: "Serbia", value: "sr-RS" },
  { label: "Kroasia", value: "hr-HR" },
  { label: "Slovenia", value: "sl-SI" },
  { label: "Melayu", value: "ms-MY" },
  { label: "Filipina", value: "fil-PH" },
  { label: "Swahili", value: "sw-TZ" },
];

export default function TranslatorPage() {
  const { t, locale } = useLanguage();

  const [prompt, setPrompt] = useState("");
  const [language, setLanguage] = useState("Indonesia");
  const [speechLanguage, setSpeechLanguage] =
    useState("id-ID");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);

  function speakTranslation(text: string) {
    if (
      typeof window === "undefined" ||
      !("speechSynthesis" in window) ||
      typeof SpeechSynthesisUtterance === "undefined"
    ) {
      toast.error(
        locale === "id"
          ? "Text-to-Speech tidak didukung browser ini. Gunakan Google Chrome."
          : "Text-to-Speech is not supported by this browser. Use Google Chrome."
      );
      return;
    }

    const synth = window.speechSynthesis;

    /*
     * Chrome kadang mengembalikan daftar voice kosong
     * pada pemanggilan pertama. Tunggu sebentar agar
     * voice yang tersedia benar-benar dimuat.
     */
    const speakNow = () => {
      synth.cancel();

      if (synth.paused) {
        synth.resume();
      }

      const languageMap: Record<string, string> = {
        Indonesia: "id-ID",
        Inggris: "en-US",
        Jepang: "ja-JP",
        Korea: "ko-KR",
        Arab: "ar-SA",
        Hindi: "hi-IN",
        Jerman: "de-DE",
        Prancis: "fr-FR",
        Spanyol: "es-ES",
        Portugis: "pt-BR",
        "Portugis (Portugal)": "pt-PT",
        Italia: "it-IT",
        Belanda: "nl-NL",
        Rusia: "ru-RU",
        Turki: "tr-TR",
        Thai: "th-TH",
        Vietnam: "vi-VN",
        Polandia: "pl-PL",
        Ukraina: "uk-UA",
        Swedia: "sv-SE",
        Dansk: "da-DK",
        Norwegia: "no-NO",
        Finlandia: "fi-FI",
        Yunani: "el-GR",
        Ibrani: "he-IL",
        Rumania: "ro-RO",
        Hungaria: "hu-HU",
        Ceko: "cs-CZ",
        Slovak: "sk-SK",
        Bulgaria: "bg-BG",
        Serbia: "sr-RS",
        Kroasia: "hr-HR",
        Slovenia: "sl-SI",
        Melayu: "ms-MY",
        Filipina: "fil-PH",
        Swahili: "sw-TZ",
        Bali: "ban-ID",
        Jawa: "jv-ID",
        Sunda: "su-ID",
        Madura: "mad-ID",
        Minangkabau: "min-ID",
        Aceh: "ace-ID",
        Batak: "bbc-ID",
      };

      /*
       * Jika bahasa target tidak punya voice native di OS,
       * gunakan kode bahasa paling dekat. Browser tetap
       * memakai voice default yang tersedia.
       */
      const speechLanguage =
        languageMap[language] ??
        SPEECH_LANGUAGES.find(
          (item) =>
            item.label === language
        )?.value ??
        "en-US";

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
          /\n+/g,
          ". "
        )
        .replace(
          /:/g,
          "... "
        )
        .replace(
          /;/g,
          "... "
        )
        .replace(
          /\?/g,
          "? "
        )
        .replace(
          /!/g,
          "! "
        )
        .replace(
          /,/g,
          ", "
        )
        .trim();

      if (!cleanText) {
        return;
      }

      const voices =
        synth.getVoices();

      const languagePrefix =
        speechLanguage
          .toLowerCase()
          .split("-")[0];

      const matchingVoices =
        voices.filter(
          (voice) =>
            voice.lang
              .toLowerCase()
              .startsWith(
                languagePrefix
              )
        );

      const preferredKeywords = [
        "natural",
        "neural",
        "enhanced",
        "premium",
        "google",
        "microsoft",
      ];

      const preferredVoice =
        matchingVoices.find(
          (voice) =>
            preferredKeywords.some(
              (keyword) =>
                voice.name
                  .toLowerCase()
                  .includes(
                    keyword
                  )
            )
        );

      const selectedVoice =
        preferredVoice ??
        matchingVoices.find(
          (voice) =>
            voice.localService
        ) ??
        matchingVoices[0];

      /*
       * Chrome dapat berhenti sendiri ketika satu utterance
       * terlalu panjang. Pecah menjadi beberapa bagian aman.
       */
      const chunks =
        cleanText.match(
          /.{1,220}(?:\s|$)/g
        ) ?? [cleanText];

      let chunkIndex = 0;

      const speakChunk = () => {
        if (
          chunkIndex >=
          chunks.length
        ) {
          setTimeout(() => {
            setIsSpeaking(false);
          }, 150);
          return;
        }

        const utterance =
          new SpeechSynthesisUtterance(
            chunks[
              chunkIndex
            ].trim()
          );

        utterance.lang =
          speechLanguage;

        if (selectedVoice) {
          utterance.voice =
            selectedVoice;
        }

        utterance.volume = 1;
        utterance.rate =
          0.94;
        utterance.pitch =
          0.98;

        utterance.onstart = () => {
          setIsSpeaking(true);
        };

        utterance.onend = () => {
          chunkIndex += 1;

          setTimeout(
            speakChunk,
            30
          );
        };

        utterance.onerror = (
          event
        ) => {
          console.error(
            "TTS ERROR:",
            event
          );

          /*
           * Jangan langsung menganggap selesai jika Chrome
           * sedang paused. Coba lanjutkan sekali.
           */
          if (
            synth.paused
          ) {
            synth.resume();
            setTimeout(
              speakChunk,
              80
            );
            return;
          }

          setIsSpeaking(false);
        };

        synth.speak(
          utterance
        );
      };

      /*
       * Beri browser satu event loop untuk menyelesaikan
       * cancel/resume sebelum speak().
       */
      setTimeout(
        speakChunk,
        60
      );
    };

    const voices =
      synth.getVoices();

    if (voices.length > 0) {
      speakNow();
      return;
    }

    let finished = false;

    const onVoicesChanged =
      () => {
        if (finished) {
          return;
        }

        finished = true;
        synth.removeEventListener(
          "voiceschanged",
          onVoicesChanged
        );

        speakNow();
      };

    synth.addEventListener(
      "voiceschanged",
      onVoicesChanged
    );

    /*
     * Jangan menunggu voiceschanged selamanya.
     */
    setTimeout(() => {
      if (finished) {
        return;
      }

      finished = true;

      synth.removeEventListener(
        "voiceschanged",
        onVoicesChanged
      );

      speakNow();
    }, 500);
  }


  function startVoice() {
    if (
      typeof window === "undefined"
    ) {
      return;
    }

    setVoiceMode(true);

    const SpeechRecognition =
      (window as any)
        .SpeechRecognition ||
      (window as any)
        .webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error(
        t.voiceInputNotSupported
      );

      setVoiceMode(false);
      return;
    }

    const recognition =
      new SpeechRecognition();

    recognition.lang =
      speechLanguage;

    recognition.continuous =
      false;

    recognition.interimResults =
      false;

    recognition.onstart = () => {
      setIsListening(true);

      toast.success(
        t.speakNow
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

      await translateVoice(
        transcript
      );
    };

    recognition.onerror = (
      event: any
    ) => {
      const errorCode =
        event?.error ?? "unknown";

      setIsListening(false);

      if (
        errorCode === "no-speech"
      ) {
        toast(
          "Mohon bicara lebih jelas. Saya belum dapat mendengar suara Anda."
        );

        return;
      }

      if (
        errorCode === "not-allowed"
      ) {
        toast.error(
          locale === "id"
            ? "Akses mikrofon ditolak."
            : "Microphone access was denied."
        );

        return;
      }

      toast.error(
        locale === "id"
          ? "Gagal menangkap suara."
          : "Failed to capture voice."
      );
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    try {
      recognition.start();
    } catch (error) {
      setIsListening(false);
    }
  }

  async function translateVoice(
    voiceText: string
  ) {
    if (!voiceText.trim()) {
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(
        "/api/translator",
        {
          method: "POST",
          headers: {
             "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            prompt: `Terjemahkan teks berikut ke Bahasa ${language}:\n\n${voiceText}`,
          }),
        }
      );

      const data =
        await res.json();

      if (!res.ok) {
        throw new Error(
          data.error ||
            t.failedToTranslate
        );
      }

      setResult(
        data.result
      );

      addNotification({
        feature:
          t.aiTranslator,
        title:
          t.translationFinished,
        message:
          `${t.translationToLanguage} ${language} ${t.translationReady}`,
        type: "success",
        result:
          data.result,
      });

      speakTranslation(
        data.result
      );

      toast.success(
        t.translationCompleted
      );
    } catch (error) {
      console.error(error);

      toast.error(
        t.failedToTranslate
      );
    } finally {
      setLoading(false);
    }
  }

  async function translate() {
    if (!prompt.trim()) {
      toast.error(
        t.pleaseEnterText
      );

      return;
    }

    try {
      setLoading(true);

      const res = await fetch(
        "/api/translator",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            prompt: `Terjemahkan teks berikut ke Bahasa ${language}:\n\n${prompt}`,
          }),
        }
      );

      const data =
        await res.json();

      if (!res.ok) {
        throw new Error(
          data.error ||
            t.failedToTranslate
        );
      }

      setResult(
        data.result
      );

      addNotification({
        feature:
          t.aiTranslator,
        title:
          t.translationFinished,
        message:
          `${t.translationToLanguage} ${language} ${t.translationReady}`,
        type: "success",
        result:
          data.result,
      });

      toast.success(
        t.translationCompleted
      );
    } catch (error) {
      console.error(error);

      toast.error(
        t.failedToTranslate
      );
    } finally {
      setLoading(false);
    }
  }

  function clearAll() {
    if (
      typeof window !==
        "undefined" &&
      "speechSynthesis" in
        window
    ) {
      window.speechSynthesis.cancel();
    }

    setIsSpeaking(false);
    setIsListening(false);
    setVoiceMode(false);
    setPrompt("");
    setResult("");
    setLanguage("Indonesia");
    setSpeechLanguage("id-ID");

    toast.success(
      t.clear
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
        t.copied
      );
    } catch (error) {
      console.error(error);

      toast.error(
        t.failedToCopy
      );
    }
  }

  return (
    <div className="space-y-5 lg:space-y-8">

      {/* Header */}

      <div className="rounded-2xl bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-700 p-5 shadow-xl lg:rounded-3xl lg:p-8">

        <div className="flex items-start gap-3 lg:items-center lg:gap-4">

          <div className="rounded-xl bg-white/10 p-2.5 backdrop-blur lg:rounded-2xl lg:p-3">

            <Languages
              size={26}
              className="text-white"
            />

          </div>

          <div>

            <h1 className="text-2xl font-bold text-white lg:text-4xl">
              {t.translatorTitle}
            </h1>

            <p className="mt-2 text-sm text-white/80 lg:text-base">
              {t.translatorDescription}
            </p>

          </div>

        </div>

      </div>

      {/* Main Content */}

      <div className="grid gap-4 lg:gap-6 xl:grid-cols-2">

        {/* Input */}

        <div className="rounded-2xl border border-slate-800 bg-[#111827] p-4 shadow-xl lg:rounded-3xl lg:p-6">

          <textarea
            value={prompt}
            onChange={(e) =>
              setPrompt(
                e.target.value
              )
            }
            placeholder={
              t.typeTextHere
            }
            className="h-44 w-full resize-none rounded-xl border border-slate-700 bg-slate-900 p-4 text-white outline-none focus:border-cyan-500 lg:h-52 lg:rounded-2xl lg:p-5"
          />

          {/* Voice */}

          <div className="mt-4 flex flex-col gap-3 lg:flex-row">

            <button
              onClick={
                startVoice
              }
              disabled={
                loading
              }
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-500 px-5 py-3 font-medium text-white transition hover:bg-purple-600 disabled:cursor-not-allowed disabled:opacity-50 lg:w-auto lg:rounded-2xl lg:px-6"
            >

              {isListening ? (
                <>
                  <MicOff
                    size={18}
                  />

                  {t.listening}

                </>
              ) : (
                <>
                  <Mic
                    size={18}
                  />

                  {t.voice}

                </>
              )}

            </button>

            <select
              value={speechLanguage}
              onChange={(e) =>
                setSpeechLanguage(
                  e.target.value
                )
              }
              className="w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-white outline-none focus:border-cyan-500 lg:w-auto lg:rounded-2xl lg:p-3"
            >

              {SPEECH_LANGUAGES.map(
                (voiceLanguage) => (
                  <option
                    key={
                      voiceLanguage.value
                    }
                    value={
                      voiceLanguage.value
                    }
                  >
                    {
                      voiceLanguage.label
                    }
                  </option>
                )
              )}

            </select>

          </div>

          {/* Language */}

          <select
            value={language}
            onChange={(e) =>
              setLanguage(
                e.target.value
              )
            }
            className="mt-4 w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-white outline-none lg:mt-5 lg:rounded-2xl lg:p-4"
          >

            {TARGET_LANGUAGES.map(
              (targetLanguage) => (
                <option
                  key={
                    targetLanguage
                  }
                  value={
                    targetLanguage
                  }
                >
                  {
                    targetLanguage
                  }
                </option>
              )
            )}

          </select>

          {/* Actions */}

          <div className="mt-4 flex flex-col gap-3 lg:mt-5 lg:flex-row">

            <button
              onClick={
                translate
              }
              disabled={
                loading
              }
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 font-medium text-white transition hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-50 lg:w-auto lg:rounded-2xl lg:px-6"
            >

              <Play
                size={18}
              />

              {loading
                ? t.translating
                : t.translate}

            </button>

            <button
              onClick={
                clearAll
              }
              disabled={
                !prompt &&
                !result
              }
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-500 px-5 py-3 font-medium text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50 lg:w-auto lg:rounded-2xl lg:px-6"
            >

              <Trash2
                size={18}
              />

              {t.clear}

            </button>

          </div>

        </div>

        {/* Result */}

        <div className="rounded-2xl border border-slate-800 bg-[#111827] p-4 shadow-xl lg:rounded-3xl lg:p-6">

          <div className="mb-4 flex justify-end gap-2 lg:mb-5">

            {/* SPEAK RESULT */}

            {result && (
              <button
                type="button"
                onClick={() =>
                  isSpeaking
                    ? (
                        window.speechSynthesis.cancel(),
                        setIsSpeaking(
                          false
                        )
                      )
                    : speakTranslation(
                        result
                      )
                }
                title={
                  isSpeaking
                    ? "Hentikan suara"
                    : "Dengarkan hasil terjemahan"
                }
                className="rounded-xl border border-slate-700 bg-slate-900 p-2.5 transition hover:bg-slate-800 lg:rounded-2xl lg:p-3"
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
              disabled={
                !result
              }
              title={
                t.copyResult
              }
              className="rounded-xl border border-slate-700 bg-slate-900 p-2.5 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 lg:rounded-2xl lg:p-3"
            >

              <Copy
                size={18}
              />

            </button>

          </div>

          {result ? (

            <div className="h-[320px] overflow-auto rounded-xl border border-slate-700 bg-slate-900 p-4 lg:h-[500px] lg:rounded-2xl lg:p-5">

              <pre className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-300">
                {result}
              </pre>

            </div>

          ) : (

            <div className="flex h-[320px] items-center justify-center rounded-xl border-2 border-dashed border-slate-700 bg-slate-900 lg:h-[500px] lg:rounded-2xl">

              <div className="text-center">

                <Languages
                  size={48}
                  className="mx-auto mb-5 text-slate-600"
                />

                <h2 className="text-xl font-bold text-white lg:text-2xl">
                  {t.translatorTitle}
                </h2>

                <p className="mt-3 text-sm text-slate-400 lg:text-base">
                  {t.enterTextToTranslate}
                </p>

              </div>

            </div>

          )}

        </div>

      </div>

      {/* VOICE MODE */}

      {voiceMode && (
        <div className="fixed inset-0 z-[100] flex min-h-screen items-center justify-center bg-slate-950">

          <div className="w-full max-w-md px-6 text-center">

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

            <h2 className="mt-8 text-2xl font-bold text-white">
              DNA AI Translator
            </h2>

            <p className="mt-3 text-sm text-slate-400">

              {isListening
                ? locale === "id"
                  ? `Mendengarkan dalam ${speechLanguage}...`
                  : `Listening in ${speechLanguage}...`
                : isSpeaking
                  ? locale === "id"
                    ? `Berbicara dalam ${language}...`
                    : `Speaking in ${language}...`
                  : locale === "id"
                    ? `Bicara: ${speechLanguage} • Tujuan: ${language}`
                    : `Speech: ${speechLanguage} • Target: ${language}`}

            </p>

            <button
              type="button"
              onClick={
                startVoice
              }
              disabled={
                loading
              }
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

            <button
              type="button"
              onClick={() => {
                if (
                  typeof window !==
                    "undefined" &&
                  "speechSynthesis" in
                    window
                ) {
                  window.speechSynthesis.cancel();
                }

                setIsSpeaking(
                  false
                );

                if (
                  isListening
                ) {
                  return;
                }

                setVoiceMode(
                  false
                );
              }}
              className="mx-auto mt-6 block text-sm text-slate-500 transition hover:text-white"
            >

              {t.clear ===
              "Clear"
                ? "Close"
                : "Tutup"}

            </button>

          </div>

        </div>
      )}

    </div>
  );
}