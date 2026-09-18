import { describe, expect, it } from "vitest";

import {
  INTERFACE_ID,
  SELECTOR,
  decodeBool,
  decodeString,
  decodeUint,
  encodeBalanceOf,
  encodeBalanceOf1155,
  encodeSupportsInterface,
  isEvmAddress,
  normalizeAddress,
  padAddress,
  padUint,
} from "@/lib/erc";

const ZERO_PAD_63 = "0".repeat(63);

/** ABI-encode a string the way a contract would return it. */
function abiEncodeString(value: string): string {
  const hex = Buffer.from(value, "utf8").toString("hex");
  const length = (hex.length / 2).toString(16).padStart(64, "0");
  const offset = (32).toString(16).padStart(64, "0");
  const padded = hex.padEnd(Math.ceil(hex.length / 64) * 64, "0");
  return `0x${offset}${length}${padded}`;
}

describe("isEvmAddress", () => {
  it("accepts 40 hex characters with or without the 0x prefix case", () => {
    expect(isEvmAddress("0x0000000000000000000000000000000000000001")).toBe(true);
    expect(isEvmAddress("0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48")).toBe(true);
  });

  it("rejects short, long, non-hex and non-string input", () => {
    expect(isEvmAddress("0x1")).toBe(false);
    expect(isEvmAddress("0x" + "a".repeat(39))).toBe(false);
    expect(isEvmAddress("0x" + "a".repeat(41))).toBe(false);
    expect(isEvmAddress("0x" + "z".repeat(40))).toBe(false);
    expect(isEvmAddress("not-an-address")).toBe(false);
    expect(isEvmAddress("")).toBe(false);
    expect(isEvmAddress(null)).toBe(false);
    expect(isEvmAddress(42)).toBe(false);
  });

  it("tolerates surrounding whitespace", () => {
    expect(isEvmAddress("  0x0000000000000000000000000000000000000001  ")).toBe(true);
  });
});

describe("normalizeAddress", () => {
  it("lowercases and trims so the same wallet cannot be counted twice", () => {
    expect(normalizeAddress("  0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48  ")).toBe(
      "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"
    );
  });
});

describe("padAddress", () => {
  it("left-pads to a full 32-byte word", () => {
    const padded = padAddress("0x0000000000000000000000000000000000000001");
    expect(padded).toHaveLength(64);
    expect(padded).toBe(ZERO_PAD_63 + "1");
  });

  it("throws on a non-address rather than producing a malformed call", () => {
    expect(() => padAddress("0x123")).toThrow(/not an address/);
  });
});

describe("padUint", () => {
  it("pads decimal strings, numbers and bigints", () => {
    expect(padUint(0)).toBe("0".repeat(64));
    expect(padUint(1)).toBe(ZERO_PAD_63 + "1");
    expect(padUint("255")).toBe("0".repeat(62) + "ff");
    expect(padUint(2n ** 255n)).toHaveLength(64);
  });

  it("rejects negatives, which cannot be encoded as uint256", () => {
    expect(() => padUint(-1)).toThrow(/negative/);
  });
});

describe("call encoding", () => {
  it("builds balanceOf(address) for ERC-721", () => {
    expect(encodeBalanceOf("0x0000000000000000000000000000000000000001")).toBe(
      SELECTOR.balanceOf + ZERO_PAD_63 + "1"
    );
  });

  it("builds balanceOf(address,uint256) for ERC-1155", () => {
    expect(encodeBalanceOf1155("0x0000000000000000000000000000000000000001", 7)).toBe(
      SELECTOR.balanceOf1155 + ZERO_PAD_63 + "1" + ZERO_PAD_63 + "7"
    );
  });

  it("builds supportsInterface(bytes4)", () => {
    expect(encodeSupportsInterface(INTERFACE_ID.ERC721)).toBe(
      SELECTOR.supportsInterface + "80ac58cd" + "0".repeat(56)
    );
  });

  it("rejects an interface id that is not exactly 4 bytes", () => {
    expect(() => encodeSupportsInterface("0x80ac")).toThrow(/4-byte/);
  });
});

describe("decodeUint", () => {
  it("decodes plain and zero-padded values", () => {
    expect(decodeUint("0x1")).toBe(1);
    expect(decodeUint("0x" + ZERO_PAD_63 + "1")).toBe(1);
    expect(decodeUint("0x" + "0".repeat(62) + "ff")).toBe(255);
  });

  it("returns null for empty or malformed data instead of throwing", () => {
    // "the contract did not answer" is an ordinary outcome and must not throw.
    expect(decodeUint("0x")).toBe(null);
    expect(decodeUint("")).toBe(null);
    expect(decodeUint(undefined)).toBe(null);
    expect(decodeUint(null)).toBe(null);
    expect(decodeUint("0xzz")).toBe(null);
    expect(decodeUint(123)).toBe(null);
  });

  it("returns null above MAX_SAFE_INTEGER rather than silently rounding", () => {
    const tooBig = "0x" + (2n ** 200n).toString(16);
    expect(decodeUint(tooBig)).toBe(null);
  });
});

describe("decodeBool", () => {
  it("reads the low byte", () => {
    expect(decodeBool("0x" + ZERO_PAD_63 + "1")).toBe(true);
    expect(decodeBool("0x" + "0".repeat(64))).toBe(false);
  });

  it("returns null for missing data", () => {
    expect(decodeBool("0x")).toBe(null);
    expect(decodeBool(undefined)).toBe(null);
  });
});

describe("decodeString", () => {
  it("decodes a dynamically sized string return", () => {
    expect(decodeString(abiEncodeString("Hello"))).toBe("Hello");
    expect(decodeString(abiEncodeString("Cool Collection"))).toBe("Cool Collection");
  });

  it("returns null for a short or empty response", () => {
    expect(decodeString("0x")).toBe(null);
    expect(decodeString("0x1234")).toBe(null);
    expect(decodeString(undefined)).toBe(null);
  });
});
