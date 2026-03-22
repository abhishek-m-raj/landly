"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MOCK_PROPERTIES,
  randomTickerEntry,
  type Transaction,
} from "@/app/lib/mock-data";

export default function LiveTicker() {
  const [current, setCurrent] = useState<Transaction | null>(null);

  useEffect(() => {
    /* Rotate a new mock transaction every 4 seconds */
    const tick = () => setCurrent(randomTickerEntry());
    tick();
    const interval = setInterval(tick, 4000);
    return () => clearInterval(interval);
  }, []);

  if (!current) return null;

  const propTitle =
    MOCK_PROPERTIES.find((p) => p.id === current.property_id)?.title ?? "a property";

  return (
    <div className="fixed bottom-0 left-0 z-40 w-full border-t border-landly-slate/10 bg-landly-navy-deep/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-6 py-2.5">
        {/* live indicator */}
        <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-landly-green">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-landly-green opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-landly-green" />
          </span>
          Live
        </span>

        {/* activity message */}
        <div className="min-w-0 flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.p
              key={current.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
              className="truncate text-sm text-landly-offwhite/80"
            >
              <span className="font-semibold text-landly-offwhite">{current.user_name}</span>{" "}
              bought{" "}
              <span className="font-mono font-semibold text-landly-gold">{current.shares}</span>{" "}
              shares of{" "}
              <span className="font-medium text-landly-offwhite">{propTitle}</span>
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
