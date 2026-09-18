"use client";

import { useEffect, useMemo, useState } from "react";
import { CHAINS, CHAIN_KEYS } from "@/lib/chains";
import { parseWalletList } from "@/lib/wallets";
import type { FindHoldersResult } from "@/lib/finder";
import { Field, Panel, inputClass } from "./Panel";

const STORAGE_KEY = "control-room.wallets";

type ApiResponse = FindHoldersResult & {
  input?: {
    parsedWallets: number;
    searchedWallets: number;
    truncated: boolean;
    rejected: { value: string; reason: string }[];
    duplicates: string[];
  };
  error?: string;
};

const short = (addr: string) => `${addr.slice(0, 6)}…${addr.slice(-4)}`;

export function FinderPanel() {
  const [chain, setChain] = useState("robinhood");
  const [contract, setContract] = useState("");
  const [wallets, setWallets] = useState("");
  const [tokenId, setTokenId] = useState("");
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Persist locally only. A deployed instance must never ship someone's wallet
  // list inside the bundle or to a server we do not control.
  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    // localStorage does not exist during SSR, so this effect is the only correct
    // place to read it — the setState it triggers is the intended hydration step,
    // not an accidental render cascade.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWallets(saved);
  }, []);

  useEffect(() => {
    if (wallets) window.localStorage.setItem(STORAGE_KEY, wallets);
  }, [wallets]);

  const preview = useMemo(() => parseWalletList(wallets), [wallets]);
  const standard = result?.standard ?? "unknown";

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/find-holders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chain, contract, wallets, tokenId }),
      });
      const data: ApiResponse = await res.json();
      if (!res.ok) {
        setError(data.error ?? `Request failed (${res.status})`);
      } else {
        setResult(data);
      }
    } catch {
      setError("Could not reach the server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Panel
      title="NFT Finder"
      subtitle="Which of my wallets hold this collection?"
      status={{ label: "live", tone: "live" }}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Chain">
            <select
              value={chain}
              onChange={(e) => setChain(e.target.value)}
              className={inputClass}
            >
              {CHAIN_KEYS.map((key) => (
                <option key={key} value={key}>
                  {CHAINS[key].label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Collection contract">
            <input
              value={contract}
              onChange={(e) => setContract(e.target.value)}
              placeholder="0x…"
              spellCheck={false}
              className={inputClass}
            />
          </Field>
        </div>

        <Field
          label="My wallets"
          hint={
            preview.valid.length > 0
              ? `${preview.valid.length} address${preview.valid.length === 1 ? "" : "es"} ready${
                  preview.rejected.length ? `, ${preview.rejected.length} ignored` : ""
                }${preview.duplicates.length ? `, ${preview.duplicates.length} duplicate` : ""}`
              : "One per line. Stored in this browser only."
          }
        >
          <textarea
            value={wallets}
            onChange={(e) => setWallets(e.target.value)}
            rows={5}
            spellCheck={false}
            placeholder={"0xabc…\n0xdef…"}
            className={`${inputClass} resize-y`}
          />
        </Field>

        {result?.standard === "erc1155" || (!result && tokenId) ? (
          <Field label="Token ID" hint="ERC-1155 balances are per token id.">
            <input
              value={tokenId}
              onChange={(e) => setTokenId(e.target.value)}
              placeholder="1"
              className={inputClass}
            />
          </Field>
        ) : null}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={loading || !contract || preview.valid.length === 0}
            className="rounded-md bg-accent px-4 py-2 text-xs font-semibold text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? "Checking…" : "Find holders"}
          </button>
          {preview.rejected.length > 0 ? (
            <span className="text-[11px] text-warn">
              Ignoring {preview.rejected.length} non-address token
              {preview.rejected.length === 1 ? "" : "s"}
            </span>
          ) : null}
        </div>
      </form>

      {error ? (
        <p className="mt-4 rounded-md border border-danger/40 bg-danger/5 px-3 py-2 text-xs text-danger">
          {error}
        </p>
      ) : null}

      {result ? (
        <div className="mt-5 space-y-3 border-t border-line pt-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <span className="font-semibold text-accent">
              {result.holders.length} of {result.totalWallets} hold it
            </span>
            <span className="text-muted">
              {result.contractSymbol ?? result.contractName ?? "unknown collection"}
            </span>
            <span className="text-muted">
              {standard === "unknown" ? "standard unconfirmed (read as ERC-721)" : standard.toUpperCase()}
            </span>
            {result.errored > 0 ? (
              <span className="text-warn">{result.errored} call(s) failed</span>
            ) : null}
            <span className="text-muted tnum">{result.durationMs} ms</span>
          </div>

          {result.holders.length > 0 ? (
            <ul className="space-y-1">
              {result.rows
                .filter((r) => r.held)
                .map((r) => (
                  <li
                    key={r.address}
                    className="flex items-center justify-between gap-3 rounded border border-accent/25 bg-accent/5 px-3 py-1.5 font-mono text-xs"
                  >
                    <span>{r.address}</span>
                    <span className="tnum shrink-0 text-accent">×{r.balance}</span>
                  </li>
                ))}
            </ul>
          ) : (
            <p className="text-xs text-muted">
              None of the {result.totalWallets} wallets hold this collection on{" "}
              {result.chainLabel}.
            </p>
          )}

          {result.errored > 0 ? (
            <ul className="space-y-1">
              {result.rows
                .filter((r) => r.error)
                .map((r) => (
                  <li key={r.address} className="font-mono text-[11px] text-warn">
                    {short(r.address)} — {r.error}
                  </li>
                ))}
            </ul>
          ) : null}

          {result.input?.truncated ? (
            <p className="text-[11px] text-warn">
              Searched the first {result.input.searchedWallets} wallets only.
            </p>
          ) : null}
        </div>
      ) : null}
    </Panel>
  );
}
