"use client";

import { usePollar } from "@pollar/react";
import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { FlightPackage } from "@/components/flight-package";
import { LoginPanel, type EstelaUser } from "@/components/login-panel";

type Booking = {
  id: number;
  kind: "ticket" | "package" | "travel";
  currency: string;
  amount: string;
  status: string;
  createdAt: string;
  destination: string | null;
  origin: string | null;
  departureAt: string | null;
  returnAt: string | null;
  eventTitle: string | null;
  eventCity: string | null;
  eventCountry: string | null;
  airlineBookingReference: string | null;
  hasDuffelOrder: boolean;
};

type Stamp = { tokenId: number; kind: "event" | "trip"; refId: number; createdAt: string };
type StampAttribute = { trait_type: string; value: string | number };
type StampMetadata = { name: string; description: string; image: string; attributes: StampAttribute[] };
type Membership = { xp: number; level: string; discountBps: number; passId: number | null };
type EventItem = { id: number; title: string; description: string | null; city: string; airport: string | null; country: string; startsAt: string; ticketPrice: string | null; currency: string };
type AccountData = { bookings: Booking[]; stamps: Stamp[]; stampMetadata: Record<number, StampMetadata>; membership: Membership | null; events: EventItem[] };
type ProviderProfile = { name: string; email: string; avatar: string };

const SECTIONS = [
  { id: "resumen", number: "01", label: "OVERVIEW", icon: "grid" },
  { id: "viajes", number: "02", label: "MY TRIPS", icon: "route" },
  { id: "compras", number: "03", label: "PURCHASES", icon: "ticket" },
  { id: "perfil", number: "04", label: "MY PROFILE", icon: "user" },
] as const;

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? "").join("").toUpperCase() || "ST";
}

function AccountAvatar({ profile, large = false }: { profile: ProviderProfile; large?: boolean }) {
  const size = large ? "account-avatar-large" : "account-avatar-small";
  return profile.avatar
    ? <img className={`account-avatar account-avatar-image ${size}`} src={profile.avatar} alt={`${profile.name}'s profile`} />
    : <span className={`account-avatar ${size}`}>{initials(profile.name)}</span>;
}

function AccountIcon({ name }: { name: string }) {
  const paths: Record<string, ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></>,
    route: <><circle cx="5" cy="5" r="2" /><circle cx="19" cy="19" r="2" /><path d="M7 5h5a4 4 0 0 1 4 4v6a4 4 0 0 0 4 4" /></>,
    ticket: <><path d="M4 6.5A2.5 2.5 0 0 0 6.5 4h11A2.5 2.5 0 0 0 20 6.5v2a2.5 2.5 0 0 0 0 5v2a2.5 2.5 0 0 0-2.5 2.5h-11A2.5 2.5 0 0 0 4 15.5v-2a2.5 2.5 0 0 0 0-5z" /><path d="M12 7v2m0 3v2m0 3v1" /></>,
    user: <><circle cx="12" cy="8" r="3.5" /><path d="M4.5 20a7.5 7.5 0 0 1 15 0" /></>,
    arrow: <><path d="M5 12h14m-6-6 6 6-6 6" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="1" /><path d="M7 3v4m10-4v4M3 10h18" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    spark: <><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-2-5.8L4 11l6-2.2L12 3Z" /><path d="m19 15 .9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15Z" /></>,
  };
  return <svg className="account-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] ?? paths.grid}</svg>;
}

function BrandMark() {
  return <span className="brand-mark" aria-hidden="true"><svg viewBox="0 0 52 54" fill="none"><path d="m26 3 5.5 14.2 15.2.9-11.7 9.7 3.8 14.9L26 34.5l-12.8 8.2L17 27.8 5.3 18.1l15.2-.9L26 3Z" fill="currentColor" /><path d="M5 49h18M31 49h13" stroke="currentColor" strokeWidth="4" strokeLinecap="square" /></svg></span>;
}

