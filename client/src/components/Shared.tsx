import React from "react";
import { Link } from "react-router-dom";

export function EmptyState({ title = "Coming soon", text = "There's nothing here yet. Check back soon!" }: { title?: string; text?: string }) {
  return (
    <div className="text-center py-20">
      <div className="text-5xl mb-4">✦</div>
      <h3 className="text-xl font-extrabold uppercase mb-2">{title}</h3>
      <p className="text-body">{text}</p>
    </div>
  );
}

export function BackLink({ to = "/collections", label = "BACK TO COLLECTIONS" }: { to?: string; label?: string }) {
  return (
    <div className="max-w-[1280px] mx-auto px-6 lg:px-10 pt-6 md:pt-10">
      <Link to={to} className="btn-label text-body hover:text-ink inline-flex items-center gap-1">
        ‹ {label}
      </Link>
    </div>
  );
}

/**
 * Rarity badge. Colours come from CSS variables that Layout writes from the
 * site settings, so the admin can restyle them without a deploy.
 */
export function Badge({ label = "COMMON", rarity }: { label?: string; rarity?: string }) {
  if (!label) return null;
  const key = (rarity || "common").toLowerCase().replace(/\s+/g, "_");
  return (
    <span
      className="text-[11px] font-extrabold uppercase tracking-wider px-3 py-1.5 rounded-md inline-block"
      style={{
        background: `var(--rarity-${key}-bg, var(--candy-pink-100))`,
        color: `var(--rarity-${key}-fg, var(--candy-pink))`,
      }}
    >
      {label}
    </span>
  );
}

/** Elegant clean placeholder figure: a bear silhouette rendered as SVG */
export function FigurePlaceholder({
  color = "#FF5FA2",
  label,
  mystery = false,
  size = 200,
}: {
  color?: string;
  label?: string;
  mystery?: boolean;
  size?: number;
}) {
  return (
    <div className="flex items-center justify-center w-full" style={{ height: size * 1.5 }}>
      {mystery ? (
        <svg width={size} height={size * 1.3} viewBox="0 0 200 260" fill="none">
          <circle cx="70" cy="45" r="26" fill="#F2C14E" />
          <circle cx="130" cy="45" r="26" fill="#F2C14E" />
          <ellipse cx="100" cy="150" rx="70" ry="80" fill="#F2C14E" />
          <text x="100" y="165" textAnchor="middle" fontSize="72" fontWeight="800" fill="#8A6A12">
            ?
          </text>
        </svg>
      ) : (
        <svg width={size} height={size * 1.3} viewBox="0 0 200 260" fill="none">
          <circle cx="70" cy="45" r="26" fill={color} />
          <circle cx="130" cy="45" r="26" fill={color} />
          <ellipse cx="100" cy="150" rx="70" ry="80" fill={color} />
          <circle cx="78" cy="140" r="7" fill="#fff" opacity="0.85" />
          <circle cx="122" cy="140" r="7" fill="#fff" opacity="0.85" />
          <ellipse cx="100" cy="168" rx="14" ry="10" fill="#fff" opacity="0.85" />
        </svg>
      )}
    </div>
  );
}
