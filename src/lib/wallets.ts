/**
 * Wallet-list parsing.
 *
 * Kept pure and separate from any network work because it is the first thing a
 * user touches, and the failure it must prevent is silent: a typo'd or duplicated
 * address would otherwise skew the holder count with no visible cause.
 */

import { isEvmAddress, normalizeAddress } from "./erc";

export interface ParsedWallets {
  /** Unique, lowercased, valid addresses in input order. */
  valid: string[];
  /** Input lines that were not addresses, with the reason. */
  rejected: { value: string; reason: string }[];
  /** Addresses seen more than once (already collapsed in `valid`). */
  duplicates: string[];
}

/**
 * Accepts one address per line, or comma/space separated, and tolerates the noise
 * people paste: labels, numbering, and addresses embedded in block-explorer URLs
 * (`.../address/0xabc...`).
 */
export function parseWalletList(input: string): ParsedWallets {
  const valid: string[] = [];
  const rejected: { value: string; reason: string }[] = [];
  const seen = new Set<string>();
  const duplicates: string[] = [];

  const tokens = String(input ?? "")
    .split(/[\s,;]+/)
    .map((t) => t.trim())
    .filter(Boolean);

  for (const token of tokens) {
    // Extract an addressed embedded in a URL or pasted text like "1) 0xabc…".
    const embedded = token.match(/0x[0-9a-fA-F]{40}/);
    const candidate = embedded ? embedded[0] : token;

    if (!isEvmAddress(candidate)) {
      rejected.push({ value: token, reason: "not a 40-hex-character EVM address" });
      continue;
    }

    const normalized = normalizeAddress(candidate);
    if (seen.has(normalized)) {
      duplicates.push(normalized);
      continue;
    }
    seen.add(normalized);
    valid.push(normalized);
  }

  return { valid, rejected, duplicates };
}

export function formatWalletList(addresses: readonly string[]): string {
  return addresses.join("\n");
}
