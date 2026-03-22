"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  type Property,
  type PricePoint,
  type PropertyMarketData,
  formatINR,
} from "@/app/lib/types";
import { supabase, getAuthHeaders } from "@/lib/supabase";
import { useAuth } from "@/app/components/AuthProvider";

function buildPath(
  points: PricePoint[],
  width: number,
  height: number,
  padding: number
) {
  if (points.length === 0) {
    return "";
  }

  const prices = points.map((p) => p.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const range = Math.max(1, maxPrice - minPrice);

  return points
    .map((point, index) => {
      const x =
        padding +
        (index / Math.max(points.length - 1, 1)) * (width - padding * 2);
      const y =
        padding + ((maxPrice - point.price) / range) * (height - padding * 2);
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function formatTime(iso: string) {
  const dt = new Date(iso);
  return dt.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PropertyTradingTerminal({
  propertyId,
  fallbackPrice,
  property,
  walletBalance: initialWalletBalance = 0,
}: {
  propertyId: string;
  fallbackPrice: number;
  property?: Pick<Property, "shares_available" | "total_shares" | "status" | "estimated_yield">;
  walletBalance?: number;
}) {
  const [market, setMarket] = useState<PropertyMarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [tab, setTab] = useState<"buy" | "sell">("buy");
  const [shares, setShares] = useState(1);
  const [priceLimit, setPriceLimit] = useState<string>("");
  const [trading, setTrading] = useState(false);
  const [tradeError, setTradeError] = useState("");
  const [tradeSuccess, setTradeSuccess] = useState(false);

  const [walletBalance, setWalletBalance] = useState(initialWalletBalance);
  const [userShares, setUserShares] = useState(0);

  const { user: authUser } = useAuth();
  const userId = authUser?.id ?? null;

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const res = await fetch(`/api/properties/${propertyId}/market`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (!mounted) return;

        if (res.ok && data && !data.error) {
          setMarket(data);
          setError("");
        } else {
          setError(data.error || "Unable to load market data");
        }
      } catch {
        if (mounted) {
          setError("Unable to load market data");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    load();
    const interval = setInterval(load, 20000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [propertyId]);

  useEffect(() => {
    setWalletBalance(initialWalletBalance);
  }, [initialWalletBalance]);

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

  const history = useMemo(() => market?.history ?? [], [market]);
  const currentPrice = market?.currentPrice ?? fallbackPrice;
  const changePct = market?.change24hPct ?? 0;
  const changeAbs = market?.change24hAbs ?? 0;
  const isUp = changePct >= 0;

  const chartPath = useMemo(() => buildPath(history, 1100, 360, 20), [
    history,
  ]);
  const maxDepth = useMemo(() => {
    if (!market) return 1;
    const quantities = [
      ...market.orderbook.bids.map((level) => level.quantity),
      ...market.orderbook.asks.map((level) => level.quantity),
    ];
    return Math.max(1, ...quantities);
  }, [market]);

  const execPrice =
    priceLimit && !isNaN(Number(priceLimit))
      ? Number(priceLimit)
      : currentPrice;
  const totalCost =
    tab === "buy" ? shares * execPrice : shares * currentPrice;
  const estimatedYield = property?.estimated_yield ?? 8.2;
  const isVerified = property?.status ? ["verified", "live", "sold"].includes(property.status) : true;
  const canExecute =
    tab === "buy"
      ? shares > 0 &&
        shares <= (property?.shares_available || 999) &&
        totalCost <= walletBalance &&
        !!userId
      : shares > 0 && shares <= userShares && !!userId;

  async function handleTrade() {
    if (!canExecute || !userId) return;
    setTrading(true);
    setTradeError("");

    const endpoint = tab === "buy" ? "/api/buy-shares" : "/api/sell-shares";
    const body = {
      propertyId,
      shares,
    };

    try {
      const authHeaders = await getAuthHeaders();
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setTradeSuccess(true);
        if (data.newWalletBalance != null)
          setWalletBalance(data.newWalletBalance);
        if (tab === "buy" && data.sharesRemaining != null) {
          if (property) {
            property.shares_available = data.sharesRemaining;
          }
          setUserShares((prev) => prev + shares);
        }
        setShares(1);
        setPriceLimit("");
        setTimeout(() => setTradeSuccess(false), 3000);

        if (tab === "sell") {
          const nextShares = data.sharesRemainingOwned ?? 0;
          setUserShares(nextShares);
        }
      } else {
        setTradeError(data.error || `${tab} failed`);
      }
    } catch {
      setTradeError("Network error. Please try again.");
    }
    setTrading(false);
  }

  return (
    <section className="mt-8 rounded-(--radius-land) border border-landly-slate/15 bg-landly-navy-deep/40 p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-sans text-lg font-semibold text-landly-offwhite">
            Investment Panel
          </h2>
          <p className="mt-1 text-xs text-landly-slate">
            View property performance and manage your investment
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-3xl font-semibold text-landly-gold">
            {formatINR(currentPrice)}
          </p>
          <p
            className={`text-sm font-semibold ${
              isUp ? "text-landly-green" : "text-landly-red"
            }`}
          >
            {isUp ? "↗" : "↘"} {isUp ? "+" : ""}
            {changePct.toFixed(2)}% ({isUp ? "+" : ""}{formatINR(changeAbs)})
          </p>
        </div>
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-landly-slate">Loading chart…</p>
      ) : error ? (
        <p className="mt-6 text-sm text-landly-red">{error}</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          {/* left: chart */}
          <div className="overflow-hidden rounded-(--radius-land) bg-landly-navy/80 p-3">
            <svg viewBox="0 0 1100 360" className="h-96 w-full">
              <defs>
                <linearGradient id="tradingLine" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
              </defs>
              <path
                d={chartPath}
                fill="none"
                stroke="url(#tradingLine)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
            <div className="mt-2 flex items-center justify-between text-[10px] uppercase tracking-wider text-landly-slate">
              <span>{history[0] ? formatTime(history[0].timestamp) : "-"}</span>
              <span>
                {history[history.length - 1]
                  ? formatTime(history[history.length - 1].timestamp)
                  : "-"}
              </span>
            </div>
          </div>

          {/* right: buy/sell ticket */}
          <div>
            {!authUser ? (
              <div className="rounded-(--radius-land) border border-landly-slate/20 bg-landly-navy/50 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-landly-gold">
                      Investment access
                    </p>
                    <h3 className="mt-2 font-sans text-lg font-semibold text-landly-offwhite">
                      Browse freely. Sign in only when you&apos;re ready to invest.
                    </h3>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-landly-gold/10">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-landly-gold">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                </div>

                <p className="mt-4 text-sm leading-relaxed text-landly-slate">
                  Property information, performance, and verification remain open to everyone. Authentication only starts when you want to buy or sell shares.
                </p>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-(--radius-land) border border-landly-slate/10 bg-landly-navy-deep/60 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-landly-slate">Minimum ticket</p>
                    <p className="mt-1 font-mono text-sm font-semibold text-landly-gold">{formatINR(currentPrice)}</p>
                  </div>
                  <div className="rounded-(--radius-land) border border-landly-slate/10 bg-landly-navy-deep/60 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-landly-slate">Verification</p>
                    <p className="mt-1 text-sm font-semibold text-landly-green">{isVerified ? "Verified" : "In review"}</p>
                  </div>
                  <div className="rounded-(--radius-land) border border-landly-slate/10 bg-landly-navy-deep/60 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-landly-slate">Est. yield</p>
                    <p className="mt-1 font-mono text-sm font-semibold text-landly-gold">~{estimatedYield.toFixed(1)}%</p>
                  </div>
                </div>

                <div className="mt-5 flex w-full flex-col gap-2 sm:flex-row">
                  <Link
                    href="/login"
                    className="inline-flex flex-1 items-center justify-center rounded-(--radius-land) bg-landly-green px-4 py-3 text-sm font-semibold text-white transition-all hover:brightness-110"
                  >
                    Log in to invest
                  </Link>
                  <Link
                    href="/signup"
                    className="inline-flex flex-1 items-center justify-center rounded-(--radius-land) border border-landly-slate/20 px-4 py-3 text-sm font-semibold text-landly-offwhite transition-all hover:border-landly-slate/40"
                  >
                    Create account
                  </Link>
                </div>

                <div className="mt-5 rounded-(--radius-land) border border-landly-slate/10 bg-landly-navy-deep/40 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-landly-slate">What happens after login</p>
                  <p className="mt-1 text-xs leading-relaxed text-landly-slate">
                    You&apos;ll be able to choose quantity, review the total ticket size, and complete the order from this same panel.
                  </p>
                </div>
              </div>
            ) : (
            <>
            {/* tabs */}
            <div className="mb-4 flex gap-2 rounded-(--radius-land) border border-landly-slate/20 bg-landly-navy/50 p-1">
              <button
                onClick={() => setTab("buy")}
                className={`flex-1 rounded px-3 py-2 text-center text-xs font-semibold transition-all ${
                  tab === "buy"
                    ? "bg-landly-green text-white"
                    : "text-landly-slate hover:text-landly-offwhite"
                }`}
              >
                Buy Shares
              </button>
              <button
                onClick={() => setTab("sell")}
                className={`flex-1 rounded px-3 py-2 text-center text-xs font-semibold transition-all ${
                  tab === "sell"
                    ? "bg-landly-red text-white"
                    : "text-landly-slate hover:text-landly-offwhite"
                }`}
              >
                Sell Shares
              </button>
            </div>

            {/* inputs */}
            <div className="space-y-3 rounded-(--radius-land) bg-landly-navy/70 p-3">
              {tradeError && (
                <div className="rounded-(--radius-land) border border-landly-red/30 bg-landly-red/10 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-landly-red">Trade Error</p>
                  <p className="mt-1 text-xs text-landly-red">{tradeError}</p>
                </div>
              )}

              <div>
                <label className="block text-[10px] uppercase tracking-wider text-landly-slate">
                  Shares
                </label>
                <input
                  type="number"
                  min="1"
                  max={
                    tab === "buy"
                      ? property?.shares_available || 999
                      : userShares
                  }
                  value={shares}
                  onChange={(e) =>
                    setShares(Math.max(1, Number(e.target.value) || 1))
                  }
                  className="mt-1 w-full rounded border border-landly-slate/30 bg-landly-navy px-2 py-1 font-mono text-sm text-landly-offwhite outline-none focus:border-landly-gold/50"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider text-landly-slate">
                  Price Limit (optional)
                </label>
                <input
                  type="number"
                  placeholder={formatINR(currentPrice).replace("₹", "")}
                  value={priceLimit}
                  onChange={(e) => setPriceLimit(e.target.value)}
                  className="mt-1 w-full rounded border border-landly-slate/30 bg-landly-navy px-2 py-1 font-mono text-sm text-landly-offwhite outline-none focus:border-landly-gold/50"
                />
              </div>

              <div className="border-t border-landly-slate/20 pt-2">
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="text-landly-slate">Total</span>
                  <span className="font-mono font-semibold text-landly-gold">
                    {formatINR(totalCost)}
                  </span>
                </div>
                {tab === "buy" && (
                  <div className="mb-2 flex items-center justify-between text-xs">
                    <span className="text-landly-slate">Available</span>
                    <span className="font-mono text-landly-offwhite">
                      {property?.shares_available ?? 0}
                    </span>
                  </div>
                )}
                {tab === "sell" && (
                  <div className="mb-2 flex items-center justify-between text-xs">
                    <span className="text-landly-slate">Your Shares</span>
                    <span className="font-mono text-landly-offwhite">
                      {userShares}
                    </span>
                  </div>
                )}
              </div>

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleTrade}
                disabled={!canExecute || trading}
                className={`w-full rounded py-2.5 text-xs font-semibold text-white transition-all ${
                  tab === "buy"
                    ? "bg-landly-green hover:brightness-110 disabled:opacity-40"
                    : "bg-landly-red hover:brightness-110 disabled:opacity-40"
                } disabled:cursor-not-allowed`}
              >
                {trading
                  ? "Processing…"
                  : tradeSuccess
                    ? "✓ Success"
                    : `${tab === "buy" ? "Buy" : "Sell"} ${shares} Share${shares > 1 ? "s" : ""}`}
              </motion.button>

              {tab === "buy" && (
                <div className="rounded bg-landly-navy-deep/60 px-2 py-2">
                  <p className="text-[10px] text-landly-slate">
                    Wallet Balance
                  </p>
                  <p className="mt-0.5 font-mono text-sm font-semibold text-landly-gold">
                    {formatINR(walletBalance)}
                  </p>
                </div>
              )}
            </div>
            </>
            )}
          </div>
        </div>
      )}

      {/* orderbook section below chart */}
      {market && (
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <div>
            <h3 className="mb-2 font-sans text-sm font-semibold text-landly-offwhite">
              Buyer Interest
            </h3>
            <div className="space-y-1 rounded-(--radius-land) bg-landly-navy/70 p-2">
              {market.orderbook.bids.slice(0, 8).map((bid, index) => (
                <div
                  key={bid.id}
                  className="flex items-center gap-2 text-[11px]"
                >
                  <div className="relative flex-1 overflow-hidden rounded bg-landly-green/10 px-1.5 py-0.5">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: `${(bid.quantity / maxDepth) * 100}%`,
                      }}
                      transition={{ duration: 0.45, delay: index * 0.02 }}
                      className="absolute inset-y-0 left-0 bg-landly-green/20"
                    />
                    <span className="relative z-10 font-mono text-landly-green">
                      {bid.quantity}
                    </span>
                  </div>
                  <span className="min-w-16 font-mono text-landly-offwhite">
                    {formatINR(bid.price)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-2 font-sans text-sm font-semibold text-landly-offwhite">
              Seller Interest
            </h3>
            <div className="space-y-1 rounded-(--radius-land) bg-landly-navy/70 p-2">
              {market.orderbook.asks.slice(0, 8).map((ask, index) => (
                <div
                  key={ask.id}
                  className="flex items-center gap-2 text-[11px]"
                >
                  <span className="min-w-16 font-mono text-landly-offwhite">
                    {formatINR(ask.price)}
                  </span>
                  <div className="relative flex-1 overflow-hidden rounded bg-landly-red/10 px-1.5 py-0.5 text-right">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: `${(ask.quantity / maxDepth) * 100}%`,
                      }}
                      transition={{ duration: 0.45, delay: index * 0.02 }}
                      className="absolute inset-y-0 right-0 bg-landly-red/20"
                    />
                    <span className="relative z-10 font-mono text-landly-red">
                      {ask.quantity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
