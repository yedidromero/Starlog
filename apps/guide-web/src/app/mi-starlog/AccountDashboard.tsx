"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { usePollar } from "@pollar/react";

type TravelerProfile = { name: string; email: string; city: string; interests: string; avatar: string };

const DEMO_PROFILE: TravelerProfile = {
  name: "Marina Cortés",
  email: "marina.cortes@email.com",
  city: "Valencia",
  interests: "Concerts · Culture · Crypto community",
  avatar: "",
};

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? "").join("").toUpperCase() || "ST";
}

function AccountAvatar({ profile, large = false }: { profile: TravelerProfile; large?: boolean }) {
  const sizeClass = large ? "account-avatar-large" : "account-avatar-small";
  return profile.avatar
    ? <img className={`account-avatar account-avatar-image ${sizeClass}`} src={profile.avatar} alt={`${profile.name}'s profile`} />
    : <span className={`account-avatar ${sizeClass}`}>{initials(profile.name)}</span>;
}

function AccountAccessScreen({
  title,
  message,
  action,
  actionLabel,
}: {
  title: string;
  message: string;
  action?: () => void;
  actionLabel?: string;
}) {
  return (
    <div className="account-page account-auth-page">
      <header className="account-header">
        <Link className="account-brand" href="/" aria-label="Starlog, go to home"><BrandMark /><span className="brand-name"><span>Star</span><b>log</b></span></Link>
        <Link className="account-back-link" href="/#viajes">EXPLORE TRIPS <span aria-hidden="true">↗</span></Link>
      </header>
      <main className="account-auth-main">
        <span className="account-kicker"><span className="account-live-dot" /> YOUR TRAVEL JOURNAL</span>
        <h1>{title}<span>.</span></h1>
        <p>{message}</p>
        {action && actionLabel && <button className="account-button account-button-copper account-auth-action" type="button" onClick={action}>{actionLabel} <AccountIcon name="arrow" /></button>}
        <small>STARLOG ACCOUNT · POLLAR · STELLAR TESTNET</small>
      </main>
    </div>
  );
}

const sections = [
  { id: "resumen", number: "01", label: "OVERVIEW", icon: "grid" },
  { id: "viajes", number: "02", label: "MY TRIPS", icon: "route" },
  { id: "compras", number: "03", label: "PURCHASES", icon: "ticket" },
  { id: "perfil", number: "04", label: "MY PROFILE", icon: "user" },
] as const;

function AccountIcon({ name }: { name: string }) {
  const paths: Record<string, ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></>,
    route: <><circle cx="5" cy="5" r="2" /><circle cx="19" cy="19" r="2" /><path d="M7 5h5a4 4 0 0 1 4 4v6a4 4 0 0 0 4 4" /></>,
    ticket: <><path d="M4 6.5A2.5 2.5 0 0 0 6.5 4h11A2.5 2.5 0 0 0 20 6.5v2a2.5 2.5 0 0 0 0 5v2a2.5 2.5 0 0 0-2.5 2.5h-11A2.5 2.5 0 0 0 4 15.5v-2a2.5 2.5 0 0 0 0-5z" /><path d="M12 7v2m0 3v2m0 3v1" /></>,
    user: <><circle cx="12" cy="8" r="3.5" /><path d="M4.5 20a7.5 7.5 0 0 1 15 0" /></>,
    arrow: <><path d="M5 12h14m-6-6 6 6-6 6" /></>,
    pin: <><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" /><circle cx="12" cy="10" r="2" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="1" /><path d="M7 3v4m10-4v4M3 10h18" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    edit: <><path d="m4 16.5-.8 4.3 4.3-.8L20 7.5 16.5 4z" /><path d="m14.5 6 3.5 3.5" /></>,
    spark: <><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-2-5.8L4 11l6-2.2L12 3Z" /><path d="m19 15 .9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15Z" /></>,
  };

  return <svg className="account-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] ?? paths.grid}</svg>;
}

function BrandMark() {
  return <span className="brand-mark" aria-hidden="true"><svg viewBox="0 0 52 54" fill="none"><path d="m26 3 5.5 14.2 15.2.9-11.7 9.7 3.8 14.9L26 34.5l-12.8 8.2L17 27.8 5.3 18.1l15.2-.9L26 3Z" fill="currentColor" /><path d="M5 49h18M31 49h13" stroke="currentColor" strokeWidth="4" strokeLinecap="square" /></svg></span>;
}

