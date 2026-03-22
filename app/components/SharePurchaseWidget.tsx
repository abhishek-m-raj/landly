"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { type Property, formatINR } from "@/app/lib/mock-data";

export default function SharePurchaseWidget({
  property,
  walletBalance = 10000,
}: {
  property: Property;
  walletBalance?: number;
}) {
  const [shares, setShares] = useState(1);
  const [buying, setBuying] = useState(false);
  const [success, setSuccess] = useState(false);

  const totalCost = shares * property.share_price;
  const ownershipPct = ((shares / property.total_shares) * 100).toFixed(2);
  const canAfford = totalCost <= walletBalance;
  const canBuy = shares > 0 && shares <= property.shares_available && canAfford;

  function handleBuy() {
    if (!canBuy) return;
    setBuying(true);
    // Simulated — will connect to POST /api/buy-shares
    setTimeout(() => {
      setBuying(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }, 1200);
  }

  return (
    <div className="rounded-[var(--radius-land)] border border-landly-slate/15 bg-landly-navy-deep/80 p-6">
      <h3 className="font-sans text-lg font-semibold text-landly-offwhite">
        Buy Shares
      </h3>

      {/* share input */}
      <div className="mt-5">
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-landly-slate">
          Number of shares
        </label>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShares(Math.max(1, shares - 1))}
            className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-land)] border border-landly-slate/20 text-landly-offwhite transition-colors hover:border-landly-gold/40"
          >
            −
          </button>
          <input
            type="number"
            min={1}
            max={property.shares_available}
            value={shares}
            onChange={(e) => setShares(Math.max(1, Math.min(property.shares_available, Number(e.target.value) || 1)))}
            className="h-10 w-full flex-1 rounded-[var(--radius-land)] border border-landly-slate/20 bg-landly-navy px-3 text-center font-mono text-sm text-landly-offwhite outline-none focus:border-landly-gold/50"
          />
          <button
            onClick={() => setShares(Math.min(property.shares_available, shares + 1))}
            className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-land)] border border-landly-slate/20 text-landly-offwhite transition-colors hover:border-landly-gold/40"
          >
            +
          </button>
        </div>
      </div>

      {/* cost breakdown */}
      <div className="mt-5 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-landly-slate">Price per share</span>
          <span className="font-mono font-medium text-landly-offwhite">
            {formatINR(property.share_price)}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-landly-slate">Total cost</span>
          <span className="font-mono font-semibold text-landly-gold">
            {formatINR(totalCost)}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-landly-slate">Ownership</span>
          <span className="font-mono text-landly-offwhite">{ownershipPct}%</span>
        </div>
        <div className="border-t border-landly-slate/10 pt-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-landly-slate">Shares available</span>
            <span className="font-mono text-landly-offwhite">
              {property.shares_available}
            </span>
          </div>
        </div>
      </div>

      {/* buy button */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={handleBuy}
        disabled={!canBuy || buying}
        className="mt-6 w-full rounded-[var(--radius-land)] bg-landly-green py-3.5 text-sm font-semibold text-white transition-all hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {buying ? "Processing…" : success ? "✓ Purchase Successful" : `Buy ${shares} Share${shares > 1 ? "s" : ""}`}
      </motion.button>

      {!canAfford && (
        <p className="mt-2 text-center text-xs text-landly-red">
          Insufficient wallet balance
        </p>
      )}

      {/* wallet */}
      <div className="mt-4 flex items-center justify-between rounded-[var(--radius-land)] bg-landly-navy/60 px-4 py-3">
        <span className="text-xs text-landly-slate">Wallet balance</span>
        <span className="font-mono text-sm font-medium text-landly-gold">
          {formatINR(walletBalance)}
        </span>
      </div>
    </div>
  );
}
