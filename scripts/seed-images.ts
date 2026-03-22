/**
 * Seed script — updates image_url for existing properties in Supabase.
 *
 * Usage:
 *   npx tsx scripts/seed-images.ts
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const IMAGE_MAP: Record<string, string> = {
  "Thrissur Agricultural Plot":
    "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800",
  "Kochi Residential Flat":
    "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800",
  "Bangalore Commercial Space":
    "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800",
  "Goa Beach Plot":
    "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=800",
  "Mumbai Studio Apartment":
    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800",
  "Hyderabad Tech Park Unit":
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800",
};

async function main() {
  for (const [title, url] of Object.entries(IMAGE_MAP)) {
    const { data, error } = await supabase
      .from("properties")
      .update({ image_url: url })
      .eq("title", title)
      .select("id, title");

    if (error) {
      console.error(`FAIL  ${title}:`, error.message);
    } else if (data && data.length > 0) {
      console.log(`OK    ${title} → image_url set`);
    } else {
      console.warn(`SKIP  "${title}" not found in properties table`);
    }
  }
}

main();
