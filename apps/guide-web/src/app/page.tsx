"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { StarlogAssistant } from "./StarlogAssistant";
import { StarlogWalletControl } from "./StarlogWalletControl";
import { StarlogAccountShortcut } from "./StarlogAccountShortcut";
import { JourneyStarMotion } from "./JourneyStarMotion";
import { MusementActivities } from "./MusementActivities";

type Locale = "es" | "en";
type PaymentMethod = "USDC" | "EURC" | "XLM" | "CARD";
type MapKind = "all" | "meetup" | "merchant";

type Trip = {
  id: string;
  city: Record<Locale, string>;
  date: Record<Locale, string>;
  title: Record<Locale, string>;
  detail: Record<Locale, string>;
  priceUSDC: string;
  priceEUR: Record<Locale, string>;
  url: string;
  code: string;
  variant: "fog" | "linen" | "copper";
};

type MapPlace = {
  id: string;
  kind: Exclude<MapKind, "all">;
  city: string;
  title: string;
  detail: string;
  meta: string;
  x: number;
  y: number;
  url: string;
};

const COPY = {
  es: {
    nav: [["inicio", "INICIO"], ["viajes", "VIAJES"], ["mapa", "MAPA"], ["crear-meetup", "CREAR MEETUP"], ["como-funciona", "CÓMO FUNCIONA"]],
    heroTag: "VIAJES Y MEETUPS CRIPTO · RED STELLAR",
    travel: "VIAJA", pay: "PAGANDO", yourWay: "COMO QUIERAS",
    currencies: "USDC · EURC · XLM", heroFooter: "VIAJES · EVENTOS · COMUNIDAD",
    heroCopy: "Reserva viajes a eventos cripto, paga con stablecoins o con tarjeta y encuentra a tu comunidad en cada destino.",
    seeTrips: "VER VIAJES", howButton: "CÓMO FUNCIONA",
    tripsKicker: "SEIS FORMAS DE SALIR", tripsTitle: "Tu próximo destino.",
    tripsText: "Experiencias y eventos reales en Valencia, Barcelona y Madrid.",
    tripsNote: "Importes de muestra para el prototipo. Referencia visual 1 USDC ≈ 1 EUR; no es una cotización en vivo ni una reserva confirmada.",
    from: "DESDE", payUSDC: "PAGAR CON USDC", payCard: "PAGAR CON TARJETA",
    mapKicker: "ENCUENTRA A TU GENTE", mapTitle: "La ciudad también es tuya.",
    mapText: "Explora meetups y lugares reportados por la comunidad.",
    mapAll: "TODO", mapMeetups: "MEETUPS", mapMerchants: "COMERCIOS", citiesLabel: "CIUDADES",
    mapNote: "Los comercios provienen de directorios comunitarios de Bitcoin. Confirma antes de ir: el registro no garantiza aceptación actual ni pagos en USDC, EURC o XLM.",
    source: "VER FUENTE", noMapResults: "No hay lugares en este filtro.",
    createKicker: "UNA FICHA · DOS PLATAFORMAS", createTitle: "Convoca a tu comunidad.",
    createText: "Prepara el meetup una sola vez para distribuirlo en Luma y Eventbrite.",
    name: "NOMBRE DEL MEETUP", city: "CIUDAD", date: "FECHA", capacity: "AFORO", description: "DESCRIPCIÓN",
    namePlaceholder: "Ej. Stellar Builders Valencia", cityPlaceholder: "Elige una ciudad", capacityPlaceholder: "Ej. 40",
    descriptionPlaceholder: "¿Qué vamos a hacer y quién debería venir?", submitMeetup: "PUBLICAR EN LUMA Y EVENTBRITE",
    formNote: "La publicación externa se activará cuando conectemos las credenciales de Luma y Eventbrite.",
    meetupCreated: "Borrador creado una sola vez en esta vista.",
    lumaPending: "Luma · API pendiente", eventbritePending: "Eventbrite · API pendiente",
    formError: "Completa el nombre, ciudad, fecha y descripción.",
    howKicker: "CLARO DESDE EL PRIMER PASO", howTitle: "Así viaja Starlog.",
    steps: [
      ["Elige viaje", "Encuentra un evento, experiencia y comunidad en tu destino."],
      ["Paga como quieras", "Elige USDC, EURC, XLM o tarjeta en el checkout."],
      ["El dinero queda en custodia", "El contrato Soroban libera el pago según las condiciones del viaje."],
      ["Viaja y conoce a tu comunidad", "Llega con un plan, personas y lugares que descubrir."],
    ],
    escrowNote: "Flujo de producto previsto. Escrow y pagos aún requieren configurar el contrato y conectar el checkout.",
    footerLine: "Viaja pagando como quieras.", built: "CONSTRUIDO EN LA RED STELLAR",
    checkoutTitle: "PREPARA TU PAGO", checkoutSub: "Elige cómo quieres pagar este plan.",
    chooseMethod: "MÉTODO DE PAGO", amount: "IMPORTE DE REFERENCIA", checkoutButton: "CONTINUAR",
    checkoutNotice: "Demo de checkout: no se ha realizado ningún cargo. Faltan la dirección/llamada del escrow Soroban y la pasarela de tarjeta.",
    close: "CERRAR", openMenu: "Abrir menú", closeMenu: "Cerrar menú", guide: "Planifica tu próxima aventura con Starlog",
    selected: "LUGAR SELECCIONADO", locationList: "LUGARES EN EL MAPA", cryptoDirectory: "DIRECTORIO COMUNITARIO",
    eventInfo: "AGENDA OFICIAL",
  },
  en: {
    nav: [["inicio", "HOME"], ["viajes", "TRIPS"], ["mapa", "MAP"], ["crear-meetup", "CREATE MEETUP"], ["como-funciona", "HOW IT WORKS"]],
    wallet: "CONNECT WALLET",
    heroTag: "CRYPTO TRAVEL & MEETUPS · STELLAR NETWORK",
    travel: "TRAVEL", pay: "AND PAY", yourWay: "YOUR WAY",
    currencies: "USDC · EURC · XLM", heroFooter: "TRIPS · EVENTS · COMMUNITY",
    heroCopy: "Book trips to crypto events, pay with stablecoins or a card, and meet your community at every destination.",
    seeTrips: "EXPLORE TRIPS", howButton: "HOW IT WORKS",
    tripsKicker: "SIX WAYS TO GO", tripsTitle: "Your next destination.",
    tripsText: "Real experiences and events in Valencia, Barcelona and Madrid.",
    tripsNote: "Sample amounts for this prototype. Visual reference 1 USDC ≈ 1 EUR; not a live quote or confirmed booking.",
    from: "FROM", payUSDC: "PAY WITH USDC", payCard: "PAY BY CARD",
    mapKicker: "FIND YOUR PEOPLE", mapTitle: "The city is yours, too.",
    mapText: "Explore meetups and places reported by the community.",
    mapAll: "ALL", mapMeetups: "MEETUPS", mapMerchants: "MERCHANTS", citiesLabel: "CITIES",
    mapNote: "Merchants come from community Bitcoin directories. Confirm before visiting: listings do not guarantee current acceptance or USDC, EURC or XLM payments.",
    source: "VIEW SOURCE", noMapResults: "No places in this filter.",
    createKicker: "ONE LISTING · TWO PLATFORMS", createTitle: "Bring your community together.",
    createText: "Prepare the meetup once to distribute it on Luma and Eventbrite.",
    name: "MEETUP NAME", city: "CITY", date: "DATE", capacity: "CAPACITY", description: "DESCRIPTION",
    namePlaceholder: "e.g. Stellar Builders Valencia", cityPlaceholder: "Choose a city", capacityPlaceholder: "e.g. 40",
    descriptionPlaceholder: "What are we doing, and who should come?", submitMeetup: "PUBLISH ON LUMA AND EVENTBRITE",
    formNote: "External publishing will turn on after Luma and Eventbrite credentials are connected.",
    meetupCreated: "Draft created once in this view.",
    lumaPending: "Luma · API pending", eventbritePending: "Eventbrite · API pending",
    formError: "Fill in the name, city, date and description.",
    howKicker: "CLEAR FROM THE FIRST STEP", howTitle: "How Starlog works.",
    steps: [
      ["Choose a trip", "Find an event, experience and community at your destination."],
      ["Pay your way", "Choose USDC, EURC, XLM or card at checkout."],
      ["Funds stay in escrow", "The Soroban contract releases payment under the trip terms."],
      ["Travel and meet your people", "Arrive with a plan, people and places to discover."],
    ],
    escrowNote: "Planned product flow. Escrow and payments still need a configured contract and connected checkout.",
    footerLine: "Travel and meet, pay your way.", built: "BUILT ON THE STELLAR NETWORK",
    checkoutTitle: "SET UP YOUR PAYMENT", checkoutSub: "Choose how you want to pay for this plan.",
    chooseMethod: "PAYMENT METHOD", amount: "REFERENCE AMOUNT", checkoutButton: "CONTINUE",
    checkoutNotice: "Checkout demo: no charge was made. The Soroban escrow address/call and card gateway are not connected yet.",
    close: "CLOSE", openMenu: "Open menu", closeMenu: "Close menu", guide: "Plan your next adventure with Starlog",
    selected: "SELECTED PLACE", locationList: "PLACES ON THE MAP", cryptoDirectory: "COMMUNITY DIRECTORY",
    eventInfo: "OFFICIAL AGENDA",
  },
} as const;

