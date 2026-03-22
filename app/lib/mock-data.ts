/* ── DEPRECATED — This file is no longer used ──────
   All pages now fetch from live APIs.
   Types and helpers have moved to app/lib/types.ts.
   This file can be safely deleted. */

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

/* ── seed properties (matches Supabase seeds) ────── */

export const MOCK_PROPERTIES: Property[] = [
  {
    id: "p1",
    owner_id: "o1",
    title: "Thrissur Agricultural Plot",
    location: "Thrissur, Kerala",
    type: "agricultural",
    description:
      "A 2-acre fertile plot in the heart of Kerala's cultural capital. Ideal for paddy and spice cultivation with year-round water access.",
    total_value: 800000,
    total_shares: 800,
    shares_available: 612,
    share_price: 1000,
    image_url: "",
    status: "live",
    created_at: "2026-03-15T10:00:00Z",
  },
  {
    id: "p2",
    owner_id: "o2",
    title: "Kochi Residential Flat",
    location: "Kakkanad, Kochi",
    type: "residential",
    description:
      "Modern 2BHK apartment in Kochi's IT corridor. Close to Infopark with excellent rental demand.",
    total_value: 4500000,
    total_shares: 4500,
    shares_available: 3800,
    share_price: 1000,
    image_url: "",
    status: "live",
    created_at: "2026-03-14T10:00:00Z",
  },
  {
    id: "p3",
    owner_id: "o3",
    title: "Bangalore Commercial Space",
    location: "Koramangala, Bangalore",
    type: "commercial",
    description:
      "Prime 1,200 sq ft office space in Bangalore's startup hub. Currently leased with 8% annual yield.",
    total_value: 12000000,
    total_shares: 1200,
    shares_available: 720,
    share_price: 10000,
    image_url: "",
    status: "live",
    created_at: "2026-03-13T10:00:00Z",
  },
  {
    id: "p4",
    owner_id: "o4",
    title: "Goa Beach Plot",
    location: "Calangute, Goa",
    type: "agricultural",
    description:
      "0.5-acre beachside plot near Calangute. High tourism value with potential resort development.",
    total_value: 2500000,
    total_shares: 2500,
    shares_available: 1900,
    share_price: 1000,
    image_url: "",
    status: "live",
    created_at: "2026-03-12T10:00:00Z",
  },
  {
    id: "p5",
    owner_id: "o5",
    title: "Mumbai Studio Apartment",
    location: "Andheri West, Mumbai",
    type: "residential",
    description:
      "Compact studio in Mumbai's entertainment district. High rental yield with metro connectivity.",
    total_value: 6000000,
    total_shares: 600,
    shares_available: 350,
    share_price: 10000,
    image_url: "",
    status: "live",
    created_at: "2026-03-11T10:00:00Z",
  },
  {
    id: "p6",
    owner_id: "o6",
    title: "Hyderabad Tech Park Unit",
    location: "HITEC City, Hyderabad",
    type: "commercial",
    description:
      "Office unit in Hyderabad's technology corridor. Leased to a leading IT firm with 5-year lock-in.",
    total_value: 9000000,
    total_shares: 900,
    shares_available: 540,
    share_price: 10000,
    image_url: "",
    status: "live",
    created_at: "2026-03-10T10:00:00Z",
  },
];

/* ── Indian names for live ticker ────────────────── */

const NAMES = [
  "Aarav", "Priya", "Rahul", "Ananya", "Vikram",
  "Meera", "Arjun", "Diya", "Karthik", "Sneha",
  "Rohan", "Ishita", "Aditya", "Kavya", "Nikhil",
  "Pooja", "Siddharth", "Tanvi", "Varun", "Riya",
];