function AccountAccessScreen({ title, message, children }: { title: string; message: string; children?: ReactNode }) {
  return (
    <div className="account-page account-auth-page">
      <header className="account-header">
        <Link className="account-brand" href="/" aria-label="Starlog home"><BrandMark /><span className="brand-name"><span>Star</span><b>log</b></span></Link>
        <Link className="account-back-link" href="/#viajes">EXPLORE TRIPS <span aria-hidden="true">↗</span></Link>
      </header>
      <main className="account-auth-main">
        <span className="account-kicker"><span className="account-live-dot" /> YOUR TRAVEL JOURNAL</span>
        <h1>{title}<span>.</span></h1>
        <p>{message}</p>
        {children}
        <small>STARLOG ACCOUNT · POLLAR · STELLAR TESTNET</small>
      </main>
    </div>
  );
}

async function jsonOrThrow<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  if (response.status === 401) throw new Error("SESSION_EXPIRED");
  if (!response.ok) throw new Error(`Could not load ${url} (${response.status})`);
  return response.json() as Promise<T>;
}

export function AccountDashboard() {
  const [user, setUser] = useState<EstelaUser | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((session: EstelaUser | null) => { if (active) setUser(session); })
      .catch(() => { if (active) setUser(null); })
      .finally(() => { if (active) setSessionChecked(true); });
    return () => { active = false; };
  }, []);

  if (!sessionChecked) {
    return <AccountAccessScreen title="Opening your journal" message="Checking your Starlog account…" />;
  }
  if (!user) {
    return (
      <AccountAccessScreen title="Your trips belong here" message="Create your account or sign in with Google through Pollar to see your bookings, passport stamps and traveler profile.">
        <LoginPanel user={user} onUserChange={setUser} appearance="account" />
      </AccountAccessScreen>
    );
  }
  return <AccountDashboardContent user={user} onUserChange={setUser} />;
}

