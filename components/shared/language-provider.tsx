"use client";

import type { ReactNode } from "react";
import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import id from "@/messages/id";
import en from "@/messages/en";

export type Locale = "id" | "en";

const translations = {
  id,
  en,
};

type Translation = typeof id;

type LanguageContextType = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translation;
};

const LanguageContext = createContext<LanguageContextType>({
  locale: "id",
  setLocale: () => {},
  t: id,
});

export function LanguageProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>("id");

  useEffect(() => {
    const saved = localStorage.getItem("language") as Locale | null;

    if (saved) {
      setLocaleState(saved);
    }
  }, []);

  const setLocale = (locale: Locale) => {
    localStorage.setItem("language", locale);
    setLocaleState(locale);
  };

  return (
    <LanguageContext.Provider
      value={{
        locale,
        setLocale,
        t: translations[locale],
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}