import "./globals.css";
import SplashScreen from "@/components/SplashScreen";

import type { Metadata } from "next";

import ThemeProvider from "@/components/theme-provider";
import SessionWrapper from "@/components/providers/session-provider";
import { LanguageProvider } from "@/components/shared/language-provider";

export const metadata: Metadata = {
  title: "DNA AI Platform",
  description: "AI Advertising Platform",
};


export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
     <body>
  <SplashScreen />

  <LanguageProvider>
          <SessionWrapper>
            <ThemeProvider>
              {children}
            </ThemeProvider>
          </SessionWrapper>
        </LanguageProvider>
      </body>
    </html>
  );
}