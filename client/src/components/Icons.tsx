import React from "react";

/**
 * A small, self-contained icon set drawn as inline SVG.
 *
 * These are deliberately not FontAwesome: a webfont would add a network
 * request, a licence to track and a flash of missing glyphs. Inline SVG
 * inherits the current colour, scales cleanly and costs nothing at runtime.
 */

export type IconKey =
  | "candy"
  | "heart"
  | "cake"
  | "calendar"
  | "gift"
  | "crown"
  | "sparkle"
  | "star"
  | "balloon"
  | "cloud"
  | "flower"
  | "paw"
  | "music"
  | "icecream"
  | "rainbow"
  | "sun";

const S = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

const SHAPES: Record<IconKey, { label: string; node: React.ReactNode }> = {
  candy: {
    label: "Candy",
    node: (
      <>
        <circle cx="12" cy="12" r="4.5" {...S} />
        <path d="M7.8 10.2 4 7.5v9l3.8-2.7M16.2 10.2 20 7.5v9l-3.8-2.7" {...S} />
      </>
    ),
  },
  heart: {
    label: "Heart",
    node: <path d="M12 20s-7-4.6-7-9.4A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7 2.6C19 15.4 12 20 12 20Z" {...S} />,
  },
  cake: {
    label: "Cake",
    node: (
      <>
        <path d="M4 20h16v-6H4v6ZM4 14c1.6 0 1.6-1.4 3.2-1.4S8.8 14 10.4 14s1.6-1.4 3.2-1.4S15.2 14 16.8 14 18.4 12.6 20 12.6" {...S} />
        <path d="M12 9V6" {...S} />
        <circle cx="12" cy="4.6" r="1.2" {...S} />
      </>
    ),
  },
  calendar: {
    label: "Calendar",
    node: (
      <>
        <rect x="4" y="6" width="16" height="14" rx="2.5" {...S} />
        <path d="M4 10.5h16M8.5 4v4M15.5 4v4" {...S} />
      </>
    ),
  },
  gift: {
    label: "Gift",
    node: (
      <>
        <rect x="4" y="10" width="16" height="10" rx="2" {...S} />
        <path d="M4 13.5h16M12 10v10" {...S} />
        <path d="M12 10S10.6 6 8.6 6a2 2 0 1 0 0 4M12 10s1.4-4 3.4-4a2 2 0 1 1 0 4" {...S} />
      </>
    ),
  },
  crown: {
    label: "Crown",
    node: (
      <>
        <path d="M4 8.5 7 14l5-7 5 7 3-5.5V18H4V8.5Z" {...S} />
        <path d="M4 20h16" {...S} />
      </>
    ),
  },
  sparkle: {
    label: "Sparkle",
    node: (
      <>
        <path d="M12 3.5c0 4 1.5 5.5 5.5 5.5-4 0-5.5 1.5-5.5 5.5 0-4-1.5-5.5-5.5-5.5 4 0 5.5-1.5 5.5-5.5Z" {...S} />
        <path d="M17.5 15c0 2 .8 2.8 2.8 2.8-2 0-2.8.8-2.8 2.8 0-2-.8-2.8-2.8-2.8 2 0 2.8-.8 2.8-2.8Z" {...S} />
      </>
    ),
  },
  star: {
    label: "Star",
    node: <path d="m12 3.8 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 10l5.9-.9L12 3.8Z" {...S} />,
  },
  balloon: {
    label: "Balloon",
    node: (
      <>
        <path d="M12 4c3 0 5 2.4 5 5.4S14.5 16 12 16s-5-3.6-5-6.6S9 4 12 4Z" {...S} />
        <path d="M12 16v1.6M12 17.6c1.4.6 1.4 2 0 2.6" {...S} />
      </>
    ),
  },
  cloud: {
    label: "Cloud",
    node: <path d="M7.5 18h9.2a3.3 3.3 0 0 0 .3-6.6A5 5 0 0 0 8 9.6 3.7 3.7 0 0 0 7.5 18Z" {...S} />,
  },
  flower: {
    label: "Flower",
    node: (
      <>
        <circle cx="12" cy="10" r="2.2" {...S} />
        <path d="M12 4.5a2.7 2.7 0 0 1 0 5.4M12 15.5a2.7 2.7 0 0 1 0-5.4M6.6 7.2a2.7 2.7 0 0 1 4.7 2.7M17.4 12.8a2.7 2.7 0 0 1-4.7-2.7M6.6 12.8a2.7 2.7 0 0 0 4.7-2.7M17.4 7.2a2.7 2.7 0 0 0-4.7 2.7" {...S} />
        <path d="M12 15.5V20" {...S} />
      </>
    ),
  },
  paw: {
    label: "Paw",
    node: (
      <>
        <ellipse cx="12" cy="15.5" rx="4" ry="3.4" {...S} />
        <ellipse cx="6.6" cy="11" rx="1.8" ry="2.2" {...S} />
        <ellipse cx="17.4" cy="11" rx="1.8" ry="2.2" {...S} />
        <ellipse cx="9.6" cy="7" rx="1.7" ry="2.1" {...S} />
        <ellipse cx="14.4" cy="7" rx="1.7" ry="2.1" {...S} />
      </>
    ),
  },
  music: {
    label: "Music",
    node: (
      <>
        <path d="M9 17V6l10-2v11" {...S} />
        <circle cx="7" cy="17" r="2" {...S} />
        <circle cx="17" cy="15" r="2" {...S} />
      </>
    ),
  },
  icecream: {
    label: "Ice cream",
    node: (
      <>
        <path d="M8 10h8l-4 10-4-10Z" {...S} />
        <path d="M8 10a4 4 0 0 1 8 0" {...S} />
        <circle cx="12" cy="5.2" r="1.4" {...S} />
      </>
    ),
  },
  rainbow: {
    label: "Rainbow",
    node: (
      <>
        <path d="M3 18a9 9 0 0 1 18 0" {...S} />
        <path d="M6.5 18a5.5 5.5 0 0 1 11 0" {...S} />
        <path d="M10 18a2 2 0 0 1 4 0" {...S} />
      </>
    ),
  },
  sun: {
    label: "Sun",
    node: (
      <>
        <circle cx="12" cy="12" r="4" {...S} />
        <path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6" {...S} />
      </>
    ),
  },
};

export const ICON_KEYS = Object.keys(SHAPES) as IconKey[];

export function iconLabel(key: string): string {
  return SHAPES[key as IconKey]?.label ?? key;
}

export function Icon({ name, size = 24, className }: { name: string; size?: number; className?: string }) {
  const shape = SHAPES[name as IconKey];
  if (!shape) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      {shape.node}
    </svg>
  );
}
