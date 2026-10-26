"use client";

import { usePollar } from "@pollar/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { post } from "@/lib/api";

export type EstelaUser = { userId?: string; id?: string; wallet: string; role: string };

type Props = {
  /** The Estela session, or null; owned by the page so other components can use it. */
  user: EstelaUser | null;
  onUserChange: (user: EstelaUser | null) => void;
  appearance?: "default" | "account";
};

/**
 * Two-step sign-in: Pollar logs the user in and gives them a wallet, then the wallet
 * signs Estela's SEP-10 challenge so our backend knows which address it is talking
 * to and opens its own session cookie.
 */
export function LoginPanel({ user, onUserChange, appearance = "default" }: Props) {
  const accountAppearance = appearance === "account";
  const { isAuthenticated, verified, wallet, openLoginModal, logout, getClient } = usePollar();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Only try automatically once per address, so a failure doesn't loop.
  const attempted = useRef<string | null>(null);
  // Pollar login failures (e.g. the app is out of credits) would otherwise only
  // show inside its modal, which the user may have closed.
  const [pollarError, setPollarError] = useState<string | null>(null);

  useEffect(() => {
    const client = getClient();
    const show = (s: ReturnType<typeof client.getAuthState>) =>
      setPollarError(s.step === "error" ? `${s.message} (${s.errorCode})` : null);
    show(client.getAuthState());
    return client.onAuthStateChange(show);
  }, [getClient]);

  const linkSession = useCallback(async () => {
    if (!wallet?.address) return;
    setBusy(true);
    setError(null);
    try {
      const challenge = await post<{ transaction: string; homeDomain: string; webAuthDomain: string }>(
        "/api/auth/challenge",
        { account: wallet.address },
      );
      const proof = await getClient().stellar.sep10.sign({
        challengeXdr: challenge.transaction,
        homeDomains: challenge.homeDomain,
        webAuthDomain: challenge.webAuthDomain,
      });
      if (proof.status !== "signed") {
        throw new Error(proof.details ?? proof.code ?? "Pollar did not sign the challenge");
      }
      onUserChange(await post<EstelaUser>("/api/auth/verify", { transaction: proof.signedXdr }));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }, [wallet?.address, getClient, onUserChange]);

  useEffect(() => {
    const address = wallet?.address;
    if (!isAuthenticated || !verified || !address) return;
    if (user?.wallet === address || attempted.current === address) return;
    attempted.current = address;
    void linkSession();
  }, [isAuthenticated, verified, wallet?.address, user?.wallet, linkSession]);

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    onUserChange(null);
    attempted.current = null;
    logout();
  }

  if (!isAuthenticated) {
    return (
      <div className={accountAppearance ? "account-login-control" : "flex flex-col items-center gap-3 text-sm"}>
        <button
          onClick={openLoginModal}
          className={accountAppearance ? "account-button account-button-copper" : "rounded-full bg-foreground text-background px-6 h-12 font-medium"}
          type="button"
        >
          SIGN IN
        </button>
        {pollarError && <p className={accountAppearance ? "account-login-error" : "text-red-600 max-w-md text-center"}>{pollarError}</p>}
      </div>
    );
  }

  if (wallet?.custody === "smart") {
    return <p className="text-sm">Passkey wallets are not supported yet. Sign in with Google or email.</p>;
  }

  if (accountAppearance) {
    return (
      <div className="account-login-control">
        {error && <p className="account-login-error" role="alert">{error} <button onClick={linkSession}>RETRY</button></p>}
        <button onClick={signOut} className="account-signout" type="button">SIGN OUT</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 text-sm">
      <p>
        Wallet: <code className="font-mono">{wallet?.address ?? "creando…"}</code>
      </p>
      {user ? (
        <p>
          Starlog session active · role <strong>{user.role}</strong>
        </p>
      ) : (
        <p>{busy ? "Signing in to Starlog…" : "Linking your Starlog session…"}</p>
      )}
      {error && (
        <p className="text-red-600">
          {error}{" "}
          <button onClick={linkSession} className="underline">
            Reintentar
          </button>
        </p>
      )}
      <button onClick={signOut} className="self-start underline">
        Sign out
      </button>
    </div>
  );
}
