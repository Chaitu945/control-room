/**
 * "Which of my wallets hold this collection?" — the core of the NFT Finder panel.
 *
 * Key-free by design: it reads balances straight from public RPC nodes with
 * eth_call, so there is no provider account to configure, no API key to leak, and
 * no per-request cost. That is what makes it viable as the first working panel of
 * this dashboard.
 */

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
} from "./erc";
import { ethCall, mapLimit, type RpcOutcome } from "./rpc";
import type { Chain } from "./chains";

export type Standard = "erc721" | "erc1155" | "unknown";

export interface HolderRow {
  address: string;
  /** Token count held, or null when the call failed. */
  balance: number | null;
  held: boolean;
  error?: string;
}

export interface FindHoldersResult {
  chain: string;
  chainLabel: string;
  contract: string;
  standard: Standard;
  /** ERC-1155 balance queries are per-token-id, so the id used is reported back. */
  tokenId: string | null;
  contractName: string | null;
  contractSymbol: string | null;
  totalWallets: number;
  rows: HolderRow[];
  holders: string[];
  errored: number;
  durationMs: number;
}

const CONCURRENCY = 6;

/**
 * Detect the token standard via ERC-165 supportsInterface.
 *
 * Returns "unknown" rather than guessing when the contract does not implement
 * ERC-165, so the UI can say "assuming ERC-721" instead of implying certainty.
 */
export async function detectStandard(chain: Chain, contract: string): Promise<Standard> {
  const [is721, is1155] = await Promise.all([
    ethCall(chain, contract, encodeSupportsInterface(INTERFACE_ID.ERC721)),
    ethCall(chain, contract, encodeSupportsInterface(INTERFACE_ID.ERC1155)),
  ]);

  if (decodeBool(is721.result) === true) return "erc721";
  if (decodeBool(is1155.result) === true) return "erc1155";
  return "unknown";
}

async function readMetadata(chain: Chain, contract: string): Promise<{ name: string | null; symbol: string | null }> {
  const [name, symbol] = await Promise.all([
    ethCall(chain, contract, SELECTOR.name),
    ethCall(chain, contract, SELECTOR.symbol),
  ]);
  return { name: decodeString(name.result), symbol: decodeString(symbol.result) };
}

/** Pure aggregation so the counting rules are testable without a chain. */
export function summarize(rows: readonly HolderRow[]): {
  holders: string[];
  errored: number;
  totalBalance: number;
} {
  const holders: string[] = [];
  let errored = 0;
  let totalBalance = 0;

  for (const row of rows) {
    if (row.error) {
      errored += 1;
      continue;
    }
    if (typeof row.balance === "number" && row.balance > 0) {
      holders.push(row.address);
      totalBalance += row.balance;
    }
  }

  return { holders, errored, totalBalance };
}

export interface FindHoldersInput {
  chain: Chain;
  contract: string;
  wallets: readonly string[];
  /** Required for ERC-1155; ignored for ERC-721. */
  tokenId?: string;
}

export async function findHolders(input: FindHoldersInput): Promise<FindHoldersResult> {
  const started = Date.now();
  const { chain } = input;
  const contract = normalizeAddress(input.contract);

  if (!isEvmAddress(contract)) throw new Error(`not a contract address: ${input.contract}`);

  const standard = await detectStandard(chain, contract);
  const metadata = await readMetadata(chain, contract);

  // Non-ERC-1155 contracts are read with the ERC-721 signature, which is also
  // what most non-ERC-165 collections actually implement.
  const useErc1155 = standard === "erc1155";
  const tokenId = useErc1155 ? (input.tokenId ?? "1") : null;

  const rows = await mapLimit(input.wallets, CONCURRENCY, async (wallet): Promise<HolderRow> => {
    const data = useErc1155 ? encodeBalanceOf1155(wallet, tokenId as string) : encodeBalanceOf(wallet);
    const outcome: RpcOutcome = await ethCall(chain, contract, data);

    if (outcome.result === undefined) {
      return { address: wallet, balance: null, held: false, error: outcome.error ?? "call failed" };
    }

    const balance = decodeUint(outcome.result);
    if (balance === null) {
      return { address: wallet, balance: null, held: false, error: "unreadable balance response" };
    }
    return { address: wallet, balance, held: balance > 0 };
  });

  const { holders, errored } = summarize(rows);

  return {
    chain: chain.key,
    chainLabel: chain.label,
    contract,
    standard,
    tokenId,
    contractName: metadata.name,
    contractSymbol: metadata.symbol,
    totalWallets: input.wallets.length,
    rows,
    holders,
    errored,
    durationMs: Date.now() - started,
  };
}