function AccountDashboardContent({ user, onUserChange }: { user: EstelaUser; onUserChange: (user: EstelaUser | null) => void }) {
  const { getClient } = usePollar();
  const [providerProfile, setProviderProfile] = useState<ProviderProfile>({ name: "Starlog traveler", email: "", avatar: "" });
  const [activeSection, setActiveSection] = useState("resumen");
  const [data, setData] = useState<AccountData | null>(null);
  const [loadError, setLoadError] = useState("");
  const [selectedPurchase, setSelectedPurchase] = useState<Booking | null>(null);
  const [bookingRefresh, setBookingRefresh] = useState(0);

  useEffect(() => {
    const client = getClient();
    const auth = client.getAuthState();
    if (auth.step !== "authenticated" || !auth.verified) return;
    const profile = client.getUserProfile();
    const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim();
    setProviderProfile({ name: name || "Starlog traveler", email: profile?.mail ?? "", avatar: profile?.avatar ?? "" });
  }, [getClient, user.wallet]);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoadError("");
      try {
        const [bookings, stamps, membership, events] = await Promise.all([
          jsonOrThrow<Booking[]>("/api/me/bookings"),
          jsonOrThrow<Stamp[]>("/api/me/stamps"),
          jsonOrThrow<Membership>("/api/me/membership").catch(() => null),
          jsonOrThrow<EventItem[]>("/api/events").catch(() => []),
        ]);
        const metadataEntries = await Promise.all(stamps.map(async (stamp) => {
          try {
            const metadata = await jsonOrThrow<StampMetadata>(`/api/meta/stamps/${stamp.tokenId}`);
            return [stamp.tokenId, metadata] as const;
          } catch {
            return null;
          }
        }));
        if (!active) return;
        setData({
          bookings,
          stamps,
          stampMetadata: Object.fromEntries(metadataEntries.filter((entry): entry is NonNullable<typeof entry> => entry !== null)),
          membership,
          events,
        });
      } catch (error) {
        if (!active) return;
        if (error instanceof Error && error.message === "SESSION_EXPIRED") {
          onUserChange(null);
          return;
        }
        setLoadError(error instanceof Error ? error.message : "Could not load your account.");
      }
    }
    void load();
    return () => { active = false; };
  }, [bookingRefresh, onUserChange, user.wallet]);

  useEffect(() => {
    const targets = SECTIONS.map(({ id }) => document.getElementById(id)).filter((element): element is HTMLElement => element !== null);
    if (!targets.length) return;
    const observer = new IntersectionObserver((entries) => {
      const current = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (current) setActiveSection(current.target.id);
    }, { rootMargin: "-90px 0px -62% 0px", threshold: [0.05, 0.2, 0.4] });
    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [data]);

  const travelBookings = useMemo(() => (data?.bookings ?? []).filter((booking) => booking.kind !== "ticket"), [data?.bookings]);
  const upcomingTrip = travelBookings
    .filter((booking) => booking.status === "confirmed" && booking.departureAt && new Date(booking.departureAt).getTime() >= Date.now())
    .sort((a, b) => new Date(a.departureAt!).getTime() - new Date(b.departureAt!).getTime())[0];
  const visitedPlaces = useMemo(() => {
    const places = [
      ...travelBookings.map((booking) => booking.destination),
      ...(data?.stamps ?? []).filter((stamp) => stamp.kind === "trip").map((stamp) => stampMetadataAttribute(data?.stampMetadata[stamp.tokenId], "Place")),
    ];
    return [...new Set(places.filter((place): place is string => Boolean(place)).map((place) => place.trim()).filter(Boolean))];
  }, [data?.stampMetadata, data?.stamps, travelBookings]);
  const recommendations = useMemo(() => {
    const knownPlaces = new Set(visitedPlaces.map(normalizePlace));
    const knownAirports = new Set(travelBookings.map((booking) => booking.destination?.toUpperCase()).filter((code): code is string => Boolean(code && /^[A-Z]{3}$/.test(code))));
    if (!knownPlaces.size) return [];
    return (data?.events ?? []).filter((event) => knownPlaces.has(normalizePlace(event.city)) || Boolean(event.airport && knownAirports.has(event.airport.toUpperCase()))).slice(0, 3);
  }, [data?.events, travelBookings, visitedPlaces]);
  const firstName = providerProfile.name.trim().split(/\s+/)[0] || "traveler";
  const travelStampCount = (data?.stamps ?? []).filter((stamp) => stamp.kind === "trip").length;

  return (
    <div className="account-page">
      <header className="account-header">
        <Link className="account-brand" href="/" aria-label="Starlog home"><BrandMark /><span className="brand-name"><span>Star</span><b>log</b></span></Link>
        <Link className="account-back-link" href="/#viajes">EXPLORE TRIPS <span aria-hidden="true">↗</span></Link>
        <a className="account-header-user" href="#perfil" onClick={() => setActiveSection("perfil")} aria-label="Go to my profile"><AccountAvatar profile={providerProfile} /><span>{providerProfile.name.toUpperCase()}</span></a>
        <LoginPanel user={user} onUserChange={onUserChange} appearance="account" />
      </header>

      <main className="account-frame">
        <aside className="account-sidebar" aria-label="Account navigation">
          <div className="account-sidebar-label">YOUR SPACE <span>STL / 01</span></div>
          <nav className="account-side-nav">
            {SECTIONS.map((section) => (
              <a key={section.id} href={`#${section.id}`} onClick={() => setActiveSection(section.id)} className={activeSection === section.id ? "active" : ""} aria-current={activeSection === section.id ? "location" : undefined}>
                <AccountIcon name={section.icon} /><span>{section.label}</span><small>{section.number}</small>
              </a>
            ))}
          </nav>
          <div className="account-sidebar-bottom"><span className="account-sidebar-star">✳</span><span>TRAVEL YOUR WAY</span><Link href="/#como-funciona">HOW IT WORKS <span aria-hidden="true">↗</span></Link></div>
        </aside>

        <div className="account-main">
          <section className="account-welcome" id="resumen" aria-labelledby="account-title">
            <div>
              <div className="account-kicker"><span className="account-live-dot" /> YOUR TRAVEL JOURNAL</div>
              <h1 id="account-title">Good to see you,<br /><em>{firstName}.</em></h1>
              <p>Your Starlog profile, confirmed bookings and on-chain travel memories.</p>
            </div>
            <div className="account-welcome-stamp" aria-label="Your Starlog member pass"><span>ST★RLOG</span><strong>{travelStampCount.toString().padStart(2, "0")}</strong><small>TRIP<br />STAMPS</small></div>
          </section>

          {loadError && <p className="account-load-error" role="alert">{loadError}</p>}
          {!data && !loadError && <p className="account-loading">Loading your bookings and travel passport…</p>}

          <section className="account-trip-section" id="viajes" aria-labelledby="upcoming-title">
            <div className="account-section-heading">
              <div><span className="account-section-kicker">01 / UP NEXT</span><h2 id="upcoming-title">Your next trip<span>.</span></h2></div>
              <Link className="account-inline-link" href="/#viajes">EXPLORE TRIPS <AccountIcon name="arrow" /></Link>
            </div>
            {upcomingTrip ? <TripFeature booking={upcomingTrip} /> : (
              <div className="account-empty-panel"><span className="account-empty-star">✳</span><h3>No upcoming trips yet.</h3><p>Your confirmed flights and travel packages will appear here.</p><FlightPackage profileSearch onBooked={() => setBookingRefresh((value) => value + 1)} /></div>
            )}
            <div className="account-trips-list" aria-label="Your booked trips">
              {travelBookings.map((booking) => <TripRow key={booking.id} booking={booking} />)}
              {data && travelBookings.length === 0 && <p className="account-empty-inline">Your booked flights and travel packages will show here.</p>}
            </div>
          </section>

          <section className="account-recommendations" aria-labelledby="recommendation-title">
            <div className="account-section-heading">
              <div><span className="account-section-kicker">02 / A LITTLE FURTHER</span><h2 id="recommendation-title">Made for your next stop<span>.</span></h2><p>Upcoming Starlog events in places from your confirmed trips.</p></div>
              <span className="account-personal-badge"><AccountIcon name="spark" /> BASED ON YOUR TRIPS</span>
            </div>
            {recommendations.length ? (
              <div className="account-recommendation-grid">
                {recommendations.map((event) => <RecommendationCard key={event.id} event={event} />)}
              </div>
            ) : (
              <div className="account-empty-panel account-empty-panel-compact"><h3>Personal picks will appear as your travel history grows.</h3><p>We use destinations from your confirmed bookings and match them with upcoming events.</p></div>
            )}
          </section>

          <section className="account-purchases" id="compras" aria-labelledby="purchases-title">
            <div className="account-section-heading">
              <div><span className="account-section-kicker">03 / YOUR HISTORY</span><h2 id="purchases-title">Your purchases<span>.</span></h2></div>
              <span className="account-inline-link">{data?.bookings.length ?? 0} BOOKINGS</span>
            </div>
            <div className="account-purchase-list">
              {(data?.bookings ?? []).map((booking) => <PurchaseRow key={booking.id} booking={booking} onOpen={() => setSelectedPurchase(booking)} />)}
              {data && data.bookings.length === 0 && <p className="account-empty-inline">Your completed ticket, flight and travel package purchases will appear here.</p>}
            </div>
          </section>

          <section className="account-profile" id="perfil" aria-labelledby="profile-title">
            <div className="account-section-heading">
              <div><span className="account-section-kicker">04 / YOUR DETAILS</span><h2 id="profile-title">Your traveler profile<span>.</span></h2></div>
              <span className="account-inline-link">CONNECTED WITH POLLAR</span>
            </div>
            <div className="account-profile-card">
              <div className="profile-identity">
                <AccountAvatar profile={providerProfile} large />
                <div><span>STELLAR WALLET CONNECTED</span><h3>{providerProfile.name}</h3><p>{providerProfile.email || "Pollar account"} <i /> {visitedPlaces.length} places in your trip history</p></div>
                {data?.membership && <span className="profile-tier">ESTELA PASS<br /><strong>{data.membership.level.toUpperCase()}</strong></span>}
              </div>
              <div className="profile-passport">
                <div className="profile-passport-heading"><div><span>YOUR ON-CHAIN TRAVEL PASSPORT</span><p>NFT stamps issued from completed trips and event check-ins</p></div><strong>{data?.stamps.length.toString().padStart(2, "0") ?? "00"} STAMPS</strong></div>
                <StampGallery stamps={data?.stamps ?? []} metadata={data?.stampMetadata ?? {}} />
                {data?.membership && <div className="profile-membership">
                  {data.membership.passId !== null && <img src={`/api/meta/pass/${data.membership.passId}/image?xp=${data.membership.xp}`} alt={`Estela Pass, ${data.membership.level} level`} width={400} height={250} />}
                  <div><span>ESTELA PASS · {data.membership.level.toUpperCase()}</span><strong>{data.membership.xp.toLocaleString("en-US")} XP</strong><small>{data.membership.discountBps / 100}% member discount · based on your on-chain activity</small></div>
                </div>}
              </div>
              <div className="profile-fields">
                <label><span>ACCOUNT EMAIL</span><input value={providerProfile.email || "Not shared by Pollar"} readOnly /></label>
                <label><span>STELLAR WALLET</span><input value={user.wallet} readOnly /></label>
                <label><span>ACCOUNT ROLE</span><input value={user.role.toUpperCase()} readOnly /></label>
                <label><span>DESTINATIONS IN YOUR HISTORY</span><input value={visitedPlaces.join(" · ") || "No completed trips yet"} readOnly /></label>
              </div>
            </div>
          </section>

          <footer className="account-footer"><Link className="account-footer-brand" href="/"><BrandMark /><span className="brand-name"><span>Star</span><b>log</b></span></Link><p>Travel, your way.</p><span>BUILT ON THE STELLAR NETWORK <i>✳</i></span></footer>
        </div>
      </main>

      {selectedPurchase && <PurchaseDialog booking={selectedPurchase} onClose={() => setSelectedPurchase(null)} />}
    </div>
  );
}

