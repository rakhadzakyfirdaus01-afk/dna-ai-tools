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

export default function TranslatorPage() {
  const { t, locale } = useLanguage();

  const [prompt, setPrompt] = useState("");
  const [language, setLanguage] = useState("Indonesia");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);

  function speakTranslation(text: string) {
    if (
      typeof window === "undefined" ||
      !("speechSynthesis" in window)
    ) {
      toast.error(
        "Text-to-Speech tidak didukung browser ini."
      );
      return;
    }

    window.speechSynthesis.cancel();

    const languageMap: Record<string, string> = {
      Abkhaz: "ab",
      Aceh: "ace",
      Acoli: "ach",
      Afar: "aa",
      Afrikaans: "af",
      Akan: "ak",
      Albania: "sq",
      Alur: "alr",
      Amharik: "am",
      Arab: "ar",
      Armenia: "hy",
      Assam: "as",
      Avar: "av",
      Awadhi: "awa",
      Aymara: "ay",
      Azerbaijani: "az",
      Bali: "ban",
      Baluchi: "bal",
      Bambara: "bm",
      Baoulé: "ba",
      Bashkir: "ba",
      Basque: "eu",
      "Batak Karo": "btx",
      "Batak Simalungun": "bts",
      "Batak Toba": "bbc",
      Belanda: "nl",
      Belarusia: "be",
      Bemba: "bem",
      Bengali: "bn",
      Betawi: "bew",
      Bhojpuri: "bho",
      Bikol: "bik",
      Bosnia: "bs",
      Breton: "br",
      Bulgaria: "bg",
      Buriat: "bua",
      Burma: "my",
      Cebuano: "ceb",
      Ceko: "cs",
      Chamorro: "ch",
      Chechen: "ce",
      "China (Aks. Sederhana)": "zh-CN",
      "China (Aks. Tradisional)": "zh-TW",
      Chuuke: "chk",
      Chuvash: "cv",
      Dansk: "da",
      Dari: "fa-AF",
      Dinka: "din",
      Divehi: "dv",
      Dogri: "doi",
      Dombe: "dov",
      Dyula: "dyu",
      Dzongkha: "dz",
      Esperanto: "eo",
      Estonia: "et",
      Ewe: "ee",
      Faroe: "fo",
      Fiji: "fj",
      Fon: "fon",
      "Frisia Barat": "fy",
      Friuli: "fur",
      Fulani: "ff",
      Ga: "gaa",
      "Gaelik Skotlandia": "gd",
      Galisia: "gl",
      Ganda: "lg",
      Georgia: "ka",
      Guarani: "gn",
      Gujarat: "gu",
      "Hakha Chin": "cnh",
      Hausa: "ha",
      Hawaii: "haw",
      Hiligaynon: "hil",
      Hindi: "hi",
      Hmong: "hmn",
      Hungaria: "hu",
      Hunsrik: "hrx",
      Iban: "iba",
      Ibrani: "he",
      Igbo: "ig",
      Iloko: "ilo",
      Indonesia: "id-ID",
      Inggris: "en-US",
      Irlandia: "ga",
      Islandia: "is",
      Italia: "it",
      "Jamaika Patois": "jam",
      Jawa: "jv",
      Jepang: "ja-JP",
      Jerman: "de-DE",
      Jingpo: "kac",
      Kalaallisut: "kl",
      Kannada: "kn",
      Kanton: "yue",
      Kanuri: "kr",
      Katalan: "ca",
      Kazakh: "kk",
      Khasi: "kha",
      Khmer: "km",
      Kiga: "cgg",
      Kinyarwanda: "rw",
      Kirgiz: "ky",
      Kituba: "ktu",
      "Kok Borok": "trp",
      Komi: "kv",
      Kongo: "kg",
      Konkani: "kok",
      Korea: "ko-KR",
      Korsika: "co",
      "Kreol Haiti": "ht",
      Krio: "kri",
      Kroasia: "hr",
      Kurdi: "ku",
      "Kurdi Sorani": "ckb",
      Lao: "lo",
      Latgalian: "ltg",
      Latin: "la",
      Latvia: "lv",
      Liguria: "lij",
      Limburgia: "li",
      Lingala: "ln",
      Lituania: "lt",
      Lombard: "lmo",
      Luksemburg: "lb",
      Luo: "luo",
      Madura: "mad",
      Maithili: "mai",
      Makasar: "mak",
      Makedonia: "mk",
      Malagasi: "mg",
      Malayalam: "ml",
      Malta: "mt",
      Mam: "mam",
      "Manipuri (Meitei Mayek)": "mni",
      Manx: "gv",
      Maori: "mi",
      Marathi: "mr",
      Marshall: "mh",
      Marwari: "mwr",
      "Maya Yukatek": "yua",
      "Meadow Mari": "chm",
      Melayu: "ms-MY",
      "Melayu (Arab)": "ms",
      Minangkabau: "min",
      Mizo: "lus",
      Mongolia: "mn",
      Morisien: "mfe",
      "Nahuatl (Huasteca Timur)": "nhe",
      Ndau: "ndc",
      "Ndebele Selatan": "nr",
      "Nepal Bhasa (Newari)": "new",
      Nepali: "ne",
      NKo: "nqo",
      Norwegia: "no",
      Nuer: "nus",
      Nyanja: "ny",
      Oriya: "or",
      Oromo: "om",
      Ositania: "oc",
      Ossetia: "os",
      Pampanga: "pam",
      Pangasina: "pag",
      Papiamento: "pap",
      Pashto: "ps",
      Persia: "fa",
      Polski: "pl",
      Portugis: "pt-BR",
      "Portugis (Portugal)": "pt-PT",
      Prancis: "fr-FR",
      Punjabi: "pa",
      "Punjabi (Arab)": "pa-Arab",
      "Q'eqchi'": "kek",
      Quechua: "qu",
      Romani: "rom",
      Rumania: "ro",
      Rundi: "rn",
      Rusia: "ru-RU",
      Sakha: "sah",
      "Sami Utara": "se",
      Samoa: "sm",
      Sango: "sg",
      Sanskerta: "sa",
      "Santali (Latin)": "sat",
      Serbia: "sr",
      "Seselwa Kreol Prancis": "crs",
      Shan: "shn",
      Shona: "sn",
      Silesia: "szl",
      Sindhi: "sd",
      Sinhala: "si",
      Sisilia: "scn",
      Slovak: "sk",
      Slovenia: "sl",
      Somalia: "so",
      "Sotho Selatan": "st",
      "Sotho Utara": "nso",
      Spanyol: "es-ES",
      Sunda: "su",
      Suomi: "fi",
      Susu: "sus",
      Swahili: "sw",
      Swati: "ss",
      Swedia: "sv",
      Tagalog: "tl",
      Tahiti: "ty",
      Tajik: "tg",
      Tamazight: "ber",
      "Tamazight (Tifinagh)": "ber",
      Tamil: "ta",
      Tatar: "tt",
      "Tatar Krimea": "crh",
      Telugu: "te",
      Tetun: "tet",
      Thai: "th",
      Tibet: "bo",
      Tigrinya: "ti",
      Tiv: "tiv",
      "Tok Pisin": "tpi",
      Tonga: "to",
      Tsonga: "ts",
      Tswana: "tn",
      Tulu: "tcy",
      Tumbuka: "tum",
      Turki: "tr-TR",
      Turkmen: "tk",
      Tuvinia: "tyv",
      Udmurt: "udm",
      Ukraina: "uk-UA",
      Urdu: "ur",
      Uyghur: "ug",
      Uzbek: "uz",
      Venda: "ve",
      Venesia: "vec",
      Vietnam: "vi-VN",
      Warai: "war",
      Welsh: "cy",
      Wolof: "wo",
      Xhosa: "xh",
      Yiddish: "yi",
      Yoruba: "yo",
      Yunani: "el",
      Zapotek: "zap",
      Zulu: "zu",
    };

    const speechLanguage =
      languageMap[language] ?? "en-US";

    const utterance =
      new SpeechSynthesisUtterance(text);

    utterance.lang = speechLanguage;

    const voices =
      window.speechSynthesis.getVoices();

    const languagePrefix =
      speechLanguage
        .toLowerCase()
        .split("-")[0];

    const selectedVoice = voices.find(
      (voice) =>
        voice.lang
          .toLowerCase()
          .startsWith(languagePrefix)
    );

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onstart = () => {
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
    };

    window.speechSynthesis.speak(
      utterance
    );
  }

  function startVoice() {
    if (typeof window === "undefined") return;

    setVoiceMode(true);

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error(t.voiceInputNotSupported);
      setVoiceMode(false);
      return;
    }

    const recognition =
      new SpeechRecognition();

    recognition.lang = "id-ID";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
      toast.success(t.speakNow);
    };

    recognition.onresult = async (
      event: any
    ) => {
      const transcript =
        event.results?.[0]?.[0]?.transcript?.trim();

      if (!transcript) return;

      setPrompt(transcript);

      await translateVoice(transcript);
    };

    recognition.onerror = (event: any) => {
      const errorCode =
        event?.error ?? "unknown";

      setIsListening(false);

      if (errorCode === "no-speech") {
        toast(
          "Mohon bicara lebih jelas. Saya belum dapat mendengar suara Anda."
        );
        return;
      }

      if (errorCode === "not-allowed") {
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
      console.error(error);
      setIsListening(false);
    }
  }

  async function translateVoice(
    voiceText: string
  ) {
    if (!voiceText.trim()) return;

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

      setResult(data.result);

      addNotification({
        feature: t.aiTranslator,
        title: t.translationFinished,
        message:
          `${t.translationToLanguage} ${language} ${t.translationReady}`,
        type: "success",
        result: data.result,
      });

      speakTranslation(data.result);

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
      toast.error(t.pleaseEnterText);
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

      setResult(data.result);

      addNotification({
        feature: t.aiTranslator,
        title: t.translationFinished,
        message:
          `${t.translationToLanguage} ${language} ${t.translationReady}`,
        type: "success",
        result: data.result,
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
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    setIsSpeaking(false);
    setIsListening(false);
    setVoiceMode(false);
    setPrompt("");
    setResult("");
    setLanguage("Indonesia");

    toast.success(t.clear);
  }

  async function copyResult() {
    if (!result) return;

    try {
      await navigator.clipboard.writeText(
        result
      );

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

            {TARGET_LANGUAGES.map(
              (targetLanguage) => (
                <option
                  key={targetLanguage}
                  value={targetLanguage}
                >
                  {targetLanguage}
                </option>
              )
            )}

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

          <div className="mb-4 flex justify-end gap-2 lg:mb-5">

            {/* SPEAK RESULT */}

            {result && (
              <button
                type="button"
                onClick={() =>
                  isSpeaking
                    ? (
                        window.speechSynthesis.cancel(),
                        setIsSpeaking(false)
                      )
                    : speakTranslation(result)
                }
                title={
                  isSpeaking
                    ? "Hentikan suara"
                    : "Dengarkan hasil terjemahan"
                }
                className="rounded-xl border border-slate-700 bg-slate-900 p-2.5 transition hover:bg-slate-800 lg:rounded-2xl lg:p-3"
              >

                {isSpeaking ? (
                  <VolumeX size={18} />
                ) : (
                  <Volume2 size={18} />
                )}

              </button>
            )}

            {/* COPY */}

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

      {/* VOICE MODE */}

      {voiceMode && (
        <div className="fixed inset-0 z-[100] flex min-h-screen items-center justify-center bg-slate-950">

          <div className="w-full max-w-md px-6 text-center">

            <div className="flex justify-center">

              <div
                className={`flex h-32 w-32 items-center justify-center rounded-full bg-slate-900 ${
                  isListening || isSpeaking
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
                ? "Mendengarkan..."
                : isSpeaking
                  ? "Sedang berbicara..."
                  : `Bahasa tujuan: ${language}`}
            </p>

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
                <MicOff size={24} />
              ) : (
                <Mic size={24} />
              )}

            </button>

            <button
              type="button"
              onClick={() => {
                if (
                  typeof window !== "undefined" &&
                  "speechSynthesis" in window
                ) {
                  window.speechSynthesis.cancel();
                }

                setIsSpeaking(false);

                if (isListening) {
                  return;
                }

                setVoiceMode(false);
              }}
              className="mx-auto mt-6 block text-sm text-slate-500 transition hover:text-white"
            >
              {t.clear === "Clear"
                ? "Close"
                : "Tutup"}
            </button>

          </div>

        </div>
      )}

    </div>
  );
}