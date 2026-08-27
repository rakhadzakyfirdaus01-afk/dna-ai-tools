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
    const savedLanguage = localStorage.getItem("language");

    if (savedLanguage === "id" || savedLanguage === "en") {
      setLocaleState(savedLanguage);
    }
  }, []);

  const setLocale = (newLocale: Locale) => {
    localStorage.setItem("language", newLocale);
    setLocaleState(newLocale);
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