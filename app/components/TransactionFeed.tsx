"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { type Transaction } from "@/app/lib/types";
import { supabase } from "@/lib/supabase";

export default function TransactionFeed({ propertyId }: { propertyId: string }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [nowTimestamp, setNowTimestamp] = useState(() => Date.now());

  useEffect(() => {
    /* Load recent transactions for this property */
    supabase
      .from("transactions")
      .select("*")
      .eq("property_id", propertyId)
      .order("created_at", { ascending: false })
      .limit(10)
      .then(({ data }) => {
        if (data) setTransactions(data);
      });

    /* Subscribe to new inserts for this property */
    const channel = supabase
      .channel(`tx-feed-${propertyId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "transactions",
          filter: `property_id=eq.${propertyId}`,
        },
        (payload) => {
          const tx = payload.new as Transaction;
          setTransactions((prev) => [tx, ...prev].slice(0, 10));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [propertyId]);

  useEffect(() => {
    const updateClock = () => setNowTimestamp(Date.now());
    const interval = window.setInterval(updateClock, 60000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  function timeAgo(iso: string) {
    const diff = Math.floor((nowTimestamp - new Date(iso).getTime()) / 1000);
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
