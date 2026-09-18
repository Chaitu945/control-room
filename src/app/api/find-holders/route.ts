/**
 * POST /api/find-holders
 *
 * Body: { chain: string, contract: string, wallets: string, tokenId?: string }
 *
 * Returns which of the supplied wallets hold the collection, plus per-wallet
 * detail. No API key is required — this reads public RPC nodes directly.
 */

import { getChain, isKnownChain } from "@/lib/chains";
import { findHolders } from "@/lib/finder";
import { isEvmAddress } from "@/lib/erc";
import { parseWalletList } from "@/lib/wallets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Cap the fan-out so one request cannot be used to hammer public endpoints. */
const MAX_WALLETS = 60;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  const { chain: chainKey, contract, wallets, tokenId } = (body ?? {}) as Record<string, unknown>;

  if (typeof chainKey !== "string" || !isKnownChain(chainKey)) {
    return Response.json({ error: `Unknown chain. Expected one of: eth, robinhood, ink, base, polygon, arbitrum.` }, { status: 400 });
  }
  const chain = getChain(chainKey);
  if (!chain) return Response.json({ error: "Unknown chain." }, { status: 400 });

  if (typeof contract !== "string" || !isEvmAddress(contract)) {
    return Response.json({ error: "Contract must be a 0x… address (40 hex characters)." }, { status: 400 });
  }

  const parsed = parseWalletList(typeof wallets === "string" ? wallets : "");
  if (parsed.valid.length === 0) {
    return Response.json(
      {
        error: "No valid wallet addresses found.",
        rejected: parsed.rejected.slice(0, 10),
      },
      { status: 400 }
    );
  }

  const selected = parsed.valid.slice(0, MAX_WALLETS);

  try {
    const result = await findHolders({
      chain,
      contract,
      wallets: selected,
      tokenId: typeof tokenId === "string" && tokenId.trim() ? tokenId.trim() : undefined,
    });

    return Response.json({
      ...result,
      // Echo back the parse so the UI can show what it ignored rather than
      // silently searching a different set than the user pasted.
      input: {
        parsedWallets: parsed.valid.length,
        searchedWallets: selected.length,
        truncated: parsed.valid.length > MAX_WALLETS,
        rejected: parsed.rejected.slice(0, 10),
        duplicates: parsed.duplicates,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error.";
    return Response.json({ error: message }, { status: 502 });
  }
}
