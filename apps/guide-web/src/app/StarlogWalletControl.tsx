"use client";

import { useState } from "react";
import { usePollar } from "@pollar/react";

type Locale = "es" | "en";

function WalletGlyph() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M3.25 5.25h12.5A1.75 1.75 0 0 1 17.5 7v8a1.75 1.75 0 0 1-1.75 1.75h-11A2.25 2.25 0 0 1 2.5 14.5v-8A2.25 2.25 0 0 1 4.75 4.25H15" />
      <path d="M13.25 10h4.25v3h-4.25a1.5 1.5 0 1 1 0-3Z" />
      <circle cx="13.25" cy="11.5" r=".35" fill="currentColor" stroke="none" />
    </svg>
  );
}

function WalletSetupPrompt({ locale }: { locale: Locale }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="wallet-control">
      <button
        className="wallet-connect-button"
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="wallet-button-icon"><WalletGlyph /></span>
        <span>{locale === "es" ? "Conectar wallet" : "Connect wallet"}</span>
        <span className="wallet-network-label">TESTNET</span>
      </button>
      {open && (
        <div className="wallet-popover" role="status">
          <strong>{locale === "es" ? "Completa la configuración de Pollar" : "Finish Pollar setup"}</strong>
          <p>
            {locale === "es" ? <>Añade la clave pública de Pollar testnet en <code>apps/guide-web/.env.local</code> como <code>NEXT_PUBLIC_POLLAR_API_KEY</code> y reinicia Starlog.</> : <>Add your Pollar testnet publishable key to <code>apps/guide-web/.env.local</code> as <code>NEXT_PUBLIC_POLLAR_API_KEY</code>, then restart Starlog.</>}
          </p>
          <a href="https://docs.pollar.xyz/docs/getting-started/api-keys" target="_blank" rel="noreferrer">
            {locale === "es" ? "Ver dónde encontrar la clave" : "Find the key in Pollar docs"} <span aria-hidden="true">↗</span>
          </a>
        </div>
      )}
    </div>
  );
}

function ConfiguredWalletControl({ locale }: { locale: Locale }) {
  const {
    isAuthenticated,
    verified,
    wallet,
    openLoginModal,
    logout,
    createWallet,
    openWalletBalanceModal,
    openReceiveModal,
  } = usePollar();
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const createStellarWallet = async () => {
    setBusy(true);
    setNotice("");
    try {
      await createWallet();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not create the wallet. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const copyAddress = async () => {
    if (!wallet) return;
    try {
      await navigator.clipboard.writeText(wallet.address);
      setNotice(locale === "es" ? "Dirección copiada." : "Wallet address copied.");
    } catch {
      setNotice(locale === "es" ? "No se pudo copiar. Selecciona la dirección y cópiala." : "Could not copy the address. Select it and copy manually.");
    }
  };

  if (!isAuthenticated) {
    return (
      <button className="wallet-connect-button" type="button" onClick={openLoginModal}>
        <span className="wallet-button-icon"><WalletGlyph /></span>
        <span>{locale === "es" ? "Iniciar sesión" : "Sign in"}</span>
        <span className="wallet-network-label">TESTNET</span>
      </button>
    );
  }

  if (!verified) {
      return <button className="wallet-connect-button" type="button" disabled>{locale === "es" ? "Verificando wallet…" : "Verifying wallet…"}</button>;
  }

  if (!wallet) {
    return (
      <div className="wallet-control">
        <button className="wallet-connect-button" type="button" onClick={() => void createStellarWallet()} disabled={busy}>
          <span className="wallet-button-icon"><WalletGlyph /></span>
          <span>{busy ? (locale === "es" ? "Creando wallet…" : "Creating wallet…") : (locale === "es" ? "Crear wallet Stellar" : "Create Stellar wallet")}</span>
          <span className="wallet-network-label">TESTNET</span>
        </button>
        {notice && <div className="wallet-popover wallet-notice" role="status">{notice}</div>}
      </div>
    );
  }

  const shortAddress = `${wallet.address.slice(0, 5)}…${wallet.address.slice(-5)}`;

  return (
    <div className="wallet-control">
      <button
        className="wallet-connect-button wallet-connected-button"
        type="button"
        aria-expanded={menuOpen}
        onClick={() => { setMenuOpen((current) => !current); setNotice(""); }}
      >
        <span className="wallet-status-dot wallet-status-connected" />
        <span>{shortAddress}</span>
        <span className="wallet-network-label">TESTNET</span>
      </button>
      {menuOpen && (
        <div className="wallet-popover">
          <span className="wallet-popover-label">{locale === "es" ? "TU WALLET STELLAR" : "YOUR STELLAR WALLET"}</span>
          <code className="wallet-address">{wallet.address}</code>
          {notice && <p className="wallet-feedback" role="status">{notice}</p>}
          <button type="button" onClick={() => void copyAddress()}>{locale === "es" ? "Copiar dirección" : "Copy address"}</button>
          <button type="button" onClick={() => { setMenuOpen(false); openWalletBalanceModal(); }}>{locale === "es" ? "Ver saldo" : "View balance"}</button>
          <button type="button" onClick={() => { setMenuOpen(false); openReceiveModal(); }}>{locale === "es" ? "Recibir" : "Receive"}</button>
          <button className="wallet-logout" type="button" onClick={() => { setMenuOpen(false); logout(); }}>{locale === "es" ? "Cerrar sesión" : "Sign out"}</button>
        </div>
      )}
    </div>
  );
}

export function StarlogWalletControl({ locale }: { locale: Locale }) {
  if (!process.env.NEXT_PUBLIC_POLLAR_API_KEY?.trim()) return <WalletSetupPrompt locale={locale} />;
  return <ConfiguredWalletControl locale={locale} />;
}
