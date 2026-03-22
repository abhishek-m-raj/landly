"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Navbar from "@/app/components/Navbar";
import { useAuth } from "@/app/components/AuthProvider";
import { type Property, type Holding, type Transaction, formatINR } from "@/app/lib/types";
import { supabase } from "@/lib/supabase";

const fadeUp = (delay: number) => ({
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number], delay },
  },
});

export default function DashboardPage() {
  const router = useRouter();
  const { user: authUser, loading: authLoading } = useAuth();
  const [walletBalance, setWalletBalance] = useState(0);
  const [holdings, setHoldings] = useState<(Holding & { property?: Property })[]>([]);
  const [transactions, setTransactions] = useState<(Transaction & { property?: Property })[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [addingFunds, setAddingFunds] = useState(false);

  // Redirect logged-out users to login
  useEffect(() => {
    if (!authLoading && !authUser) {
      router.replace("/login");
    }
  }, [authLoading, authUser, router]);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUserId(user.id);

      const [walletRes, holdingsRes, txRes] = await Promise.all([
        fetch(`/api/wallet?userId=${user.id}`),
        supabase
          .from("holdings")
          .select("*, property:properties(*)")
          .eq("user_id", user.id),
        supabase
          .from("transactions")
          .select("*, property:properties(*)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      const walletData = await walletRes.json();
      if (walletRes.ok) setWalletBalance(walletData.wallet_balance ?? 0);
      if (holdingsRes.data) setHoldings(holdingsRes.data);
      if (txRes.data) setTransactions(txRes.data);
      setLoading(false);
    }
    load();
  }, []);

  async function handleAddFunds() {
    if (!userId || addingFunds) return;
    setAddingFunds(true);
    const res = await fetch("/api/wallet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    const data = await res.json();
    if (res.ok && data.newBalance != null) setWalletBalance(data.newBalance);
    setAddingFunds(false);
  }

  const totalInvested = holdings.reduce((sum, h) => sum + h.total_invested, 0);
  const totalCurrentValue = holdings.reduce((sum, h) => {
    const prop = h.property;
    return sum + (prop ? h.shares_owned * prop.share_price : h.total_invested);
  }, 0);
  const totalGain = totalCurrentValue - totalInvested;
  const gainPct = totalInvested > 0 ? ((totalGain / totalInvested) * 100).toFixed(1) : "0";

  if (loading) {
    return (
      <div className="flex min-h-svh flex-col bg-landly-navy">
        <Navbar />
        <div className="flex flex-1 items-center justify-center">
          <p className="text-landly-slate">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh flex-col bg-landly-navy">
      <Navbar />

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 pt-24 pb-16 md:pt-28">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
        >
          {/* header */}
          <motion.div variants={fadeUp(0)}>
            <h1 className="font-sans text-3xl font-bold text-landly-offwhite">Dashboard</h1>
          </motion.div>

          {/* wallet */}
          <motion.div variants={fadeUp(0.05)} className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="text-xs font-medium uppercase tracking-wider text-landly-slate">Wallet Balance</span>
              <p className="mt-1 font-mono text-4xl font-bold text-landly-gold">
                {formatINR(walletBalance)}
              </p>
            </div>
            <button
              onClick={handleAddFunds}
              disabled={addingFunds}
              className="rounded-[var(--radius-land)] border border-landly-gold/40 px-6 py-2.5 text-sm font-semibold text-landly-gold transition-all hover:bg-landly-gold/10 disabled:opacity-50"
            >
              {addingFunds ? "Adding…" : "Add ₹10,000"}
            </button>
          </motion.div>

          {/* portfolio summary */}
          <motion.div variants={fadeUp(0.1)} className="mt-10 grid gap-4 sm:grid-cols-4">
            {[
              { label: "Total Invested", value: formatINR(totalInvested) },
              { label: "Current Value", value: formatINR(totalCurrentValue) },
              {
                label: "Gain / Loss",
                value: `${totalGain >= 0 ? "+" : ""}${formatINR(totalGain)} (${gainPct}%)`,
                color: totalGain >= 0 ? "text-landly-green" : "text-landly-red",
              },
              { label: "Properties Held", value: holdings.length.toString() },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-[var(--radius-land)] bg-landly-navy-deep/60 border border-landly-slate/10 p-5"
              >
                <span className="block text-[10px] font-medium uppercase tracking-wider text-landly-slate">
                  {item.label}
                </span>
                <span className={`mt-1 block font-mono text-xl font-semibold ${item.color || "text-landly-gold"}`}>
                  {item.value}
                </span>
              </div>
            ))}
          </motion.div>

          {/* holdings */}
          <motion.div variants={fadeUp(0.15)} className="mt-12">
            <h2 className="font-sans text-xl font-semibold text-landly-offwhite">Your Holdings</h2>

            {holdings.length === 0 ? (
              <p className="mt-4 text-sm text-landly-slate">
                No holdings yet.{" "}
                <Link href="/marketplace" className="text-landly-gold hover:underline">
                  Explore properties
                </Link>
              </p>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {holdings.map((h, i) => {
                  const prop = h.property;
                  const currentVal = prop ? h.shares_owned * prop.share_price : h.total_invested;
                  const gain = currentVal - h.total_invested;
                  const gPct = h.total_invested > 0 ? ((gain / h.total_invested) * 100).toFixed(1) : "0";

                  return (
                    <motion.div
                      key={h.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08 + 0.2 }}
                    >
                      <Link
                        href={`/property/${h.property_id}`}
                        className="group block rounded-[var(--radius-land)] border border-landly-slate/10 bg-landly-navy-deep/50 p-5 transition-all hover:border-landly-slate/25"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-sans text-base font-semibold text-landly-offwhite group-hover:text-landly-gold transition-colors">
                              {prop?.title ?? "Unknown Property"}
                            </h3>
                            <p className="mt-0.5 text-xs text-landly-slate">{prop?.location}</p>
                          </div>
                          <span className={`font-mono text-sm font-semibold ${gain >= 0 ? "text-landly-green" : "text-landly-red"}`}>
                            {gain >= 0 ? "+" : ""}{gPct}%
                          </span>
                        </div>
                        <div className="mt-4 grid grid-cols-3 gap-3">
                          <div>
                            <span className="block font-mono text-sm font-semibold text-landly-offwhite">
                              {h.shares_owned}
                            </span>
                            <span className="block text-[10px] uppercase tracking-wider text-landly-slate">Shares</span>
                          </div>
                          <div>
                            <span className="block font-mono text-sm font-semibold text-landly-gold">
                              {formatINR(h.total_invested)}
                            </span>
                            <span className="block text-[10px] uppercase tracking-wider text-landly-slate">Invested</span>
                          </div>
                          <div>
                            <span className="block font-mono text-sm font-semibold text-landly-gold">
                              {formatINR(currentVal)}
                            </span>
                            <span className="block text-[10px] uppercase tracking-wider text-landly-slate">Value</span>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>

          {/* recent transactions */}
          <motion.div variants={fadeUp(0.2)} className="mt-12">
            <h2 className="font-sans text-xl font-semibold text-landly-offwhite">Recent Transactions</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-landly-slate/10 text-[10px] uppercase tracking-wider text-landly-slate">
                    <th className="pb-3 pr-4 font-medium">Property</th>
                    <th className="pb-3 pr-4 font-medium">Shares</th>
                    <th className="pb-3 pr-4 font-medium">Amount</th>
                    <th className="pb-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.slice(0, 5).map((tx) => {
                    const prop = tx.property;
                    return (
                      <tr key={tx.id} className="border-b border-landly-slate/5">
                        <td className="py-3 pr-4 text-landly-offwhite">{prop?.title ?? "—"}</td>
                        <td className="py-3 pr-4 font-mono text-landly-offwhite">{tx.shares}</td>
                        <td className="py-3 pr-4 font-mono text-landly-gold">{formatINR(tx.total_amount)}</td>
                        <td className="py-3 text-landly-slate">
                          {new Date(tx.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
