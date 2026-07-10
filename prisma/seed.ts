import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type SeedItem = {
  name: string;
  description?: string;
  status: "NEEDED" | "PURCHASED";
  location: string | null;
};

const LOCATIONS: { name: string; description?: string }[] = [
  {
    name: "Welcome / Sign-in Table",
    description:
      "First table guests see on arrival. Holds the welcome sign, escort cards, and guest book.",
  },
  {
    name: "Ceremony Arch",
    description: "Floral arch backdrop where the couple exchanges vows.",
  },
  {
    name: "Cocktail Bar",
    description: "Bar area during cocktail hour on the terrace.",
  },
  {
    name: "Guest Tables",
    description: "The ten round reception tables for seated dinner.",
  },
  {
    name: "Head Table",
    description: "Long sweetheart table for the couple and wedding party.",
  },
];

const ITEMS: SeedItem[] = [
  {
    name: "Welcome sign",
    description: "Acrylic 24x36 sign on a gold easel greeting guests by name.",
    status: "PURCHASED",
    location: "Welcome / Sign-in Table",
  },
  {
    name: "Escort card display",
    description: "Framed board listing each guest's assigned table number.",
    status: "NEEDED",
    location: "Welcome / Sign-in Table",
  },
  {
    name: "Guest book",
    description: "Linen-bound book with two matching pens.",
    status: "PURCHASED",
    location: "Welcome / Sign-in Table",
  },
  {
    name: "Ring dish",
    description: "Small ceramic dish to hold the rings during the ceremony.",
    status: "PURCHASED",
    location: "Ceremony Arch",
  },
  {
    name: "Votive candle holders",
    description: "Set of 24 frosted glass votives to line the aisle.",
    status: "NEEDED",
    location: "Ceremony Arch",
  },
  {
    name: "Champagne coupes",
    description: "Vintage-style coupes for the welcome toast.",
    status: "NEEDED",
    location: "Cocktail Bar",
  },
  {
    name: "Cocktail napkins",
    status: "PURCHASED",
    location: "Cocktail Bar",
  },
  {
    name: "Glass bud vases",
    description: "Dozen small bud vases for single-stem florals per table.",
    status: "NEEDED",
    location: "Guest Tables",
  },
  {
    name: "Table number cards",
    description: "Numbered cards 1-10 in matching gold stands.",
    status: "PURCHASED",
    location: "Guest Tables",
  },
  {
    name: "Menu cards",
    description: "Individual printed dinner menus, one per place setting.",
    status: "NEEDED",
    location: "Head Table",
  },
  {
    name: "Gold candlesticks",
    description: "Pair of tall tapered candlesticks flanking the couple.",
    status: "PURCHASED",
    location: "Head Table",
  },
  // Intentionally unassigned (no location yet):
  {
    name: "Cake topper",
    description: "Custom laser-cut monogram topper — still deciding placement.",
    status: "NEEDED",
    location: null,
  },
  {
    name: "Extra string lights",
    status: "NEEDED",
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
    const locationId = item.location
      ? locationIds.get(item.location) ?? null
      : null;
    await prisma.item.create({
      data: {
        name: item.name,
        description: item.description,
        status: item.status,
        locationId,
      },
    });
  }

  const locationCount = await prisma.location.count();
  const itemCount = await prisma.item.count();
  const unassignedCount = await prisma.item.count({
    where: { locationId: null },
  });

  console.log(
    `Seed complete: ${locationCount} locations, ${itemCount} items ` +
      `(${unassignedCount} unassigned).`
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
