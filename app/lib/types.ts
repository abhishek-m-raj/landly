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

export interface OrderBookLevel {
  id: string;
  side: "bid" | "ask";
  price: number;
  quantity: number;
}

export interface PropertyOrderBook {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  spread: number;
  midPrice: number;
  totalBidVolume: number;
  totalAskVolume: number;
  lastUpdated: string;
}

export interface PropertyMarketData {
  propertyId: string;
  currency: "INR";
  currentPrice: number;
  change24hAbs: number;
  change24hPct: number;
  history: PricePoint[];
  sharesAvailable?: number;
  totalShares?: number;
  orderbook: PropertyOrderBook;
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function percentSold(property: Property): number {
  const fractionListed = property.fraction_listed ?? 100;
  const listedShares = Math.floor((property.total_shares * fractionListed) / 100);
  const sharesSold = Math.max(0, listedShares - property.shares_available);

  return Math.round(
    (sharesSold / property.total_shares) * 100
  );
}