function TripFeature({ booking }: { booking: Booking }) {
  const destination = booking.destination || booking.eventCity || "Your destination";
  const origin = booking.origin || "STARLOG";
  return (
    <>
      <article className="account-feature-trip">
        <div className="account-feature-copy">
          <div className="account-trip-topline"><span className="account-status"><i /> CONFIRMED BOOKING</span><span>STL · #{booking.id}</span></div>
          <div className="account-trip-city"><span>{booking.kind === "ticket" ? "UP NEXT" : "NEXT STOP"}</span><h3>{destination}</h3><span className="account-country">{booking.eventCountry?.toUpperCase() || booking.destination?.toUpperCase() || "TRAVEL BOOKING"}</span></div>
          <div className="account-trip-details">
            <div><AccountIcon name="calendar" /><span><small>DEPARTURE</small><strong>{formatDate(booking.departureAt)}</strong></span></div>
            <div><AccountIcon name="ticket" /><span><small>BOOKING</small><strong>{booking.eventTitle || (booking.kind === "travel" ? "Duffel flight" : "Flight + event package")}</strong></span></div>
          </div>
          <div className="account-trip-actions"><Link className="account-button account-button-copper" href="#compras">VIEW BOOKING <AccountIcon name="arrow" /></Link><span className="account-trip-ref">{booking.airlineBookingReference ? `AIRLINE REF · ${booking.airlineBookingReference}` : `BOOKING #${booking.id}`}</span></div>
        </div>
        <div className="account-trip-art" aria-label={`Travel route from ${origin} to ${destination}`}>
          <div className="account-art-grid" /><div className="account-art-orbit account-art-orbit-one" /><div className="account-art-orbit account-art-orbit-two" />
          <span className="account-art-coordinate">{booking.departureAt ? new Date(booking.departureAt).toLocaleDateString("en-US", { month: "short", year: "numeric" }).toUpperCase() : "CONFIRMED"}</span>
          <span className="account-art-star">✳</span><div className="account-art-route"><span>{origin.toUpperCase()}</span><i /><b /><i /><span>{destination.toUpperCase()}</span></div>
          <div className="account-art-stamp"><span>STELLAR<br />TRAVEL CLUB</span><strong>{airportCode(destination)}</strong><small>{booking.currency} · {booking.amount}</small></div>
          <span className="account-art-code">STARLOG—#{booking.id}</span>
        </div>
      </article>
      <div className="account-trip-footnote"><span><AccountIcon name="check" /> VERIFIED FROM YOUR BOOKING</span><span>{booking.returnAt ? `Return · ${formatDate(booking.returnAt)}` : booking.currency ? `${booking.amount} ${booking.currency}` : "Confirmed booking"}</span></div>
    </>
  );
}

