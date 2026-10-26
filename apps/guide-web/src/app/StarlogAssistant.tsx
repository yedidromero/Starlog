"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ControlBar,
  RoomAudioRenderer,
  SessionProvider,
  useAgent,
  useLocalParticipant,
  useSession,
  useSessionContext,
  useSessionMessages,
} from "@livekit/components-react";
import { TokenSource } from "livekit-client";
import "@livekit/components-styles";

const tokenSource = TokenSource.endpoint("/api/livekit/token");

type AssistantView = "explore" | "chat";
type TravelType = "flight" | "stay";

type DuffelFlightSlice = {
  origin: { code: string; name: string };
  destination: { code: string; name: string };
  departTime: string;
  arriveTime: string;
  duration: string;
  stops: number;
  carriers: string[];
  flightNumbers: string[];
};

type DuffelFlightOffer = {
  id: string;
  amount: string;
  currency: string;
  owner: string;
  expiresAt: string;
  slices: DuffelFlightSlice[];
};

export function StarlogAssistant({ onClose }: { onClose: () => void }) {
  const session = useSession(tokenSource, { agentName: "starlog-guide" });

  return (
    <SessionProvider session={session}>
      <AssistantPanel onClose={onClose} />
      <RoomAudioRenderer />
    </SessionProvider>
  );
}

