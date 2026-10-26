"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { EventsList } from "./events-list";
import { type EstelaUser, LoginPanel } from "./login-panel";
import { MyStamps } from "./my-stamps";
import { MyTickets } from "./my-tickets";

/** Holds the Starlog session shared by the login panel, events and tickets. */
export function Home() {
  const [user, setUser] = useState<EstelaUser | null>(null);
  const [checked, setChecked] = useState(false);
  // Bumped after a purchase so the tickets reload.
  const [ticketsVersion, setTicketsVersion] = useState(0);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then(setUser)
      .finally(() => setChecked(true));
  }, []);

  if (!checked) return <p className="text-sm opacity-70">Loading…</p>;

  return (
    <>
      <LoginPanel user={user} onUserChange={setUser} />
      {user && <Link href="/mi-starlog" className="rounded-full border border-black/15 dark:border-white/20 px-5 py-3 text-sm font-medium">MY STARLOG</Link>}
      <EventsList signedIn={user !== null} onPurchased={() => setTicketsVersion((v) => v + 1)} />
      {user && <MyTickets refreshKey={ticketsVersion} />}
      {user && <MyStamps refreshKey={ticketsVersion} />}
    </>
  );
}
