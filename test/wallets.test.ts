import { describe, expect, it } from "vitest";

import { parseWalletList } from "@/lib/wallets";

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
    const upper = A.toUpperCase().replace("0X", "0x");
    const result = parseWalletList(`${A}\n${upper}`);
    expect(result.valid).toEqual([A]);
    expect(result.duplicates).toEqual([A]);
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
    for (const input of ["", "   ", "\n\n", undefined as unknown as string, null as unknown as string]) {
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
