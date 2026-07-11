import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type SeedLocation = {
  name: string;
  description?: string;
  color: string;
  planX: number;
  planY: number;
  sortOrder: number;
  shape: "ROUND" | "RECT";
  seatCount: number;
};

type SeedItem = {
  name: string;
  description?: string;
  status: "NEEDED" | "PURCHASED";
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
    shape: "RECT",
    seatCount: 2,
  },
  {
    name: "Ceremony Arch",
    description: "Floral arch backdrop where the couple exchanges vows.",
    color: "#a3b18a",
    planX: 0.5,
    planY: 0.12,
    sortOrder: 1,
    shape: "ROUND",
    seatCount: 2,
  },
  {
    name: "Cocktail Bar",
    description: "Bar area during cocktail hour on the terrace.",
    color: "#9db4c0",
    planX: 0.82,
    planY: 0.32,
    sortOrder: 2,
    shape: "RECT",
    seatCount: 6,
  },
  {
    name: "Guest Tables",
    description: "The ten round reception tables for seated dinner.",
    color: "#cba0a0",
    planX: 0.45,
    planY: 0.62,
    sortOrder: 3,
    shape: "ROUND",
    seatCount: 10,
  },
  {
    name: "Head Table",
    description: "Long sweetheart table for the couple and wedding party.",
    color: "#b08968",
    planX: 0.5,
    planY: 0.85,
    sortOrder: 4,
    shape: "RECT",
    seatCount: 8,
  },
];

const ITEMS: SeedItem[] = [
  {
    name: "Welcome sign",
    description: "Acrylic 24x36 sign on a gold easel greeting guests by name.",
    status: "PURCHASED",
    quantity: 1,
    category: "SIGNAGE",
    priority: "HIGH",
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
    location: "Welcome / Sign-in Table",
  },
  {
    name: "Ring dish",
    description: "Small ceramic dish to hold the rings during the ceremony.",
    status: "PURCHASED",
    quantity: 1,
    category: "OTHER",
    priority: "LOW",
    location: "Ceremony Arch",
  },
  {
    name: "Votive candle holders",
    description: "Frosted glass votives to line the aisle.",
    status: "NEEDED",
    quantity: 24,
    category: "LIGHTING",
    priority: "MEDIUM",
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
    vendorName: "Rentals — Borrowed & Blue",
    location: "Cocktail Bar",
  },
  {
    name: "Cocktail napkins",
    status: "PURCHASED",
    quantity: 200,
    category: "STATIONERY",
    priority: "LOW",
    location: "Cocktail Bar",
  },
  {
    name: "Glass bud vases",
    description: "Small bud vases for single-stem florals per table.",
    status: "NEEDED",
    quantity: 30,
    category: "FLORALS",
    priority: "MEDIUM",
    location: "Guest Tables",
  },
  {
    name: "Table number cards",
    description: "Numbered cards 1-10 in matching gold stands.",
    status: "PURCHASED",
    quantity: 10,
    category: "STATIONERY",
    priority: "MEDIUM",
    location: "Guest Tables",
  },
  {
    name: "Menu cards",
    description: "Individual printed dinner menus, one per place setting.",
    status: "NEEDED",
    quantity: 100,
    category: "STATIONERY",
    priority: "HIGH",
    notes: "Final menu confirmed with caterer — ready to send to printer.",
    location: "Head Table",
  },
  {
    name: "Gold candlesticks",
    description: "Pair of tall tapered candlesticks flanking the couple.",
    status: "PURCHASED",
    quantity: 2,
    category: "LIGHTING",
    priority: "LOW",
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
    location: null,
  },
  {
    name: "Extra string lights",
    status: "NEEDED",
    quantity: 6,
    category: "LIGHTING",
    priority: "LOW",
    location: null,
  },
];

type SeedParty = { key: string; name: string; color: string };
type SeedPerson = {
  name: string;
  party: string | null;
  location: string | null;
  notes?: string;
};

const PARTIES: SeedParty[] = [
  { key: "AS", name: "Alex & Sam", color: "#a3b18a" },
  { key: "JT", name: "Jordan & Taylor", color: "#cba0a0" },
  { key: "RIV", name: "The Riveras", color: "#9db4c0" },
];

const PEOPLE: SeedPerson[] = [
  // A couple seated together (no warning).
  { name: "Alex Chen", party: "AS", location: "Guest Tables" },
  { name: "Sam Chen", party: "AS", location: "Guest Tables" },
  // A couple split across two tables (should show a separation warning).
  { name: "Jordan Lee", party: "JT", location: "Head Table" },
  { name: "Taylor Lee", party: "JT", location: "Guest Tables" },
  // A family with one member not yet seated (also a separation warning).
  { name: "Maria Rivera", party: "RIV", location: "Guest Tables" },
  { name: "Luis Rivera", party: "RIV", location: "Guest Tables" },
  { name: "Elena Rivera", party: "RIV", location: null, notes: "Plus-one — still deciding table." },
  // Solo guests (never flagged).
  { name: "Pat Morgan", party: null, location: "Head Table" },
  { name: "Robin Fox", party: null, location: null },
];

async function main() {
  // Clear existing data (children first due to relations).
  await prisma.seatAssignment.deleteMany();
  await prisma.seatingPlan.deleteMany();
  await prisma.person.deleteMany();
  await prisma.party.deleteMany();
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

  // Create parties, capturing their generated ids by seed key.
  const partyIds = new Map<string, string>();
  for (const { key, name, color } of PARTIES) {
    const created = await prisma.party.create({ data: { name, color } });
    partyIds.set(key, created.id);
  }

  // Create guests (no seat here — seating lives in a plan).
  const personIds = new Map<string, string>();
  for (const person of PEOPLE) {
    const created = await prisma.person.create({
      data: {
        name: person.name,
        notes: person.notes,
        partyId: person.party ? partyIds.get(person.party) ?? null : null,
      },
    });
    personIds.set(person.name, created.id);
  }

  // Create a default active seating plan and seat guests in it, packing each
  // table's seats from index 0. Guests with no seed location stay unseated.
  const plan = await prisma.seatingPlan.create({
    data: { name: "Plan A", isActive: true },
  });
  const nextSeat = new Map<string, number>();
  for (const person of PEOPLE) {
    if (!person.location) continue;
    const locationId = locationIds.get(person.location);
    const personId = personIds.get(person.name);
    if (!locationId || !personId) continue;
    const seatIndex = nextSeat.get(locationId) ?? 0;
    nextSeat.set(locationId, seatIndex + 1);
    await prisma.seatAssignment.create({
      data: { planId: plan.id, personId, locationId, seatIndex },
    });
  }

  const locationCount = await prisma.location.count();
  const itemCount = await prisma.item.count();
  const unassignedCount = await prisma.item.count({
    where: { locationId: null },
  });
  const peopleCount = await prisma.person.count();
  const partyCount = await prisma.party.count();

  console.log(
    `Seed complete: ${locationCount} locations, ${itemCount} items ` +
      `(${unassignedCount} unassigned), ${peopleCount} guests in ` +
      `${partyCount} parties.`,
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