const TRIPS: Trip[] = [
  { id: "sons", city: { es: "VALÈNCIA", en: "VALENCIA" }, date: { es: "15 NOV 2026 · 18:00", en: "NOV 15, 2026 · 18:00" }, title: { es: "Sons del Cabanyal", en: "Sons del Cabanyal" }, detail: { es: "Concierto escenificado en Teatre El Musical.", en: "Staged concert at Teatre El Musical." }, priceUSDC: "10", priceEUR: { es: "≈ 10 €", en: "≈ €10" }, url: "https://www.valencia.es/w/sons-del-cabanyal.-concierto-escenificado-s.m.-poblados-mar%C3%ADtimos?redirect=%2Fcas%2Fpagina-de-categoria", code: "VLC", variant: "copper" },
  { id: "albufera", city: { es: "VALÈNCIA", en: "VALENCIA" }, date: { es: "FECHA FLEXIBLE", en: "FLEXIBLE DATE" }, title: { es: "Albufera · bus y barca", en: "Albufera · bus & boat" }, detail: { es: "Ruta de dos horas con paseo tradicional por la laguna.", en: "Two-hour trip with a traditional boat ride on the lagoon." }, priceUSDC: "22", priceEUR: { es: "≈ 22 €", en: "≈ €22" }, url: "https://www.visitvalencia.com/shop/valencia-autobus-turistico/albufera-bus-turistico", code: "ALB", variant: "fog" },
  { id: "park-guell", city: { es: "BARCELONA", en: "BARCELONA" }, date: { es: "CONSULTAR HORARIOS", en: "CHECK AVAILABILITY" }, title: { es: "Park Güell · visita guiada", en: "Park Güell · guided visit" }, detail: { es: "Visita guiada de unos 50 minutos; entrada al parque aparte.", en: "About 50 minutes; park admission is separate." }, priceUSDC: "17+", priceEUR: { es: "≈ 17 € + entrada", en: "≈ €17 + admission" }, url: "https://parkguell.barcelona/en/planning-your-visit/guided-tours", code: "BCN", variant: "linen" },
  { id: "oreja", city: { es: "BARCELONA", en: "BARCELONA" }, date: { es: "26–27 NOV 2026 · 20:30", en: "NOV 26–27, 2026 · 20:30" }, title: { es: "La Oreja de Van Gogh", en: "La Oreja de Van Gogh" }, detail: { es: "Tantas cosas que contar Tour 2026 · Palau Sant Jordi.", en: "Tantas cosas que contar Tour 2026 · Palau Sant Jordi." }, priceUSDC: "38*", priceEUR: { es: "≈ 38 €*", en: "≈ €38*" }, url: "https://agenda500.barcelona.cat/es/detall/concert-la-oreja-de-van-gogh_99400765693.html", code: "BCN", variant: "copper" },
  { id: "bryan", city: { es: "MADRID", en: "MADRID" }, date: { es: "10 NOV 2026 · 20:30", en: "NOV 10, 2026 · 20:30" }, title: { es: "Bryan Adams", en: "Bryan Adams" }, detail: { es: "Roll with the Punches · Movistar Arena.", en: "Roll with the Punches · Movistar Arena." }, priceUSDC: "43*", priceEUR: { es: "≈ 43 €*", en: "≈ €43*" }, url: "https://www.movistararena.es/programacion/evento/bryan-adams-roll-with-the-punches/10-11-2026/20%3A30/informacion", code: "MAD", variant: "fog" },
  { id: "palacio", city: { es: "MADRID", en: "MADRID" }, date: { es: "CONSULTAR HORARIOS", en: "CHECK OPENING TIMES" }, title: { es: "Palacio Real de Madrid", en: "Royal Palace of Madrid" }, detail: { es: "Visita autoguiada de las salas, unos 45 minutos.", en: "Self-guided visit of the rooms, about 45 minutes." }, priceUSDC: "18*", priceEUR: { es: "≈ 18 €*", en: "≈ €18*" }, url: "https://tickets.patrimonionacional.es/es/tickets/palacio-real-de-madrid", code: "MAD", variant: "linen" },
];

