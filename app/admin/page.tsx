"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import Navbar from "@/app/components/Navbar";
import { useAuth } from "@/app/components/AuthProvider";
import { type Property, formatINR } from "@/app/lib/types";
import { getAuthHeaders } from "@/lib/supabase";
import { isAdminEmail } from "@/lib/admin";

type PropertyStatus = Property["status"];
type UserRole = "investor" | "owner" | "admin";
type AdminTab = "overview" | "properties" | "users" | "transactions";

interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  wallet_balance: number;
}

interface AdminTransaction {
  id: string;
  user_id: string;
  user_name: string;
  shares: number;
  price_per_share: number;
  total_amount: number;
  created_at: string;
  property?: {
    id: string;
    title: string;
    location: string;
  };
}

interface AdminOverview {
  properties: {
    total: number;
    byStatus: Record<PropertyStatus, number>;
  };
  users: {
    total: number;
    byRole: Record<UserRole, number>;
  };
  transactions: {
    count: number;
    volume: number;
  };
  holdings: {
    totalInvested: number;
    totalSharesOwned: number;
  };
  wallets: {
    totalBalance: number;
  };
}

type PropertyDraft = Pick<
  Property,
  "title" | "location" | "type" | "description" | "status" | "total_value" | "total_shares" | "shares_available" | "share_price"
>;

const PROPERTY_STATUSES: PropertyStatus[] = ["pending", "verified", "live", "rejected", "sold"];
const USER_ROLES: UserRole[] = ["investor", "owner", "admin"];

const TABS: Array<{ id: AdminTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "properties", label: "Properties" },
  { id: "users", label: "Users" },
  { id: "transactions", label: "Transactions" },
];

function buildPropertyDraft(property: Property): PropertyDraft {
  return {
    title: property.title,
    location: property.location,
    type: property.type,
    description: property.description,
    status: property.status,
    total_value: property.total_value,
    total_shares: property.total_shares,
    shares_available: property.shares_available,
    share_price: property.share_price,
  };
}

function statusTextColor(status: PropertyStatus) {
  if (status === "live") return "text-landly-green";
  if (status === "pending") return "text-landly-gold";
  if (status === "verified") return "text-sky-400";
  if (status === "sold") return "text-violet-300";
  return "text-landly-red";
}

