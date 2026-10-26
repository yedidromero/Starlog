"use client";

import { usePollar } from "@pollar/react";
import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { FlightPackage } from "@/components/flight-package";
import { LoginPanel, type EstelaUser } from "@/components/login-panel";
import { MyTickets } from "@/components/my-tickets";
import { TravelAgent } from "@/components/travel-agent";

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
  isDemo?: boolean;
  sampleOrderRef?: string;
  samplePaymentNote?: string;
};

type Stamp = { tokenId: number; kind: "event" | "trip"; refId: number; createdAt: string };
type StampAttribute = { trait_type: string; value: string | number };
type StampMetadata = { name: string; description: string; image: string; attributes: StampAttribute[] };
type Membership = { xp: number; level: string; discountBps: number; passId: number | null };
type EventItem = { id: number; title: string; description: string | null; city: string; airport: string | null; country: string; startsAt: string; ticketPrice: string | null; currency: string };
type AccountData = { bookings: Booking[]; demoMode: boolean; stamps: Stamp[]; stampMetadata: Record<number, StampMetadata>; membership: Membership | null; events: EventItem[] };
type BookingsResponse = { bookings: Booking[]; demoMode: boolean };
type ProviderProfile = { name: string; email: string; avatar: string };
type WalletAssetView = { code: string; balance: string | null; issuer?: string; chain: string; network: string; source?: string; status?: string };

const DEMO_DESTINATIONS = [
  { place: "Venice", country: "Italy", year: "2025", code: "IT", style: "destination-memory-venice" },
  { place: "Cairo + Giza", country: "Egypt", year: "2025", code: "EG", style: "destination-memory-egypt" },
  { place: "Jerusalem", country: "Israel", year: "2024", code: "IL", style: "destination-memory-israel" },
] as const;

const DEMO_ITINERARY: Booking = {
  id: 842,
  kind: "travel",
  currency: "USDC",
  amount: "43",
  status: "demo",
  createdAt: "2026-10-01T12:00:00.000Z",
  destination: "Madrid",
  origin: "Valencia",
  departureAt: "2026-11-10T12:00:00.000Z",
  returnAt: "2026-11-12T12:00:00.000Z",
  eventTitle: "Bryan Adams · Movistar Arena",
  eventCity: "Madrid",
  eventCountry: "Spain",
  airlineBookingReference: null,
  hasDuffelOrder: false,
  isDemo: true,
  sampleOrderRef: "ST-00842",
};

const DEMO_PURCHASES: Booking[] = [
  { id: 631, kind: "ticket", currency: "USDC", amount: "44", status: "demo", createdAt: "2026-06-18T12:00:00.000Z", destination: "Valencia", origin: null, departureAt: null, returnAt: null, eventTitle: "Albufera · bus and boat", eventCity: "Valencia", eventCountry: "Spain", airlineBookingReference: null, hasDuffelOrder: false, isDemo: true, sampleOrderRef: "ST-00631", samplePaymentNote: "≈ 44 EUR · 2 guests" },
  { id: 418, kind: "ticket", currency: "USDC", amount: "17", status: "demo", createdAt: "2026-03-22T12:00:00.000Z", destination: "Barcelona", origin: null, departureAt: null, returnAt: null, eventTitle: "Park Güell · guided visit", eventCity: "Barcelona", eventCountry: "Spain", airlineBookingReference: null, hasDuffelOrder: false, isDemo: true, sampleOrderRef: "ST-00418", samplePaymentNote: "≈ 17 EUR · 1 guest" },
  { id: 297, kind: "ticket", currency: "EUR", amount: "12", status: "demo", createdAt: "2026-02-09T12:00:00.000Z", destination: "Madrid", origin: null, departureAt: null, returnAt: null, eventTitle: "Stellar Community Brunch", eventCity: "Madrid", eventCountry: "Spain", airlineBookingReference: null, hasDuffelOrder: false, isDemo: true, sampleOrderRef: "ST-00297", samplePaymentNote: "1 guest" },
];

const DEMO_UPCOMING_TRIPS: Booking[] = [
  DEMO_ITINERARY,
  { ...DEMO_ITINERARY, id: -843, amount: "249", destination: "Barcelona", origin: "Madrid", departureAt: "2026-11-26T10:00:00.000Z", returnAt: "2026-11-28T18:00:00.000Z", eventTitle: "La Oreja de Van Gogh · Barcelona weekend", eventCity: "Barcelona", sampleOrderRef: "ST-00843" },
];

