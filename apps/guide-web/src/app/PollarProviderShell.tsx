"use client";

import type { ReactNode } from "react";
import { PollarProvider } from "@pollar/react";

export function PollarProviderShell({ children }: { children: ReactNode }) {
  const apiKey = process.env.NEXT_PUBLIC_POLLAR_API_KEY?.trim();

  if (!apiKey) return children;

  return (
    <PollarProvider
      client={{
        apiKey,
        stellarNetwork: "testnet",
        confirmation: "prompt",
      }}
    >
      {children}
    </PollarProvider>
  );
}
