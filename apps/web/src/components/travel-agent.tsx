"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { usePollar } from "@pollar/react";
import { RoomAudioRenderer, SessionProvider, useAgent, useLocalParticipant, useSession, useSessionContext, useSessionMessages } from "@livekit/components-react";
import { TokenSource } from "livekit-client";
import { FlightPackage } from "@/components/flight-package";

const tokenSource = TokenSource.endpoint("/api/livekit/token");

function MessageText({ text }: { text: string }) {
  return <>{text.split(/(\[[^\]]+\]\(https?:\/\/[^)]+\)|\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>;
    const link = part.match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/);
    return link ? <a key={index} href={link[2]} target="_blank" rel="noreferrer">{link[1]} ↗</a> : part;
  })}</>;
}

export function TravelAgent({ signedIn }: { signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener("starlog:open-agent", show);
    return () => window.removeEventListener("starlog:open-agent", show);
  }, []);
  return <>
    {open && <AgentSession signedIn={signedIn} onClose={() => setOpen(false)} />}
    <button className="assistant-launcher" type="button" aria-expanded={open} onClick={() => setOpen(value => !value)}><span className="star-seal" aria-hidden="true">✳</span><span>ASK STARLOG · YOUR TRAVEL AGENT</span><span aria-hidden="true">{open ? "−" : "+"}</span></button>
  </>;
}

function AgentSession({ signedIn, onClose }: { signedIn: boolean; onClose: () => void }) {
  const session = useSession(tokenSource, { agentName: "starlog-guide" });
  return <SessionProvider session={session}><AgentPanel signedIn={signedIn} onClose={onClose} /><RoomAudioRenderer /></SessionProvider>;
}

function AgentPanel({ signedIn, onClose }: { signedIn: boolean; onClose: () => void }) {
  const session = useSessionContext();
  const endRef = useRef(session.end);
  endRef.current = session.end;
  const { state } = useAgent(session);
  const { localParticipant } = useLocalParticipant();
  const { messages, send, isSending } = useSessionMessages(session);
  const { openLoginModal } = usePollar();
  const [input, setInput] = useState("");
  const [started, setStarted] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");
  const [voice, setVoice] = useState(false);
  const [view, setView] = useState<"chat" | "flights">("chat");
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => () => { void endRef.current(); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ block: "nearest" }); }, [messages]);

  async function connect() {
    if (started) return;
    setConnecting(true);
    setError("");
    try {
      await session.start({ tracks: { microphone: { enabled: false } } });
      setStarted(true);
    } finally { setConnecting(false); }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (!text || isSending || connecting) return;
    try {
      await connect();
      await send(text);
      setInput("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not connect to Starlog. Please try again.");
    }
  }

  async function toggleVoice() {
    try {
      await connect();
      await localParticipant.setMicrophoneEnabled(!voice);
      setVoice(!voice);
    } catch { setError("Microphone unavailable. You can continue chatting by text."); }
  }

  return <section className="assistant-panel assistant-panel-planner" role="dialog" aria-modal="false" aria-labelledby="agent-title" onKeyDown={event => { if (event.key === "Escape") onClose(); }}>
    <header className="assistant-head"><span className="assistant-avatar" aria-hidden="true">✳</span><span><strong id="agent-title">Your Starlog travel agent</strong><small>{connecting ? "Connecting…" : started ? `Connected · ${state}` : "Activities, destinations & travel advice"}</small></span><button type="button" onClick={onClose} aria-label="Close travel agent">×</button></header>
    <div className="assistant-view-tabs"><button type="button" className={view === "chat" ? "active" : ""} onClick={() => setView("chat")}>CHAT WITH STARLOG</button><button type="button" className={view === "flights" ? "active" : ""} onClick={() => setView("flights")}>SEARCH FLIGHTS</button></div>
    {view === "chat" ? <div className="assistant-chat-view">
      <div className="assistant-transcript" aria-live="polite">
        {messages.length === 0 && <><p className="assistant-message">Where shall we go next? Ask me about destinations, things to do, or your travel plans.</p><div className="assistant-prompt-suggestions">{["What can I do in Barcelona?", "Help me plan a weekend in Valencia", "How can I travel from Madrid to Barcelona?"].map(prompt => <button type="button" key={prompt} onClick={() => setInput(prompt)}>{prompt}</button>)}</div></>}
        {messages.map(message => <p key={message.id} className={`assistant-bubble ${message.type === "userTranscript" || message.from?.isLocal ? "assistant-bubble-user" : ""}`}><MessageText text={message.message} /></p>)}
        {started && state === "thinking" && <p className="assistant-status" role="status">Starlog is finding ideas for you…</p>}
        <div ref={bottomRef} />
      </div>
      {error && <p className="assistant-error" role="alert">{error}</p>}
      <div className="assistant-session-row"><button type="button" className="assistant-connect-button" onClick={() => void toggleVoice()} disabled={connecting}>{voice ? "TURN VOICE OFF" : "ENABLE VOICE"}</button></div>
      <form onSubmit={submit} className="assistant-form"><input value={input} onChange={event => setInput(event.target.value)} placeholder="Ask your travel agent…" aria-label="Message for Starlog" disabled={connecting || isSending} /><button type="submit" disabled={connecting || isSending || !input.trim()}>{connecting ? "CONNECTING…" : isSending ? "SENDING…" : "SEND ↗"}</button></form>
    </div> : <div className="travel-agent-body">{signedIn ? <FlightPackage profileSearch openByDefault /> : <><p className="travel-agent-description">Sign in to find your flight and pay securely with crypto.</p><button type="button" className="travel-agent-action travel-agent-action-primary" onClick={openLoginModal}>SIGN IN TO SEARCH FLIGHTS ↗</button></>}</div>}
  </section>;
}
