import "./globals.css";
import ThemeProvider from "@/components/theme-provider";
import SessionWrapper from "@/components/providers/session-provider";


export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  return (

    <html lang="en" suppressHydrationWarning>

      <body>

        <SessionWrapper>

          <ThemeProvider>

            {children}

          </ThemeProvider>

        </SessionWrapper>

      </body>

    </html>

  );

}