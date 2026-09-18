/**
 * JSON-RPC helper with endpoint failover and bounded concurrency.
 *
 * Deployed on a serverless function with public RPC endpoints, throttling is the
 * expected case rather than the exception, so a 429 retries on the fallback
 * endpoint instead of failing the whole request.
 */

import { CHAINS, type Chain } from "./chains";

export interface RpcOutcome {
  result?: string;
  error?: string;
  /** True when the failure looks transient (throttling/5xx) rather than fatal. */
  transient: boolean;
}

const TIMEOUT_MS = 12_000;
const MAX_ATTEMPTS_PER_ENDPOINT = 2;

/** Endpoints for a chain: an env override wins over the public defaults. */
export function rpcUrlsFor(chain: Chain): string[] {
  const override = process.env[chain.rpcEnvKey]?.trim();
  const urls = [override, chain.rpc, chain.fallbackRpc].filter(
    (u): u is string => typeof u === "string" && u.length > 0
  );
  return Array.from(new Set(urls));
}

async function singleCall(url: string, to: string, data: string): Promise<RpcOutcome> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_call",
        params: [{ to, data }, "latest"],
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    if (res.status === 429 || res.status >= 500) {
      return { error: `HTTP ${res.status}`, transient: true };
    }
    if (!res.ok) {
      return { error: `HTTP ${res.status}`, transient: false };
    }

    const body = (await res.json()) as { result?: string; error?: { message?: string } };
    if (body.error) return { error: body.error.message ?? "rpc error", transient: false };
    return { result: body.result, transient: false };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: message, transient: err instanceof Error && err.name === "AbortError" };
  } finally {
    clearTimeout(timer);
  }
}

/** eth_call against a chain, trying each endpoint in order. */
export async function ethCall(chain: Chain, to: string, data: string): Promise<RpcOutcome> {
  const urls = rpcUrlsFor(chain);
  let last: RpcOutcome = { error: "no rpc endpoint configured", transient: false };

  for (const url of urls) {
    for (let attempt = 0; attempt < MAX_ATTEMPTS_PER_ENDPOINT; attempt++) {
      const outcome = await singleCall(url, to, data);
      if (outcome.result !== undefined) return outcome;
      last = outcome;
      // Only retry the same endpoint on a transient failure; a definite error
      // (e.g. "execution reverted") will not change by asking again.
      if (!outcome.transient) break;
    }
  }
  return last;
}

/** Map with a concurrency cap so a 50-wallet list cannot open 50 sockets at once. */
export async function mapLimit<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    for (;;) {
      const index = cursor++;
      if (index >= items.length) return;
      results[index] = await fn(items[index], index);
    }
  });

  await Promise.all(workers);
  return results;
}

export function chainOrNull(key: string): Chain | null {
  return Object.prototype.hasOwnProperty.call(CHAINS, key) ? CHAINS[key] : null;
}
