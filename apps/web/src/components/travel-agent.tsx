"use client";

import { useState } from "react";
import { usePollar } from "@pollar/react";
import { FlightPackage } from "@/components/flight-package";

/** Visible travel-agent entry point; flight search and booking use the existing Duffel/Pollar flow. */
export function TravelAgent({ signedIn }: { signedIn: boolean }) {
  const { openLoginModal } = usePollar();
  const [open, setOpen] = useState(false);
  const [flightSearch, setFlightSearch] = useState(false);

  return (
    <>
      {open && (
        <section className="assistant-panel assistant-panel-planner" role="dialog" aria-modal="false" aria-labelledby="travel-agent-title">
          <header className="assistant-head">
            <span className="assistant-avatar" aria-hidden="true">✳</span>
            <span><strong id="travel-agent-title">Starlog Travel Agent</strong><small>TRIP PLANNING · DUFFEL · POLLAR</small></span>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close travel agent">×</button>
          </header>
          <div className="travel-agent-body">
            <p className="travel-agent-greeting">I&apos;m here to help plan your next trip.</p>
            <p className="travel-agent-description">Search live flights with Duffel and book securely with Pollar on Stellar.</p>
            <div className="travel-agent-actions">
              <button type="button" className="travel-agent-action travel-agent-action-primary" onClick={() => {
                if (!signedIn) {
                  openLoginModal();
                  return;
                }
                setFlightSearch((current) => !current);
              }}>
                {signedIn ? (flightSearch ? "CLOSE FLIGHT SEARCH" : "SEARCH LIVE FLIGHTS") : "SIGN IN TO SEARCH FLIGHTS"}
                <span aria-hidden="true">↗</span>
              </button>
              <a className="travel-agent-action" href="/#viajes" onClick={() => setOpen(false)}>EXPLORE TRIPS <span aria-hidden="true">↗</span></a>
              <a className="travel-agent-action" href="/mi-starlog" onClick={() => setOpen(false)}>MY TRAVEL JOURNAL <span aria-hidden="true">↗</span></a>
            </div>
            {flightSearch && signedIn && <FlightPackage profileSearch openByDefault />}
          </div>
          <p className="assistant-disclaimer">Flight prices and availability come from Duffel. Payment is confirmed in Pollar before booking.</p>
        </section>
      )}
      <button className="assistant-launcher" type="button" aria-expanded={open} onClick={() => setOpen((current) => !current)}>
        <span className="star-seal" aria-hidden="true">✳</span><span>YOUR STARLOG TRAVEL AGENT</span><span aria-hidden="true">{open ? "−" : "+"}</span>
      </button>
    </>
  );
}
