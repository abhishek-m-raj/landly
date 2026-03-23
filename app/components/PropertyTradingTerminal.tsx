"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  type Property,
  type PricePoint,
  type PropertyMarketData,
  type Order,
  formatINR,
  getListedShares,
} from "@/app/lib/types";
import { supabase, getAuthHeaders } from "@/lib/supabase";
import { useAuth } from "@/app/components/AuthProvider";

type TimeRange = "1d" | "1w" | "1m" | "6m" | "1y" | "all";

type PropertyContext = Pick<
  Property,
  | "shares_available"
  | "total_shares"
  | "status"
  | "estimated_yield"
  | "fraction_listed"
  | "listed_shares"
  | "owner_retained_percent"
>;

const TIME_RANGES: Array<{ value: TimeRange; label: string }> = [
  { value: "1d", label: "1D" },
  { value: "1w", label: "1W" },
  { value: "1m", label: "1M" },
  { value: "6m", label: "6M" },
  { value: "1y", label: "1Y" },
  { value: "all", label: "All" },
];

const CHART_W = 1100;
const CHART_H = 360;
const CHART_PAD = 20;

interface ChartPoint {
  x: number;
  y: number;
  price: number;
  timestamp: string;
  volume: number;
}

function buildChartData(points: PricePoint[]): { path: string; coords: ChartPoint[] } {
  if (points.length === 0) return { path: "", coords: [] };

  const prices = points.map((p) => p.price);
  let minPrice = Math.min(...prices);
  let maxPrice = Math.max(...prices);
  // When all points are the same price, add padding so line renders mid-chart
  if (maxPrice - minPrice < 0.01) {
    const mid = minPrice || 1;
    const pad = mid * 0.02; // 2% padding
    minPrice = mid - pad;
    maxPrice = mid + pad;
  }
  const range = maxPrice - minPrice;

  const coords: ChartPoint[] = points.map((point, index) => {
    const x =
      CHART_PAD +
      (index / Math.max(points.length - 1, 1)) * (CHART_W - CHART_PAD * 2);
    const y =
      CHART_PAD +
      ((maxPrice - point.price) / range) * (CHART_H - CHART_PAD * 2);
    return { x, y, price: point.price, timestamp: point.timestamp, volume: point.volume };
  });

  const path = coords
    .map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`)
    .join(" ");

  return { path, coords };
}

function formatTime(iso: string) {
  const dt = new Date(iso);
  return dt.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateTime(iso: string) {
  const dt = new Date(iso);
  return dt.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
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
  property?: PropertyContext;
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
  const [openOrders, setOpenOrders] = useState<Order[]>([]);
  const [selectedRange, setSelectedRange] = useState<TimeRange>("all");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const svgRef = useRef<SVGSVGElement>(null);

  const { user: authUser } = useAuth();
  const userId = authUser?.id ?? null;

  const fetchOpenOrders = useCallback(async () => {
    if (!userId) { setOpenOrders([]); return; }
    try {
      const authHeaders = await getAuthHeaders();
      const res = await fetch(`/api/orders?propertyId=${propertyId}`, {
        headers: authHeaders,
      });
      if (res.ok) {
        const data = await res.json();
        setOpenOrders(data);
      }
    } catch { /* ignore */ }
  }, [userId, propertyId]);

  const fetchHoldings = useCallback(async () => {
    if (!userId) { setUserShares(0); return; }
    try {
      const authHeaders = await getAuthHeaders();
      const res = await fetch(`/api/holdings`, { headers: authHeaders });
      if (res.ok) {
        const rows: Array<{ property_id: string; shares_owned: number }> = await res.json();
        const row = rows.find((h) => h.property_id === propertyId);
        setUserShares(row?.shares_owned ?? 0);
      }
    } catch { /* ignore */ }
  }, [userId, propertyId]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const res = await fetch(`/api/properties/${propertyId}/market?range=${selectedRange}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (!mounted) return;

        if (res.ok && data && !data.error) {
          setMarket(data);
          setError("");
        } else {
          // Only set error if we have no cached data yet
          if (!market) {
            setError(data.error || "Unable to load market data");
          }
        }
      } catch {
        if (mounted && !market) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId, selectedRange, refreshKey]);

  // Live realtime updates — subscribe to new trades on all ranges
  useEffect(() => {
    const channel = supabase
      .channel(`trades-${propertyId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "trades",
          filter: `property_id=eq.${propertyId}`,
        },
        (payload) => {
          const row = payload.new as { price: number; quantity: number; created_at: string };
          setMarket((prev) => {
            if (!prev) return prev;
            const newPoint: PricePoint = {
              timestamp: row.created_at,
              price: Number(row.price),
              volume: row.quantity,
            };
            return {
              ...prev,
              currentPrice: Number(row.price),
              hasRealData: true,
              rangeHasData: true,
              history: [...prev.history, newPoint],
            };
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [propertyId]);

  useEffect(() => {
    setWalletBalance(initialWalletBalance);
  }, [initialWalletBalance]);

  useEffect(() => {
    if (!userId) {
      setUserShares(0);
      setOpenOrders([]);
      return;
    }

    fetchHoldings();
    fetchOpenOrders();
  }, [propertyId, userId, fetchHoldings, fetchOpenOrders]);

  const history = useMemo(() => market?.history ?? [], [market]);
  const hasRealData = market?.hasRealData ?? false;
  const rangeHasData = market?.rangeHasData ?? false;
  const currentPrice = market?.currentPrice ?? fallbackPrice;
  const changePct = market?.change24hPct ?? 0;
  const changeAbs = market?.change24hAbs ?? 0;
  const isUp = changePct >= 0;
  const currentSharesAvailable = market?.sharesAvailable ?? property?.shares_available ?? 0;
  const totalShares = property?.total_shares ?? market?.totalShares ?? 0;
  const listedShares = property ? getListedShares(property) : 0;
  const sharesSold = Math.max(0, listedShares - currentSharesAvailable);
  const ownerRetainedShares = Math.max(0, totalShares - listedShares);
  const ownerRetainedPercent = totalShares > 0
    ? (ownerRetainedShares / totalShares) * 100
    : property?.owner_retained_percent ?? Math.max(0, 100 - (property?.fraction_listed ?? 100));
  const soldToInvestorsPercent = totalShares > 0 ? (sharesSold / totalShares) * 100 : 0;
  const availableToInvestPercent = totalShares > 0 ? (currentSharesAvailable / totalShares) * 100 : 0;

  const { path: chartPath, coords: chartCoords } = useMemo(
    () => buildChartData(history),
    [history],
  );

  // Hover: find the nearest chart point based on mouse X in the SVG
  const handleChartHover = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (chartCoords.length === 0 || !svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const mouseX = ((e.clientX - rect.left) / rect.width) * CHART_W;
      let closest = 0;
      let closestDist = Infinity;
      for (let i = 0; i < chartCoords.length; i++) {
        const d = Math.abs(chartCoords[i].x - mouseX);
        if (d < closestDist) {
          closestDist = d;
          closest = i;
        }
      }
      setHoverIndex(closest);
    },
    [chartCoords],
  );

  const hoverPoint = hoverIndex !== null ? chartCoords[hoverIndex] : null;
  const hoverChange = hoverPoint && chartCoords.length > 0
    ? hoverPoint.price - chartCoords[0].price
    : 0;
  const hoverChangePct = hoverPoint && chartCoords.length > 0 && chartCoords[0].price > 0
    ? (hoverChange / chartCoords[0].price) * 100
    : 0;
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
  const isLimitOrder = priceLimit !== "" && !isNaN(Number(priceLimit)) && Number(priceLimit) > 0;
  const totalCost =
    tab === "buy" ? shares * execPrice : shares * (isLimitOrder ? execPrice : currentPrice);
  const estimatedYield = property?.estimated_yield ?? 8.2;
  const isVerified = property?.status ? ["verified", "live", "sold"].includes(property.status) : true;
  const canExecute =
    tab === "buy"
      ? shares > 0 &&
        shares <= currentSharesAvailable &&
        totalCost <= walletBalance &&
        !!userId
      : shares > 0 && shares <= userShares && !!userId;

  async function handleTrade() {
    if (!canExecute || !userId) return;
    setTrading(true);
    setTradeError("");

    try {
      const authHeaders = await getAuthHeaders();

      if (isLimitOrder) {
        // Use the orders endpoint for limit orders
        const res = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders },
          body: JSON.stringify({
            propertyId,
            side: tab,
            orderType: "limit",
            price: Number(priceLimit),
            quantity: shares,
          }),
        });
        const data = await res.json();

        if (res.ok && data.success) {
          if (data.filledQuantity === 0) {
            setTradeError(`No liquidity — your limit ${tab} order is resting on the book`);
            fetchOpenOrders();
          } else {
            setTradeSuccess(true);
            if (data.newWalletBalance != null) setWalletBalance(data.newWalletBalance);
            if (tab === "buy" && data.filledQuantity > 0) {
              setUserShares((prev) => prev + data.filledQuantity);
            }
            if (tab === "sell" && data.filledQuantity > 0) {
              setUserShares((prev) => prev - data.filledQuantity);
            }
            setShares(1);
            setPriceLimit("");
            fetchOpenOrders();
            fetchHoldings();
            setRefreshKey((k) => k + 1);
            setTimeout(() => setTradeSuccess(false), 3000);
          }
        } else {
          setTradeError(data.error || `${tab} failed`);
        }
      } else {
        // Use market order endpoints for backward compat
        const endpoint = tab === "buy" ? "/api/buy-shares" : "/api/sell-shares";
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders },
          body: JSON.stringify({ propertyId, shares }),
        });
        const data = await res.json();

        if (res.ok && data.success) {
          const filled = data.filledQuantity ?? shares;
          if (filled === 0) {
            setTradeError(`No liquidity available for market ${tab}`);
            if (data.newWalletBalance != null) setWalletBalance(data.newWalletBalance);
          } else {
            setTradeSuccess(true);
            if (data.newWalletBalance != null) setWalletBalance(data.newWalletBalance);
            if (tab === "buy") {
              setUserShares((prev) => prev + filled);
              if (property && data.sharesRemaining != null) {
                property.shares_available = data.sharesRemaining;
              }
            }
            if (tab === "sell") {
              setUserShares((prev) => prev - filled);
            }
            setShares(1);
            setPriceLimit("");
            fetchOpenOrders();
            fetchHoldings();
            setRefreshKey((k) => k + 1);
            setTimeout(() => setTradeSuccess(false), 3000);
          }
        } else {
          setTradeError(data.error || `${tab} failed`);
        }
      }
    } catch {
      setTradeError("Network error. Please try again.");
    }
    setTrading(false);
  }

  async function handleCancelOrder(orderId: string) {
    try {
      const authHeaders = await getAuthHeaders();
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.newWalletBalance != null) setWalletBalance(data.newWalletBalance);
        fetchOpenOrders();
      }
    } catch { /* ignore */ }
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

      {totalShares > 0 && listedShares > 0 && (
        <div className="mb-6 rounded-(--radius-land) border border-landly-slate/10 bg-landly-navy/55 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-landly-gold">
                Ownership Split
              </p>
              <p className="mt-1 text-sm text-landly-slate">
                Listed and retained ownership stay separate so the capital structure is clear before any order is placed.
              </p>
            </div>
            <div className="text-sm text-landly-slate">
              <span className="font-mono text-landly-offwhite">{listedShares}</span> listed of {totalShares} shares
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-full bg-landly-slate/15">
            <div className="flex h-4 w-full">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${ownerRetainedPercent}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="bg-landly-slate/70"
              />
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${soldToInvestorsPercent}%` }}
                transition={{ duration: 0.7, ease: "easeOut", delay: 0.05 }}
                className="bg-landly-green"
              />
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${availableToInvestPercent}%` }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
                className="bg-landly-gold"
              />
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-(--radius-land) border border-landly-slate/10 bg-landly-navy-deep/60 px-3 py-3">
              <p className="text-[10px] uppercase tracking-wider text-landly-slate">Owner retained</p>
              <p className="mt-1 font-mono text-base font-semibold text-landly-offwhite">{ownerRetainedPercent.toFixed(0)}%</p>
              <p className="mt-1 text-xs text-landly-slate">{ownerRetainedShares} shares</p>
            </div>
            <div className="rounded-(--radius-land) border border-landly-slate/10 bg-landly-navy-deep/60 px-3 py-3">
              <p className="text-[10px] uppercase tracking-wider text-landly-slate">Listed for investors</p>
              <p className="mt-1 font-mono text-base font-semibold text-landly-offwhite">{((listedShares / totalShares) * 100).toFixed(0)}%</p>
              <p className="mt-1 text-xs text-landly-slate">{listedShares} shares</p>
            </div>
            <div className="rounded-(--radius-land) border border-landly-slate/10 bg-landly-navy-deep/60 px-3 py-3">
              <p className="text-[10px] uppercase tracking-wider text-landly-slate">Still available</p>
              <p className="mt-1 font-mono text-base font-semibold text-landly-offwhite">{availableToInvestPercent.toFixed(0)}%</p>
              <p className="mt-1 text-xs text-landly-slate">{currentSharesAvailable} investor shares open</p>
            </div>
          </div>
        </div>
      )}

      {loading && !market ? (
        <p className="mt-6 text-sm text-landly-slate">Loading chart…</p>
      ) : error && !market ? (
        <p className="mt-6 text-sm text-landly-red">{error}</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          {/* left: chart */}
          <div className="overflow-hidden rounded-(--radius-land) bg-landly-navy/80 p-3">
            {/* time range filters */}
            <div className="mb-3 flex gap-1">
              {TIME_RANGES.map((r) => (
                <button
                  key={r.value}
                  onClick={() => { setSelectedRange(r.value); setHoverIndex(null); }}
                  className={`rounded px-3 py-1 text-[10px] font-semibold uppercase tracking-wider transition-all ${
                    selectedRange === r.value
                      ? "bg-landly-gold text-landly-navy-deep"
                      : "text-landly-slate hover:text-landly-offwhite"
                  }`}
                >
                  {r.label}
                  {selectedRange === r.value && (
                    <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-landly-green animate-pulse" />
                  )}
                </button>
              ))}
            </div>

            {!hasRealData || !rangeHasData ? (
              <div className="flex h-96 w-full items-center justify-center">
                <div className="text-center">
                  <svg className="mx-auto mb-3 h-12 w-12 text-landly-slate/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                  </svg>
                  <p className="text-sm font-semibold text-landly-slate">Graph not available</p>
                  <p className="mt-1 text-xs text-landly-slate/60">
                    {!hasRealData
                      ? "No trade data yet for this property"
                      : "No trades in the selected time range"}
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Hover info bar */}
                <div className="mb-1 flex items-center gap-3 h-5">
                  {hoverPoint ? (
                    <>
                      <span className="font-mono text-sm font-semibold text-landly-offwhite">
                        {formatINR(hoverPoint.price)}
                      </span>
                      <span
                        className={`font-mono text-xs font-semibold ${
                          hoverChange >= 0 ? "text-landly-green" : "text-landly-red"
                        }`}
                      >
                        {hoverChange >= 0 ? "+" : ""}
                        {formatINR(hoverChange)} ({hoverChangePct >= 0 ? "+" : ""}
                        {hoverChangePct.toFixed(2)}%)
                      </span>
                      <span className="text-[10px] text-landly-slate">
                        {formatDateTime(hoverPoint.timestamp)}
                      </span>
                    </>
                  ) : (
                    <span className="text-[10px] text-landly-slate/50">Hover over chart for details</span>
                  )}
                </div>

                <svg
                  ref={svgRef}
                  viewBox={`0 0 ${CHART_W} ${CHART_H}`}
                  className="h-96 w-full cursor-crosshair"
                  onMouseMove={handleChartHover}
                  onMouseLeave={() => setHoverIndex(null)}
                >
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
                  {/* Hover crosshair + dot */}
                  {hoverPoint && (
                    <>
                      <line
                        x1={hoverPoint.x}
                        y1={CHART_PAD}
                        x2={hoverPoint.x}
                        y2={CHART_H - CHART_PAD}
                        stroke="#94a3b8"
                        strokeWidth="1"
                        strokeDasharray="4 3"
                        opacity="0.4"
                      />
                      <circle
                        cx={hoverPoint.x}
                        cy={hoverPoint.y}
                        r="5"
                        fill="#f59e0b"
                        stroke="#1e293b"
                        strokeWidth="2"
                      />
                    </>
                  )}
                </svg>
                <div className="mt-2 flex items-center justify-between text-[10px] uppercase tracking-wider text-landly-slate">
                  <span>{history[0] ? formatTime(history[0].timestamp) : "-"}</span>
                  <span>
                    {history[history.length - 1]
                      ? formatTime(history[history.length - 1].timestamp)
                      : "-"}
                  </span>
                </div>
              </>
            )}
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
                      ? Math.max(1, currentSharesAvailable)
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
                  Price Limit (optional — leave empty for market order)
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
                      {currentSharesAvailable}
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
                    : `${isLimitOrder ? "Limit " : ""}${tab === "buy" ? "Buy" : "Sell"} ${shares} Share${shares > 1 ? "s" : ""}`}
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
              Bids (Buy Orders)
            </h3>
            <div className="space-y-1 rounded-(--radius-land) bg-landly-navy/70 p-2">
              {market.orderbook.bids.length === 0 ? (
                <p className="py-3 text-center text-[11px] text-landly-slate">No buy orders</p>
              ) : (
                market.orderbook.bids.slice(0, 8).map((bid, index) => (
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
              )))}
            </div>
          </div>

          <div>
            <h3 className="mb-2 font-sans text-sm font-semibold text-landly-offwhite">
              Asks (Sell Orders)
            </h3>
            <div className="space-y-1 rounded-(--radius-land) bg-landly-navy/70 p-2">
              {market.orderbook.asks.length === 0 ? (
                <p className="py-3 text-center text-[11px] text-landly-slate">No sell orders</p>
              ) : (
                market.orderbook.asks.slice(0, 8).map((ask, index) => (
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
              )))}
            </div>
          </div>
        </div>
      )}

      {/* Spread info */}
      {market && market.orderbook.spread > 0 && (
        <div className="mt-3 flex items-center justify-center gap-4 text-[10px] uppercase tracking-wider text-landly-slate">
          <span>Spread: <span className="font-mono text-landly-offwhite">{formatINR(market.orderbook.spread)}</span></span>
          <span>Mid: <span className="font-mono text-landly-offwhite">{formatINR(market.orderbook.midPrice)}</span></span>
        </div>
      )}

      {/* Open orders */}
      {authUser && openOrders.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-2 font-sans text-sm font-semibold text-landly-offwhite">
            Your Open Orders
          </h3>
          <div className="space-y-1.5 rounded-(--radius-land) bg-landly-navy/70 p-3">
            {openOrders.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between rounded bg-landly-navy-deep/60 px-3 py-2"
              >
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-bold uppercase ${
                    order.side === "buy" ? "text-landly-green" : "text-landly-red"
                  }`}>
                    {order.side}
                  </span>
                  <span className="font-mono text-xs text-landly-offwhite">
                    {order.filled_quantity}/{order.quantity} @ {formatINR(order.price ?? 0)}
                  </span>
                  <span className={`rounded px-1 py-0.5 text-[9px] font-semibold uppercase ${
                    order.status === "partial"
                      ? "bg-landly-gold/20 text-landly-gold"
                      : "bg-landly-slate/20 text-landly-slate"
                  }`}>
                    {order.status}
                  </span>
                </div>
                <button
                  onClick={() => handleCancelOrder(order.id)}
                  className="rounded px-2 py-1 text-[10px] font-semibold text-landly-red transition-colors hover:bg-landly-red/10"
                >
                  Cancel
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
