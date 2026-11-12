// Home page (M0 placeholder): proves workspace packages render through the app.
// Replaced by the leagues dashboard in M1.
import { PROVIDER_IDS, SPORT_IDS, getSport } from '@ffc/domain';

const PROVIDER_LABELS: Record<(typeof PROVIDER_IDS)[number], string> = {
  sleeper: 'Sleeper',
  yahoo: 'Yahoo',
};

export default function HomePage() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Fantasy Football Center</h1>
        <p className="text-muted">Every fantasy league you play in, in one place. Coming soon.</p>
      </header>
      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Planned</h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
          <dt className="font-medium">Sports</dt>
          <dd>{SPORT_IDS.map((id) => getSport(id).label).join(', ')}</dd>
          <dt className="font-medium">Providers</dt>
          <dd>{PROVIDER_IDS.map((id) => PROVIDER_LABELS[id]).join(', ')}</dd>
        </dl>
      </section>
    </main>
  );
}
