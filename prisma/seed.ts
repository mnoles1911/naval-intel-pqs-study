import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type SeedLocation = {
  name: string;
  description?: string;
  color: string;
  planX: number;
  planY: number;
  sortOrder: number;
};

type SeedItem = {
  name: string;
  description?: string;
  status: "NEEDED" | "PURCHASED" | "READY";
  quantity?: number;
  category?:
    | "FLORALS"
    | "STATIONERY"
    | "LIGHTING"
    | "TABLEWARE"
    | "SIGNAGE"
    | "FURNITURE"
    | "LINENS"
    | "FAVORS"
    | "OTHER";
  priority?: "LOW" | "MEDIUM" | "HIGH";
  estimatedCost?: number;
  actualCost?: number;
  vendorName?: string;
  vendorUrl?: string;
  notes?: string;
  location: string | null;
};

const LOCATIONS: SeedLocation[] = [
  {
    name: "Welcome / Sign-in Table",
    description:
      "First table guests see on arrival. Holds the welcome sign, escort cards, and guest book.",
    color: "#c9a66b",
    planX: 0.12,
    planY: 0.2,
    sortOrder: 0,
  },
  {
    name: "Ceremony Arch",
    description: "Floral arch backdrop where the couple exchanges vows.",
    color: "#a3b18a",
    planX: 0.5,
    planY: 0.12,
    sortOrder: 1,
  },
  {
    name: "Cocktail Bar",
    description: "Bar area during cocktail hour on the terrace.",
    color: "#9db4c0",
    planX: 0.82,
    planY: 0.32,
    sortOrder: 2,
  },
  {
    name: "Guest Tables",
    description: "The ten round reception tables for seated dinner.",
    color: "#cba0a0",
    planX: 0.45,
    planY: 0.62,
    sortOrder: 3,
  },
  {
    name: "Head Table",
    description: "Long sweetheart table for the couple and wedding party.",
    color: "#b08968",
    planX: 0.5,
    planY: 0.85,
    sortOrder: 4,
  },
];

const ITEMS: SeedItem[] = [
  {
    name: "Welcome sign",
    description: "Acrylic 24x36 sign on a gold easel greeting guests by name.",
    status: "READY",
    quantity: 1,
    category: "SIGNAGE",
    priority: "HIGH",
    estimatedCost: 120,
    actualCost: 135,
    vendorName: "Etsy — LetteredLane",
    vendorUrl: "https://www.etsy.com/",
    notes: "Easel is in the garage; sign wrapped in bubble wrap.",
    location: "Welcome / Sign-in Table",
  },
  {
    name: "Escort card display",
    description: "Framed board listing each guest's assigned table number.",
    status: "NEEDED",
    quantity: 1,
    category: "STATIONERY",
    priority: "HIGH",
    estimatedCost: 60,
    notes: "Waiting on final seating chart before printing.",
    location: "Welcome / Sign-in Table",
  },
  {
    name: "Guest book",
    description: "Linen-bound book with two matching pens.",
    status: "PURCHASED",
    quantity: 1,
    category: "STATIONERY",
    priority: "MEDIUM",
    estimatedCost: 45,
    actualCost: 42,
    location: "Welcome / Sign-in Table",
  },
  {
    name: "Ring dish",
    description: "Small ceramic dish to hold the rings during the ceremony.",
    status: "READY",
    quantity: 1,
    category: "OTHER",
    priority: "LOW",
    estimatedCost: 20,
    actualCost: 18,
    location: "Ceremony Arch",
  },
  {
    name: "Votive candle holders",
    description: "Frosted glass votives to line the aisle.",
    status: "NEEDED",
    quantity: 24,
    category: "LIGHTING",
    priority: "MEDIUM",
    estimatedCost: 72,
    vendorName: "Amazon",
    notes: "Buy flameless candles too — venue bans open flame on the aisle.",
    location: "Ceremony Arch",
  },
  {
    name: "Champagne coupes",
    description: "Vintage-style coupes for the welcome toast.",
    status: "NEEDED",
    quantity: 100,
    category: "TABLEWARE",
    priority: "HIGH",
    estimatedCost: 250,
    vendorName: "Rentals — Borrowed & Blue",
    location: "Cocktail Bar",
  },
  {
    name: "Cocktail napkins",
    status: "PURCHASED",
    quantity: 200,
    category: "STATIONERY",
    priority: "LOW",
    estimatedCost: 30,
    actualCost: 28,
    location: "Cocktail Bar",
  },
  {
    name: "Glass bud vases",
    description: "Small bud vases for single-stem florals per table.",
    status: "NEEDED",
    quantity: 30,
    category: "FLORALS",
    priority: "MEDIUM",
    estimatedCost: 90,
    location: "Guest Tables",
  },
  {
    name: "Table number cards",
    description: "Numbered cards 1-10 in matching gold stands.",
    status: "PURCHASED",
    quantity: 10,
    category: "STATIONERY",
    priority: "MEDIUM",
    estimatedCost: 40,
    actualCost: 40,
    location: "Guest Tables",
  },
  {
    name: "Menu cards",
    description: "Individual printed dinner menus, one per place setting.",
    status: "NEEDED",
    quantity: 100,
    category: "STATIONERY",
    priority: "HIGH",
    estimatedCost: 150,
    notes: "Final menu confirmed with caterer — ready to send to printer.",
    location: "Head Table",
  },
  {
    name: "Gold candlesticks",
    description: "Pair of tall tapered candlesticks flanking the couple.",
    status: "READY",
    quantity: 2,
    category: "LIGHTING",
    priority: "LOW",
    estimatedCost: 55,
    actualCost: 60,
    location: "Head Table",
  },
  // Intentionally unassigned (no location yet):
  {
    name: "Cake topper",
    description: "Custom laser-cut monogram topper — still deciding placement.",
    status: "NEEDED",
    quantity: 1,
    category: "OTHER",
    priority: "MEDIUM",
    estimatedCost: 35,
    location: null,
  },
  {
    name: "Extra string lights",
    status: "NEEDED",
    quantity: 6,
    category: "LIGHTING",
    priority: "LOW",
    estimatedCost: 48,
    location: null,
  },
];

async function main() {
  // Clear existing data (items first due to the relation).
  await prisma.item.deleteMany();
  await prisma.location.deleteMany();

  // Create locations and capture their generated ids by name.
  const locationIds = new Map<string, string>();
  for (const loc of LOCATIONS) {
    const created = await prisma.location.create({ data: loc });
    locationIds.set(created.name, created.id);
  }

  // Create items, wiring each to its location (or leaving it unassigned).
  for (const item of ITEMS) {
    const { location, ...rest } = item;
    const locationId = location ? locationIds.get(location) ?? null : null;
    await prisma.item.create({ data: { ...rest, locationId } });
  }

  const locationCount = await prisma.location.count();
  const itemCount = await prisma.item.count();
  const unassignedCount = await prisma.item.count({
    where: { locationId: null },
  });

  console.log(
    `Seed complete: ${locationCount} locations, ${itemCount} items ` +
      `(${unassignedCount} unassigned).`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
