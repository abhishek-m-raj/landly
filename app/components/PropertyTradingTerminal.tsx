"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { type Property, formatINR, getListedShares } from "@/app/lib/types";
import { supabase, getAuthHeaders } from "@/lib/supabase";
import { useAuth } from "@/app/components/AuthProvider";

interface PropertyContext extends Pick<
  Property,
  | "shares_available"
  | "total_shares"
  | "status"
  | "estimated_yield"
  | "fraction_listed"
  | "listed_shares"
  | "owner_retained_percent"
  | "total_value"
> {
  monthlyRentalIncome?: number | null;
  propertyAreaLabel?: string | null;
}

function formatStatus(status: Property["status"] | undefined) {
  if (!status) return "Pending";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function statusTone(status: Property["status"] | undefined) {
  if (status === "live") return "bg-landly-green/10 text-landly-green";
  if (status === "verified") return "bg-landly-gold/10 text-landly-gold";
  if (status === "rejected") return "bg-landly-red/10 text-landly-red";
  return "bg-landly-slate/10 text-landly-slate";
}

export default function PropertyTradingTerminal({
  propertyId,
  fallbackPrice,
  property,
  walletBalance: initialWalletBalance = 0,
}: {
  propertyId: string;
  fallbackPrice: number;
  property?: PropertyContext;
  walletBalance?: number;
}) {
  const [tab, setTab] = useState<"buy" | "sell">("buy");
  const [shares, setShares] = useState(1);
  const [processing, setProcessing] = useState(false);
  const [tradeError, setTradeError] = useState("");
  const [tradeSuccess, setTradeSuccess] = useState(false);
  const [walletBalance, setWalletBalance] = useState(initialWalletBalance);
  const [userShares, setUserShares] = useState(0);
  const [sharesAvailable, setSharesAvailable] = useState(property?.shares_available ?? 0);

  const { user: authUser } = useAuth();
  const userId = authUser?.id ?? null;

  useEffect(() => {
    setWalletBalance(initialWalletBalance);
  }, [initialWalletBalance]);

  useEffect(() => {
    setSharesAvailable(property?.shares_available ?? 0);
  }, [property?.shares_available]);

  useEffect(() => {
    if (!userId) {
      setUserShares(0);
      return;
    }

    supabase
      .from("holdings")
      .select("shares_owned")
      .eq("user_id", userId)
      .eq("property_id", propertyId)
      .maybeSingle()
      .then(({ data }) => {
        setUserShares(data?.shares_owned ?? 0);
      });
  }, [propertyId, userId]);

  const currentPrice = fallbackPrice;
  const totalShares = property?.total_shares ?? 0;
  const listedShares = property ? getListedShares(property) : 0;
  const sharesSold = property ? Math.max(0, listedShares - sharesAvailable) : 0;
  const ownerRetainedShares = Math.max(0, totalShares - listedShares);
  const ownerRetainedPercent = totalShares > 0
    ? (ownerRetainedShares / totalShares) * 100
    : property?.owner_retained_percent ?? 0;
  const soldToInvestorsPercent = totalShares > 0 ? (sharesSold / totalShares) * 100 : 0;
  const availableToInvestPercent = totalShares > 0 ? (sharesAvailable / totalShares) * 100 : 0;
  const percentFunded = listedShares > 0 ? (sharesSold / listedShares) * 100 : 0;
  const capitalRaised = sharesSold * currentPrice;
  const fundingTarget = listedShares * currentPrice;
  const capitalOpen = sharesAvailable * currentPrice;
  const reviewStatus = property?.status;
  const estimatedYield = property?.estimated_yield;
  const totalCost = shares * currentPrice;
  const canExecute = tab === "buy"
    ? shares > 0 && shares <= sharesAvailable && totalCost <= walletBalance && !!userId
    : shares > 0 && shares <= userShares && !!userId;

  const progressSegments = useMemo(
    () => Array.from({ length: 12 }, (_, index) => ((index + 1) / 12) * 100),
    []
  );

  async function handleTrade() {
    if (!canExecute || !userId) return;

    setProcessing(true);
    setTradeError("");
    const endpoint = tab === "buy" ? "/api/buy-shares" : "/api/sell-shares";

    try {
      const authHeaders = await getAuthHeaders();
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ propertyId, shares }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setTradeSuccess(true);
        if (data.newWalletBalance != null) {
          setWalletBalance(data.newWalletBalance);
        }

        if (tab === "buy") {
          if (data.sharesRemaining != null) {
            setSharesAvailable(data.sharesRemaining);
          }
          setUserShares((previous) => previous + shares);
        } else {
          if (data.sharesAvailable != null) {
            setSharesAvailable(data.sharesAvailable);
          }
          if (data.sharesRemainingOwned != null) {
            setUserShares(data.sharesRemainingOwned);
          }
        }

        setShares(1);
        setTimeout(() => setTradeSuccess(false), 2600);
      } else {
        setTradeError(data.error || `${tab} failed`);
      }
    } catch {
      setTradeError("Network error. Please try again.");
    }

    setProcessing(false);
  }

  const snapshotItems = [
    { label: "Asking valuation", value: property ? formatINR(property.total_value) : "Under review" },
    { label: "Price per share", value: formatINR(currentPrice) },
    { label: "Shares sold", value: sharesSold.toString() },
    { label: "Shares remaining", value: sharesAvailable.toString() },
    { label: "Estimated yield", value: estimatedYield != null ? `~${estimatedYield.toFixed(1)}%` : "Under review" },
    { label: "Verification status", value: formatStatus(reviewStatus) },
  ];

  if (typeof property?.monthlyRentalIncome === "number") {
    snapshotItems.splice(5, 0, {
      label: "Monthly rental income",
      value: formatINR(property.monthlyRentalIncome),
    });
  }

  if (property?.propertyAreaLabel) {
    snapshotItems.push({
      label: "Property area",
      value: property.propertyAreaLabel,
    });
  }

  return (
    <section className="mt-8 rounded-(--radius-land) border border-landly-slate/15 bg-landly-navy-deep/40 p-6 md:p-7">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-landly-gold">Investment infrastructure</p>
          <h2 className="mt-2 font-sans text-2xl font-semibold text-landly-offwhite">
            Ownership clarity before participation.
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-landly-slate">
            This panel summarizes the listed tranche, how much remains with the owner, and how much capital has already been unlocked through investor participation.
          </p>
        </div>
        <div className={`inline-flex w-fit items-center rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${statusTone(reviewStatus)}`}>
          {formatStatus(reviewStatus)}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="font-sans text-lg font-semibold text-landly-offwhite">Investment Snapshot</h3>
                <p className="mt-1 text-sm text-landly-slate">Key terms and current listing posture, without exchange-style noise.</p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {snapshotItems.map((item) => (
                <div key={item.label} className="rounded-(--radius-land) border border-landly-slate/10 bg-landly-navy/60 px-4 py-4">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-landly-slate">{item.label}</p>
                  <p className="mt-2 font-mono text-lg font-semibold text-landly-offwhite">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-(--radius-land) border border-landly-slate/10 bg-landly-navy/60 p-5">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <h3 className="font-sans text-lg font-semibold text-landly-offwhite">Ownership Split</h3>
                <p className="mt-1 text-sm text-landly-slate">
                  The retained portion stays visually separate from investor participation, so the asset structure reads clearly at a glance.
                </p>
              </div>
              <div className="text-sm text-landly-slate">
                Listed tranche: <span className="font-mono text-landly-offwhite">{listedShares}</span> shares
              </div>
            </div>

            <div className="mt-5 overflow-hidden rounded-full bg-landly-slate/15">
              <div className="flex h-5 w-full">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${ownerRetainedPercent}%` }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                  className="bg-landly-slate/70"
                />
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${soldToInvestorsPercent}%` }}
                  transition={{ duration: 0.8, ease: "easeOut", delay: 0.08 }}
                  className="bg-landly-green"
                />
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${availableToInvestPercent}%` }}
                  transition={{ duration: 0.9, ease: "easeOut", delay: 0.16 }}
                  className="bg-landly-gold"
                />
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {[
                {
                  label: "Owner retained",
                  value: `${ownerRetainedPercent.toFixed(0)}%`,
                  detail: `${ownerRetainedShares} shares remain with the owner`,
                  tone: "bg-landly-slate/70",
                },
                {
                  label: "Sold to investors",
                  value: `${soldToInvestorsPercent.toFixed(0)}%`,
                  detail: `${sharesSold} shares already placed`,
                  tone: "bg-landly-green",
                },
                {
                  label: "Available to invest",
                  value: `${availableToInvestPercent.toFixed(0)}%`,
                  detail: `${sharesAvailable} shares still open`,
                  tone: "bg-landly-gold",
                },
              ].map((item) => (
                <div key={item.label} className="rounded-(--radius-land) border border-landly-slate/10 bg-landly-navy-deep/55 p-4">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${item.tone}`} />
                    <p className="text-[10px] uppercase tracking-[0.16em] text-landly-slate">{item.label}</p>
                  </div>
                  <p className="mt-2 font-mono text-xl font-semibold text-landly-offwhite">{item.value}</p>
                  <p className="mt-1 text-sm text-landly-slate">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-(--radius-land) border border-landly-slate/10 bg-landly-navy/60 p-5">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <h3 className="font-sans text-lg font-semibold text-landly-offwhite">Funding Progress</h3>
                <p className="mt-1 text-sm text-landly-slate">
                  This visual tracks capital unlocked against the listed tranche. It shows progress, not volatility.
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-[0.16em] text-landly-slate">Progress on listed tranche</p>
                <p className="mt-1 font-mono text-2xl font-semibold text-landly-gold">{percentFunded.toFixed(0)}%</p>
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              {progressSegments.map((segment) => (
                <div key={segment} className="flex h-14 flex-1 items-end overflow-hidden rounded-full bg-landly-slate/10">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{
                      height: percentFunded >= segment
                        ? "100%"
                        : percentFunded + 100 / 12 >= segment
                          ? `${Math.max(22, (percentFunded % (100 / 12)) * 12)}%`
                          : "18%",
                    }}
                    transition={{ duration: 0.55, ease: "easeOut", delay: segment / 220 }}
                    className={`w-full ${
                      percentFunded >= segment
                        ? "bg-landly-green"
                        : percentFunded + 100 / 12 >= segment
                          ? "bg-landly-gold"
                          : "bg-landly-slate/20"
                    }`}
                  />
                </div>
              ))}
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <div className="rounded-(--radius-land) border border-landly-slate/10 bg-landly-navy-deep/55 p-4">
                <p className="text-[10px] uppercase tracking-[0.16em] text-landly-slate">Capital raised</p>
                <p className="mt-2 font-mono text-lg font-semibold text-landly-gold">{formatINR(capitalRaised)}</p>
              </div>
              <div className="rounded-(--radius-land) border border-landly-slate/10 bg-landly-navy-deep/55 p-4">
                <p className="text-[10px] uppercase tracking-[0.16em] text-landly-slate">Funding target</p>
                <p className="mt-2 font-mono text-lg font-semibold text-landly-offwhite">{formatINR(fundingTarget)}</p>
              </div>
              <div className="rounded-(--radius-land) border border-landly-slate/10 bg-landly-navy-deep/55 p-4">
                <p className="text-[10px] uppercase tracking-[0.16em] text-landly-slate">Still open</p>
                <p className="mt-2 font-mono text-lg font-semibold text-landly-offwhite">{formatINR(capitalOpen)}</p>
              </div>
            </div>
          </div>
        </div>

        <div>
          {!authUser ? (
            <div className="rounded-(--radius-land) border border-landly-slate/20 bg-landly-navy/55 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-landly-gold/10 text-landly-gold">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 7h16" />
                  <path d="M7 4v6" />
                  <path d="M17 4v6" />
                  <path d="M5 11h14v8H5z" />
                </svg>
              </div>
              <h3 className="mt-4 font-sans text-xl font-semibold text-landly-offwhite">Sign in to participate</h3>
              <p className="mt-2 text-sm leading-relaxed text-landly-slate">
                Landly keeps the property brief open. Sign-in only begins when you want to commit capital or exit an existing position.
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                <div className="rounded-(--radius-land) border border-landly-slate/10 bg-landly-navy-deep/55 p-4">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-landly-slate">Minimum participation</p>
                  <p className="mt-2 font-mono text-lg font-semibold text-landly-gold">{formatINR(currentPrice)}</p>
                </div>
                <div className="rounded-(--radius-land) border border-landly-slate/10 bg-landly-navy-deep/55 p-4">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-landly-slate">Open shares</p>
                  <p className="mt-2 font-mono text-lg font-semibold text-landly-offwhite">{sharesAvailable}</p>
                </div>
                <div className="rounded-(--radius-land) border border-landly-slate/10 bg-landly-navy-deep/55 p-4">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-landly-slate">Verification</p>
                  <p className="mt-2 text-sm font-semibold text-landly-offwhite">{formatStatus(reviewStatus)}</p>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3">
                <Link href="/login" className="inline-flex h-11 items-center justify-center rounded-(--radius-land) bg-landly-green px-4 text-sm font-semibold text-white transition-all hover:brightness-110">
                  Log in to invest
                </Link>
                <Link href="/signup" className="inline-flex h-11 items-center justify-center rounded-(--radius-land) border border-landly-slate/20 px-4 text-sm font-semibold text-landly-offwhite transition-all hover:border-landly-slate/40">
                  Create account
                </Link>
              </div>
            </div>
          ) : (
            <div className="rounded-(--radius-land) border border-landly-slate/20 bg-landly-navy/55 p-5">
              <div className="flex gap-2 rounded-(--radius-land) border border-landly-slate/20 bg-landly-navy-deep/50 p-1">
                <button
                  onClick={() => setTab("buy")}
                  className={`flex-1 rounded px-3 py-2 text-center text-xs font-semibold transition-all ${
                    tab === "buy" ? "bg-landly-green text-white" : "text-landly-slate hover:text-landly-offwhite"
                  }`}
                >
                  Invest
                </button>
                <button
                  onClick={() => setTab("sell")}
                  className={`flex-1 rounded px-3 py-2 text-center text-xs font-semibold transition-all ${
                    tab === "sell" ? "bg-landly-red text-white" : "text-landly-slate hover:text-landly-offwhite"
                  }`}
                >
                  Sell
                </button>
              </div>

              <div className="mt-5 space-y-4 rounded-(--radius-land) bg-landly-navy/65 p-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.16em] text-landly-slate">
                    {tab === "buy" ? "Investor shares to purchase" : "Shares to sell"}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={tab === "buy" ? Math.max(1, sharesAvailable) : Math.max(1, userShares)}
                    value={shares}
                    onChange={(event) => setShares(Math.max(1, Number(event.target.value) || 1))}
                    className="mt-1 w-full rounded border border-landly-slate/30 bg-landly-navy px-3 py-2 font-mono text-sm text-landly-offwhite outline-none transition-colors focus:border-landly-gold/50"
                  />
                </div>

                <div className="space-y-2 border-t border-landly-slate/20 pt-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-landly-slate">Participation price</span>
                    <span className="font-mono text-landly-offwhite">{formatINR(currentPrice)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-landly-slate">{tab === "buy" ? "Investment amount" : "Sale value"}</span>
                    <span className="font-mono font-semibold text-landly-gold">{formatINR(totalCost)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-landly-slate">Open investor shares</span>
                    <span className="font-mono text-landly-offwhite">{sharesAvailable}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-landly-slate">Your holding</span>
                    <span className="font-mono text-landly-offwhite">{userShares}</span>
                  </div>
                </div>

                <div className="rounded-(--radius-land) border border-landly-slate/10 bg-landly-navy-deep/55 px-4 py-3">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-landly-slate">Available wallet balance</p>
                  <p className="mt-2 font-mono text-lg font-semibold text-landly-gold">{formatINR(walletBalance)}</p>
                </div>

                <motion.button
                  whileTap={{ scale: 0.985 }}
                  onClick={handleTrade}
                  disabled={!canExecute || processing}
                  className={`w-full rounded-(--radius-land) py-3 text-sm font-semibold text-white transition-all ${
                    tab === "buy"
                      ? "bg-landly-green hover:brightness-110 disabled:opacity-40"
                      : "bg-landly-red hover:brightness-110 disabled:opacity-40"
                  } disabled:cursor-not-allowed`}
                >
                  {processing
                    ? "Processing…"
                    : tradeSuccess
                      ? tab === "buy"
                        ? "Investment confirmed"
                        : "Sale recorded"
                      : tab === "buy"
                        ? `Confirm investment of ${formatINR(totalCost)}`
                        : `Confirm sale of ${shares} share${shares > 1 ? "s" : ""}`}
                </motion.button>

                {tradeError && (
                  <div className="rounded-(--radius-land) border border-landly-red/30 bg-landly-red/10 px-3 py-2">
                    <p className="text-xs text-landly-red">{tradeError}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
