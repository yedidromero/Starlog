import { Account, Address, Contract, Keypair, TransactionBuilder, rpc, scValToNative } from "@stellar/stellar-sdk";
import { currentSession } from "@/server/auth/current-user";
import { env } from "@/server/env";
import { json, unauthorized } from "@/server/http";
import { formatAmount } from "@/server/pricing";

/** Read the configured tokens directly; these may exist without a classic trustline. */
export async function GET() {
  const session = await currentSession();
  if (!session) return unauthorized();
  const config = env();
  const server = new rpc.Server(config.STELLAR_RPC_URL);
  const network = config.STELLAR_NETWORK_PASSPHRASE === "Test SDF Network ; September 2015" ? "testnet" : "mainnet";
  // Only the public address is used to simulate a read. Nothing is signed or submitted.
  const source = Keypair.fromSecret(config.ESCROW_ADMIN_SECRET).publicKey();
  const tokens = [{ code: "USDC", contractId: config.USDC_CONTRACT_ID }, { code: "EURC", contractId: config.EURC_CONTRACT_ID }];
  const assets = await Promise.all(tokens.map(async token => {
    try {
      const transaction = new TransactionBuilder(new Account(source, "0"), { fee: "100", networkPassphrase: config.STELLAR_NETWORK_PASSPHRASE })
        .addOperation(new Contract(token.contractId).call("balance", new Address(session.wallet).toScVal()))
        .setTimeout(30).build();
      const result = await server.simulateTransaction(transaction);
      if (!rpc.Api.isSimulationSuccess(result) || !result.result) throw new Error("error" in result ? result.error : "Token balance lookup unavailable");
      const amount = scValToNative(result.result.retval) as bigint;
      return { code: token.code, balance: formatAmount(amount), issuer: token.contractId, chain: "STELLAR", network, source: "token-contract" };
    } catch (error) {
      const notHeld = error instanceof Error && /trustline entry is missing for account/.test(error.message);
      return { code: token.code, balance: notHeld ? "0" : null, issuer: token.contractId, chain: "STELLAR", network, source: "token-contract", status: notHeld ? "not-held" : "unavailable" };
    }
  }));
  return json({ assets }, { headers: { "Cache-Control": "no-store" } });
}
