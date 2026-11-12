// Small round avatar from a provider image, or initials when there is none.
// No inline `style` anywhere: the production CSP blocks style attributes (DESIGN §8 R3), and
// next/image adds one, so this uses a plain <img> with Tailwind size classes.

const SIZE_CLASS = {
  sm: 'size-7',
  md: 'size-8',
  lg: 'size-10',
} as const;

export type AvatarSize = keyof typeof SIZE_CLASS;

export function Avatar({
  src,
  name,
  size = 'md',
}: {
  src: string | null;
  name: string;
  size?: AvatarSize;
}) {
  const sizeClass = SIZE_CLASS[size];
  if (src === null) {
    const initial = name.trim().charAt(0).toUpperCase() || '?';
    return (
      <span
        aria-hidden
        className={`${sizeClass} inline-flex shrink-0 items-center justify-center rounded-full bg-border text-xs font-semibold text-muted`}
      >
        {initial}
      </span>
    );
  }
  return (
    // Provider thumbnails are already small; loading them directly from the CSP-allowed CDN
    // avoids next/image's inline style and image-optimisation quota.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      className={`${sizeClass} shrink-0 rounded-full object-cover`}
    />
  );
}
