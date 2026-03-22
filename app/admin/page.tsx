"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/app/components/Navbar";
import {
  MOCK_PENDING_PROPERTIES,
  formatINR,
  type Property,
} from "@/app/lib/mock-data";

export default function AdminPage() {
  const [pending, setPending] = useState<Property[]>(MOCK_PENDING_PROPERTIES);
  const [decided, setDecided] = useState<{ id: string; action: "approved" | "rejected" }[]>([]);

  const handleAction = (id: string, action: "approved" | "rejected") => {
    setDecided((prev) => [...prev, { id, action }]);
    setPending((prev) => prev.filter((p) => p.id !== id));
  };

  const typeColor: Record<string, string> = {
    agricultural: "text-landly-green",
    residential: "text-sky-400",
    commercial: "text-landly-gold",
  };

  return (
    <div className="flex min-h-svh flex-col bg-landly-navy">
      <Navbar />

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 pt-24 pb-16 md:pt-28">
        <motion.h1
          className="font-sans text-3xl font-bold text-landly-offwhite"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Admin Panel
        </motion.h1>

        <motion.p
          className="mt-2 text-sm text-landly-slate"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { delay: 0.05 } }}
        >
          {pending.length} pending {pending.length === 1 ? "listing" : "listings"} awaiting review
        </motion.p>

        {/* pending list */}
        <div className="mt-8 space-y-4">
          <AnimatePresence>
            {pending.map((prop, i) => (
              <motion.div
                key={prop.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0, transition: { delay: i * 0.06 } }}
                exit={{ opacity: 0, x: -40, transition: { duration: 0.25 } }}
                className="rounded-[var(--radius-land)] border border-landly-slate/10 bg-landly-navy-deep/50 p-5"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-sans text-base font-semibold text-landly-offwhite">
                        {prop.title}
                      </h3>
                      <span className={`text-xs font-medium capitalize ${typeColor[prop.type] ?? "text-landly-slate"}`}>
                        {prop.type}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-landly-slate">{prop.location}</p>
                    <p className="mt-2 text-sm text-landly-offwhite/70 line-clamp-2">
                      {prop.description}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs">
                      <span className="text-landly-slate">
                        Value: <span className="font-mono text-landly-gold">{formatINR(prop.total_value)}</span>
                      </span>
                      <span className="text-landly-slate">
                        Shares: <span className="font-mono text-landly-offwhite">{prop.total_shares}</span>
                      </span>
                      <span className="text-landly-slate">
                        Per share: <span className="font-mono text-landly-offwhite">{formatINR(prop.share_price)}</span>
                      </span>
                      <span className="text-landly-slate">
                        Submitted: {new Date(prop.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => handleAction(prop.id, "approved")}
                      className="rounded-[var(--radius-land)] bg-landly-green/15 px-5 py-2 text-sm font-semibold text-landly-green transition-all hover:bg-landly-green/25"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleAction(prop.id, "rejected")}
                      className="rounded-[var(--radius-land)] bg-landly-red/10 px-5 py-2 text-sm font-semibold text-landly-red transition-all hover:bg-landly-red/20"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {pending.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-16 text-center"
            >
              <p className="text-sm text-landly-slate">No pending listings. All caught up.</p>
            </motion.div>
          )}
        </div>

        {/* action log */}
        {decided.length > 0 && (
          <motion.div
            className="mt-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <h2 className="text-sm font-medium uppercase tracking-wider text-landly-slate">Action Log</h2>
            <div className="mt-3 space-y-2">
              {decided.map((d) => {
                const prop = MOCK_PENDING_PROPERTIES.find((p) => p.id === d.id);
                return (
                  <div
                    key={d.id}
                    className="flex items-center gap-3 text-sm"
                  >
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${
                        d.action === "approved" ? "bg-landly-green" : "bg-landly-red"
                      }`}
                    />
                    <span className="text-landly-offwhite">{prop?.title}</span>
                    <span className={d.action === "approved" ? "text-landly-green" : "text-landly-red"}>
                      {d.action}
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