const DEMO_PAST_TRIPS: Booking[] = [
  { ...DEMO_ITINERARY, id: -701, amount: "315", status: "completed", createdAt: "2025-09-14T12:00:00.000Z", destination: "Venice", origin: "Madrid", departureAt: "2025-09-14T09:00:00.000Z", returnAt: "2025-09-18T18:00:00.000Z", eventTitle: "Venice · Grand Canal escape", eventCity: "Venice", eventCountry: "Italy", sampleOrderRef: "ST-00701" },
  { ...DEMO_ITINERARY, id: -602, amount: "420", currency: "EURC", status: "completed", createdAt: "2025-04-08T12:00:00.000Z", destination: "Cairo + Giza", origin: "Barcelona", departureAt: "2025-04-08T08:00:00.000Z", returnAt: "2025-04-14T19:00:00.000Z", eventTitle: "Egypt · Pyramids and Nile discovery", eventCity: "Cairo", eventCountry: "Egypt", sampleOrderRef: "ST-00602" },
  { ...DEMO_ITINERARY, id: -503, amount: "385", status: "completed", createdAt: "2024-11-12T12:00:00.000Z", destination: "Jerusalem", origin: "Madrid", departureAt: "2024-11-12T07:00:00.000Z", returnAt: "2024-11-17T16:00:00.000Z", eventTitle: "Jerusalem · Old City discovery", eventCity: "Jerusalem", eventCountry: "Israel", sampleOrderRef: "ST-00503" },
];

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
        <small>STARLOG ACCOUNT · SECURE CRYPTO WALLET</small>
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
      <AccountAccessScreen title="Your trips belong here" message="Create your account or sign in with Google to see your bookings, passport stamps and traveler profile.">
        <LoginPanel user={user} onUserChange={setUser} appearance="account" />
      </AccountAccessScreen>
    );
  }
  return <AccountDashboardContent user={user} onUserChange={setUser} />;
}

