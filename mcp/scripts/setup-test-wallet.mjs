import { writeFileSync } from "node:fs";
import { Keypair } from "@stellar/stellar-sdk";

const destination = new URL("../.env.local", import.meta.url);
const wallet = Keypair.random();

try {
  writeFileSync(
    destination,
    `ESTELA_AGENT_SECRET=${wallet.secret()}\nESTELA_URL=http://localhost:3000\n`,
    { flag: "wx", mode: 0o600 },
  );
} catch (error) {
  if (error?.code === "EEXIST") {
    console.error("The agent wallet already exists in mcp/.env.local; it was not replaced.");
    process.exit(1);
  }
  throw error;
}

console.log(`Created a dedicated Stellar testnet wallet: ${wallet.publicKey()}`);
