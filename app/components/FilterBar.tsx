"use client";

import { motion } from "framer-motion";

const TYPES = ["All", "Agricultural", "Residential", "Commercial"] as const;
export type PropertyFilter = (typeof TYPES)[number];

export default function FilterBar({
  active,
  onChange,
}: {
  active: PropertyFilter;
  onChange: (filter: PropertyFilter) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {TYPES.map((type) => (
        <button
          key={type}
          onClick={() => onChange(type)}
          className={`relative rounded-full px-5 py-2 text-sm font-medium transition-colors ${
            active === type
              ? "text-landly-gold"
              : "text-landly-slate hover:text-landly-offwhite"
          }`}
        >
          {active === type && (
            <motion.span
              layoutId="filter-pill"
              className="absolute inset-0 rounded-full border border-landly-gold/50 bg-landly-gold/5"
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            />
          )}
          <span className="relative">{type}</span>
        </button>
      ))}
    </div>
  );
}
