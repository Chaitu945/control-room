import { FinderPanel } from "@/components/FinderPanel";
import { Panel } from "@/components/Panel";

function Planned({
  title,
  subtitle,
  items,
  blockedOn,
}: {
  title: string;
  subtitle: string;
  items: string[];
  blockedOn: string;
}) {
  return (
    <Panel title={title} subtitle={subtitle} status={{ label: "planned", tone: "planned" }}>
      <ul className="space-y-2 text-xs text-muted">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted/60" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 border-t border-line pt-3 text-[11px] text-warn">{blockedOn}</p>
    </Panel>
  );
}

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <header className="mb-8">
        <div className="flex items-center gap-2.5">
          <span className="h-2 w-2 rounded-full bg-accent" />
          <h1 className="text-lg font-semibold tracking-tight">Holders</h1>
        </div>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          One place for NFT minting, wallet tracking and holder lookups. Panels ship
          independently: <span className="text-foreground">live</span> means it works
          today, against public RPC endpoints, with no API key and no provider
          account.
        </p>
      </header>

      <div className="space-y-5">
        <FinderPanel />

        <div className="grid gap-5 md:grid-cols-2">
          <Planned
            title="Wallet Overview"
            subtitle="What does a given wallet hold?"
            items={[
              "Paste any address to see its native balance and holdings",
              "Reuses the same key-free RPC path the Finder already uses",
            ]}
            blockedOn="Not built yet, and the reason is worth stating: listing everything a wallet owns needs an asset indexer, which needs an API key. The Finder dodges that by asking one contract about addresses you already know."
          />

          <Planned
            title="Mint"
            subtitle="What am I minting, and did it land?"
            items={[
              "Upcoming drops from mints.json with local countdowns",
              "Gas-wait status and per-wallet mint results",
              "Transaction confirmation with explorer links",
            ]}
            blockedOn="Not built yet: needs my local mint runner wired to a shared data source."
          />
        </div>
      </div>

      <footer className="mt-10 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line pt-5 text-[11px] text-muted">
        <span>Reads public RPC endpoints directly — no API keys.</span>
        <span>Wallet lists stay in your browser.</span>
      </footer>
    </main>
  );
}
