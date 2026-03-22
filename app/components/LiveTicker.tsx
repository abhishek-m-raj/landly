"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { type Transaction } from "@/app/lib/types";
import { supabase } from "@/lib/supabase";

export default function LiveTicker() {
  const [current, setCurrent] = useState<Transaction | null>(null);
  const [propNames, setPropNames] = useState<Record<string, string>>({});
  const requestedPropertyIds = useRef(new Set<string>());

  const loadPropName = useCallback(async (propertyId: string) => {
    if (requestedPropertyIds.current.has(propertyId)) {
      return;
    }

    requestedPropertyIds.current.add(propertyId);

    const { data } = await supabase
      .from("properties")
      .select("title")
      .eq("id", propertyId)
      .single();

    if (data?.title) {
      setPropNames((prev) => ({ ...prev, [propertyId]: data.title }));
      return;
    }

    requestedPropertyIds.current.delete(propertyId);
  }, []);

  useEffect(() => {
    /* Load recent transaction + property names */
    async function init() {
      const { data } = await supabase
        .from("transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1);
      if (data?.[0]) {
        setCurrent(data[0]);
        await loadPropName(data[0].property_id);
      }
    }
    init();

    /* Subscribe to new transaction inserts */
    const channel = supabase
      .channel("live-ticker")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "transactions" },
        (payload) => {
          const tx = payload.new as Transaction;
          setCurrent(tx);
          loadPropName(tx.property_id);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [loadPropName]);

  if (!current) return null;

  const propTitle = propNames[current.property_id] ?? "a property";

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
                <span className="font-semibold text-landly-offwhite">{current.user_name || "Demo Investor"}</span>{" "}
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
