import type { Metadata } from "next";
import "@pollar/react/styles.css";
import "./globals.css";
import "./mi-starlog/account.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Starlog",
  description: "Travel to events and book trips with stablecoins on Stellar.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Browser extensions (e.g. LanguageTool) add attributes to <html> before React
    // hydrates; this only silences mismatches on this element, not its children.
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