const BASE_PLACES: MapPlace[] = [
  { id: "meetup-valencia", kind: "meetup", city: "Valencia", title: "Sons del Cabanyal", detail: "Teatre El Musical · 90 min · €10", meta: "NOV 15 · 18:00", x: 67, y: 69, url: "https://www.valencia.es/w/sons-del-cabanyal.-concierto-escenificado-s.m.-poblados-mar%C3%ADtimos?redirect=%2Fcas%2Fpagina-de-categoria" },
  { id: "meetup-barcelona", kind: "meetup", city: "Barcelona", title: "La Oreja de Van Gogh", detail: "Palau Sant Jordi · Nov 26–27", meta: "NOV 26–27 · 20:30", x: 77, y: 34, url: "https://agenda500.barcelona.cat/es/detall/concert-la-oreja-de-van-gogh_99400765693.html" },
  { id: "meetup-madrid", kind: "meetup", city: "Madrid", title: "Bryan Adams · Roll with the Punches", detail: "Movistar Arena", meta: "10 NOV · 20:30", x: 48, y: 50, url: "https://www.movistararena.es/programacion/evento/bryan-adams-roll-with-the-punches/10-11-2026/20%3A30/informacion" },
  { id: "merchant-valencia", kind: "merchant", city: "Valencia", title: "Mobile Accessories&More", detail: "Avinguda de Campanar, 15 · BTC", meta: "BTC DIRECTORY", x: 62, y: 64, url: "https://coinmap.site/places/es" },
  { id: "merchant-barcelona", kind: "merchant", city: "Barcelona", title: "Cahoot Coworking Barcelona", detail: "Carrer de Floridablanca, 94 · BTC", meta: "BTC DIRECTORY", x: 72, y: 29, url: "https://coinmap.site/places/es" },
  { id: "merchant-madrid", kind: "merchant", city: "Madrid", title: "Maestros Pintores", detail: "Calle de las Canarias, 27 · BTC", meta: "BTC DIRECTORY", x: 43, y: 46, url: "https://coinmap.site/places/es" },
];