function TripRow({ booking }: { booking: Booking }) {
  const place = booking.destination || booking.eventCity || "Flight booking";
  return <article className="account-trip-row"><div><span>{booking.status.toUpperCase()} · {booking.kind.toUpperCase()}</span><strong>{place}</strong><small>{booking.origin ? `${booking.origin} → ` : ""}{booking.eventTitle || booking.airlineBookingReference || `Booking #${booking.id}`}</small></div><span>{formatDate(booking.departureAt || booking.createdAt)}</span><b>{booking.amount} {booking.currency}</b></article>;
}

function RecommendationCard({ event }: { event: EventItem }) {
  return (
    <article className="account-recommendation-card">
      <div className="recommendation-art"><span>{event.city.toUpperCase()} / {event.country.toUpperCase()}</span><strong>{event.city.toUpperCase()}</strong><i>✳</i></div>
      <div className="recommendation-content"><span className="recommendation-reason">A PLACE FROM YOUR TRIP HISTORY</span><h3>{event.title}</h3><p>{event.description || `Join a Starlog event in ${event.city}.`}</p><div><span>{event.ticketPrice ? `${formatBaseAmount(event.ticketPrice)} ${event.currency}` : formatDate(event.startsAt)}</span><Link href="/#viajes" aria-label={`Explore ${event.title}`}>↗</Link></div></div>
    </article>
  );
}

