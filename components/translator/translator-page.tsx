"use client";

import { useState } from "react";
import {
  Languages,
  Play,
  Copy,
  Trash2,
  Mic,
  MicOff,
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

export default function TranslatorPage() {
  const { t } = useLanguage();

  const [prompt, setPrompt] = useState("");
  const [language, setLanguage] = useState("Indonesia");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);

  function startVoice() {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error(t.voiceInputNotSupported);
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang = "id-ID";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
      toast.success(t.speakNow);
    };

    recognition.onresult = (event: any) => {
      const transcript =
        event.results[0][0].transcript;

      setPrompt((current) =>
        current
          ? `${current} ${transcript}`
          : transcript
      );
    };

    recognition.onerror = () => {
      setIsListening(false);
      toast.error(t.failedToCaptureVoice);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  }

  async function translate() {
    if (!prompt.trim()) {
      toast.error(t.pleaseEnterText);
      return;
    }

    try {
      setLoading(true);

      const res = await fetch("/api/translator", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: `Terjemahkan teks berikut ke Bahasa ${language}:\n\n${prompt}`,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error || t.failedToTranslate
        );
      }

      setResult(data.result);

      addNotification({
        feature: t.aiTranslator,
        title: t.translationFinished,
        message:
          `${t.translationToLanguage} ${language} ${t.translationReady}`,
        type: "success",
        result: data.result,
      });

      toast.success(t.translationCompleted);
    } catch (error) {
      console.error(error);

      toast.error(t.failedToTranslate);
    } finally {
      setLoading(false);
    }
  }

  function clearAll() {
    setPrompt("");
    setResult("");
    setLanguage("Indonesia");

    toast.success(t.clear);
  }

  async function copyResult() {
    if (!result) return;

    try {
      await navigator.clipboard.writeText(result);

      toast.success(t.copied);
    } catch (error) {
      console.error(error);

      toast.error(t.failedToCopy);
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
              setPrompt(e.target.value)
            }
            placeholder={t.typeTextHere}
            className="h-44 w-full resize-none rounded-xl border border-slate-700 bg-slate-900 p-4 text-white outline-none focus:border-cyan-500 lg:h-52 lg:rounded-2xl lg:p-5"
          />

          {/* Voice */}

          <div className="mt-4 flex flex-col gap-3 lg:flex-row">

            <button
              onClick={startVoice}
              disabled={isListening}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-500 px-5 py-3 font-medium text-white transition hover:bg-purple-600 disabled:cursor-not-allowed disabled:opacity-50 lg:w-auto lg:rounded-2xl lg:px-6"
            >

              {isListening ? (
                <>
                  <MicOff size={18} />
                  {t.listening}
                </>
              ) : (
                <>
                  <Mic size={18} />
                  {t.voice}
                </>
              )}

            </button>

          </div>

          {/* Language */}

          <select
            value={language}
            onChange={(e) =>
              setLanguage(e.target.value)
            }
            className="mt-4 w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-white outline-none lg:mt-5 lg:rounded-2xl lg:p-4"
          >
            {TARGET_LANGUAGES.map((targetLanguage) => (
              <option
                key={targetLanguage}
                value={targetLanguage}
              >
                {targetLanguage}
              </option>
            ))}
          </select>

          {/* Actions */}

          <div className="mt-4 flex flex-col gap-3 lg:mt-5 lg:flex-row">

            <button
              onClick={translate}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 font-medium text-white transition hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-50 lg:w-auto lg:rounded-2xl lg:px-6"
            >

              <Play size={18} />

              {loading
                ? t.translating
                : t.translate}

            </button>

            <button
              onClick={clearAll}
              disabled={!prompt && !result}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-500 px-5 py-3 font-medium text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50 lg:w-auto lg:rounded-2xl lg:px-6"
            >

              <Trash2 size={18} />

              {t.clear}

            </button>

          </div>

        </div>

        {/* Result */}

        <div className="rounded-2xl border border-slate-800 bg-[#111827] p-4 shadow-xl lg:rounded-3xl lg:p-6">

          <div className="mb-4 flex justify-end lg:mb-5">

            <button
              onClick={copyResult}
              disabled={!result}
              title={t.copyResult}
              className="rounded-xl border border-slate-700 bg-slate-900 p-2.5 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 lg:rounded-2xl lg:p-3"
            >

              <Copy size={18} />

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

    </div>
  );
}