export function AccountDashboard() {
  if (!process.env.NEXT_PUBLIC_POLLAR_API_KEY?.trim()) {
    return <AccountDashboardContent profileSeed={DEMO_PROFILE} demo />;
  }
  return <PollarAccountDashboard />;
}

function PollarAccountDashboard() {
  const { isAuthenticated, verified, configStatus, retryConfig, openLoginModal, logout, getClient } = usePollar();
  const [profileSeed, setProfileSeed] = useState<TravelerProfile | null>(null);
  const [profileKey, setProfileKey] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !verified) {
      setProfileSeed(null);
      setProfileKey(null);
      return;
    }

    const auth = getClient().getAuthState();
    if (auth.step !== "authenticated" || !auth.verified || !auth.session.userId) return;

    const providerProfile = getClient().getUserProfile();
    const userId = auth.session.userId;
    const key = `starlog:traveler-profile:${userId}`;
    const defaults: TravelerProfile = {
      name: [providerProfile?.first_name, providerProfile?.last_name].filter(Boolean).join(" ").trim() || "Starlog traveler",
      email: providerProfile?.mail ?? "",
      city: "",
      interests: "",
      avatar: providerProfile?.avatar ?? "",
    };

    let stored: Partial<TravelerProfile> = {};
    try {
      const serialized = window.localStorage.getItem(key);
      if (serialized) {
        const value: unknown = JSON.parse(serialized);
        if (value && typeof value === "object") stored = value as Partial<TravelerProfile>;
      }
    } catch {
      stored = {};
    }

    const profile = { ...defaults, ...stored };
    try {
      if (!window.localStorage.getItem(key)) window.localStorage.setItem(key, JSON.stringify(profile));
    } catch {
      // The account remains usable in memory if browser storage is unavailable.
    }
    setProfileKey(key);
    setProfileSeed(profile);
  }, [getClient, isAuthenticated, verified]);

  if (configStatus === "error") {
    return <AccountAccessScreen title="Pollar could not connect" message="The sign-in service did not load. Try again in a moment." action={retryConfig} actionLabel="RETRY CONNECTION" />;
  }
  if (configStatus !== "ready") {
    return <AccountAccessScreen title="Connecting your account" message="Starlog is checking the Pollar sign-in service." />;
  }
  if (!isAuthenticated) {
    return <AccountAccessScreen title="Your trips belong here" message="Sign in with your Pollar account to open your Starlog profile, travel passport and saved plans." action={openLoginModal} actionLabel="SIGN IN WITH POLLAR" />;
  }
  if (!verified || !profileSeed || !profileKey) {
    return <AccountAccessScreen title="Verifying your account" message="Your Starlog profile will open as soon as Pollar confirms your session." />;
  }

  return <AccountDashboardContent key={profileKey} profileSeed={profileSeed} profileKey={profileKey} onSignOut={logout} />;
}

