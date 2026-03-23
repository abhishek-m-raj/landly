export interface PropertyDocument {
  name: string;
  verified: boolean;
}

export interface Property {
  id: string;
  owner_id: string;
  title: string;
  location: string;
  type: "agricultural" | "residential" | "commercial";
  description: string;
  total_value: number;
  total_shares: number;
  shares_available: number;
  fraction_listed: number;
  estimated_yield: number | null;
  share_price: number;
  image_url: string;
  documents: PropertyDocument[];
  status: "pending" | "verified" | "live" | "rejected" | "sold";
  verification_status?: Property["status"];
  listed_shares?: number;
  shares_sold?: number;
  percent_funded?: number;
  owner_retained_percent?: number;
  created_at: string;
}

export type TransactionType = "buy" | "sell";

export interface Transaction {
  id: string;
  user_id: string;
  property_id: string;
  user_name: string;
  shares: number;
  price_per_share: number;
  total_amount: number;
  type: TransactionType;
  created_at: string;
}

export interface Holding {
  id: string;
  user_id: string;
  property_id: string;
  shares_owned: number;
  total_invested: number;
  created_at: string;
  property?: Property;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: "investor" | "owner" | "admin";
  wallet_balance: number;
}

export interface PricePoint {
  timestamp: string;
  price: number;
  volume: number;
}

export interface PropertyMarketData {
  propertyId: string;
  currency: "INR";
  currentPrice: number;
  history: PricePoint[];
  transactionCount: number;
  latestActivityAt: string | null;
  sharesAvailable?: number;
  totalShares?: number;
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getListedShares(property: Pick<Property, "total_shares" | "fraction_listed" | "listed_shares">): number {
  if (typeof property.listed_shares === "number" && Number.isFinite(property.listed_shares)) {
    return Math.max(0, Math.trunc(property.listed_shares));
  }

  const fractionListed = property.fraction_listed ?? 100;
  return Math.floor((property.total_shares * fractionListed) / 100);
}

export function getSharesSold(property: Pick<Property, "shares_available" | "total_shares" | "fraction_listed" | "listed_shares" | "shares_sold">): number {
  if (typeof property.shares_sold === "number" && Number.isFinite(property.shares_sold)) {
    return Math.max(0, Math.trunc(property.shares_sold));
  }

  return Math.max(0, getListedShares(property) - property.shares_available);
}

export function percentSold(property: Property): number {
  const listedShares = getListedShares(property);
  const sharesSold = getSharesSold(property);

  if (listedShares <= 0) {
    return 0;
  }

  return Math.round(
    (sharesSold / listedShares) * 100
  );
}
