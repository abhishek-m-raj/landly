"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { randomTickerEntry, type Transaction } from "@/app/lib/mock-data";

export default function TransactionFeed({ propertyId }: { propertyId: string }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    /* Seed 3 initial + add one every 5 seconds (mock) */
    const initial = Array.from({ length: 3 }, () => {
      const tx = randomTickerEntry();
      return { ...tx, property_id: propertyId };
    });
    setTransactions(initial);

    const interval = setInterval(() => {
      const tx = randomTickerEntry();
      setTransactions((prev) => [{ ...tx, property_id: propertyId }, ...prev].slice(0, 10));
    }, 5000);

    return () => clearInterval(interval);
  }, [propertyId]);

  function timeAgo(iso: string) {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  }

  return (
    <div>
      <h3 className="font-sans text-lg font-semibold text-landly-offwhite">
        Recent Activity
      </h3>
      <div className="mt-4 space-y-2">
        <AnimatePresence initial={false}>
          {transactions.map((tx) => (
            <motion.div
              key={tx.id}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="flex items-center justify-between rounded-[var(--radius-land)] bg-landly-navy-deep/50 px-4 py-3"
            >
              <p className="text-sm text-landly-offwhite/80">
                <span className="font-semibold text-landly-offwhite">{tx.user_name}</span>{" "}
                bought{" "}
                <span className="font-mono font-semibold text-landly-gold">{tx.shares}</span>{" "}
                shares
              </p>
              <span className="text-xs text-landly-slate">{timeAgo(tx.created_at)}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
