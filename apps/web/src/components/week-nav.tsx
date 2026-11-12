// Previous / current / next week links. Presentational: hrefs come from the caller.
import Link from 'next/link';

export function WeekNav({
  week,
  maxWeek,
  hrefFor,
}: {
  week: number;
  maxWeek: number;
  hrefFor: (week: number) => string;
}) {
  const link = 'rounded-lg border border-border px-3 py-1 hover:border-accent';
  const off = 'rounded-lg border border-border px-3 py-1 opacity-40';
  return (
    <nav aria-label="Week" className="flex items-center gap-2 text-sm">
      {week > 1 ? (
        <Link href={hrefFor(week - 1)} className={link} aria-label="Previous week">
          ‹
        </Link>
      ) : (
        <span aria-hidden className={off}>
          ‹
        </span>
      )}
      <span className="min-w-20 text-center font-semibold">Week {week}</span>
      {week < maxWeek ? (
        <Link href={hrefFor(week + 1)} className={link} aria-label="Next week">
          ›
        </Link>
      ) : (
        <span aria-hidden className={off}>
          ›
        </span>
      )}
    </nav>
  );
}