function AssistantPanel({ onClose }: { onClose: () => void }) {
  const session = useSessionContext();
  const sessionEndRef = useRef(session.end);
  sessionEndRef.current = session.end;
  const { state } = useAgent(session);
  const { localParticipant } = useLocalParticipant();
  const { messages, send, isSending } = useSessionMessages(session);
  const [input, setInput] = useState("");
  const [started, setStarted] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");
  const [view, setView] = useState<AssistantView>(() =>
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("assistant") === "flights" ? "explore" : "chat",
  );
  const [travelType, setTravelType] = useState<TravelType>("flight");
  const [origin, setOrigin] = useState("Madrid");
  const [destination, setDestination] = useState("Barcelona");
  const [departureDate, setDepartureDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState("1");
  const [selectedOption, setSelectedOption] = useState("");
  const [quoteReady, setQuoteReady] = useState(false);
  const [offers, setOffers] = useState<DuffelFlightOffer[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [searchNotice, setSearchNotice] = useState("");

  useEffect(() => () => { void sessionEndRef.current(); }, []);

  const startSession = async () => {
    if (started) return true;
    setConnecting(true);
    setError("");
    try {
      // Text chat connects to the agent without requesting microphone access.
      await session.start({ tracks: { microphone: { enabled: false } } });
      setStarted(true);
      return true;
    } catch {
      setError("No se pudo conectar. Revisa las credenciales de LiveKit y que el agente Starlog esté activo.");
      return false;
    } finally {
      setConnecting(false);
    }
  };

  const endSession = async () => {
    await session.end();
    setStarted(false);
    setVoiceEnabled(false);
  };

  const enableVoice = async () => {
    setError("");
    if (!started && !(await startSession())) return;
    setConnecting(true);
    try {
      await localParticipant.setMicrophoneEnabled(true);
      setVoiceEnabled(true);
    } catch {
      setError("No se pudo activar el micrófono. Puedes seguir usando el chat por texto.");
    } finally {
      setConnecting(false);
    }
  };

  const submitMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = input.trim();
    if (!message || isSending || connecting) return;
    if (!started && !(await startSession())) {
      return;
    }
    setError("");
    try {
      await send(message);
      setInput("");
      setQuoteReady(false);
    } catch {
      setError("No se pudo enviar el mensaje. Inténtalo de nuevo; el texto sigue en el campo.");
    }
  };

  const submitTravelSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSelectedOption("");
    setSearchError("");
    setSearchNotice("");
    setOffers([]);

    if (travelType === "stay") {
      setSearchNotice("Duffel Stays requiere habilitación separada en esta cuenta. No se han consultado ni inventado opciones de hotel.");
      return;
    }

    setSearching(true);
    try {
      const response = await fetch("/api/duffel/flights/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ origin, destination, departureDate, returnDate, adults: Number(guests) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo buscar en Duffel.");
      const foundOffers = Array.isArray(result.offers) ? result.offers as DuffelFlightOffer[] : [];
      setOffers(foundOffers);
      setSearchNotice(foundOffers.length ? `${foundOffers.length} ofertas recibidas de Duffel en modo test.` : "Duffel no devolvió ofertas para esta búsqueda. Prueba con otra ruta o fecha.");
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : "No se pudo conectar con Duffel.");
    } finally {
      setSearching(false);
    }
  };

  const changeTravelType = (nextType: TravelType) => {
    setTravelType(nextType);
    setSelectedOption("");
    setOffers([]);
    setSearchError("");
    setSearchNotice("");
  };

  const selectedOffer = offers.find((offer) => offer.id === selectedOption);

  const reviewSelectedOffer = () => {
    if (!selectedOffer) return;
    setInput(`He elegido el vuelo ${origin} a ${destination} del ${departureDate}, oferta ${selectedOffer.id} por ${selectedOffer.amount} ${selectedOffer.currency}. Cotiza el total en XLM de testnet y explícame los siguientes pasos antes de reservar.`);
    setQuoteReady(true);
    setView("chat");
  };

  return (
    <section className="assistant-panel assistant-panel-livekit assistant-panel-planner" aria-label="Planificador de viajes Starlog">
      <div className="assistant-head">
        <span className="assistant-avatar" aria-hidden="true">✦</span>
        <span><strong>Tu próximo viaje</strong><small>{started ? `${voiceEnabled ? "Voz activa" : "Chat conectado"} · ${state}` : "Vuelos y hoteles · asistente Starlog"}</small></span>
        <button onClick={onClose} aria-label="Cerrar planificador">×</button>
      </div>

      <div className="assistant-view-tabs" role="tablist" aria-label="Elige cómo planear">
        <button type="button" role="tab" aria-selected={view === "explore"} className={view === "explore" ? "active" : ""} onClick={() => setView("explore")}>Explorar opciones</button>
        <button type="button" role="tab" aria-selected={view === "chat"} className={view === "chat" ? "active" : ""} onClick={() => setView("chat")}>Hablar con Starlog</button>
      </div>

      {view === "explore" ? (
        <div className="assistant-explorer-scroll">
          <div className="assistant-explorer-intro">
            <span className="assistant-mini-kicker">BUSCA · COMPARA · ELIGE</span>
            <h2>¿A dónde quieres ir?</h2>
            <p>Indica tu ruta o destino. Revisa las opciones antes de avanzar.</p>
          </div>

          <div className="assistant-travel-switch" role="group" aria-label="Tipo de viaje">
            <button type="button" className={travelType === "flight" ? "selected" : ""} aria-pressed={travelType === "flight"} onClick={() => changeTravelType("flight")}><span>↗</span> Vuelos</button>
            <button type="button" className={travelType === "stay" ? "selected" : ""} aria-pressed={travelType === "stay"} onClick={() => changeTravelType("stay")}><span>⌂</span> Hoteles</button>
          </div>

          <form className="assistant-search-form" onSubmit={submitTravelSearch}>
            {travelType === "flight" ? (
              <>
                <div className="assistant-search-pair">
                  <label>ORIGEN<input value={origin} onChange={(event) => setOrigin(event.target.value)} placeholder="Ciudad o aeropuerto" required /></label>
                  <span className="assistant-route-arrow" aria-hidden="true">→</span>
                  <label>DESTINO<input value={destination} onChange={(event) => setDestination(event.target.value)} placeholder="Ciudad o aeropuerto" required /></label>
                </div>
                <div className="assistant-search-pair assistant-search-pair-fields">
                  <label>SALIDA<input type="date" value={departureDate} onChange={(event) => setDepartureDate(event.target.value)} required /></label>
                  <label>REGRESO <small>OPCIONAL</small><input type="date" value={returnDate} onChange={(event) => setReturnDate(event.target.value)} /></label>
                  <label>VIAJEROS<select value={guests} onChange={(event) => setGuests(event.target.value)}><option value="1">1 viajero</option><option value="2">2 viajeros</option><option value="3">3 viajeros</option><option value="4">4 viajeros</option><option value="5">5 viajeros</option><option value="6">6 viajeros</option></select></label>
                </div>
              </>
            ) : (
              <>
                <label className="assistant-full-field">DESTINO<input value={destination} onChange={(event) => setDestination(event.target.value)} placeholder="Ciudad u hotel" required /></label>
                <div className="assistant-search-pair assistant-search-pair-fields">
                  <label>ENTRADA<input type="date" value={checkIn} onChange={(event) => setCheckIn(event.target.value)} required /></label>
                  <label>SALIDA<input type="date" value={checkOut} onChange={(event) => setCheckOut(event.target.value)} required /></label>
                  <label>HUÉSPEDES<select value={guests} onChange={(event) => setGuests(event.target.value)}><option value="1">1 huésped</option><option value="2">2 huéspedes</option><option value="3">3 huéspedes</option><option value="4">4 huéspedes</option><option value="5">5 huéspedes</option><option value="6">6 huéspedes</option></select></label>
                </div>
              </>
            )}
            <button className="assistant-search-button" type="submit" disabled={searching}>{searching ? "Consultando Duffel…" : `Buscar ${travelType === "flight" ? "vuelos" : "hoteles"}`}<span aria-hidden="true"> →</span></button>
          </form>

          <div className="assistant-demo-notice" role="note"><span>i</span><p><strong>{travelType === "flight" ? "Duffel · modo de prueba" : "Hoteles · acceso pendiente"}</strong>{travelType === "flight" ? "Las ofertas se consultan en Duffel sandbox. Elegir una oferta no crea una reserva ni cobra el viaje." : "Duffel Stays necesita habilitarse por separado antes de mostrar opciones reales."}</p></div>
          {searchError && <p className="assistant-search-feedback assistant-search-feedback-error" role="alert">{searchError}</p>}
          {searchNotice && <p className="assistant-search-feedback" role="status">{searchNotice}</p>}

          {offers.length > 0 && <div className="assistant-options" aria-live="polite">
            <div className="assistant-options-heading"><div><span className="assistant-mini-kicker">OFERTAS DUFFEL · TEST</span><h3>{origin} → {destination}</h3></div><span>{offers.length} OPCIONES</span></div>
            <p className="assistant-options-context">{departureDate}{returnDate ? ` — ${returnDate}` : " · solo ida"} · {guests} viajero(s)</p>
            {offers.map((offer) => (
              <article className={"assistant-option-card " + (selectedOption === offer.id ? "chosen" : "")} key={offer.id}>
                <div className="assistant-duffel-offer-main">
                  <div className="assistant-duffel-offer-top"><span className="assistant-provider-mark">D</span><span>OFERTA DUFFEL</span><strong>{offer.amount} {offer.currency}</strong></div>
                  {offer.slices.map((slice, index) => <div className="assistant-duffel-slice" key={`${offer.id}-${index}`}>
                    <div className="assistant-option-route"><strong>{slice.departTime}<i />{slice.arriveTime}</strong><small>{slice.duration}{slice.stops ? ` · ${slice.stops} escala${slice.stops > 1 ? "s" : ""}` : " · directo"}</small></div>
                    <div className="assistant-duffel-airline"><strong>{slice.carriers.join(" · ") || offer.owner}</strong><small>{slice.flightNumbers.join(" · ")}{slice.origin.code && slice.destination.code ? ` · ${slice.origin.code} → ${slice.destination.code}` : ""}</small></div>
                  </div>)}
                </div>
                <button type="button" className="assistant-option-select" aria-pressed={selectedOption === offer.id} onClick={() => setSelectedOption(offer.id)}>{selectedOption === offer.id ? "Seleccionado ✓" : "Elegir oferta"}</button>
                {selectedOption === offer.id && <div className="assistant-selection-next"><div><span>OFERTA SELECCIONADA</span><strong>{offer.amount} {offer.currency} · {offer.id}</strong></div><button type="button" onClick={reviewSelectedOffer}>Cotizar con Starlog →</button></div>}
              </article>
            ))}
          </div>}
          <div className="assistant-explorer-footnote">Duffel ofrece vuelos de prueba; Starlog aún debe completar la revisión de pasajeros y la confirmación del pago antes de crear una orden.</div>
        </div>
      ) : (
        <div className="assistant-chat-view">
          <div className="assistant-transcript" aria-live="polite">
            {messages.length === 0 ? (
              <>
                <div className="assistant-message">¡Hola! ¿En qué idioma te sientes más cómodo para conversar? Puedo atenderte en español o inglés. Elige uno o escribe directamente.</div>
                <div className="assistant-prompt-suggestions" aria-label="Elegir idioma">
                  <button type="button" onClick={() => setInput("Prefiero conversar en español.")}>Español</button>
                  <button type="button" onClick={() => setInput("I prefer to speak English.")}>English</button>
                </div>
                <div className="assistant-message">Después puedes decirme tu destino. Si aún no me dices desde dónde sales, te lo preguntaré; con las fechas podré buscar vuelos y darte ideas para el viaje.</div>
                <div className="assistant-prompt-suggestions" aria-label="Ejemplos de mensajes">
                  {["Quiero ir a Madrid", "Quiero visitar València", "Quiero ir a Barcelona"].map((prompt) => (
                    <button type="button" key={prompt} onClick={() => setInput(prompt)}>{prompt}</button>
                  ))}
                </div>
              </>
            ) : messages.map((message, index) => {
              const item = message as unknown as { id?: string; role?: string; content?: unknown; message?: unknown };
              const content = item.content;
              const contentRecord = content && typeof content === "object" ? content as Record<string, unknown> : null;
              const textValue = contentRecord?.text ?? contentRecord?.agentTranscript ?? contentRecord?.userTranscript ?? contentRecord?.userInput;
              const text = typeof content === "string" ? content : typeof textValue === "string" ? textValue : typeof item.message === "string" ? item.message : "";
              const isUser = item.role === "user" || Boolean(content && typeof content === "object" && ("userTranscript" in content || "userInput" in content));
              return text ? <p className={"assistant-bubble " + (isUser ? "assistant-bubble-user" : "")} key={item.id ?? index}>{text}</p> : null;
            })}
          </div>
          {error && <p className="assistant-error" role="alert">{error}</p>}
          {quoteReady && <p className="assistant-selection-note" role="status">Oferta preparada. Pulsa «Enviar» para pedir el total en Stellar testnet. Todavía no se reserva ni se paga el vuelo.</p>}
          <div className="assistant-session-row">
            {!voiceEnabled ? (
              <button className="assistant-connect-button" onClick={() => { void enableVoice(); }} disabled={connecting}>{connecting ? "Conectando…" : "Activar voz · micrófono opcional"}</button>
            ) : (
              <><div className="assistant-livekit-controls" data-lk-theme="default"><ControlBar controls={{ microphone: true, camera: false, screenShare: false }} variation="minimal" /></div><button className="assistant-end-button" onClick={endSession}>Finalizar conversación</button></>
            )}
          </div>
          <form onSubmit={submitMessage} className="assistant-form">
            <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Escribe aquí; no necesitas activar la voz…" aria-label="Mensaje para Starlog" disabled={isSending || connecting} />
            <button aria-label="Enviar mensaje" disabled={isSending || connecting || !input.trim()}>{isSending ? "…" : "Enviar"}</button>
          </form>
        </div>
      )}
    </section>
  );
}
