import { createClient, createDb, DATABASE_URL, type Database } from "./client";
import { customers, orders, payments, tickets } from "./schema";

const FIRST_NAMES = [
  "Amina",
  "Jean",
  "Marie",
  "Paul",
  "Fatou",
  "Daniel",
  "Grace",
  "Emmanuel",
  "Clara",
  "Ibrahim",
  "Sophie",
  "Pierre",
  "Nadia",
  "Joseph",
  "Esther",
  "Samuel",
  "Chantal",
  "Michel",
  "Ruth",
  "Alain",
];

const LAST_NAMES = [
  "Ngono",
  "Mbarga",
  "Fouda",
  "Kamga",
  "Ndjock",
  "Ewane",
  "Talla",
  "Biya",
  "Owona",
  "Essomba",
  "Nguema",
  "Atangana",
  "Meka",
  "Bella",
  "Ekotto",
  "Mouafo",
  "Tchinda",
  "Abega",
  "Nana",
  "Kotto",
];

const INCIDENT_SUBJECTS = [
  "I was charged twice.",
  "I see two charges for the same order.",
  "My payment appears twice.",
  "I was debited twice for one purchase.",
];

const OTHER_SUBJECTS = [
  "Receipt request",
  "Order delayed",
  "Wrong email on receipt",
  "Need invoice copy",
];

const AMOUNTS = [5000, 10000, 15000, 25000, 35000, 50000];

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(random: () => number, items: readonly T[]) {
  const item = items[Math.floor(random() * items.length)];
  if (!item) {
    throw new Error("Cannot pick from an empty list");
  }
  return item;
}

function transactionId(random: () => number, prefix: string, index: number) {
  const suffix = Math.floor(random() * 9000 + 1000);
  return `${prefix}-${index + 1}-${suffix}`;
}

export async function seedDatabase(database: Database) {
  const random = mulberry32(20260919);
  const now = new Date("2026-09-01T08:00:00.000Z");

  const customerRows = Array.from({ length: 500 }, (_, index) => {
    const first = pick(random, FIRST_NAMES);
    const last = pick(random, LAST_NAMES);
    return {
      name: `${first} ${last}`,
      email: `${first.toLowerCase()}.${last.toLowerCase()}.${index + 1}@example.com`,
      createdAt: new Date(now.getTime() + index * 60_000),
    };
  });

  const insertedCustomers = await database
    .insert(customers)
    .values(customerRows)
    .returning();

  if (insertedCustomers.length !== 500) {
    throw new Error("Failed to seed customers");
  }

  const affectedCustomers = insertedCustomers.slice(0, 40);
  const orderRows: Array<typeof orders.$inferInsert> = [];

  for (const [index, customer] of insertedCustomers.entries()) {
    orderRows.push({
      customerId: customer.id,
      amount: pick(random, AMOUNTS),
      status: "completed",
      createdAt: new Date(now.getTime() + index * 90_000),
    });
  }

  for (let index = 0; index < 300; index += 1) {
    const customer = pick(random, insertedCustomers);
    const status = pick(random, ["completed", "pending", "cancelled"] as const);
    orderRows.push({
      customerId: customer.id,
      amount: pick(random, AMOUNTS),
      status,
      createdAt: new Date(now.getTime() + (500 + index) * 90_000),
    });
  }

  const insertedOrders = await database.insert(orders).values(orderRows).returning();
  const ordersByCustomer = new Map<string, Array<(typeof insertedOrders)[number]>>();
  for (const order of insertedOrders) {
    const existing = ordersByCustomer.get(order.customerId) ?? [];
    existing.push(order);
    ordersByCustomer.set(order.customerId, existing);
  }

  const paymentRows: Array<typeof payments.$inferInsert> = [];
  let paymentIndex = 0;

  for (const order of insertedOrders.slice(0, 500)) {
    paymentRows.push({
      customerId: order.customerId,
      orderId: order.id,
      amount: order.amount,
      status: "completed",
      transactionId: transactionId(random, "PAY", paymentIndex),
      createdAt: new Date(order.createdAt.getTime() + 30_000),
    });
    paymentIndex += 1;
  }

  for (const order of insertedOrders.slice(500)) {
    paymentRows.push({
      customerId: order.customerId,
      orderId: order.id,
      amount: order.amount,
      status: order.status === "cancelled" ? "failed" : order.status,
      transactionId: transactionId(random, "PAY", paymentIndex),
      createdAt: new Date(order.createdAt.getTime() + 30_000),
    });
    paymentIndex += 1;
  }

  const ticketRows: Array<typeof tickets.$inferInsert> = [];

  for (const [index, customer] of affectedCustomers.entries()) {
    const customerOrders = ordersByCustomer.get(customer.id);
    const order = customerOrders?.[0];
    if (!order) {
      continue;
    }

    paymentRows.push({
      customerId: customer.id,
      orderId: order.id,
      amount: order.amount,
      status: "completed",
      transactionId: transactionId(random, "PAY", paymentIndex),
      createdAt: new Date(order.createdAt.getTime() + 120_000),
    });
    paymentIndex += 1;

    ticketRows.push({
      customerId: customer.id,
      subject: pick(random, INCIDENT_SUBJECTS),
      description: `${customer.name} reported two completed charges of ${order.amount} XAF for the same order.`,
      status: "open",
      createdAt: new Date(order.createdAt.getTime() + 180_000 + index * 1000),
    });
  }

  for (let index = 0; index < 60; index += 1) {
    const customer = pick(random, insertedCustomers);
    ticketRows.push({
      customerId: customer.id,
      subject: pick(random, OTHER_SUBJECTS),
      description: `${customer.name} asked for help with a routine support request.`,
      status: pick(random, ["open", "resolved"] as const),
      createdAt: new Date(now.getTime() + index * 180_000),
    });
  }

  await database.insert(payments).values(paymentRows);
  await database.insert(tickets).values(ticketRows);

  console.log(
    `Seeded ${insertedCustomers.length} customers, ${insertedOrders.length} orders, ${paymentRows.length} payments, ${ticketRows.length} tickets`,
  );
}

if (process.argv[1]?.endsWith("seed.ts")) {
  const client = createClient(DATABASE_URL, { max: 1 });
  const database = createDb(client);
  await seedDatabase(database);
  await client.end();
}
