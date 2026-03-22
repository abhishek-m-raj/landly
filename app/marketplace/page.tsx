"use client";

import { useState, useEffect } from "react";
import Navbar from "@/app/components/Navbar";
import FilterBar, { type PropertyFilter } from "@/app/components/FilterBar";
import PropertyCard from "@/app/components/PropertyCard";
import LiveTicker from "@/app/components/LiveTicker";
import { type Property } from "@/app/lib/types";

export default function MarketplacePage() {
  const [filter, setFilter] = useState<PropertyFilter>("All");
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/properties")
      .then((r) => r.json())
      .then((data) => setProperties(data ?? []))
      .catch(() => setProperties([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered =
    filter === "All"
      ? properties
      : properties.filter((p) => p.type === filter.toLowerCase());

  return (
    <div className="flex min-h-svh flex-col bg-landly-navy pb-14">
      <Navbar />

      <main className="mx-auto w-full max-w-7xl flex-1 px-6 pt-24 md:pt-28">
        {/* header */}
        <div className="mb-10">
          <h1 className="font-sans text-3xl font-bold text-landly-offwhite md:text-4xl">
            Marketplace
          </h1>
          <p className="mt-2 text-sm text-landly-slate">
            Invest in verified properties across India
          </p>
        </div>

        {/* filters */}
        <div className="mb-8">
          <FilterBar active={filter} onChange={setFilter} />
        </div>

        {/* property grid */}
        {loading ? (
          <p className="py-20 text-center text-landly-slate">Loading properties…</p>
        ) : filtered.length === 0 ? (
          <p className="py-20 text-center text-landly-slate">
            No properties found for this category.
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((property, i) => (
              <PropertyCard key={property.id} property={property} index={i} />
            ))}
          </div>
        )}
      </main>

      <LiveTicker />
    </div>
  );
}
