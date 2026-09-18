/**
 * Chain registry.
 *
 * Deliberately key-free: every endpoint here is a public JSON-RPC node, so the
 * deployed app works with no provider account and no secrets. A paid endpoint can
 * be supplied per chain through env (see rpcEnvKey) when the public ones throttle.
 */

export type ChainKind = "evm";

export interface Chain {
  /** Stable key used in URLs and API payloads. */
  key: string;
  label: string;
  kind: ChainKind;
  /** Public, key-free JSON-RPC endpoint. */
  rpc: string;
  /** Used when the primary endpoint fails or rate-limits. */
  fallbackRpc?: string;
  explorer: string;
  /** Env var name that overrides `rpc` when set (e.g. a paid endpoint). */
  rpcEnvKey: string;
  /** Native currency symbol, for display only. */
  nativeSymbol: string;
}

export const CHAINS: Record<string, Chain> = {
  eth: {
    key: "eth",
    label: "Ethereum",
    kind: "evm",
    rpc: "https://ethereum-rpc.publicnode.com",
    fallbackRpc: "https://eth.drpc.org",
    explorer: "https://etherscan.io/token/",
    rpcEnvKey: "RPC_URL_ETH",
    nativeSymbol: "ETH",
  },
  robinhood: {
    key: "robinhood",
    label: "Robinhood Chain",
    kind: "evm",
    rpc: "https://rpc.mainnet.chain.robinhood.com",
    explorer: "https://robinhoodchain.blockscout.com/token/",
    rpcEnvKey: "RPC_URL_ROBINHOOD",
    nativeSymbol: "ETH",
  },
  ink: {
    key: "ink",
    label: "Ink Chain",
    kind: "evm",
    rpc: "https://rpc-gel.inkonchain.com",
    explorer: "https://explorer.inkonchain.com/token/",
    rpcEnvKey: "RPC_URL_INK",
    nativeSymbol: "ETH",
  },
  base: {
    key: "base",
    label: "Base",
    kind: "evm",
    rpc: "https://base-rpc.publicnode.com",
    explorer: "https://basescan.org/token/",
    rpcEnvKey: "RPC_URL_BASE",
    nativeSymbol: "ETH",
  },
  polygon: {
    key: "polygon",
    label: "Polygon",
    kind: "evm",
    rpc: "https://polygon-bor-rpc.publicnode.com",
    explorer: "https://polygonscan.com/token/",
    rpcEnvKey: "RPC_URL_POLYGON",
    nativeSymbol: "POL",
  },
  arbitrum: {
    key: "arbitrum",
    label: "Arbitrum One",
    kind: "evm",
    rpc: "https://arbitrum-one-rpc.publicnode.com",
    explorer: "https://arbiscan.io/token/",
    rpcEnvKey: "RPC_URL_ARBITRUM",
    nativeSymbol: "ETH",
  },
};

export const CHAIN_KEYS = Object.keys(CHAINS);

export function isKnownChain(key: string): boolean {
  return Object.prototype.hasOwnProperty.call(CHAINS, key);
}

export function getChain(key: string): Chain | null {
  return isKnownChain(key) ? CHAINS[key] : null;
}

/** Nav/label helper that keeps ordering stable across server and client renders. */
export function chainOptions(): { value: string; label: string }[] {
  return CHAIN_KEYS.map((key) => ({ value: key, label: CHAINS[key].label }));
}
