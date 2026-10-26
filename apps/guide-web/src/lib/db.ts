import mariadb, { type Pool } from "mariadb";

const globalForDb = globalThis as typeof globalThis & {
  starlogDbPool?: Pool;
};

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export function getDbPool(): Pool {
  if (globalForDb.starlogDbPool) return globalForDb.starlogDbPool;

  const port = Number(process.env.STARLOG_DB_PORT ?? "3306");
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("STARLOG_DB_PORT must be a valid TCP port.");
  }

  globalForDb.starlogDbPool = mariadb.createPool({
    host: requiredEnv("STARLOG_DB_HOST"),
    port,
    database: requiredEnv("STARLOG_DB_NAME"),
    user: requiredEnv("STARLOG_DB_USER"),
    password: requiredEnv("STARLOG_DB_PASSWORD"),
    connectionLimit: 3,
    connectTimeout: 10_000,
    acquireTimeout: 10_000,
    ssl: process.env.STARLOG_DB_SSL?.toLowerCase() !== "false",
  });

  return globalForDb.starlogDbPool;
}