function PurchaseRow({ booking, onOpen }: { booking: Booking; onOpen: () => void }) {
  const date = new Date(booking.createdAt);
  const day = date.toLocaleDateString("en-US", { day: "2-digit" });
  const monthYear = date.toLocaleDateString("en-US", { month: "short", year: "numeric" }).toUpperCase();
  const title = booking.eventTitle || (booking.kind === "travel" ? "Duffel flight booking" : booking.kind === "package" ? "Flight + event package" : "Starlog ticket");
  const status = booking.status === "confirmed" ? "COMPLETE" : booking.status.replaceAll("_", " ").toUpperCase();
  return (
    <article className="account-purchase-row">
      <div className="purchase-date"><strong>{day}</strong><span>{monthYear}</span></div>
      <div className="purchase-main"><span>{(booking.destination || booking.eventCity || booking.kind).toUpperCase()} · {booking.kind.toUpperCase()}</span><h3>{title}</h3><small>Booking #{booking.id}{booking.airlineBookingReference ? ` · Airline ref ${booking.airlineBookingReference}` : ""}</small></div>
      <div className="purchase-method"><span>AMOUNT</span><strong>{booking.amount} {booking.currency}</strong><small>{booking.hasDuffelOrder ? "Duffel order confirmed" : "Starlog booking"}</small></div>
      <span className={`purchase-complete ${booking.status === "confirmed" ? "" : "purchase-status-other"}`}><AccountIcon name="check" /> {status}</span>
      <button type="button" className="purchase-menu" onClick={onOpen} aria-label={`View ${title} details`}>↗</button>
    </article>
  );
}

