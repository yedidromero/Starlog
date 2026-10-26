import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@pollar/react/styles.css";
import "./globals.css";
import { PollarProviderShell } from "./PollarProviderShell";

export const metadata: Metadata = {
  title: "Starlog · Travel, your way",
  description: "Trips, events and community. Pay with USDC, EURC, XLM or card.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body><PollarProviderShell>{children}</PollarProviderShell></body>
    </html>
  );
}