function BrandMark() {
  return <span className="brand-mark" aria-hidden="true"><svg viewBox="0 0 52 54" fill="none"><path d="m26 3 5.5 14.2 15.2.9-11.7 9.7 3.8 14.9L26 34.5l-12.8 8.2L17 27.8 5.3 18.1l15.2-.9L26 3Z" fill="currentColor" /><path d="M5 49h18M31 49h13" stroke="currentColor" strokeWidth="4" strokeLinecap="square" /></svg></span>;
}

function StarSeal() {
  return <span className="star-seal" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none"><path d="m24 3 5.2 13.7 14.5 1-11.2 9.4 3.6 14.1L24 33.8l-12.1 7.4 3.5-14.1-11.1-9.4 14.5-1L24 3Z" fill="currentColor" /><path d="M8 45h16M28 45h12" stroke="currentColor" strokeWidth="3" strokeLinecap="square" /></svg></span>;
}

export default function Home() {
  const [locale, setLocale] = useState<Locale>("es");
  const [activeSection, setActiveSection] = useState("inicio");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mapKind, setMapKind] = useState<MapKind>("all");
  const [selectedPlaceId, setSelectedPlaceId] = useState("meetup-valencia");
  const [checkoutTrip, setCheckoutTrip] = useState<Trip | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("USDC");
  const [paymentNotice, setPaymentNotice] = useState(false);
  const [meetupForm, setMeetupForm] = useState({ title: "", city: "", date: "", capacity: "", description: "" });
  const [newMeetup, setNewMeetup] = useState<MapPlace | null>(null);
  const [meetupStatus, setMeetupStatus] = useState("");
  const [assistantOpen, setAssistantOpen] = useState(false);
  const c = COPY[locale];
  const places = newMeetup ? [...BASE_PLACES, newMeetup] : BASE_PLACES;
  const visiblePlaces = places.filter((place) => mapKind === "all" || place.kind === mapKind);
  const selectedPlace = visiblePlaces.find((place) => place.id === selectedPlaceId) ?? visiblePlaces[0] ?? null;

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    const assistant = new URLSearchParams(window.location.search).get("assistant");
    if (assistant === "chat" || assistant === "flights") setAssistantOpen(true);
  }, []);

  useEffect(() => {
    const sections = c.nav.map(([id]) => document.getElementById(id));
    const available = sections.filter((section): section is HTMLElement => section !== null);
    if (available.length === 0) return;
    const observer = new IntersectionObserver((entries) => {
      const current = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (current) setActiveSection(current.target.id);
    }, { rootMargin: "-88px 0px -58% 0px", threshold: [0.1, 0.25, 0.5] });
    available.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [locale, c.nav]);

  useEffect(() => {
    if (!checkoutTrip && !mobileMenuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setCheckoutTrip(null);
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [checkoutTrip, mobileMenuOpen]);

  const openCheckout = (trip: Trip, method: PaymentMethod) => {
    setCheckoutTrip(trip);
    setPaymentMethod(method);
    setPaymentNotice(false);
  };

  const handleMeetupSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cities: Record<string, { x: number; y: number }> = { valencia: { x: 67, y: 69 }, barcelona: { x: 77, y: 34 }, madrid: { x: 48, y: 50 } };
    const point = cities[meetupForm.city];
    if (!meetupForm.title.trim() || !point || !meetupForm.date || !meetupForm.description.trim()) {
      setMeetupStatus(c.formError);
      return;
    }
    const cityName = meetupForm.city === "valencia" ? "Valencia" : meetupForm.city === "barcelona" ? "Barcelona" : "Madrid";
    const dateLabel = new Date(meetupForm.date + "T12:00:00").toLocaleDateString(locale === "es" ? "es-ES" : "en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase();
    const created: MapPlace = {
      id: "created-" + Date.now(), kind: "meetup", city: cityName, title: meetupForm.title.trim(),
      detail: meetupForm.description.trim() + (meetupForm.capacity ? " · " + meetupForm.capacity + " " + c.capacity.toLowerCase() : ""),
      meta: dateLabel, x: point.x, y: point.y, url: "#crear-meetup",
    };
    setNewMeetup(created);
    setSelectedPlaceId(created.id);
    setMapKind("all");
    setMeetupStatus("created");
    setMeetupForm({ title: "", city: "", date: "", capacity: "", description: "" });
  };

  const goToSection = (id: string) => {
    setActiveSection(id);
    setMobileMenuOpen(false);
  };

  return (
    <>
    <div className="starlog-site">
      <JourneyStarMotion locale={locale} />
      <header className="site-header">
        <div className="header-inner">
          <a className="brand" href="#inicio" onClick={() => goToSection("inicio")} aria-label="Starlog home">
            <BrandMark /><span className="brand-name"><span>Star</span><b>log</b></span>
          </a>
          <nav className="desktop-nav" aria-label={locale === "es" ? "Navegación principal" : "Main navigation"}>
            {c.nav.map(([id, label]) => <a key={id} href={"#" + id} className={activeSection === id ? "active" : ""} onClick={() => goToSection(id)}>{label}</a>)}
          </nav>
          <div className="header-actions">
            <div className="language-switch" role="group" aria-label={locale === "es" ? "Seleccionar idioma" : "Select language"}>
              <button type="button" className={locale === "es" ? "selected" : ""} aria-pressed={locale === "es"} onClick={() => setLocale("es")}>ES</button>
              <span aria-hidden="true">/</span>
              <button type="button" className={locale === "en" ? "selected" : ""} aria-pressed={locale === "en"} onClick={() => setLocale("en")}>EN</button>
            </div>
            <StarlogWalletControl locale={locale} />
            <StarlogAccountShortcut locale={locale} />
            <button type="button" className={"menu-toggle " + (mobileMenuOpen ? "opened" : "")} aria-label={mobileMenuOpen ? c.closeMenu : c.openMenu} aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen((open) => !open)}><span /><span /><span /></button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="mobile-menu" role="dialog" aria-modal="true" aria-label={locale === "es" ? "Menú principal" : "Main menu"}>
            <div className="mobile-menu-head"><span>{locale === "es" ? "NAVEGACIÓN" : "NAVIGATION"}</span><span>01 — 05</span></div>
            <nav aria-label={locale === "es" ? "Navegación móvil" : "Mobile navigation"}>
              {c.nav.map(([id, label], index) => <a key={id} href={"#" + id} onClick={() => goToSection(id)}><small>0{index + 1}</small><strong>{label}</strong><span aria-hidden="true">↗</span></a>)}
            </nav>
            <div className="mobile-menu-bottom"><StarSeal /><span>{c.footerLine}</span></div>
          </div>
        )}
      </header>

      <main>
        <section className="hero-section page-wrap" id="inicio">
          <div className="hero-card">
            <div className="hero-copy">
              <div className="hero-label"><span className="hero-seal-box"><StarSeal /></span><span>{c.heroTag}</span></div>
              <h1 className="hero-title"><span>{c.travel}</span><em>{c.pay}</em><span>{c.yourWay}</span></h1>
              <div className="currency-line">{c.currencies}</div>
              <p className="hero-description">{c.heroCopy}</p>
              <div className="hero-buttons">
                <a className="hard-button button-copper" href="#viajes" onClick={() => goToSection("viajes")}>{c.seeTrips}<span aria-hidden="true"> →</span></a>
                <a className="hard-button button-dark" href="#como-funciona" onClick={() => goToSection("como-funciona")}>{c.howButton}</a>
                <button className="hero-assistant-button" type="button" onClick={() => setAssistantOpen(true)}><StarSeal /><span>{c.guide}</span></button>
              </div>
            </div>
            <div className="hero-baseline"><span>STARLOG / MERIDIAN</span><span>{c.heroFooter}</span></div>
          </div>
        </section>

        <section className="trips-section page-wrap" id="viajes">
          <div className="section-heading">
            <div><span className="section-kicker">{c.tripsKicker}</span><h2>{c.tripsTitle}</h2><p>{c.tripsText}</p></div>
            <span className="section-index">06 <i /> {locale === "es" ? "PLANES" : "PLANS"}</span>
          </div>
          <p className="demo-price-note"><span>!</span>{c.tripsNote}</p>
          <div className="trip-grid">
            {TRIPS.map((trip, index) => (
              <article className={"trip-card trip-" + trip.variant} key={trip.id}>
                <div className="trip-topline"><span>{trip.city[locale]}</span><span>STL / {trip.code}</span></div>
                <div className="trip-graphic" aria-hidden="true"><span className="trip-number">0{index + 1}</span><span className="trip-city-glyph">{trip.code.slice(0, 1)}</span><span className="trip-orbit" /><span className="trip-star"><StarSeal /></span></div>
                <div className="trip-content">
                  <div className="trip-date">{trip.date[locale]}</div>
                  <h3>{trip.title[locale]}</h3><p>{trip.detail[locale]}</p>
                  <a className="trip-source" href={trip.url} target="_blank" rel="noreferrer">{locale === "es" ? "CONSULTAR FUENTE OFICIAL" : "CHECK OFFICIAL SOURCE"} ↗</a>
              <div className="trip-price"><span>{c.from}</span><strong>{trip.priceUSDC}<small> USDC</small></strong><b>{trip.priceEUR[locale]}</b></div>
                  <div className="trip-actions">
                    <button className="hard-button button-copper" type="button" onClick={() => openCheckout(trip, "USDC")}>{c.payUSDC}</button>
                    <button className="hard-button button-dark" type="button" onClick={() => openCheckout(trip, "CARD")}>{c.payCard}</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <MusementActivities locale={locale} />
        </section>

        <section className="map-section page-wrap" id="mapa">
          <div className="section-heading section-heading-dark">
            <div><span className="section-kicker">{c.mapKicker}</span><h2>{c.mapTitle}</h2><p>{c.mapText}</p></div>
            <span className="section-index">MAD · BCN · VLC</span>
          </div>
          <div className="map-frame">
          <div className="map-toolbar"><span><i /> {locale === "es" ? "MAPA DE ESPAÑA" : "MAP OF SPAIN"}</span><span>{visiblePlaces.length.toString().padStart(2, "0")} {locale === "es" ? "LUGARES" : "PLACES"} · 03 {c.citiesLabel}</span></div>
            <div className="map-layout">
              <div className="map-canvas" role="group" aria-label={locale === "es" ? "Mapa esquemático interactivo de España" : "Interactive schematic map of Spain"}>
                <svg className="spain-drawing" viewBox="0 0 820 550" aria-hidden="true">
                  <path className="map-contour" d="M146 111 204 75 274 85 325 62 405 77 467 62 531 96 587 119 637 164 659 223 638 274 655 315 618 361 584 400 533 423 470 420 425 448 365 424 324 440 277 412 231 409 191 369 153 346 132 302 105 268 119 218 106 173Z" />
                  <path className="map-route" d="M394 277 538 347M394 277 592 208" /><path className="map-route map-route-light" d="M538 347 592 208" />
                  <circle className="map-city-dot" cx="394" cy="277" r="5" /><circle className="map-city-dot" cx="538" cy="347" r="5" /><circle className="map-city-dot" cx="592" cy="208" r="5" />
                  <text className="map-city-name" x="347" y="263">MADRID</text><text className="map-city-name" x="501" y="371">VALENCIA</text><text className="map-city-name" x="592" y="188">BARCELONA</text>
                  <text className="map-label" x="319" y="495">PENÍNSULA IBÉRICA / STELLAR COMMUNITY</text>
                </svg>
                <div className="map-crosshair map-crosshair-a" /><div className="map-crosshair map-crosshair-b" />
                {visiblePlaces.map((place, index) => (
                  <button type="button" key={place.id} className={"map-pin " + (place.kind === "merchant" ? "pin-merchant" : "pin-meetup") + (selectedPlace?.id === place.id ? " pin-selected" : "")}
                    style={{ left: place.x + "%", top: place.y + "%" }} aria-label={place.title + " · " + place.city} aria-pressed={selectedPlace?.id === place.id} onClick={() => setSelectedPlaceId(place.id)}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                  </button>
                ))}
                <div className="map-legend"><span><i className="legend-dot legend-meetup" />{c.mapMeetups}</span><span><i className="legend-dot legend-merchant" />{c.mapMerchants}</span></div>
                <span className="map-north">N ↑</span>
              </div>
              <aside className="map-sidebar">
                <div className="map-filter-label">{locale === "es" ? "FILTRAR POR TIPO" : "FILTER BY TYPE"}</div>
                <div className="map-filters" role="group" aria-label={locale === "es" ? "Filtrar lugares" : "Filter places"}>
                  {([["all", c.mapAll], ["meetup", c.mapMeetups], ["merchant", c.mapMerchants]] as [MapKind, string][]).map(([kind, label]) => (
                    <button type="button" key={kind} className={mapKind === kind ? "active" : ""} aria-pressed={mapKind === kind} onClick={() => setMapKind(kind)}>{label}</button>
                  ))}
                </div>
                <div className="map-list-title">{c.locationList}<span>{visiblePlaces.length.toString().padStart(2, "0")}</span></div>
                <div className="map-place-list">
                  {visiblePlaces.map((place) => (
                    <button type="button" key={place.id} className={"map-place-row " + (selectedPlace?.id === place.id ? "selected" : "")} onClick={() => setSelectedPlaceId(place.id)}>
                      <span className={"place-marker " + (place.kind === "merchant" ? "merchant" : "meetup")}>{place.kind === "merchant" ? "₿" : "✳"}</span>
                      <span className="place-copy"><small>{place.city} · {place.meta}</small><strong>{place.title}</strong><em>{place.detail}</em></span><span className="place-arrow">↗</span>
                    </button>
                  ))}
                  {visiblePlaces.length === 0 && <p className="map-empty">{c.noMapResults}</p>}
                </div>
                {selectedPlace && (
                  <div className="map-selection">
                    <span>{selectedPlace.kind === "merchant" ? c.cryptoDirectory : c.eventInfo}</span>
                    <strong>{selectedPlace.title}</strong><small>{selectedPlace.city} · {selectedPlace.detail}</small>
                    <a href={selectedPlace.url} target={selectedPlace.url.startsWith("http") ? "_blank" : undefined} rel="noreferrer">{c.source} ↗</a>
                  </div>
                )}
              </aside>
            </div>
          </div>
          <p className="map-disclaimer">{c.mapNote} <a href="https://coinmap.site/places/es" target="_blank" rel="noreferrer">Coinmap community directory ↗</a></p>
        </section>

        <section className="meetup-section page-wrap" id="crear-meetup">
          <div className="meetup-side">
            <span className="section-kicker">{c.createKicker}</span><h2>{c.createTitle}</h2><p>{c.createText}</p>
            <div className="provider-stamps"><span><StarSeal /> LUMA</span><b>+</b><span className="eventbrite-stamp">EVENTBRITE</span></div>
            <div className="single-entry"><strong>01 → 02</strong><span>{locale === "es" ? "Una sola ficha. Dos canales." : "One listing. Two channels."}</span></div>
          </div>
          <div className="meetup-form-card">
            <form onSubmit={handleMeetupSubmit}>
              <div className="form-heading"><span>{locale === "es" ? "NUEVO MEETUP" : "NEW MEETUP"}</span><span>STARLOG / 01</span></div>
              <label>{c.name}<input required maxLength={100} value={meetupForm.title} placeholder={c.namePlaceholder} onChange={(event) => setMeetupForm({ ...meetupForm, title: event.target.value })} /></label>
              <div className="form-row">
                <label>{c.city}<select required value={meetupForm.city} onChange={(event) => setMeetupForm({ ...meetupForm, city: event.target.value })}><option value="">{c.cityPlaceholder}</option><option value="valencia">Valencia</option><option value="barcelona">Barcelona</option><option value="madrid">Madrid</option></select></label>
                <label>{c.date}<input required type="date" value={meetupForm.date} onChange={(event) => setMeetupForm({ ...meetupForm, date: event.target.value })} /></label>
              </div>
              <label>{c.capacity}<input type="number" min="1" max="5000" value={meetupForm.capacity} placeholder={c.capacityPlaceholder} onChange={(event) => setMeetupForm({ ...meetupForm, capacity: event.target.value })} /></label>
              <label>{c.description}<textarea required maxLength={1200} rows={3} value={meetupForm.description} placeholder={c.descriptionPlaceholder} onChange={(event) => setMeetupForm({ ...meetupForm, description: event.target.value })} /></label>
              {meetupStatus && meetupStatus !== "created" && <p className="form-status form-status-error" role="alert">{meetupStatus}</p>}
              {meetupStatus === "created" && <div className="publish-state" role="status"><strong>{c.meetupCreated}</strong><span>STARLOG ✓</span><span>{c.lumaPending}</span><span>{c.eventbritePending}</span></div>}
              <button className="hard-button button-copper form-submit" type="submit">{c.submitMeetup}<span aria-hidden="true"> ↗</span></button>
              <small className="form-note">{c.formNote}</small>
            </form>
          </div>
        </section>

        <section className="how-section page-wrap" id="como-funciona">
          <div className="section-heading section-heading-dark">
            <div><span className="section-kicker">{c.howKicker}</span><h2>{c.howTitle}</h2></div>
          </div>
          <div className="steps-grid">
            {c.steps.map(([title, detail], index) => <article className="step-card" key={title}><span className="step-number">0{index + 1}</span><span className="step-mark"><StarSeal /></span><h3>{title}</h3><p>{detail}</p></article>)}
          </div>
          <p className="escrow-note"><span>!</span>{c.escrowNote}</p>
        </section>
      </main>

      <footer className="site-footer" id="site-footer">
        <div className="footer-main">
          <a className="brand footer-brand" href="#inicio" onClick={() => goToSection("inicio")}><BrandMark /><span className="brand-name"><span>Star</span><b>log</b></span></a>
          <p>{c.footerLine}</p><span className="footer-build">{c.built} <i>✳</i></span>
        </div>
        <div className="footer-bottom"><span>STARLOG © 2026</span><a href="#como-funciona">{c.howButton}</a><span>USDC · EURC · XLM · CARD</span></div>
      </footer>

      {assistantOpen && <StarlogAssistant onClose={() => setAssistantOpen(false)} />}

      {checkoutTrip && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCheckoutTrip(null); }}>
          <section className="checkout-modal" role="dialog" aria-modal="true" aria-labelledby="checkout-title">
            <button className="modal-close" type="button" aria-label={c.close} onClick={() => setCheckoutTrip(null)}>×</button>
            <div className="modal-kicker">{checkoutTrip.city[locale]} · {checkoutTrip.date[locale]}</div>
            <h2 id="checkout-title">{c.checkoutTitle}</h2><p className="checkout-plan">{checkoutTrip.title[locale]}</p>
          <div className="checkout-amount"><span>{c.amount}</span><strong>{checkoutTrip.priceUSDC} USDC</strong><b>{checkoutTrip.priceEUR[locale]}</b></div>
            <span className="method-label">{c.chooseMethod}</span>
            <div className="payment-methods" role="group" aria-label={c.chooseMethod}>
              {(["USDC", "EURC", "XLM", "CARD"] as PaymentMethod[]).map((method) => <button type="button" key={method} aria-pressed={paymentMethod === method} className={paymentMethod === method ? "selected" : ""} onClick={() => { setPaymentMethod(method); setPaymentNotice(false); }}>{method === "CARD" ? (locale === "es" ? "TARJETA" : "CARD") : method}</button>)}
            </div>
            <div className="checkout-security"><StarSeal /><span>Pollar wallet · Stellar testnet</span></div>
            {paymentNotice && <p className="checkout-notice" role="status">{c.checkoutNotice}</p>}
            <button className="hard-button button-copper checkout-submit" type="button" onClick={() => setPaymentNotice(true)}>{c.checkoutButton} ↗</button>
            <button className="modal-cancel" type="button" onClick={() => setCheckoutTrip(null)}>{c.close}</button>
          </section>
        </div>
      )}
    </div>
    </>
  );
}