function AccountDashboardContent({
  profileSeed,
  profileKey,
  onSignOut,
  demo = false,
}: {
  profileSeed: TravelerProfile;
  profileKey?: string;
  onSignOut?: () => void;
  demo?: boolean;
}) {
  const [activeSection, setActiveSection] = useState("resumen");
  const [editingProfile, setEditingProfile] = useState(false);
  const [savedNotice, setSavedNotice] = useState("");
  const [selectedPurchase, setSelectedPurchase] = useState<string | null>(null);
  const [profile, setProfile] = useState(profileSeed);
  const [savedProfile, setSavedProfile] = useState(profile);
  const firstName = profile.name.trim().split(/\s+/)[0] || "traveler";

  useEffect(() => {
    const targets = sections.map(({ id }) => document.getElementById(id)).filter((element): element is HTMLElement => element !== null);
    if (targets.length === 0) return;
    const observer = new IntersectionObserver((entries) => {
      const current = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (current) setActiveSection(current.target.id);
    }, { rootMargin: "-90px 0px -62% 0px", threshold: [0.05, 0.2, 0.4] });
    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, []);

  const saveProfile = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (profileKey) {
      try {
        window.localStorage.setItem(profileKey, JSON.stringify(profile));
      } catch {
        setSavedNotice("This browser could not save your profile details.");
        return;
      }
    }
    setEditingProfile(false);
    setSavedProfile(profile);
    setSavedNotice(profileKey ? "Your profile is saved on this device." : "Your profile was updated in this demo.");
    window.setTimeout(() => setSavedNotice(""), 3500);
  };

  return (
    <div className="account-page">
      <header className="account-header">
        <Link className="account-brand" href="/" aria-label="Starlog, go to home"><BrandMark /><span className="brand-name"><span>Star</span><b>log</b></span></Link>
        <Link className="account-back-link" href="/#viajes">EXPLORE TRIPS <span aria-hidden="true">↗</span></Link>
        <a className="account-header-user" href="#perfil" onClick={() => setActiveSection("perfil")} aria-label="Go to my profile"><AccountAvatar profile={profile} /><span>{profile.name.toUpperCase()}</span></a>
        {onSignOut && <button className="account-signout" type="button" onClick={onSignOut}>SIGN OUT</button>}
      </header>

      <main className="account-frame">
        <aside className="account-sidebar" aria-label="Account navigation">
          <div className="account-sidebar-label">YOUR SPACE <span>STL / 01</span></div>
          <nav className="account-side-nav">
            {sections.map((section) => (
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
              <p>Everything you have experienced — and what comes next — in one place.</p>
            </div>
            <div className="account-welcome-stamp" aria-label="Starlog member since 2024"><span>ST★RLOG</span><strong>24</strong><small>MEMBER<br />SINCE 2024</small></div>
          </section>

          <section className="account-trip-section" id="viajes" aria-labelledby="upcoming-title">
            <div className="account-section-heading">
              <div><span className="account-section-kicker">01 / UP NEXT</span><h2 id="upcoming-title">Your next trip<span>.</span></h2></div>
              <Link className="account-inline-link" href="/#viajes">SEE ALL TRIPS <AccountIcon name="arrow" /></Link>
            </div>

            <article className="account-feature-trip">
              <div className="account-feature-copy">
                <div className="account-trip-topline"><span className="account-status"><i /> SAMPLE PLAN</span><span>STL · 2026 · 0018</span></div>
                <div className="account-trip-city"><span>NEXT STOP</span><h3>Madrid</h3><span className="account-country">SPAIN &nbsp; / &nbsp; MAD</span></div>
                <div className="account-trip-details">
                  <div><AccountIcon name="calendar" /><span><small>DATES</small><strong>NOV 10 — 12, 2026</strong></span></div>
                  <div><AccountIcon name="ticket" /><span><small>FEATURED PLAN</small><strong>Bryan Adams · Movistar Arena</strong></span></div>
                </div>
                <div className="account-trip-actions"><a className="account-button account-button-copper" href="https://www.movistararena.es/programacion/evento/bryan-adams-roll-with-the-punches/10-11-2026/20%3A30/informacion" target="_blank" rel="noreferrer">VIEW EVENT <AccountIcon name="arrow" /></a><span className="account-trip-ref">SAMPLE #ST-00842</span></div>
              </div>
              <div className="account-trip-art" aria-label="Illustration of Madrid and your travel route">
                <div className="account-art-grid" />
                <div className="account-art-orbit account-art-orbit-one" />
                <div className="account-art-orbit account-art-orbit-two" />
                <span className="account-art-coordinate">40°25′ N<br />3°42′ O</span>
                <span className="account-art-star">✳</span>
                <div className="account-art-route"><span>VALENCIA</span><i /><b /><i /><span>MADRID</span></div>
                <div className="account-art-stamp"><span>STELLAR<br />TRAVEL CLUB</span><strong>MAD</strong><small>SPAIN · 2026</small></div>
                <span className="account-art-code">STL—40.4168°</span>
              </div>
            </article>

            <div className="account-trip-footnote"><span><AccountIcon name="check" /> DEMO ITINERARY</span><span>Sample amount: 43 USDC · No booking or charge was made</span></div>
          </section>

          <section className="account-recommendations" aria-labelledby="recommendation-title">
            <div className="account-section-heading">
              <div><span className="account-section-kicker">02 / A LITTLE FURTHER</span><h2 id="recommendation-title">We think you will love these<span>.</span></h2><p>Picked for you based on your trips and saved plans.</p></div>
              <span className="account-personal-badge"><AccountIcon name="spark" /> MADE FOR YOU</span>
            </div>
            <div className="account-recommendation-grid">
              <article className="account-recommendation-card">
                <div className="recommendation-art recommendation-art-barcelona"><span>BCN / 41°23′ N</span><strong>BAR<br />CELO<br />NA</strong><i>✳</i></div>
                <div className="recommendation-content"><span className="recommendation-reason">YOU ENJOYED BARCELONA</span><h3>Park Güell<br />with a local guide</h3><p>Architecture, mosaics and city views on a relaxed guided visit.</p><div><span>FROM 17 USDC</span><a href="https://parkguell.barcelona/en/planning-your-visit/guided-tours" target="_blank" rel="noreferrer" aria-label="View the Park Güell guided tour">↗</a></div></div>
              </article>
              <article className="account-recommendation-card">
                <div className="recommendation-art recommendation-art-valencia"><span>VLC / 39°28′ N</span><strong>ALBU<br />FERA</strong><i>≈</i></div>
                <div className="recommendation-content"><span className="recommendation-reason">ANOTHER SIDE OF VALENCIA</span><h3>Albufera<br />by bus and boat</h3><p>Take in the lagoon and landscapes just beyond your home city.</p><div><span>FROM 22 USDC</span><a href="https://www.visitvalencia.com/shop/valencia-autobus-turistico/albufera-bus-turistico" target="_blank" rel="noreferrer" aria-label="View the Albufera trip">↗</a></div></div>
              </article>
              <article className="account-recommendation-card">
                <div className="recommendation-art recommendation-art-community"><span>STL / MEETUP</span><strong>BUILD<br />TOGETHER</strong><i>✳</i></div>
                <div className="recommendation-content"><span className="recommendation-reason">YOUR PEOPLE TRAVEL, TOO</span><h3>Stellar Builders<br />Barcelona</h3><p>An afternoon to share projects with the local community.</p><div><span>COMMUNITY MEETUP</span><Link href="/#mapa" aria-label="Explore meetups">↗</Link></div></div>
              </article>
            </div>
            <p className="account-demo-note"><span>i</span> Sample recommendations based on this demo account&apos;s cities and interests.</p>
          </section>

          <section className="account-purchases" id="compras" aria-labelledby="purchases-title">
            <div className="account-section-heading">
              <div><span className="account-section-kicker">03 / YOUR HISTORY</span><h2 id="purchases-title">Memories you have made<span>.</span></h2></div>
              <a className="account-inline-link" href="#compras">VIEW FULL HISTORY <AccountIcon name="arrow" /></a>
            </div>
            <div className="account-purchase-list">
              <article className="account-purchase-row"><div className="purchase-date"><strong>18</strong><span>JUN<br />2026</span></div><div className="purchase-main"><span>VALENCIA · EXPERIENCE</span><h3>Albufera · bus and boat</h3><small>Order ST-00631 · 2 guests</small></div><div className="purchase-method"><span>AMOUNT</span><strong>44 USDC</strong><small>≈ 44 EUR</small></div><span className="purchase-complete"><AccountIcon name="check" /> COMPLETE</span><button type="button" className="purchase-menu" onClick={() => setSelectedPurchase("Albufera · bus and boat|ST-00631|44 USDC|Jun 18, 2026|2 guests")} aria-label="View Albufera purchase details">↗</button></article>
              <article className="account-purchase-row"><div className="purchase-date"><strong>22</strong><span>MAR<br />2026</span></div><div className="purchase-main"><span>BARCELONA · CULTURE</span><h3>Park Güell · guided visit</h3><small>Order ST-00418 · 1 guest</small></div><div className="purchase-method"><span>AMOUNT</span><strong>17 USDC</strong><small>≈ 17 EUR</small></div><span className="purchase-complete"><AccountIcon name="check" /> COMPLETE</span><button type="button" className="purchase-menu" onClick={() => setSelectedPurchase("Park Güell · guided visit|ST-00418|17 USDC|Mar 22, 2026|1 guest")} aria-label="View Park Güell purchase details">↗</button></article>
              <article className="account-purchase-row"><div className="purchase-date"><strong>09</strong><span>FEB<br />2026</span></div><div className="purchase-main"><span>MADRID · COMMUNITY</span><h3>Stellar Community Brunch</h3><small>Order ST-00297 · 1 guest</small></div><div className="purchase-method"><span>AMOUNT</span><strong>12 EUR</strong><small>Card · ending in 4821</small></div><span className="purchase-complete"><AccountIcon name="check" /> COMPLETE</span><button type="button" className="purchase-menu" onClick={() => setSelectedPurchase("Stellar Community Brunch|ST-00297|12 EUR|Feb 09, 2026|1 guest")} aria-label="View brunch purchase details">↗</button></article>
            </div>
            <p className="account-demo-note"><span>i</span> Sample purchase history and payment methods. No charges were made and no tickets were issued.</p>
          </section>

          <section className="account-profile" id="perfil" aria-labelledby="profile-title">
            <div className="account-section-heading">
              <div><span className="account-section-kicker">04 / YOUR DETAILS</span><h2 id="profile-title">Your traveler profile<span>.</span></h2></div>
              {!editingProfile && <button type="button" className="account-inline-link account-edit-trigger" onClick={() => { setEditingProfile(true); setProfile(savedProfile); }}><AccountIcon name="edit" /> EDIT PROFILE</button>}
            </div>
            <form className="account-profile-card" onSubmit={saveProfile}>
              <div className="profile-identity"><AccountAvatar profile={profile} large /><div><span>{demo ? "MEMBER SINCE 2024" : `MEMBER SINCE ${new Date().getFullYear()}`}</span><h3>{profile.name}</h3><p>{demo ? <>Frequent traveler <i /> 3 destinations stamped</> : <>Pollar account connected <i /> Starlog profile ready</>}</p></div><span className="profile-tier">STELLAR<br /><strong>EXPLORER</strong></span></div>
              <div className="profile-passport">
                <div className="profile-passport-heading"><div><span>YOUR TRAVEL PASSPORT</span><p>Stamps for destinations you have booked</p></div><strong>03 DESTINATIONS</strong></div>
                <div className="profile-passport-stamps">
                  <article className="passport-stamp passport-stamp-venice" aria-label="Venice, Italy destination stamp"><img className="passport-stamp-photo" src="https://images.unsplash.com/photo-1701697637411-f5b878978d53?auto=format&fit=crop&w=720&q=80" alt="The Grand Canal and historic palaces in Venice" loading="lazy" decoding="async" /><span className="passport-stamp-shade" aria-hidden="true" /><span className="passport-stamp-meta">TRIP STAMP · IT</span><span className="passport-stamp-symbol">✧</span><strong>VENICE</strong><small>ITALY · 2025</small></article>
                  <article className="passport-stamp passport-stamp-egypt" aria-label="Egypt destination stamp"><img className="passport-stamp-photo" src="https://images.unsplash.com/photo-1732532929159-05fcf0ab456d?auto=format&fit=crop&w=720&q=80" alt="The Pyramids of Giza in the Egyptian desert" loading="lazy" decoding="async" /><span className="passport-stamp-shade" aria-hidden="true" /><span className="passport-stamp-meta">TRIP STAMP · EG</span><span className="passport-stamp-symbol">☼</span><strong>EGYPT</strong><small>CAIRO + GIZA · 2025</small></article>
                  <article className="passport-stamp passport-stamp-israel" aria-label="Israel destination stamp"><img className="passport-stamp-photo" src="https://images.unsplash.com/photo-1697054810280-8e83633002e5?auto=format&fit=crop&w=720&q=80" alt="The Dome of the Rock and Jerusalem's Old City" loading="lazy" decoding="async" /><span className="passport-stamp-shade" aria-hidden="true" /><span className="passport-stamp-meta">TRIP STAMP · IL</span><span className="passport-stamp-symbol">✡</span><strong>ISRAEL</strong><small>JERUSALEM · 2024</small></article>
                </div>
                <p className="profile-passport-note">Sample destination badges for this demo profile. They are not linked to live bookings.</p>
              </div>
              <div className="profile-passport-option-two">
                <div className="passport-option-heading"><div><span>OPTION 02 · POSTCARD STAMPS</span><h4>Places I&apos;ve been</h4><p>A photo-led alternative for your travel memories.</p></div><strong>03 PLACES</strong></div>
                <div className="destination-memory-rail" aria-label="Photo stamps for three sample destinations">
                  <article className="destination-memory destination-memory-venice">
                    <div className="destination-memory-stamp"><img src="https://images.unsplash.com/photo-1701697637411-f5b878978d53?auto=format&fit=crop&w=720&q=80" alt="Venice's Grand Canal" loading="lazy" decoding="async" /><span className="destination-memory-code">IT · 2025</span><span className="destination-memory-star" aria-hidden="true">✧</span></div>
                    <div className="destination-memory-caption"><strong>Venice</strong><span>Italy</span><small>2025 · DEMO</small></div>
                  </article>
                  <article className="destination-memory destination-memory-egypt">
                    <div className="destination-memory-stamp"><img src="https://images.unsplash.com/photo-1732532929159-05fcf0ab456d?auto=format&fit=crop&w=720&q=80" alt="The Pyramids of Giza" loading="lazy" decoding="async" /><span className="destination-memory-code">EG · 2025</span><span className="destination-memory-star" aria-hidden="true">✧</span></div>
                    <div className="destination-memory-caption"><strong>Cairo + Giza</strong><span>Egypt</span><small>2025 · DEMO</small></div>
                  </article>
                  <article className="destination-memory destination-memory-israel">
                    <div className="destination-memory-stamp"><img src="https://images.unsplash.com/photo-1697054810280-8e83633002e5?auto=format&fit=crop&w=720&q=80" alt="The Dome of the Rock in Jerusalem" loading="lazy" decoding="async" /><span className="destination-memory-code">IL · 2024</span><span className="destination-memory-star" aria-hidden="true">✧</span></div>
                    <div className="destination-memory-caption"><strong>Jerusalem</strong><span>Israel</span><small>2024 · DEMO</small></div>
                  </article>
                </div>
              </div>
              <div className="profile-fields">
                <label><span>FULL NAME</span><input value={profile.name} readOnly={!editingProfile} onChange={(event) => setProfile({ ...profile, name: event.target.value })} /></label>
                <label><span>EMAIL ADDRESS</span><input type="email" value={profile.email} readOnly={!editingProfile} onChange={(event) => setProfile({ ...profile, email: event.target.value })} /></label>
                <label><span>HOME CITY</span><input value={profile.city} readOnly={!editingProfile} onChange={(event) => setProfile({ ...profile, city: event.target.value })} /></label>
                <label><span>INTERESTS</span><input value={profile.interests} readOnly={!editingProfile} onChange={(event) => setProfile({ ...profile, interests: event.target.value })} /></label>
              </div>
              {editingProfile && <div className="profile-edit-actions"><span>{profileKey ? "Profile details are saved on this device." : "Changes are saved in this demo view only."}</span><button type="button" className="account-button account-button-outline" onClick={() => { setProfile(savedProfile); setEditingProfile(false); }}>CANCEL</button><button className="account-button account-button-copper" type="submit">SAVE PROFILE <AccountIcon name="check" /></button></div>}
              {savedNotice && <p className="profile-saved-notice" role="status"><AccountIcon name="check" /> {savedNotice}</p>}
            </form>
          </section>

          <footer className="account-footer"><Link className="account-footer-brand" href="/"><BrandMark /><span className="brand-name"><span>Star</span><b>log</b></span></Link><p>Travel, your way.</p><span>BUILT ON THE STELLAR NETWORK <i>✳</i></span></footer>
        </div>
      </main>
      {selectedPurchase && (() => {
        const [title, order, amount, date, guests] = selectedPurchase.split("|");
        return <div className="account-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedPurchase(null); }}><section className="account-purchase-dialog" role="dialog" aria-modal="true" aria-labelledby="purchase-dialog-title"><button type="button" className="account-dialog-close" onClick={() => setSelectedPurchase(null)} aria-label="Close purchase details">×</button><span className="account-section-kicker">PURCHASE DETAILS · DEMO</span><h2 id="purchase-dialog-title">{title}</h2><div><span>ORDER</span><strong>{order}</strong></div><div><span>DATE</span><strong>{date}</strong></div><div><span>GUESTS</span><strong>{guests}</strong></div><div><span>SAMPLE AMOUNT</span><strong>{amount}</strong></div><p>No charge was made. This purchase is sample data for the prototype.</p><button type="button" className="account-button account-button-copper" onClick={() => setSelectedPurchase(null)}>GOT IT</button></section></div>;
      })()}
    </div>
  );
}
