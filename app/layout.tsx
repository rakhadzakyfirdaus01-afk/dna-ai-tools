import "./globals.css";

import ThemeProvider from "@/components/theme-provider";
import SessionWrapper from "@/components/providers/session-provider";
import { LanguageProvider } from "@/components/shared/language-provider";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body>
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