import {
  Asset,
  BASE_FEE,
  Horizon,
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";

const secret = process.env.ESTELA_AGENT_SECRET;
if (!secret) throw new Error("Set ESTELA_AGENT_SECRET in mcp/.env.local first.");

const wallet = Keypair.fromSecret(secret);
const address = wallet.publicKey();
const horizon = new Horizon.Server("https://horizon-testnet.stellar.org");
const usdc = new Asset("USDC", "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5");

let account;
try {
  account = await horizon.loadAccount(address);
} catch (error) {
  if (error?.response?.status !== 404) throw error;
  await horizon.friendbot(address).call();
  account = await horizon.loadAccount(address);
}

if (!account.balances.some((balance) => balance.asset_code === "USDC" && balance.asset_issuer === usdc.issuer)) {
  const transaction = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(Operation.changeTrust({ asset: usdc }))
    .setTimeout(30)
    .build();
  transaction.sign(wallet);
  await horizon.submitTransaction(transaction);
  account = await horizon.loadAccount(address);
}

const xlm = account.balances.find((balance) => balance.asset_type === "native")?.balance ?? "0";
const usdcBalance = account.balances.find((balance) => balance.asset_code === "USDC" && balance.asset_issuer === usdc.issuer)?.balance ?? "0";
console.log(JSON.stringify({ address, network: "testnet", xlm, usdc: usdcBalance, trustline: true }));
