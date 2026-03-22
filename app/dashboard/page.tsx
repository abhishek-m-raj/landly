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
  const [holdings, setHoldings] = useState<(Holding & { property?: Property })[]>([]);
  const [transactions, setTransactions] = useState<(Transaction & { property?: Property })[]>([]);
  const [listedProperties, setListedProperties] = useState<Property[]>([]);
  const [userRole, setUserRole] = useState<"investor" | "owner" | "admin" | null>(null);
  const [loading, setLoading] = useState(true);

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

      const metadataRole = typeof user.user_metadata?.role === "string"
        ? user.user_metadata.role as "investor" | "owner" | "admin"
        : null;
      const storedRole = typeof window !== "undefined"
        ? window.localStorage.getItem("landly-user-role") as "investor" | "owner" | "admin" | null
        : null;

      if (metadataRole) {
        setUserRole(metadataRole);
        window.localStorage.setItem("landly-user-role", metadataRole);
      } else if (storedRole) {
        setUserRole(storedRole);
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      const resolvedRole = (profileData?.role as "investor" | "owner" | "admin" | undefined) ?? metadataRole ?? storedRole;
      if (resolvedRole) {
        setUserRole(resolvedRole);
        window.localStorage.setItem("landly-user-role", resolvedRole);
      }

      const [holdingsRes, txRes, listedRes] = await Promise.all([
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
        supabase
          .from("properties")
          .select("*")
          .eq("owner_id", user.id)
          .order("created_at", { ascending: false }),
      ]);

      if (holdingsRes.data) setHoldings(holdingsRes.data);
      if (txRes.data) setTransactions(txRes.data);
      if (listedRes.data) setListedProperties(listedRes.data);
      setLoading(false);
    }
    load();
  }, []);

  const totalInvested = holdings.reduce((sum, h) => sum + h.total_invested, 0);
  const totalCurrentValue = holdings.reduce((sum, h) => {
    const prop = h.property;
    return sum + (prop ? h.shares_owned * prop.share_price : h.total_invested);
  }, 0);
  const totalGain = totalCurrentValue - totalInvested;
  const gainPct = totalInvested > 0 ? ((totalGain / totalInvested) * 100).toFixed(1) : "0";
  const isOwner = userRole === "owner";
  const ownerRaised = listedProperties.reduce((sum, property) => {
    const listedShares = Math.floor((property.total_shares * (property.fraction_listed ?? 100)) / 100);
    const soldShares = Math.max(0, listedShares - property.shares_available);
    return sum + soldShares * property.share_price;
  }, 0);
  const liveListings = listedProperties.filter((property) => property.status === "live").length;
  const pendingListings = listedProperties.filter((property) => property.status === "pending").length;

  const ownerStatusClasses: Record<Property["status"], string> = {
    pending: "bg-landly-gold/10 text-landly-gold",
    verified: "bg-landly-green/10 text-landly-green",
    live: "bg-landly-green/10 text-landly-green",
    rejected: "bg-landly-red/10 text-landly-red",
    sold: "bg-landly-slate/20 text-landly-offwhite",
  };

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
            <h1 className="font-sans text-3xl font-bold text-landly-offwhite">
              {isOwner ? "Owner Dashboard" : "Dashboard"}
            </h1>
            <p className="mt-2 text-sm text-landly-slate">
              {isOwner
                ? "Track listed properties, review status, and see how much capital each listing has unlocked."
                : "Monitor your portfolio, holdings, and recent activity in one place."}
            </p>
          </motion.div>

          {isOwner && (
            <motion.div variants={fadeUp(0.04)} className="mt-8 grid gap-4 sm:grid-cols-4">
              {[
                { label: "Listed Properties", value: listedProperties.length.toString() },
                { label: "Live Listings", value: liveListings.toString() },
                { label: "Pending Review", value: pendingListings.toString() },
                { label: "Capital Unlocked", value: formatINR(ownerRaised) },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-[var(--radius-land)] border border-landly-slate/10 bg-landly-navy-deep/60 p-5"
                >
                  <span className="block text-[10px] font-medium uppercase tracking-wider text-landly-slate">
                    {item.label}
                  </span>
                  <span className="mt-1 block font-mono text-xl font-semibold text-landly-gold">
                    {item.value}
                  </span>
                </div>
              ))}
            </motion.div>
          )}

          {isOwner && (
            <motion.div variants={fadeUp(0.08)} className="mt-10">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-sans text-xl font-semibold text-landly-offwhite">Your Listed Properties</h2>
                  <p className="mt-1 text-sm text-landly-slate">
                    Each listing shows review status and the capital unlocked so far.
                  </p>
                </div>
                <Link
                  href="/list-property"
                  className="inline-flex h-11 items-center justify-center rounded-[var(--radius-land)] bg-landly-green px-5 text-sm font-semibold text-white transition-all hover:brightness-110"
                >
                  List Another Property
                </Link>
              </div>

              {listedProperties.length === 0 ? (
                <div className="mt-4 rounded-[var(--radius-land)] border border-landly-slate/10 bg-landly-navy-deep/40 p-6">
                  <p className="text-sm text-landly-slate">
                    No properties submitted yet. Start your first listing to unlock capital without fully selling your land.
                  </p>
                </div>
              ) : (
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  {listedProperties.map((property) => {
                    const listedShares = Math.floor((property.total_shares * (property.fraction_listed ?? 100)) / 100);
                    const soldShares = Math.max(0, listedShares - property.shares_available);
                    const amountRaised = soldShares * property.share_price;

                    return (
                      <Link
                        key={property.id}
                        href={`/property/${property.id}`}
                        className="group rounded-[var(--radius-land)] border border-landly-slate/10 bg-landly-navy-deep/50 p-5 transition-all hover:border-landly-slate/25"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="font-sans text-base font-semibold text-landly-offwhite transition-colors group-hover:text-landly-gold">
                              {property.title}
                            </h3>
                            <p className="mt-1 text-xs text-landly-slate">{property.location}</p>
                          </div>
                          <span className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${ownerStatusClasses[property.status]}`}>
                            {property.status}
                          </span>
                        </div>

                        <div className="mt-5 grid grid-cols-3 gap-3">
                          <div>
                            <span className="block font-mono text-sm font-semibold text-landly-gold">
                              {formatINR(amountRaised)}
                            </span>
                            <span className="block text-[10px] uppercase tracking-wider text-landly-slate">Raised</span>
                          </div>
                          <div>
                            <span className="block font-mono text-sm font-semibold text-landly-offwhite">
                              {soldShares}
                            </span>
                            <span className="block text-[10px] uppercase tracking-wider text-landly-slate">Shares Sold</span>
                          </div>
                          <div>
                            <span className="block font-mono text-sm font-semibold text-landly-offwhite">
                              {property.fraction_listed}%
                            </span>
                            <span className="block text-[10px] uppercase tracking-wider text-landly-slate">Listed</span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* portfolio summary */}
          <motion.div variants={fadeUp(0.05)} className="mt-8 grid gap-4 sm:grid-cols-4">
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
          <motion.div variants={fadeUp(0.1)} className="mt-10">
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
          <motion.div variants={fadeUp(0.15)} className="mt-12">
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