export const MOCK_TRANSACTIONS: Transaction[] = [
  { id: "t1", user_id: "u1", property_id: "p1", user_name: "Rahul", shares: 5, price_per_share: 1000, total_amount: 5000, created_at: "2026-03-22T09:30:00Z" },
  { id: "t2", user_id: "u2", property_id: "p3", user_name: "Ananya", shares: 2, price_per_share: 10000, total_amount: 20000, created_at: "2026-03-22T09:28:00Z" },
  { id: "t3", user_id: "u3", property_id: "p2", user_name: "Vikram", shares: 10, price_per_share: 1000, total_amount: 10000, created_at: "2026-03-22T09:25:00Z" },
  { id: "t4", user_id: "u4", property_id: "p5", user_name: "Meera", shares: 3, price_per_share: 10000, total_amount: 30000, created_at: "2026-03-22T09:22:00Z" },
  { id: "t5", user_id: "u5", property_id: "p4", user_name: "Arjun", shares: 8, price_per_share: 1000, total_amount: 8000, created_at: "2026-03-22T09:20:00Z" },
];

export const MOCK_USER: UserProfile = {
  id: "u-demo",
  email: "demo@landly.in",
  full_name: "Demo Investor",
  role: "investor",
  wallet_balance: 10000,
};

export const MOCK_HOLDINGS: Holding[] = [
  {
    id: "h1",
    user_id: "u-demo",
    property_id: "p1",
    shares_owned: 12,
    total_invested: 12000,
    created_at: "2026-03-20T10:00:00Z",
  },
  {
    id: "h2",
    user_id: "u-demo",
    property_id: "p3",
    shares_owned: 3,
    total_invested: 30000,
    created_at: "2026-03-19T10:00:00Z",
  },
];

/* ── helper: random ticker entry ─────────────────── */
export function randomTickerEntry(): Transaction {
  const prop = MOCK_PROPERTIES[Math.floor(Math.random() * MOCK_PROPERTIES.length)];
  const name = NAMES[Math.floor(Math.random() * NAMES.length)];
  const shares = Math.floor(Math.random() * 10) + 1;
  return {
    id: `t-${Date.now()}`,
    user_id: "bot",
    property_id: prop.id,
    user_name: name,
    shares,
    price_per_share: prop.share_price,
    total_amount: shares * prop.share_price,
    created_at: new Date().toISOString(),
  };
}

/* ── helper: find property ───────────────────────── */
export function getPropertyById(id: string): Property | undefined {
  return MOCK_PROPERTIES.find((p) => p.id === id);
}

/* ── helper: format currency ─────────────────────── */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/* ── helper: percent sold ────────────────────────── */
export function percentSold(property: Property): number {
  return Math.round(
    ((property.total_shares - property.shares_available) / property.total_shares) * 100
  );
}

/* ── pending properties for admin review ─────────── */
export const MOCK_PENDING_PROPERTIES: Property[] = [
  {
    id: "pp1",
    owner_id: "o7",
    title: "Jaipur Heritage Haveli",
    location: "Old City, Jaipur, Rajasthan",
    type: "residential",
    description: "Restored 200-year-old haveli in Jaipur's Pink City. Cultural tourism potential with 6 rooms and courtyard.",
    total_value: 7500000,
    total_shares: 750,
    shares_available: 750,
    share_price: 10000,
    image_url: "",
    status: "pending",
    created_at: "2026-03-23T08:00:00Z",
  },
  {
    id: "pp2",
    owner_id: "o8",
    title: "Coorg Coffee Estate",
    location: "Madikeri, Coorg, Karnataka",
    type: "agricultural",
    description: "5-acre Arabica coffee estate with processing unit. Annual yield of 2 tonnes with established buyer network.",
    total_value: 3000000,
    total_shares: 3000,
    shares_available: 3000,
    share_price: 1000,
    image_url: "",
    status: "pending",
    created_at: "2026-03-22T14:00:00Z",
  },
  {
    id: "pp3",
    owner_id: "o9",
    title: "Chennai Co-Working Space",
    location: "T. Nagar, Chennai, Tamil Nadu",
    type: "commercial",
    description: "3,000 sq ft turnkey co-working space in Chennai's commercial hub. 45 desks, meeting rooms, and high-speed internet.",
    total_value: 5500000,
    total_shares: 550,
    shares_available: 550,
    share_price: 10000,
    image_url: "",
    status: "pending",
    created_at: "2026-03-21T11:30:00Z",
  },
];