function AccountDashboardContent({ user, onUserChange }: { user: EstelaUser; onUserChange: (user: EstelaUser | null) => void }) {
  const { getClient, isAuthenticated, walletBalance, refreshWalletBalance } = usePollar();
  const [providerProfile, setProviderProfile] = useState<ProviderProfile>({ name: "Starlog traveler", email: "", avatar: "" });
  const [activeSection, setActiveSection] = useState("resumen");
  const [data, setData] = useState<AccountData | null>(null);
  const [loadError, setLoadError] = useState("");
  const [selectedPurchase, setSelectedPurchase] = useState<Booking | null>(null);
  const [bookingRefresh, setBookingRefresh] = useState(0);
  const [balanceOpen, setBalanceOpen] = useState(false);
  const [balanceRefresh, setBalanceRefresh] = useState(0);
  const [balancesLoading, setBalancesLoading] = useState(true);
  const [balanceLookupFailed, setBalanceLookupFailed] = useState(false);
  const [stellarAssets, setStellarAssets] = useState<WalletAssetView[]>([]);
  const [checkedNetworks, setCheckedNetworks] = useState<Array<{ network: string; exists: boolean; failed: boolean }>>([]);

  useEffect(() => {
    if (!isAuthenticated) return;
    let active = true;
    setBalancesLoading(true);
    void refreshWalletBalance().catch(() => undefined);
    const networks = ["testnet", "mainnet"] as const;
    // Unlike the app-enabled asset list, this existing SDK lookup enumerates all
    // holdings of this public address. Keep each network separate; never sum them.
    void Promise.all([
      Promise.allSettled(networks.map(network => getClient().getWalletBalance(user.wallet, network))),
      jsonOrThrow<{ assets: WalletAssetView[] }>("/api/me/wallet-assets").catch(() => null),
    ]).then(([results, tokenBalances]) => {
      if (!active) return;
      setStellarAssets([...(tokenBalances?.assets ?? []), ...results.flatMap((result, index) => result.status === "fulfilled" ? result.value.balances.map(asset => ({ ...asset, chain: "STELLAR", network: networks[index] })) : [])]);
      setCheckedNetworks(results.map((result, index) => ({ network: networks[index], exists: result.status === "fulfilled" && result.value.exists, failed: result.status === "rejected" })));
      setBalanceLookupFailed(results.every(result => result.status === "rejected") && !tokenBalances?.assets.some(asset => asset.balance !== null));
      setBalancesLoading(false);
    });
    const refresh = () => setBalanceRefresh(value => value + 1);
    window.addEventListener("focus", refresh);
    return () => { active = false; window.removeEventListener("focus", refresh); };
  }, [isAuthenticated, getClient, refreshWalletBalance, user.wallet, bookingRefresh, balanceRefresh]);

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
        const [bookingResponse, stamps, membership, events] = await Promise.all([
          jsonOrThrow<BookingsResponse>("/api/me/bookings"),
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
          bookings: bookingResponse.bookings,
          demoMode: bookingResponse.demoMode,
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

  const travelBookings = useMemo(() => [
    ...(data?.bookings ?? []).filter((booking) => booking.kind !== "ticket"),
    ...(data?.demoMode ? [...DEMO_UPCOMING_TRIPS, ...DEMO_PAST_TRIPS] : []),
  ], [data?.bookings, data?.demoMode]);
  const nextConfirmedTrip = travelBookings
    .filter((booking) => booking.status === "confirmed" && booking.departureAt && new Date(booking.departureAt).getTime() >= Date.now())
    .sort((a, b) => new Date(a.departureAt!).getTime() - new Date(b.departureAt!).getTime())[0];
  const upcomingTrip = nextConfirmedTrip ?? (data?.demoMode ? DEMO_ITINERARY : undefined);
  const upcomingTrips = travelBookings.filter((booking) => booking.departureAt && new Date(booking.departureAt).getTime() >= Date.now() && (booking.isDemo || booking.status === "confirmed"));
  const pastTrips = travelBookings.filter((booking) => booking.departureAt && new Date(booking.departureAt).getTime() < Date.now() && (booking.isDemo || booking.status === "confirmed" || booking.status === "completed")).sort((a, b) => new Date(b.departureAt!).getTime() - new Date(a.departureAt!).getTime());
  const visitedPlaces = useMemo(() => {
    const places = [
      ...travelBookings.map((booking) => booking.destination),
      ...(data?.stamps ?? []).filter((stamp) => stamp.kind === "trip").map((stamp) => stampMetadataAttribute(data?.stampMetadata[stamp.tokenId], "Place")),
      ...(data?.demoMode ? DEMO_DESTINATIONS.map((destination) => destination.place) : []),
    ];
    return [...new Set(places.filter((place): place is string => Boolean(place)).map((place) => place.trim()).filter(Boolean))];
  }, [data?.demoMode, data?.stampMetadata, data?.stamps, travelBookings]);
  const recommendations = useMemo(() => {
    const knownPlaces = new Set(visitedPlaces.map(normalizePlace));
    const knownAirports = new Set(travelBookings.map((booking) => booking.destination?.toUpperCase()).filter((code): code is string => Boolean(code && /^[A-Z]{3}$/.test(code))));
    if (!knownPlaces.size) return [];
    return (data?.events ?? []).filter((event) => knownPlaces.has(normalizePlace(event.city)) || Boolean(event.airport && knownAirports.has(event.airport.toUpperCase()))).slice(0, 3);
  }, [data?.events, travelBookings, visitedPlaces]);
  const firstName = providerProfile.name.trim().split(/\s+/)[0] || "traveler";
  const travelStampCount = (data?.stamps ?? []).filter((stamp) => stamp.kind === "trip").length + (data?.demoMode ? DEMO_DESTINATIONS.length : 0);
  const visiblePurchases = [...(data?.bookings ?? []), ...(data?.demoMode ? [...DEMO_PURCHASES, ...DEMO_PAST_TRIPS] : [])].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const displayedMembership: Membership | null = data?.demoMode
    ? { xp: 1344, level: data.membership?.level ?? "Explorer", discountBps: 1000, passId: data.membership?.passId ?? null }
    : data?.membership ?? null;
  const sdkAssets: WalletAssetView[] = walletBalance.step === "loaded" ? walletBalance.data.balances.filter(asset => !stellarAssets.length || (asset.chain && asset.chain !== "STELLAR")).map(asset => ({ ...asset, chain: asset.chain ?? "STELLAR", network: asset.chain && asset.chain !== "STELLAR" ? asset.chain.toLowerCase() : walletBalance.data.network })) : [];
  const walletAssets = [...stellarAssets, ...sdkAssets];
  const hasFunds = (asset: WalletAssetView) => asset.balance != null && Number(asset.balance) > 0;
  const primaryAsset = walletAssets.find(asset => asset.code === "USDC" && hasFunds(asset)) ?? walletAssets.find(asset => asset.code === "EURC" && hasFunds(asset)) ?? walletAssets.find(hasFunds) ?? walletAssets.find(asset => asset.code === "USDC") ?? walletAssets[0];
  const balanceLabel = primaryAsset?.balance != null && Number.isFinite(Number(primaryAsset.balance))
    ? `${Number(primaryAsset.balance).toLocaleString("en-US", { maximumFractionDigits: 7 })} ${primaryAsset.code}`
    : balancesLoading ? "Loading…" : "View balances";

  return (
    <div className="account-page">
      <header className="account-header">
        <Link className="account-brand" href="/" aria-label="Starlog home"><BrandMark /><span className="brand-name"><span>Star</span><b>log</b></span></Link>
        <Link className="account-back-link" href="/#viajes">EXPLORE TRIPS <span aria-hidden="true">↗</span></Link>
        <a className="account-header-user" href="#perfil" onClick={() => setActiveSection("perfil")} aria-label="Go to my profile"><AccountAvatar profile={providerProfile} /><span>{providerProfile.name.toUpperCase()}</span></a>
        <button className="account-wallet-balance" type="button" onClick={() => setBalanceOpen(value => !value)} aria-expanded={balanceOpen} aria-label={`View wallet balance: ${balanceLabel}`}><span>{primaryAsset ? `${primaryAsset.code} BALANCE` : "WALLET BALANCE"}</span><strong>{balanceLabel} <span aria-hidden="true">↗</span></strong></button>
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
              {data?.demoMode && <p className="account-presentation-label">PRESENTATION PROFILE · SAMPLE TRAVEL ACTIVITY</p>}
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
              {upcomingTrips.filter((booking) => booking.id !== upcomingTrip?.id).map((booking) => <TripRow key={booking.id} booking={booking} />)}
              {data && travelBookings.length === 0 && !data.demoMode && <p className="account-empty-inline">Your booked flights and travel packages will show here.</p>}
            </div>
            {pastTrips.length > 0 && <div className="account-past-trips"><div className="account-section-heading"><div><span className="account-section-kicker">YOUR TRAVEL MEMORIES</span><h2>Past trips<span>.</span></h2></div><span className="account-inline-link">{pastTrips.length} TRIPS</span></div><div className="account-trips-list">{pastTrips.map((booking) => <TripRow key={booking.id} booking={booking} />)}</div></div>}
          </section>

          <section className="account-recommendations" aria-labelledby="recommendation-title">
            <div className="account-section-heading">
              <div><span className="account-section-kicker">02 / A LITTLE FURTHER</span><h2 id="recommendation-title">Made for your next stop<span>.</span></h2><p>{data?.demoMode ? "Upcoming Starlog events inspired by your sample travel history." : "Upcoming Starlog events in places from your confirmed trips."}</p></div>
              <span className="account-personal-badge"><AccountIcon name="spark" /> {data?.demoMode ? "INSPIRED BY SAMPLE HISTORY" : "BASED ON YOUR TRIPS"}</span>
            </div>
            {recommendations.length ? (
              <div className="account-recommendation-grid">
                {recommendations.map((event) => <RecommendationCard key={event.id} event={event} />)}
              </div>
            ) : (
              <div className="account-empty-panel account-empty-panel-compact"><h3>{data?.demoMode ? "Your next favorite event is waiting to be added." : "Personal picks will appear as your travel history grows."}</h3><p>{data?.demoMode ? "Recommendations will appear here when matching events are available." : "We use destinations from your confirmed bookings and match them with upcoming events."}</p></div>
            )}
          </section>

          <section className="account-purchases" id="compras" aria-labelledby="purchases-title">
            <div className="account-section-heading">
              <div><span className="account-section-kicker">03 / YOUR HISTORY</span><h2 id="purchases-title">Your purchases<span>.</span></h2></div>
              <span className="account-inline-link">{visiblePurchases.length.toString().padStart(2, "0")} PURCHASES</span>
            </div>
            <div className="account-purchase-list">
              {visiblePurchases.map((booking) => <PurchaseRow key={`${booking.isDemo ? "sample" : "booking"}-${booking.id}`} booking={booking} onOpen={() => setSelectedPurchase(booking)} />)}
              {data && visiblePurchases.length === 0 && <p className="account-empty-inline">Your completed ticket, flight and travel package purchases will appear here.</p>}
            </div>
            <MyTickets refreshKey={bookingRefresh} />
          </section>

          <section className="account-profile" id="perfil" aria-labelledby="profile-title">
            <div className="account-section-heading">
              <div><span className="account-section-kicker">04 / YOUR DETAILS</span><h2 id="profile-title">Your traveler profile<span>.</span></h2></div>
              <span className="account-inline-link">CRYPTO WALLET CONNECTED</span>
            </div>
            <div className="account-profile-card">
              <div className="profile-identity">
                <AccountAvatar profile={providerProfile} large />
              <div><span>STELLAR WALLET CONNECTED</span><h3>{providerProfile.name}</h3><p>{providerProfile.email || "Starlog account"} <i /> {data?.demoMode ? `${DEMO_DESTINATIONS.length} sample destinations` : `${visitedPlaces.length} places in your trip history`}</p></div>
                {displayedMembership && <span className="profile-tier">ESTELA PASS<br /><strong>{displayedMembership.level.toUpperCase()}</strong><small>{displayedMembership.discountBps / 100}% OFF</small></span>}
              </div>
              {displayedMembership && <div className="profile-benefits"><div><span>YOUR TRAVEL XP</span><strong>{displayedMembership.xp.toLocaleString("en-US")} <small>XP</small></strong></div><div><span>MEMBER DISCOUNT</span><strong>{displayedMembership.discountBps / 100}% <small>OFF</small></strong></div><button type="button" onClick={() => setBalanceOpen(true)}><span>WALLET BALANCES</span><strong>{balanceLabel}</strong></button></div>}
              <div className="profile-passport">
                <div className="profile-passport-heading"><div><span>YOUR TRAVEL PASSPORT</span><p>Destination badges and memories from your travels</p></div><strong>{((data?.stamps.length ?? 0) + (data?.demoMode ? DEMO_DESTINATIONS.length : 0)).toString().padStart(2, "0")} STAMPS</strong></div>
                {data?.demoMode && <DemoDestinationGallery />}
                {(!data?.demoMode || Boolean(data?.stamps.length)) && <StampGallery stamps={data?.stamps ?? []} metadata={data?.stampMetadata ?? {}} />}
                {displayedMembership && <div className="profile-membership">
                  {displayedMembership.passId !== null && <img src={`/api/meta/pass/${displayedMembership.passId}/image?xp=${displayedMembership.xp}`} alt={`Estela Pass, ${displayedMembership.level} level`} width={400} height={250} />}
                  <div><span>ESTELA PASS · {displayedMembership.level.toUpperCase()}</span><strong>{displayedMembership.xp.toLocaleString("en-US")} XP</strong><small>{displayedMembership.discountBps / 100}% member discount · {data?.demoMode ? "your presentation member benefits" : "based on your on-chain activity"}</small></div>
                </div>}
              </div>
              <div className="profile-fields">
                <label><span>ACCOUNT EMAIL</span><input value={providerProfile.email || "Email not shared"} readOnly /></label>
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
      {balanceOpen && <section className="account-balances-panel" role="dialog" aria-modal="false" aria-labelledby="wallet-balances-title" onKeyDown={event => { if (event.key === "Escape") setBalanceOpen(false); }}>
        <header><div><span>YOUR CONNECTED WALLET</span><h2 id="wallet-balances-title">Your assets</h2></div><button type="button" onClick={() => setBalanceOpen(false)} aria-label="Close wallet balances">×</button></header>
        <p className="account-balance-address">{user.wallet.slice(0, 8)}…{user.wallet.slice(-8)}</p>
        {balancesLoading && <p role="status">Refreshing your balances…</p>}
        {walletAssets.map((asset, index) => <div className="account-asset-row" key={`${asset.chain}-${asset.network}-${asset.code}-${asset.issuer ?? "native"}-${index}`}><div><strong>{asset.code}</strong><small>{asset.chain === "STELLAR" ? "Stellar" : asset.chain} · {asset.network}{asset.issuer ? ` · ${asset.issuer.slice(0, 4)}…${asset.issuer.slice(-4)}` : ""}{asset.status === "not-held" ? " · Not held in this wallet" : ""}</small></div><b>{asset.balance != null && Number.isFinite(Number(asset.balance)) ? Number(asset.balance).toLocaleString("en-US", { maximumFractionDigits: 7 }) : "Unavailable"}</b></div>)}
        {!balancesLoading && !walletAssets.length && <p>{balanceLookupFailed ? "Balances are temporarily unavailable. Please refresh to try again." : "No assets were found for this address on the checked networks."}</p>}
        {!balancesLoading && checkedNetworks.filter(item => !item.exists).map(item => <p className="account-balance-network-note" key={item.network}>{item.network === "mainnet" ? "Mainnet" : "Testnet"}: {item.failed ? "balance lookup unavailable" : "account not found"}</p>)}
        <button type="button" className="account-balance-refresh" onClick={() => setBalanceRefresh(value => value + 1)} disabled={balancesLoading}>REFRESH BALANCES ↻</button>
      </section>}
      <TravelAgent signedIn />
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
          <div className="account-trip-topline"><span className={`account-status ${booking.isDemo ? "account-status-sample" : ""}`}><i /> {booking.isDemo ? "PLANNED TRIP" : "CONFIRMED BOOKING"}</span><span>STL · #{Math.abs(booking.id)}</span></div>
          <div className="account-trip-city"><span>{booking.kind === "ticket" ? "UP NEXT" : "NEXT STOP"}</span><h3>{destination}</h3><span className="account-country">{booking.eventCountry?.toUpperCase() || booking.destination?.toUpperCase() || "TRAVEL BOOKING"}</span></div>
          <div className="account-trip-details">
            <div><AccountIcon name="calendar" /><span><small>{booking.isDemo ? "TRAVEL DATES" : "DEPARTURE"}</small><strong>{booking.isDemo && booking.returnAt ? `${formatDate(booking.departureAt)} — ${formatDate(booking.returnAt)}` : formatDate(booking.departureAt)}</strong></span></div>
            <div><AccountIcon name="ticket" /><span><small>{booking.isDemo ? "FEATURED EVENT" : "BOOKING"}</small><strong>{booking.eventTitle || (booking.kind === "travel" ? "Duffel flight" : "Flight + event package")}</strong></span></div>
          </div>
          <div className="account-trip-actions"><Link className="account-button account-button-copper" href="#compras">{booking.isDemo ? "VIEW TRIP" : "VIEW BOOKING"} <AccountIcon name="arrow" /></Link><span className="account-trip-ref">{booking.isDemo ? `ITINERARY ${booking.sampleOrderRef ?? booking.id}` : booking.airlineBookingReference ? `AIRLINE REF · ${booking.airlineBookingReference}` : `BOOKING #${booking.id}`}</span></div>
        </div>
        <div className="account-trip-art" aria-label={`Travel route from ${origin} to ${destination}`}>
          <div className="account-art-grid" /><div className="account-art-orbit account-art-orbit-one" /><div className="account-art-orbit account-art-orbit-two" />
          <span className="account-art-coordinate">{booking.departureAt ? new Date(booking.departureAt).toLocaleDateString("en-US", { month: "short", year: "numeric" }).toUpperCase() : "CONFIRMED"}</span>
          <span className="account-art-star">✳</span><div className="account-art-route"><span>{origin.toUpperCase()}</span><i /><b /><i /><span>{destination.toUpperCase()}</span></div>
          <div className="account-art-stamp"><span>STELLAR<br />TRAVEL CLUB</span><strong>{airportCode(destination)}</strong><small>{booking.currency} · {booking.amount}</small></div>
          <span className="account-art-code">STARLOG—#{booking.id}</span>
        </div>
      </article>
      <div className="account-trip-footnote"><span>{booking.isDemo ? <><AccountIcon name="spark" /> TRAVEL ITINERARY</> : <><AccountIcon name="check" /> VERIFIED FROM YOUR BOOKING</>}</span><span>{booking.isDemo ? `${booking.amount} ${booking.currency} · ${booking.returnAt ? `Return ${formatDate(booking.returnAt)}` : "Travel plan"}` : booking.returnAt ? `Return · ${formatDate(booking.returnAt)}` : booking.currency ? `${booking.amount} ${booking.currency}` : "Confirmed booking"}</span></div>
    </>
  );
}

function TripRow({ booking }: { booking: Booking }) {
  const place = booking.destination || booking.eventCity || "Flight booking";
  const status = booking.isDemo ? (booking.departureAt && new Date(booking.departureAt).getTime() < Date.now() ? "COMPLETED" : "UPCOMING") : booking.status.toUpperCase();
  return <article className="account-trip-row"><div><span>{status} · TRIP</span><strong>{place}</strong><small>{booking.origin ? `${booking.origin} → ` : ""}{booking.eventTitle || booking.airlineBookingReference || `Booking #${booking.id}`}</small></div><span>{formatDate(booking.departureAt || booking.createdAt)}</span><b>{booking.amount} {booking.currency}</b></article>;
}

function RecommendationCard({ event }: { event: EventItem }) {
  const city = normalizePlace(event.city);
  const title = event.title.toLowerCase();
  const image = title.includes("bryan") ? "/trips/madrid-sunset.jpg" : title.includes("albufera") ? "/trips/albufera.jpg" : title.includes("guell") || title.includes("güell") ? "/trips/barcelona-coast.jpg" : city.includes("barcelona") ? "/trips/barcelona-panorama.jpg" : city.includes("valencia") ? "/trips/valencia.jpg" : "/trips/madrid-panorama.jpg";
  const description = title.includes("bryan") ? "Live music, city lights and a memorable Madrid escape." : title.includes("oreja") ? "A Barcelona weekend filled with music and Mediterranean views." : title.includes("stellar") ? "Meet the Stellar community for talks, demos and new connections." : title.includes("albufera") ? "Discover the lagoon by boat and stay for a spectacular sunset." : `Discover a new experience in ${event.city}, inspired by your travels.`;
  return (
    <article className="account-recommendation-card">
      <div className="recommendation-art recommendation-photo"><img src={image} alt={`${event.city} destination panorama`} loading="lazy" /><span>{event.city.toUpperCase()} / {event.country.toUpperCase()}</span><strong>{event.city.toUpperCase()}</strong></div>
      <div className="recommendation-content"><span className="recommendation-reason">PICKED FOR YOUR NEXT ADVENTURE</span><h3>{event.title}</h3><p>{description}</p><div><span>{event.ticketPrice ? `${formatBaseAmount(event.ticketPrice)} ${event.currency}` : formatDate(event.startsAt)}</span><Link href="/#viajes" aria-label={`Explore ${event.title}`}>↗</Link></div></div>
    </article>
  );
}

function PurchaseRow({ booking, onOpen }: { booking: Booking; onOpen: () => void }) {
  const date = new Date(booking.createdAt);
  const day = date.toLocaleDateString("en-US", { day: "2-digit" });
  const monthYear = date.toLocaleDateString("en-US", { month: "short", year: "numeric" }).toUpperCase();
  const title = booking.eventTitle || (booking.kind === "travel" ? "Duffel flight booking" : booking.kind === "package" ? "Flight + event package" : "Starlog ticket");
  const status = booking.isDemo ? "SAMPLE" : booking.status === "confirmed" ? "COMPLETE" : booking.status.replaceAll("_", " ").toUpperCase();
  return (
    <article className="account-purchase-row">
      <div className="purchase-date"><strong>{day}</strong><span>{monthYear}</span></div>
      <div className="purchase-main"><span>{(booking.destination || booking.eventCity || booking.kind).toUpperCase()} · {booking.kind.toUpperCase()}</span><h3>{title}</h3><small>{booking.isDemo ? `Order ${booking.sampleOrderRef ?? `ST-${booking.id}`}` : `Booking #${booking.id}${booking.airlineBookingReference ? ` · Airline ref ${booking.airlineBookingReference}` : ""}`}</small></div>
      <div className="purchase-method"><span>AMOUNT</span><strong>{booking.amount} {booking.currency}</strong><small>{booking.isDemo ? booking.samplePaymentNote || "Sample data · no charge made" : booking.hasDuffelOrder ? "Duffel order confirmed" : "Starlog booking"}</small></div>
      <span className={`purchase-complete ${booking.isDemo || booking.status !== "confirmed" ? "purchase-status-other" : ""}`}>{booking.isDemo ? <AccountIcon name="spark" /> : <AccountIcon name="check" />} {status}</span>
      <button type="button" className="purchase-menu" onClick={onOpen} aria-label={`View ${title} details`}>↗</button>
    </article>
  );
}

function PurchaseDialog({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  const title = booking.eventTitle || (booking.kind === "travel" ? "Duffel flight booking" : "Starlog package");
  return <div className="account-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="account-purchase-dialog" role="dialog" aria-modal="true" aria-labelledby="purchase-dialog-title"><button type="button" className="account-dialog-close" onClick={onClose} aria-label="Close purchase details">×</button><span className="account-section-kicker">{booking.isDemo ? "SAMPLE PURCHASE · DEMO" : "BOOKING DETAILS"}</span><h2 id="purchase-dialog-title">{title}</h2><div><span>{booking.isDemo ? "ORDER" : "BOOKING"}</span><strong>{booking.isDemo ? booking.sampleOrderRef ?? `ST-${booking.id}` : `#${booking.id}`}</strong></div><div><span>DATE</span><strong>{formatDate(booking.createdAt)}</strong></div><div><span>DESTINATION</span><strong>{booking.destination || booking.eventCity || "Not available"}</strong></div><div><span>STATUS</span><strong>{booking.isDemo ? "SAMPLE ONLY" : booking.status.replaceAll("_", " ").toUpperCase()}</strong></div><div><span>AMOUNT</span><strong>{booking.amount} {booking.currency}</strong></div>{booking.samplePaymentNote && <div><span>DETAILS</span><strong>{booking.samplePaymentNote}</strong></div>}{booking.airlineBookingReference && <div><span>AIRLINE REFERENCE</span><strong>{booking.airlineBookingReference}</strong></div>}{booking.isDemo && <p className="account-demo-note"><span>i</span> This is sample profile data. No charge was made and no ticket was issued.</p>}<button type="button" className="account-button account-button-copper" onClick={onClose}>CLOSE</button></section></div>;
}

function StampGallery({ stamps, metadata }: { stamps: Stamp[]; metadata: Record<number, StampMetadata> }) {
  if (!stamps.length) return <p className="account-empty-inline">Your NFT stamps appear here after a completed trip or event check-in.</p>;
  return (
    <>
      <div className="profile-passport-option-two">
        <div className="passport-option-heading"><div><span>COLLECTED DESTINATIONS</span><h4>Places you&apos;ve been</h4><p>Real destination photos paired with your travel memories.</p></div><strong>{stamps.length.toString().padStart(2, "0")} PLACES</strong></div>
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

function DemoDestinationGallery() {
  return (
    <>
    <div className="profile-passport-option-two">
      <div className="passport-option-heading"><div><span>COLLECTED DESTINATIONS</span><h4>Places I&apos;ve been</h4><p>Every journey leaves a memory.</p></div><strong>03 PLACES</strong></div>
      <div className="destination-memory-rail" aria-label="Sample destination memories, not NFT stamps">
        {DEMO_DESTINATIONS.map((destination) => {
          const photo = destinationPhoto(destination.place);
          return <article className={`destination-memory ${destination.style}`} key={destination.place}>
            <div className="destination-memory-stamp">{photo && <img src={photo} alt={`${destination.place}, ${destination.country}`} loading="lazy" decoding="async" />}<span className="destination-memory-code">{destination.code} · {destination.year}</span><span className="destination-memory-star" aria-hidden="true">✧</span></div>
            <div className="destination-memory-caption"><strong>{destination.place}</strong><span>{destination.country}</span><small>{destination.year}</small></div>
          </article>;
        })}
      </div>
      <p className="account-demo-note">Illustrative destination badges for the presentation profile.</p>
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
  if (normalized.includes("venice") || normalized.includes("venezia")) return "/stamps/venice.jpg";
  if (normalized.includes("egypt") || normalized.includes("giza") || normalized.includes("cairo")) return "/stamps/egypt.jpg";
  if (normalized.includes("israel") || normalized.includes("jerusalem")) return "/stamps/israel.jpg";
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