export default function AdminPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<AdminTab>("overview");

  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);

  const [properties, setProperties] = useState<Property[]>([]);
  const [propertyDrafts, setPropertyDrafts] = useState<Record<string, PropertyDraft>>({});
  const [propertyFilter, setPropertyFilter] = useState<PropertyStatus | "all">("all");
  const [propertySearch, setPropertySearch] = useState("");
  const [propertiesLoading, setPropertiesLoading] = useState(true);
  const [propertyBusyId, setPropertyBusyId] = useState<string | null>(null);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [userFilter, setUserFilter] = useState<UserRole | "all">("all");
  const [userSearch, setUserSearch] = useState("");
  const [usersLoading, setUsersLoading] = useState(true);
  const [userBusyId, setUserBusyId] = useState<string | null>(null);
  const [walletAdjustments, setWalletAdjustments] = useState<Record<string, string>>({});

  const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(true);

  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const isAdmin = isAdminEmail(user?.email);

  function showError(message: string) {
    setError(message);
    setInfo("");
  }

  function showInfo(message: string) {
    setInfo(message);
    setError("");
  }

  const fetchAdminJson = useCallback(async (input: string, init?: RequestInit) => {
    const authHeaders = await getAuthHeaders();
    const headers = new Headers(init?.headers);

    for (const [key, value] of Object.entries(authHeaders)) {
      headers.set(key, value);
    }

    return fetch(input, {
      ...init,
      headers,
    });
  }, []);

  async function loadOverview() {
    setOverviewLoading(true);
    const res = await fetchAdminJson("/api/admin/overview");
    const data = await res.json();
    if (!res.ok) {
      showError(data.error || "Failed to load overview");
      setOverviewLoading(false);
      return;
    }
    setOverview(data as AdminOverview);
    setOverviewLoading(false);
  }

  async function loadProperties(nextFilter: PropertyStatus | "all", search: string) {
    setPropertiesLoading(true);
    const params = new URLSearchParams({ status: nextFilter, limit: "200" });
    if (search.trim().length > 0) {
      params.set("search", search.trim());
    }

    const res = await fetchAdminJson(`/api/admin/properties?${params.toString()}`);
    const data = await res.json();

    if (!res.ok) {
      showError(data.error || "Failed to load properties");
      setPropertiesLoading(false);
      return;
    }

    const list = (data ?? []) as Property[];
    setProperties(list);
    setPropertyDrafts((prev) => {
      const next = { ...prev };
      for (const property of list) {
        if (!next[property.id]) {
          next[property.id] = buildPropertyDraft(property);
        }
      }
      return next;
    });
    setPropertiesLoading(false);
  }

  async function loadUsers(nextFilter: UserRole | "all", search: string) {
    setUsersLoading(true);
    const params = new URLSearchParams({ role: nextFilter, limit: "300" });
    if (search.trim().length > 0) {
      params.set("search", search.trim());
    }

    const res = await fetchAdminJson(`/api/admin/users?${params.toString()}`);
    const data = await res.json();

    if (!res.ok) {
      showError(data.error || "Failed to load users");
      setUsersLoading(false);
      return;
    }

    setUsers((data ?? []) as AdminUser[]);
    setUsersLoading(false);
  }

  async function loadTransactions() {
    setTransactionsLoading(true);
    const res = await fetchAdminJson("/api/admin/transactions?limit=300");
    const data = await res.json();

    if (!res.ok) {
      showError(data.error || "Failed to load transactions");
      setTransactionsLoading(false);
      return;
    }

    setTransactions((data ?? []) as AdminTransaction[]);
    setTransactionsLoading(false);
  }

  // Initial admin bootstrap fetches all dashboard datasets once.
  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user || !isAdmin) {
      router.replace("/marketplace");
      return;
    }

    queueMicrotask(async () => {
      const [overviewRes, propertiesRes, usersRes, txRes] = await Promise.all([
        fetchAdminJson("/api/admin/overview"),
        fetchAdminJson("/api/admin/properties?status=all&limit=200"),
        fetchAdminJson("/api/admin/users?role=all&limit=300"),
        fetchAdminJson("/api/admin/transactions?limit=300"),
      ]);

      const [overviewData, propertiesData, usersData, txData] = await Promise.all([
        overviewRes.json(),
        propertiesRes.json(),
        usersRes.json(),
        txRes.json(),
      ]);

      if (overviewRes.ok) {
        setOverview(overviewData as AdminOverview);
      }
      if (propertiesRes.ok) {
        const list = (propertiesData ?? []) as Property[];
        setProperties(list);
        setPropertyDrafts((prev) => {
          const next = { ...prev };
          for (const property of list) {
            if (!next[property.id]) {
              next[property.id] = buildPropertyDraft(property);
            }
          }
          return next;
        });
      }
      if (usersRes.ok) {
        setUsers((usersData ?? []) as AdminUser[]);
      }
      if (txRes.ok) {
        setTransactions((txData ?? []) as AdminTransaction[]);
      }

      if (!overviewRes.ok || !propertiesRes.ok || !usersRes.ok || !txRes.ok) {
        const message =
          overviewData?.error ||
          propertiesData?.error ||
          usersData?.error ||
          txData?.error ||
          "Failed to load admin data";
        setError(message);
        setInfo("");
      }

      setOverviewLoading(false);
      setPropertiesLoading(false);
      setUsersLoading(false);
      setTransactionsLoading(false);
    });
  }, [authLoading, fetchAdminJson, isAdmin, router, user]);

  if (authLoading || !user || !isAdmin) {
    return (
      <div className="flex min-h-svh flex-col bg-landly-navy">
        <Navbar />
        <main className="mx-auto flex w-full max-w-6xl flex-1 items-center justify-center px-6 pt-24 pb-16 md:pt-28">
          <p className="text-sm text-landly-slate">Checking admin access...</p>
        </main>
      </div>
    );
  }

  function updateDraft<T extends keyof PropertyDraft>(id: string, key: T, value: PropertyDraft[T]) {
    setPropertyDrafts((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] ?? ({} as PropertyDraft)),
        [key]: value,
      },
    }));
  }

  async function patchProperty(id: string, payload: Partial<PropertyDraft>) {
    setPropertyBusyId(id);
    const res = await fetchAdminJson(`/api/admin/properties/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (!res.ok) {
      showError(data.error || "Failed to update property");
      setPropertyBusyId(null);
      return;
    }

    const next = data.property as Property;
    setProperties((prev) => prev.map((property) => (property.id === id ? next : property)));
    setPropertyDrafts((prev) => ({ ...prev, [id]: buildPropertyDraft(next) }));
    showInfo(`Saved property: ${next.title}`);
    loadOverview();
    setPropertyBusyId(null);
  }

  async function deleteProperty(id: string) {
    const target = properties.find((property) => property.id === id);
    if (!target) return;

    if (!window.confirm(`Delete ${target.title}? This only works with zero holdings and zero transactions.`)) {
      return;
    }

    setPropertyBusyId(id);
    const res = await fetchAdminJson(`/api/admin/properties/${id}`, { method: "DELETE" });
    const data = await res.json();

    if (!res.ok) {
      showError(data.error || "Failed to delete property");
      setPropertyBusyId(null);
      return;
    }

    setProperties((prev) => prev.filter((property) => property.id !== id));
    setPropertyDrafts((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    showInfo(`Deleted property: ${target.title}`);
    loadOverview();
    setPropertyBusyId(null);
  }

  async function updateUser(userId: string, payload: { role?: UserRole; wallet_adjustment?: number }) {
    setUserBusyId(userId);
    const res = await fetchAdminJson(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (!res.ok) {
      showError(data.error || "Failed to update user");
      setUserBusyId(null);
      return;
    }

    const updated = data.user as AdminUser;
    setUsers((prev) => prev.map((user) => (user.id === userId ? updated : user)));
    showInfo(`Updated user: ${updated.full_name || updated.email}`);
    loadOverview();
    setUserBusyId(null);
  }

  const typeColor: Record<Property["type"], string> = {
    agricultural: "text-landly-green",
    residential: "text-sky-400",
    commercial: "text-landly-gold",
  };

  return (
    <div className="flex min-h-svh flex-col bg-landly-navy">
      <Navbar />

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 pt-24 pb-16 md:pt-28">
        <motion.h1
          className="font-sans text-3xl font-bold text-landly-offwhite"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Admin Control Center
        </motion.h1>

        <motion.p
          className="mt-2 text-sm text-landly-slate"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { delay: 0.05 } }}
        >
          Full operations for platform entities, moderation, and financial controls.
        </motion.p>

        <div className="mt-6 flex flex-wrap gap-2">
          {TABS.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`rounded-(--radius-land) px-4 py-2 text-sm font-semibold transition-all ${
                tab === item.id
                  ? "bg-landly-gold text-landly-navy-deep"
                  : "border border-landly-slate/20 text-landly-slate hover:border-landly-slate/40 hover:text-landly-offwhite"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {(error || info) && (
          <div
            className={`mt-4 rounded-(--radius-land) border px-4 py-3 text-sm ${
              error
                ? "border-landly-red/30 bg-landly-red/10 text-landly-red"
                : "border-landly-green/30 bg-landly-green/10 text-landly-green"
            }`}
          >
            {error || info}
          </div>
        )}

        <div className="mt-8">
          <AnimatePresence mode="wait">
            {tab === "overview" && (
              <motion.section
                key="overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-5"
              >
                {overviewLoading || !overview ? (
                  <p className="text-sm text-landly-slate">Loading overview...</p>
                ) : (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="rounded-(--radius-land) border border-landly-slate/10 bg-landly-navy-deep/40 p-4">
                        <p className="text-xs uppercase tracking-wider text-landly-slate">Properties</p>
                        <p className="mt-1 font-mono text-2xl text-landly-gold">{overview.properties.total}</p>
                      </div>
                      <div className="rounded-(--radius-land) border border-landly-slate/10 bg-landly-navy-deep/40 p-4">
                        <p className="text-xs uppercase tracking-wider text-landly-slate">Users</p>
                        <p className="mt-1 font-mono text-2xl text-landly-gold">{overview.users.total}</p>
                      </div>
                      <div className="rounded-(--radius-land) border border-landly-slate/10 bg-landly-navy-deep/40 p-4">
                        <p className="text-xs uppercase tracking-wider text-landly-slate">Transactions</p>
                        <p className="mt-1 font-mono text-2xl text-landly-gold">{overview.transactions.count}</p>
                      </div>
                      <div className="rounded-(--radius-land) border border-landly-slate/10 bg-landly-navy-deep/40 p-4">
                        <p className="text-xs uppercase tracking-wider text-landly-slate">Volume</p>
                        <p className="mt-1 font-mono text-2xl text-landly-gold">{formatINR(overview.transactions.volume)}</p>
                      </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="rounded-(--radius-land) border border-landly-slate/10 bg-landly-navy-deep/40 p-5">
                        <h2 className="text-sm font-semibold uppercase tracking-wider text-landly-slate">Property Breakdown</h2>
                        <div className="mt-3 space-y-2">
                          {PROPERTY_STATUSES.map((status) => (
                            <div key={status} className="flex items-center justify-between text-sm">
                              <span className={`capitalize ${statusTextColor(status)}`}>{status}</span>
                              <span className="font-mono text-landly-offwhite">{overview.properties.byStatus[status] || 0}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-(--radius-land) border border-landly-slate/10 bg-landly-navy-deep/40 p-5">
                        <h2 className="text-sm font-semibold uppercase tracking-wider text-landly-slate">Financial Summary</h2>
                        <div className="mt-3 space-y-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-landly-slate">Total Wallet Balance</span>
                            <span className="font-mono text-landly-offwhite">{formatINR(overview.wallets.totalBalance)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-landly-slate">Holdings Invested</span>
                            <span className="font-mono text-landly-offwhite">{formatINR(overview.holdings.totalInvested)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-landly-slate">Total Shares Held</span>
                            <span className="font-mono text-landly-offwhite">{overview.holdings.totalSharesOwned}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </motion.section>
            )}

            {tab === "properties" && (
              <motion.section
                key="properties"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="flex flex-col gap-3 rounded-(--radius-land) border border-landly-slate/10 bg-landly-navy-deep/35 p-4 md:flex-row">
                  <input
                    value={propertySearch}
                    onChange={(event) => setPropertySearch(event.target.value)}
                    placeholder="Search title or location"
                    className="w-full rounded-(--radius-land) border border-landly-slate/20 bg-landly-navy-deep/60 px-3 py-2 text-sm text-landly-offwhite placeholder:text-landly-slate/50"
                  />
                  <select
                    value={propertyFilter}
                    onChange={(event) => {
                      const next = event.target.value as PropertyStatus | "all";
                      setPropertyFilter(next);
                      void loadProperties(next, propertySearch);
                    }}
                    className="rounded-(--radius-land) border border-landly-slate/20 bg-landly-navy-deep/60 px-3 py-2 text-sm text-landly-offwhite"
                  >
                    <option value="all">All Statuses</option>
                    {PROPERTY_STATUSES.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => loadProperties(propertyFilter, propertySearch)}
                    className="rounded-(--radius-land) border border-landly-gold/30 px-4 py-2 text-sm font-semibold text-landly-gold hover:bg-landly-gold/10"
                  >
                    Refresh
                  </button>
                </div>

                {propertiesLoading ? (
                  <p className="text-sm text-landly-slate">Loading properties...</p>
                ) : properties.length === 0 ? (
                  <p className="text-sm text-landly-slate">No properties found.</p>
                ) : (
                  <div className="space-y-4">
                    {properties.map((property) => {
                      const draft = propertyDrafts[property.id] ?? buildPropertyDraft(property);
                      const busy = propertyBusyId === property.id;

                      return (
                        <article key={property.id} className="rounded-(--radius-land) border border-landly-slate/10 bg-landly-navy-deep/45 p-5">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <h3 className="text-base font-semibold text-landly-offwhite">{property.title}</h3>
                              <p className="text-xs text-landly-slate">{property.location}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-medium capitalize ${typeColor[property.type]}`}>{property.type}</span>
                              <span className={`text-xs font-semibold uppercase tracking-wider ${statusTextColor(property.status)}`}>{property.status}</span>
                            </div>
                          </div>

                          <div className="mt-4 grid gap-3 md:grid-cols-2">
                            <input
                              value={draft.title}
                              onChange={(event) => updateDraft(property.id, "title", event.target.value)}
                              className="rounded-(--radius-land) border border-landly-slate/20 bg-landly-navy-deep/60 px-3 py-2 text-sm text-landly-offwhite"
                              placeholder="Title"
                            />
                            <input
                              value={draft.location}
                              onChange={(event) => updateDraft(property.id, "location", event.target.value)}
                              className="rounded-(--radius-land) border border-landly-slate/20 bg-landly-navy-deep/60 px-3 py-2 text-sm text-landly-offwhite"
                              placeholder="Location"
                            />
                            <select
                              value={draft.status}
                              onChange={(event) => updateDraft(property.id, "status", event.target.value as PropertyStatus)}
                              className="rounded-(--radius-land) border border-landly-slate/20 bg-landly-navy-deep/60 px-3 py-2 text-sm text-landly-offwhite"
                            >
                              {PROPERTY_STATUSES.map((status) => (
                                <option key={status} value={status}>{status}</option>
                              ))}
                            </select>
                            <select
                              value={draft.type}
                              onChange={(event) => updateDraft(property.id, "type", event.target.value as Property["type"])}
                              className="rounded-(--radius-land) border border-landly-slate/20 bg-landly-navy-deep/60 px-3 py-2 text-sm text-landly-offwhite"
                            >
                              <option value="agricultural">agricultural</option>
                              <option value="residential">residential</option>
                              <option value="commercial">commercial</option>
                            </select>
                            <input
                              type="number"
                              value={draft.total_value}
                              onChange={(event) => updateDraft(property.id, "total_value", Number(event.target.value))}
                              className="rounded-(--radius-land) border border-landly-slate/20 bg-landly-navy-deep/60 px-3 py-2 text-sm text-landly-offwhite"
                              placeholder="Total value"
                            />
                            <input
                              type="number"
                              value={draft.share_price}
                              onChange={(event) => updateDraft(property.id, "share_price", Number(event.target.value))}
                              className="rounded-(--radius-land) border border-landly-slate/20 bg-landly-navy-deep/60 px-3 py-2 text-sm text-landly-offwhite"
                              placeholder="Share price"
                            />
                            <input
                              type="number"
                              value={draft.total_shares}
                              onChange={(event) => updateDraft(property.id, "total_shares", Number(event.target.value))}
                              className="rounded-(--radius-land) border border-landly-slate/20 bg-landly-navy-deep/60 px-3 py-2 text-sm text-landly-offwhite"
                              placeholder="Total shares"
                            />
                            <input
                              type="number"
                              value={draft.shares_available}
                              onChange={(event) => updateDraft(property.id, "shares_available", Number(event.target.value))}
                              className="rounded-(--radius-land) border border-landly-slate/20 bg-landly-navy-deep/60 px-3 py-2 text-sm text-landly-offwhite"
                              placeholder="Shares available"
                            />
                          </div>

                          <textarea
                            value={draft.description}
                            onChange={(event) => updateDraft(property.id, "description", event.target.value)}
                            className="mt-3 min-h-20 w-full rounded-(--radius-land) border border-landly-slate/20 bg-landly-navy-deep/60 px-3 py-2 text-sm text-landly-offwhite"
                            placeholder="Description"
                          />

                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              disabled={busy}
                              onClick={() => patchProperty(property.id, draft)}
                              className="rounded-(--radius-land) border border-landly-gold/30 px-4 py-2 text-sm font-semibold text-landly-gold hover:bg-landly-gold/10 disabled:opacity-50"
                            >
                              Save
                            </button>
                            <button
                              disabled={busy}
                              onClick={() => patchProperty(property.id, { status: "live" })}
                              className="rounded-(--radius-land) bg-landly-green/15 px-4 py-2 text-sm font-semibold text-landly-green hover:bg-landly-green/25 disabled:opacity-50"
                            >
                              Set Live
                            </button>
                            <button
                              disabled={busy}
                              onClick={() => patchProperty(property.id, { status: "rejected" })}
                              className="rounded-(--radius-land) bg-landly-red/15 px-4 py-2 text-sm font-semibold text-landly-red hover:bg-landly-red/25 disabled:opacity-50"
                            >
                              Reject
                            </button>
                            <button
                              disabled={busy}
                              onClick={() => deleteProperty(property.id)}
                              className="rounded-(--radius-land) border border-landly-red/30 px-4 py-2 text-sm font-semibold text-landly-red hover:bg-landly-red/10 disabled:opacity-50"
                            >
                              Delete
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </motion.section>
            )}

            {tab === "users" && (
              <motion.section
                key="users"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="flex flex-col gap-3 rounded-(--radius-land) border border-landly-slate/10 bg-landly-navy-deep/35 p-4 md:flex-row">
                  <input
                    value={userSearch}
                    onChange={(event) => setUserSearch(event.target.value)}
                    placeholder="Search name or email"
                    className="w-full rounded-(--radius-land) border border-landly-slate/20 bg-landly-navy-deep/60 px-3 py-2 text-sm text-landly-offwhite placeholder:text-landly-slate/50"
                  />
                  <select
                    value={userFilter}
                    onChange={(event) => {
                      const next = event.target.value as UserRole | "all";
                      setUserFilter(next);
                      void loadUsers(next, userSearch);
                    }}
                    className="rounded-(--radius-land) border border-landly-slate/20 bg-landly-navy-deep/60 px-3 py-2 text-sm text-landly-offwhite"
                  >
                    <option value="all">All Roles</option>
                    {USER_ROLES.map((role) => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => loadUsers(userFilter, userSearch)}
                    className="rounded-(--radius-land) border border-landly-gold/30 px-4 py-2 text-sm font-semibold text-landly-gold hover:bg-landly-gold/10"
                  >
                    Refresh
                  </button>
                </div>

                {usersLoading ? (
                  <p className="text-sm text-landly-slate">Loading users...</p>
                ) : users.length === 0 ? (
                  <p className="text-sm text-landly-slate">No users found.</p>
                ) : (
                  <div className="space-y-3">
                    {users.map((user) => {
                      const busy = userBusyId === user.id;
                      return (
                        <article key={user.id} className="rounded-(--radius-land) border border-landly-slate/10 bg-landly-navy-deep/45 p-4">
                          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                            <div>
                              <p className="font-medium text-landly-offwhite">{user.full_name || "Unnamed"}</p>
                              <p className="text-xs text-landly-slate">{user.email}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <select
                                value={user.role}
                                disabled={busy}
                                onChange={(event) => updateUser(user.id, { role: event.target.value as UserRole })}
                                className="rounded-(--radius-land) border border-landly-slate/20 bg-landly-navy-deep/60 px-3 py-2 text-sm text-landly-offwhite"
                              >
                                {USER_ROLES.map((role) => (
                                  <option key={role} value={role}>{role}</option>
                                ))}
                              </select>
                              <span className="font-mono text-sm text-landly-gold">{formatINR(user.wallet_balance)}</span>
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <input
                              value={walletAdjustments[user.id] ?? ""}
                              onChange={(event) => setWalletAdjustments((prev) => ({ ...prev, [user.id]: event.target.value }))}
                              placeholder="Wallet adjustment (1000 or -500)"
                              className="min-w-72 rounded-(--radius-land) border border-landly-slate/20 bg-landly-navy-deep/60 px-3 py-2 text-sm text-landly-offwhite placeholder:text-landly-slate/50"
                            />
                            <button
                              disabled={busy}
                              onClick={() => {
                                const amount = Number(walletAdjustments[user.id] || "0");
                                if (!Number.isFinite(amount) || amount === 0) {
                                  showError("Wallet adjustment must be a non-zero number");
                                  return;
                                }
                                updateUser(user.id, { wallet_adjustment: amount });
                                setWalletAdjustments((prev) => ({ ...prev, [user.id]: "" }));
                              }}
                              className="rounded-(--radius-land) border border-landly-green/30 px-4 py-2 text-sm font-semibold text-landly-green hover:bg-landly-green/10 disabled:opacity-50"
                            >
                              Apply Wallet Update
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </motion.section>
            )}

            {tab === "transactions" && (
              <motion.section
                key="transactions"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-landly-slate">Platform Transactions</h2>
                  <button
                    onClick={loadTransactions}
                    className="rounded-(--radius-land) border border-landly-gold/30 px-4 py-2 text-sm font-semibold text-landly-gold hover:bg-landly-gold/10"
                  >
                    Refresh
                  </button>
                </div>

                {transactionsLoading ? (
                  <p className="text-sm text-landly-slate">Loading transactions...</p>
                ) : transactions.length === 0 ? (
                  <p className="text-sm text-landly-slate">No transactions yet.</p>
                ) : (
                  <div className="overflow-x-auto rounded-(--radius-land) border border-landly-slate/10 bg-landly-navy-deep/40">
                    <table className="w-full min-w-4xl text-left text-sm">
                      <thead className="border-b border-landly-slate/10 text-[10px] uppercase tracking-wider text-landly-slate">
                        <tr>
                          <th className="px-4 py-3 font-medium">Time</th>
                          <th className="px-4 py-3 font-medium">User</th>
                          <th className="px-4 py-3 font-medium">Property</th>
                          <th className="px-4 py-3 font-medium">Shares</th>
                          <th className="px-4 py-3 font-medium">Price</th>
                          <th className="px-4 py-3 font-medium">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.map((tx) => (
                          <tr key={tx.id} className="border-b border-landly-slate/5">
                            <td className="px-4 py-3 text-xs text-landly-slate">
                              {new Date(tx.created_at).toLocaleString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </td>
                            <td className="px-4 py-3 text-landly-offwhite">
                              <p>{tx.user_name}</p>
                              <p className="text-xs text-landly-slate">{tx.user_id.slice(0, 8)}...</p>
                            </td>
                            <td className="px-4 py-3 text-landly-offwhite">
                              <p>{tx.property?.title || "Unknown property"}</p>
                              <p className="text-xs text-landly-slate">{tx.property?.location || ""}</p>
                            </td>
                            <td className="px-4 py-3 font-mono text-landly-offwhite">{tx.shares}</td>
                            <td className="px-4 py-3 font-mono text-landly-offwhite">{formatINR(tx.price_per_share)}</td>
                            <td className="px-4 py-3 font-mono text-landly-gold">{formatINR(tx.total_amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </motion.section>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
