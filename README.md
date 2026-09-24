# Holders

One place for NFT minting, wallet tracking and holder lookups across EVM chains.

Built as a single dashboard over tools I already use, rather than another bot in
another chat app. Panels ship independently, so each is either genuinely working
or explicitly labelled as not yet built — there are no half-finished screens
pretending to be features.

## Status

| Panel | State | Notes |
| --- | --- | --- |
| **NFT Finder** | **Live** | Reads public RPC endpoints directly. No API key, no provider account. |
| Wallet Tracker | Planned | Needs `wallet-tracker-bot` writing to a hosted Postgres, plus valid Moralis + Alchemy keys. |
| Mint | Planned | Needs `my-mint-bot`'s runner wired to a shared data source. |

## NFT Finder

> Paste a collection contract, paste your wallets, and see which of them hold it.

This exists because working out *which* of my wallets holds a given NFT meant
opening each wallet in an explorer and checking one at a time.

It answers that with `eth_call` against public RPC nodes:

1. **Detect the standard.** `supportsInterface(0x80ac58cd)` / `(0xd9b67a26)` via
   ERC-165. A contract that does not implement ERC-165 is reported as
   `unknown` and read with the ERC-721 signature, rather than being claimed as
   ERC-721.
2. **Read the collection name/symbol** for labelling (`name()`, `symbol()`).
3. **Query each wallet** with `balanceOf(address)` (ERC-721) or
   `balanceOf(address,uint256)` (ERC-1155), at most 6 in flight at once so a long
   wallet list cannot open a burst of sockets.

### No API keys, by design

This panel needs no credentials at all. Public RPC plus hand-rolled ABI encoding
(see `src/lib/erc.ts`) means there is nothing to sign up for, nothing to leak, and
no per-request cost — which is also what makes it viable on a free serverless
tier. Set `RPC_URL_<CHAIN>` in `.env.local` only if a public endpoint throttles
you.

### Verified

Run against a live chain:

| Input | Result |
| --- | --- |
| ENS BaseRegistrar + `vitalik.eth` | `200`, detected `erc721`, **473 tokens held** |
| BAYC + 2 unrelated wallets | `200`, symbol `BAYC`, 0 of 2 hold it, ~1s |
| Contract `0x123` | `400` — "Contract must be a 0x… address (40 hex characters)." |
| Chain `doge` | `400` — lists the valid chains |
| Wallets `hello world` | `400` — "No valid wallet addresses found." |

## Privacy

Wallet lists are kept in the browser's `localStorage` and are **not** committed,
bundled, or persisted server-side. The request holds them only for the duration of
the lookup. Nothing in this repo contains a wallet address, a private key, or an
API key.

## Layout

```
src/
  app/
    page.tsx                    dashboard shell, one section per panel
    api/find-holders/route.ts   POST endpoint; validates input, caps fan-out
  components/
    FinderPanel.tsx             client panel: form, validation preview, results
    Panel.tsx                   shared panel chrome, field + input styling
  lib/
    chains.ts                   chain registry (public RPCs, no secrets)
    erc.ts                      ABI encode/decode — pure, no network
    rpc.ts                      JSON-RPC with failover + bounded concurrency
    wallets.ts                  wallet-list parsing — pure
    finder.ts                   standard detection + holder lookup
test/                           unit tests for every pure module
```

### Why the pure/impure split

`erc.ts`, `wallets.ts` and the `summarize()`/`pickPrimaryPair()` helpers contain
no network calls, so the rules that are easy to get subtly wrong — address
normalisation, duplicate handling, what counts as a holder, what a failed call
means — are unit-testable without a chain. Everything that talks to a node is a
thin layer over them.

## Local development

```bash
npm install
npm run dev          # http://localhost:3000
```

Requires Node 22 or newer.

```bash
npm test             # vitest
npm run lint
npm run typecheck
npm run build
```

CI runs all four on Node 22 and 24.

## Roadmap

1. ~~NFT Finder~~ — done.
2. **Wallet Tracker panel** — move `wallet-tracker-bot`'s storage from local
   SQLite to hosted Postgres, so a deployed dashboard can read real trades while
   the poller keeps running on my laptop.
3. **Mint panel** — surface scheduled mints, gas waits and per-wallet results.
4. **NFT Finder follow-ups** — ENS/collection-name resolution from a contract,
   holder counts for a whole collection, and a shareable read-only result link.

## Deploying

Vercel, with no configuration and no environment variables:

```bash
npx vercel
```

The Finder works immediately on deploy. The `api/find-holders` route is
request-time (serverless) and the page itself is static.
