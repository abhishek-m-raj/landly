"use client";

import Image from "next/image";
import { use, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { notFound } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import PropertyTradingTerminal from "@/app/components/PropertyTradingTerminal";
import TransactionFeed from "@/app/components/TransactionFeed";
import { type Property, formatINR, percentSold } from "@/app/lib/types";
import { useAuth } from "@/app/components/AuthProvider";
import { getAuthHeaders } from "@/lib/supabase";

const TYPE_COLORS: Record<string, string> = {
  agricultural: "bg-landly-green/80",
  residential: "bg-landly-slate/80",
  commercial: "bg-landly-gold/80",
};

const verificationChecks = [
  {
    title: "Title Deed Verified",
    detail: "Ownership and transfer records reviewed by Landly verification.",
  },
  {
    title: "Survey Report Verified",
    detail: "Boundary, acreage, and site details matched to submitted documents.",
  },
  {
    title: "Legal Clearance Verified",
    detail: "Core legal and listing compliance checks cleared before investor access.",
  },
];

const fadeUp = (delay: number) => ({
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number], delay },
  },
});

export default function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [property, setProperty] = useState<Property | null>(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    async function load() {
      const propRes = await fetch(`/api/properties/${id}`);
      const propData = await propRes.json();
      if (propRes.ok && propData && !propData.error) {
        setProperty(propData);
      }
      if (user) {
        const authHeaders = await getAuthHeaders();
        const walletRes = await fetch(`/api/wallet`, {
          headers: authHeaders,
        });
        const walletData = await walletRes.json();
        if (walletRes.ok) setWalletBalance(walletData.wallet_balance ?? 0);
      }
      setLoading(false);
    }
    load();
  }, [id, user]);

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

  if (!property) return notFound();

  const sold = percentSold(property);

  return (
    <div className="flex min-h-svh flex-col bg-landly-navy">
      <Navbar />

      {/* hero image area */}
      <div className="relative h-64 w-full overflow-hidden md:h-80">
        {property.image_url ? (
          <Image
            src={property.image_url}
            alt={property.title}
            fill
            sizes="100vw"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-landly-navy-deep via-landly-navy to-landly-navy-deep">
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 40% 50%, rgba(245,158,11,0.2) 0%, transparent 60%)",
              }}
            />
          </div>
        )}
        {/* overlay info */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-landly-navy/90 to-transparent px-6 pb-6 pt-16 md:px-12">
          <span
            className={`inline-block rounded-full px-3 py-1 text-xs font-semibold text-white ${TYPE_COLORS[property.type] || "bg-landly-slate"}`}
          >
            {property.type.charAt(0).toUpperCase() + property.type.slice(1)}
          </span>
          <h1 className="mt-2 font-sans text-2xl font-bold text-landly-offwhite md:text-3xl">
            {property.title}
          </h1>
          <p className="mt-1 text-sm text-landly-slate">{property.location}</p>
        </div>
      </div>

      {/* content */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-10 md:px-12">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            visible: { transition: { staggerChildren: 0.1 } },
          }}
        >
            {/* description */}
            <motion.section variants={fadeUp(0)}>
              <h2 className="font-sans text-lg font-semibold text-landly-offwhite">
                About this property
              </h2>
              <p className="mt-3 leading-relaxed text-landly-slate text-sm">
                {property.description}
              </p>
            </motion.section>

            {/* key details */}
            <motion.section variants={fadeUp(0.1)} className="mt-8">
              <h2 className="font-sans text-lg font-semibold text-landly-offwhite">
                Investment Details
              </h2>
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  { label: "Total Value", value: formatINR(property.total_value) },
                  { label: "Share Price", value: formatINR(property.share_price) },
                  { label: "Total Shares", value: property.total_shares.toString() },
                  { label: "Available", value: property.shares_available.toString() },
                ].map((item) => (
                  <div key={item.label} className="rounded-[var(--radius-land)] bg-landly-navy-deep/50 p-4">
                    <span className="block font-mono text-lg font-semibold text-landly-gold">
                      {item.value}
                    </span>
                    <span className="block mt-1 text-[10px] uppercase tracking-wider text-landly-slate">
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* progress */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-landly-slate">
                  <span>{sold}% funded</span>
                  <span>
                    {property.total_shares - property.shares_available} / {property.total_shares} shares sold
                  </span>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-landly-slate/20">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${sold}%` }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    className="h-full rounded-full bg-landly-green"
                  />
                </div>
              </div>
            </motion.section>

            {/* price chart and orderbook */}
            <motion.div variants={fadeUp(0.2)} className="mt-8">
              <PropertyTradingTerminal
                propertyId={property.id}
                fallbackPrice={property.share_price}
                property={property}
                walletBalance={walletBalance}
              />
            </motion.div>

            {/* verification proof */}
            <motion.section variants={fadeUp(0.25)} className="mt-8">
              <h2 className="font-sans text-lg font-semibold text-landly-offwhite">
                Verification Proof
              </h2>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                {verificationChecks.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-[var(--radius-land)] border border-landly-slate/10 bg-landly-navy-deep/50 p-5"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-landly-green/10 text-lg text-landly-green">
                      ✓
                    </div>
                    <h3 className="mt-4 font-sans text-base font-semibold text-landly-offwhite">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-landly-slate">
                      {item.detail}
                    </p>
                  </div>
                ))}
              </div>
            </motion.section>

            {/* transaction feed */}
            <motion.section variants={fadeUp(0.35)} className="mt-10">
              <TransactionFeed propertyId={property.id} />
            </motion.section>
          </motion.div>
      </main>
    </div>
  );
}
