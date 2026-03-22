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
  share_price: number;
  image_url: string;
  status: "pending" | "verified" | "live" | "rejected" | "sold";
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  property_id: string;
  user_name: string;
  shares: number;
  price_per_share: number;
  total_amount: number;
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
  return Math.round(
    ((property.total_shares - property.shares_available) / property.total_shares) * 100
  );
}
