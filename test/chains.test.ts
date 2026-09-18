import { describe, expect, it } from "vitest";

import { CHAINS, CHAIN_KEYS, chainOptions, getChain, isKnownChain } from "@/lib/chains";

describe("chain registry", () => {
  it("exposes the chains this app claims to support", () => {
    expect(CHAIN_KEYS).toEqual(
      expect.arrayContaining(["eth", "robinhood", "ink", "base", "polygon", "arbitrum"])
    );
  });

  it("has a key matching each entry, so lookups cannot drift from the map", () => {
    for (const [key, chain] of Object.entries(CHAINS)) {
      expect(chain.key).toBe(key);
    }
  });

  it("gives every chain an https RPC endpoint and an explorer", () => {
    for (const chain of Object.values(CHAINS)) {
      expect(chain.rpc.startsWith("https://")).toBe(true);
      expect(chain.explorer.startsWith("https://")).toBe(true);
      expect(chain.label.length).toBeGreaterThan(0);
      expect(chain.rpcEnvKey).toMatch(/^RPC_URL_/);
    }
  });

  it("never reuses a fallback endpoint as its primary", () => {
    for (const chain of Object.values(CHAINS)) {
      if (chain.fallbackRpc) expect(chain.fallbackRpc).not.toBe(chain.rpc);
    }
  });

  it("resolves known chains and rejects unknown ones", () => {
    expect(getChain("robinhood")?.label).toBe("Robinhood Chain");
    expect(getChain("nope")).toBe(null);
    expect(isKnownChain("eth")).toBe(true);
    expect(isKnownChain("doge")).toBe(false);
    // Prototype keys must not be mistaken for chain names.
    expect(isKnownChain("__proto__")).toBe(false);
    expect(isKnownChain("constructor")).toBe(false);
  });

  it("builds select options in a stable order", () => {
    const options = chainOptions();
    expect(options.map((o) => o.value)).toEqual(CHAIN_KEYS);
    expect(options.every((o) => o.label.length > 0)).toBe(true);
  });
});
