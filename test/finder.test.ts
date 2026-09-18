import { describe, expect, it } from "vitest";

import { summarize, type HolderRow } from "@/lib/finder";

const row = (address: string, balance: number | null, error?: string): HolderRow => ({
  address,
  balance,
  held: typeof balance === "number" && balance > 0,
  ...(error ? { error } : {}),
});

describe("summarize", () => {
  it("counts only wallets with a positive balance as holders", () => {
    const result = summarize([
      row("0xa", 3),
      row("0xb", 0),
      row("0xc", 1),
    ]);
    expect(result.holders).toEqual(["0xa", "0xc"]);
    expect(result.totalBalance).toBe(4);
    expect(result.errored).toBe(0);
  });

  it("treats a failed call as an error, never as a holder", () => {
    // A revert must not be silently read as "balance 0 against them" — but it
    // also must not be reported as a holding.
    const result = summarize([row("0xa", null, "execution reverted"), row("0xb", 2)]);
    expect(result.holders).toEqual(["0xb"]);
    expect(result.errored).toBe(1);
    expect(result.totalBalance).toBe(2);
  });

  it("returns nothing for an empty list", () => {
    expect(summarize([])).toEqual({ holders: [], errored: 0, totalBalance: 0 });
  });

  it("sums multi-token balances for ERC-1155 holdings", () => {
    const result = summarize([row("0xa", 10), row("0xb", 5)]);
    expect(result.totalBalance).toBe(15);
  });

  it("ignores a null balance that carries no error", () => {
    const result = summarize([row("0xa", null)]);
    expect(result.holders).toEqual([]);
    expect(result.errored).toBe(0);
  });
});
