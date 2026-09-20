import { describe, expect, it } from "vitest";

import { parseWalletList } from "@/lib/wallets";

/**
 * Fixtures are deliberately synthetic, and that is a hard rule for this repo:
 * a test wallet address must never be a real one. These files are public, and a
 * fixture copied from a real list publishes that wallet's association with this
 * project permanently, in the git history, forever.
 *
 * `B` contains letters so the case-insensitivity test actually exercises case.
 */
const A = "0x1111111111111111111111111111111111111111";
const B = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd";

describe("parseWalletList", () => {
  it("parses one address per line", () => {
    const result = parseWalletList(`${A}\n${B}`);
    expect(result.valid).toEqual([A, B]);
    expect(result.rejected).toEqual([]);
  });

  it("parses comma and space separated input", () => {
    expect(parseWalletList(`${A}, ${B}`).valid).toEqual([A, B]);
    expect(parseWalletList(`${A}   ${B}`).valid).toEqual([A, B]);
    expect(parseWalletList(`${A};${B}`).valid).toEqual([A, B]);
  });

  it("lowercases so the same wallet in two cases is one entry", () => {
    const upper = `0x${B.slice(2).toUpperCase()}`;
    expect(upper).not.toBe(B); // guard: the fixture must actually differ in case

    const result = parseWalletList(`${B}\n${upper}`);
    expect(result.valid).toEqual([B]);
    expect(result.duplicates).toEqual([B]);
  });

  it("extracts an address embedded in a block explorer URL", () => {
    // Pasted links are a normal way to supply an address.
    const result = parseWalletList(`https://etherscan.io/address/${A}`);
    expect(result.valid).toEqual([A]);
    expect(result.rejected).toEqual([]);
  });

  it("tolerates labels and numbering around the address", () => {
    const result = parseWalletList(`1) ${A}\n2) ${B}`);
    expect(result.valid).toEqual([A, B]);
  });

  it("reports unusable tokens with a reason instead of dropping them silently", () => {
    const result = parseWalletList(`${A}\nnot-an-address\n0x123`);
    expect(result.valid).toEqual([A]);
    expect(result.rejected).toHaveLength(2);
    expect(result.rejected[0].value).toBe("not-an-address");
    expect(result.rejected[0].reason).toMatch(/40-hex/);
  });

  it("preserves input order", () => {
    expect(parseWalletList(`${B}\n${A}`).valid).toEqual([B, A]);
  });

  it("handles empty, nullish and whitespace-only input", () => {
    for (const input of [
      "",
      "   ",
      "\n\n",
      undefined as unknown as string,
      null as unknown as string,
    ]) {
      const result = parseWalletList(input);
      expect(result.valid).toEqual([]);
      expect(result.rejected).toEqual([]);
    }
  });

  it("keeps duplicates out of valid so a wallet cannot inflate the denominator", () => {
    const result = parseWalletList(`${A}\n${A}\n${A}`);
    expect(result.valid).toEqual([A]);
    expect(result.duplicates).toEqual([A, A]);
  });
});
