/**
 * Minimal ABI encoding/decoding for the handful of calls this app makes.
 *
 * Hand-rolled rather than pulling in ethers/viem: the entire surface is four
 * function selectors and a uint decoder, and keeping it dependency-free means the
 * encoding is unit-testable with no chain to talk to.
 */

/** 4-byte function selectors, as constants so they are greppable and reviewable. */
export const SELECTOR = {
  /** balanceOf(address) — ERC-721 */
  balanceOf: "0x70a08231",
  /** balanceOf(address,uint256) — ERC-1155 */
  balanceOf1155: "0x00fdd58e",
  /** supportsInterface(bytes4) */
  supportsInterface: "0x01ffc9a7",
  /** ownerOf(uint256) — ERC-721 */
  ownerOf: "0x6352211e",
  /** name() — optional metadata, used only to label results */
  name: "0x06fdde03",
  /** symbol() */
  symbol: "0x95d89b41",
} as const;

export const INTERFACE_ID = {
  ERC721: "0x80ac58cd",
  ERC1155: "0xd9b67a26",
} as const;

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

export function isEvmAddress(value: unknown): boolean {
  return typeof value === "string" && ADDRESS_RE.test(value.trim());
}

/** Lowercase form. EVM addresses are case-insensitive; checksums are cosmetic. */
export function normalizeAddress(value: string): string {
  return value.trim().toLowerCase();
}

/** Left-pad an address to a 32-byte word. */
export function padAddress(address: string): string {
  if (!isEvmAddress(address)) throw new Error(`not an address: ${address}`);
  return normalizeAddress(address).slice(2).padStart(64, "0");
}

/** Left-pad a uint256. Accepts a decimal string or bigint. */
export function padUint(value: bigint | number | string): string {
  const asBigInt = typeof value === "bigint" ? value : BigInt(value);
  if (asBigInt < 0n) throw new Error("uint256 cannot be negative");
  return asBigInt.toString(16).padStart(64, "0");
}

export function encodeBalanceOf(address: string): string {
  return SELECTOR.balanceOf + padAddress(address);
}

export function encodeBalanceOf1155(address: string, tokenId: bigint | number | string): string {
  return SELECTOR.balanceOf1155 + padAddress(address) + padUint(tokenId);
}

export function encodeSupportsInterface(interfaceId: string): string {
  const clean = interfaceId.replace(/^0x/, "").toLowerCase();
  if (!/^[0-9a-f]{8}$/.test(clean)) throw new Error(`not a 4-byte interface id: ${interfaceId}`);
  return SELECTOR.supportsInterface + clean.padEnd(64, "0");
}

/**
 * Decode a uint256 return value.
 *
 * Returns null — rather than throwing — for empty or malformed data, because
 * "this contract did not answer" is an ordinary outcome (EOAs, non-standard
 * proxies, wrong-chain addresses) that callers must handle, not an exception.
 */
export function decodeUint(hex: unknown): number | null {
  if (typeof hex !== "string") return null;
  const clean = hex.trim();
  if (!clean || clean === "0x") return null;
  try {
    const value = BigInt(clean);
    // Balances beyond Number.MAX_SAFE_INTEGER are not representable; treat as
    // unknown rather than silently rounding to a wrong count.
    if (value > BigInt(Number.MAX_SAFE_INTEGER)) return null;
    return Number(value);
  } catch {
    return null;
  }
}

/** Decode a bool return value (last byte non-zero). */
export function decodeBool(hex: unknown): boolean | null {
  if (typeof hex !== "string" || !hex.startsWith("0x") || hex.length < 3) return null;
  try {
    return BigInt(hex) !== 0n;
  } catch {
    return null;
  }
}

/** Decode a dynamic string return (offset, length, data). */
export function decodeString(hex: unknown): string | null {
  if (typeof hex !== "string" || !hex.startsWith("0x") || hex.length < 130) return null;
  try {
    const body = hex.slice(2);
    const offset = Number(BigInt("0x" + body.slice(0, 64))) * 2;
    const length = Number(BigInt("0x" + body.slice(offset, offset + 64)));
    const data = body.slice(offset + 64, offset + 64 + length * 2);
    const bytes = data.match(/.{2}/g) ?? [];
    const text = bytes.map((b) => String.fromCharCode(parseInt(b, 16))).join("");
    return text.replace(/\0+$/, "").trim() || null;
  } catch {
    return null;
  }
}