function PurchaseDialog({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  const title = booking.eventTitle || (booking.kind === "travel" ? "Duffel flight booking" : "Starlog package");
  return <div className="account-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="account-purchase-dialog" role="dialog" aria-modal="true" aria-labelledby="purchase-dialog-title"><button type="button" className="account-dialog-close" onClick={onClose} aria-label="Close purchase details">×</button><span className="account-section-kicker">BOOKING DETAILS</span><h2 id="purchase-dialog-title">{title}</h2><div><span>BOOKING</span><strong>#{booking.id}</strong></div><div><span>DATE</span><strong>{formatDate(booking.createdAt)}</strong></div><div><span>DESTINATION</span><strong>{booking.destination || booking.eventCity || "Not available"}</strong></div><div><span>STATUS</span><strong>{booking.status.replaceAll("_", " ").toUpperCase()}</strong></div><div><span>AMOUNT</span><strong>{booking.amount} {booking.currency}</strong></div>{booking.airlineBookingReference && <div><span>AIRLINE REFERENCE</span><strong>{booking.airlineBookingReference}</strong></div>}<button type="button" className="account-button account-button-copper" onClick={onClose}>CLOSE</button></section></div>;
}

function StampGallery({ stamps, metadata }: { stamps: Stamp[]; metadata: Record<number, StampMetadata> }) {
  if (!stamps.length) return <p className="account-empty-inline">Your NFT stamps appear here after a completed trip or event check-in.</p>;
  return (
    <>
      <div className="profile-passport-stamps">
        {stamps.map((stamp) => {
          const item = metadata[stamp.tokenId];
          const place = stampMetadataAttribute(item, "Place") || "Starlog destination";
          const title = item?.name || (stamp.kind === "trip" ? "Completed trip" : "Event stamp");
          return <article className="passport-stamp" key={stamp.tokenId}>
            {item?.image && <img className="passport-stamp-nft" src={item.image} alt={title} loading="lazy" />}
            <span className="passport-stamp-shade" aria-hidden="true" /><span className="passport-stamp-meta">NFT · {stamp.kind === "trip" ? "TRIP" : "EVENT"}</span><span className="passport-stamp-symbol">✧</span><strong>{place.toUpperCase()}</strong><small>#{stamp.tokenId} · {new Date(stamp.createdAt).toLocaleDateString("en-US", { year: "numeric" })}</small>
          </article>;
        })}
      </div>
      <div className="profile-passport-option-two">
        <div className="passport-option-heading"><div><span>OPTION 02 · POSTCARD STAMPS</span><h4>Places you&apos;ve been</h4><p>Real destination photos paired with your on-chain travel memories.</p></div><strong>{stamps.length.toString().padStart(2, "0")} PLACES</strong></div>
        <div className="destination-memory-rail" aria-label="Photo postcards for your NFT stamps">
          {stamps.map((stamp) => {
            const item = metadata[stamp.tokenId];
            const place = stampMetadataAttribute(item, "Place") || "Starlog destination";
            const date = stampMetadataAttribute(item, "Date") || new Date(stamp.createdAt).toLocaleDateString("en-US", { year: "numeric" });
            const photo = destinationPhoto(place) || item?.image;
            return <article className="destination-memory" key={`postcard-${stamp.tokenId}`}>
              <div className="destination-memory-stamp">{photo && <img src={photo} alt={`${place} travel stamp`} loading="lazy" decoding="async" />}<span className="destination-memory-code">{stamp.kind === "trip" ? "TRIP" : "EVENT"} · #{stamp.tokenId}</span><span className="destination-memory-star" aria-hidden="true">✧</span></div>
              <div className="destination-memory-caption"><strong>{place}</strong><span>{stamp.kind === "trip" ? "Completed trip" : "Event visit"}</span><small>{new Date(stamp.createdAt).toLocaleDateString("en-US", { year: "numeric" }) || date}</small></div>
            </article>;
          })}
        </div>
      </div>
    </>
  );
}

function stampMetadataAttribute(metadata: StampMetadata | undefined, name: string): string | null {
  const value = metadata?.attributes.find((attribute) => attribute.trait_type.toLowerCase() === name.toLowerCase())?.value;
  return value === undefined || value === null ? null : String(value);
}

function destinationPhoto(place: string): string | null {
  const normalized = normalizePlace(place);
  if (normalized.includes("venice") || normalized.includes("venezia")) return "https://images.unsplash.com/photo-1701697637411-f5b878978d53?auto=format&fit=crop&w=720&q=80";
  if (normalized.includes("egypt") || normalized.includes("giza") || normalized.includes("cairo")) return "https://images.unsplash.com/photo-1732532929159-05fcf0ab456d?auto=format&fit=crop&w=720&q=80";
  if (normalized.includes("israel") || normalized.includes("jerusalem")) return "https://images.unsplash.com/photo-1697054810280-8e83633002e5?auto=format&fit=crop&w=720&q=80";
  return null;
}

function normalizePlace(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function airportCode(place: string) {
  return place.replace(/[^a-z]/gi, "").slice(0, 3).toUpperCase() || "TRIP";
}

function formatDate(value: string | null) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleDateString("en-US", { dateStyle: "medium" });
}

function formatBaseAmount(raw: string) {
  try {
    const units = BigInt(raw);
    const scale = BigInt(10_000_000);
    const whole = units / scale;
    const fraction = (units % scale).toString().padStart(7, "0").replace(/0+$/, "");
    return `${whole}${fraction ? `.${fraction}` : ""}`;
  } catch {
    return raw;
  }
}
