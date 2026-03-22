"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { type Property, formatINR, percentSold } from "@/app/lib/types";
import { useAuth } from "@/app/components/AuthProvider";
import AuthGateModal from "@/app/components/AuthGateModal";

const TYPE_COLORS: Record<string, string> = {
  agricultural: "bg-emerald-600/80",
  residential: "bg-sky-600/80",
  commercial: "bg-landly-gold/80",
};

export default function PropertyCard({
  property,
  index = 0,
}: {
  property: Property;
  index?: number;
}) {
  const { user } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const sold = percentSold(property);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        delay: index * 0.08,
        ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
      }}
    >
      <Link href={`/property/${property.id}`} className="group block">
        <div className="overflow-hidden rounded-[var(--radius-land)] border border-landly-slate/10 bg-landly-navy-deep/60 transition-all duration-300 group-hover:-translate-y-1 group-hover:border-landly-slate/25 group-hover:shadow-lg group-hover:shadow-black/20">
          {/* image area */}
          <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-landly-navy to-landly-navy-deep">
            {/* placeholder gradient pattern */}
            <div className="absolute inset-0 opacity-30" style={{
              backgroundImage: "radial-gradient(circle at 30% 40%, rgba(245,158,11,0.15) 0%, transparent 60%), radial-gradient(circle at 70% 60%, rgba(5,150,105,0.1) 0%, transparent 50%)",
            }} />
            {/* type badge */}
            <span className={`absolute top-3 left-3 rounded-full px-3 py-1 text-xs font-semibold text-white ${TYPE_COLORS[property.type] || "bg-landly-slate"}`}>
              {property.type.charAt(0).toUpperCase() + property.type.slice(1)}
            </span>
          </div>

          {/* content */}
          <div className="p-5">
            <h3 className="font-sans text-base font-semibold text-landly-offwhite transition-colors group-hover:text-landly-gold">
              {property.title}
            </h3>
            <p className="mt-1 text-xs text-landly-slate">{property.location}</p>

            {/* key figures */}
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div>
                <span className="block font-mono text-sm font-semibold text-landly-gold">
                  {formatINR(property.total_value)}
                </span>
                <span className="block text-[10px] uppercase tracking-wider text-landly-slate">
                  Total Value
                </span>
              </div>
              <div>
                <span className="block font-mono text-sm font-semibold text-landly-gold">
                  {formatINR(property.share_price)}
                </span>
                <span className="block text-[10px] uppercase tracking-wider text-landly-slate">
                  Per Share
                </span>
              </div>
              <div>
                <span className="block font-mono text-sm font-semibold text-landly-offwhite">
                  {property.shares_available}
                </span>
                <span className="block text-[10px] uppercase tracking-wider text-landly-slate">
                  Available
                </span>
              </div>
            </div>

            {/* progress bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-landly-slate">
                <span>{sold}% funded</span>
                <span>{property.total_shares - property.shares_available} / {property.total_shares} shares</span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-landly-slate/20">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${sold}%` }}
                  transition={{ duration: 1, delay: index * 0.08 + 0.3, ease: "easeOut" }}
                  className="h-full rounded-full bg-landly-green"
                />
              </div>
            </div>

            {/* CTA */}
            <div className="mt-5">
              <span
                role="button"
                onClick={(e) => {
                  if (!user) {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowAuthModal(true);
                  }
                }}
                className="block w-full rounded-[var(--radius-land)] bg-landly-green/10 py-2.5 text-center text-sm font-semibold text-landly-green transition-all group-hover:bg-landly-green group-hover:text-white"
              >
                Invest Now
              </span>
            </div>
          </div>
        </div>
      </Link>

      {showAuthModal && <AuthGateModal onClose={() => setShowAuthModal(false)} />}
    </motion.div>
  );
}
