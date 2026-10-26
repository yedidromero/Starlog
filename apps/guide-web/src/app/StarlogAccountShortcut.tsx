"use client";

import Link from "next/link";
import { usePollar } from "@pollar/react";

type Locale = "es" | "en";

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? "").join("").toUpperCase() || "ST";
}

function ConfiguredAccountShortcut({ locale }: { locale: Locale }) {
  const { isAuthenticated, verified, getClient } = usePollar();
  const profile = isAuthenticated && verified ? getClient().getUserProfile() : null;
  const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ");

  return (
    <Link className="account-shortcut" href="/mi-starlog" aria-label={locale === "es" ? "Abrir Mi Starlog" : "Open My Starlog"}>
      <span>{initials(name)}</span><b>{locale === "es" ? "MI STARLOG" : "MY STARLOG"}</b>
    </Link>
  );
}

export function StarlogAccountShortcut({ locale }: { locale: Locale }) {
  if (!process.env.NEXT_PUBLIC_POLLAR_API_KEY?.trim()) {
    return (
      <Link className="account-shortcut" href="/mi-starlog" aria-label={locale === "es" ? "Abrir Mi Starlog" : "Open My Starlog"}>
        <span>ST</span><b>{locale === "es" ? "MI STARLOG" : "MY STARLOG"}</b>
      </Link>
    );
  }

  return <ConfiguredAccountShortcut locale={locale} />;
}
