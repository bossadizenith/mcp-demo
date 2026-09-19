import { and, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { getDb } from "./client";
import {
  customers,
  orders,
  payments,
  tickets,
  type Customer,
  type Order,
  type Payment,
  type Ticket,
} from "./schema";

export type DuplicateGroup = {
  order: Order;
  customer: Customer;
  amount: number;
  completedPayments: Payment[];
  extraPaymentCount: number;
  refundAmount: number;
};

export type IncidentSummary = {
  affectedCustomers: number;
  affectedOrders: number;
  duplicatePayments: number;
  totalRefundAmount: number;
  groups: DuplicateGroup[];
};

export type Overview = {
  totalCustomers: number;
  totalOrders: number;
  totalPayments: number;
  incident: Omit<IncidentSummary, "groups">;
};

function conditions(parts: Array<SQL | undefined>) {
  const present = parts.filter((part): part is SQL => part !== undefined);
  if (present.length === 0) {
    return undefined;
  }
  if (present.length === 1) {
    return present[0];
  }
  return and(...present);
}

function db() {
  return getDb();
}

export async function listCustomers() {
  return db().select().from(customers).orderBy(customers.name);
}

export async function getCustomer(id: string) {
  const [customer] = await db()
    .select()
    .from(customers)
    .where(eq(customers.id, id));
  return customer ?? null;
}

export async function searchCustomers(query: string) {
  const term = `%${query}%`;
  return db()
    .select()
    .from(customers)
    .where(or(ilike(customers.name, term), ilike(customers.email, term)))
    .orderBy(customers.name)
    .limit(50);
}

export async function listOrders() {
  return db().select().from(orders).orderBy(desc(orders.createdAt));
}

export async function getOrder(id: string) {
  const [order] = await db().select().from(orders).where(eq(orders.id, id));
  return order ?? null;
}

export async function searchOrders(filters: {
  customerId?: string;
  status?: Order["status"];
}) {
  const where = conditions([
    filters.customerId ? eq(orders.customerId, filters.customerId) : undefined,
    filters.status ? eq(orders.status, filters.status) : undefined,
  ]);

  return where
    ? db().select().from(orders).where(where).orderBy(desc(orders.createdAt))
    : db().select().from(orders).orderBy(desc(orders.createdAt)).limit(100);
}

export async function listPayments() {
  return db().select().from(payments).orderBy(desc(payments.createdAt));
}

export async function getPayment(id: string) {
  const [payment] = await db()
    .select()
    .from(payments)
    .where(eq(payments.id, id));
  return payment ?? null;
}

export async function searchPayments(filters: {
  customerId?: string;
  orderId?: string;
  status?: Payment["status"];
}) {
  const where = conditions([
    filters.customerId
      ? eq(payments.customerId, filters.customerId)
      : undefined,
    filters.orderId ? eq(payments.orderId, filters.orderId) : undefined,
    filters.status ? eq(payments.status, filters.status) : undefined,
  ]);

  return where
    ? db().select().from(payments).where(where).orderBy(desc(payments.createdAt))
    : db().select().from(payments).orderBy(desc(payments.createdAt)).limit(100);
}

export async function listTickets() {
  return db().select().from(tickets).orderBy(desc(tickets.createdAt));
}

export async function getTicket(id: string) {
  const [ticket] = await db().select().from(tickets).where(eq(tickets.id, id));
  return ticket ?? null;
}

export async function searchTickets(query: string) {
  const term = `%${query}%`;
  return db()
    .select()
    .from(tickets)
    .where(or(ilike(tickets.subject, term), ilike(tickets.description, term)))
    .orderBy(desc(tickets.createdAt))
    .limit(50);
}

export async function refundPayment(id: string) {
  const payment = await getPayment(id);
  if (!payment) {
    throw new Error("Payment not found");
  }
  if (payment.status !== "completed") {
    throw new Error("Only completed payments can be refunded");
  }

  const [updated] = await db()
    .update(payments)
    .set({ status: "refunded" })
    .where(eq(payments.id, id))
    .returning();

  if (!updated) {
    throw new Error("Payment not found");
  }

  return updated;
}

export async function findDuplicatePaymentGroups(): Promise<DuplicateGroup[]> {
  const completed = await db()
    .select()
    .from(payments)
    .where(eq(payments.status, "completed"));

  const grouped = new Map<string, Payment[]>();
  for (const payment of completed) {
    const key = `${payment.orderId}:${payment.amount}`;
    const existing = grouped.get(key) ?? [];
    existing.push(payment);
    grouped.set(key, existing);
  }

  const groups: DuplicateGroup[] = [];

  for (const matches of grouped.values()) {
    if (matches.length < 2) {
      continue;
    }

    const first = matches[0];
    if (!first) {
      continue;
    }

    const order = await getOrder(first.orderId);
    const customer = await getCustomer(first.customerId);
    if (!order || !customer) {
      continue;
    }

    const extraPaymentCount = matches.length - 1;
    groups.push({
      order,
      customer,
      amount: first.amount,
      completedPayments: matches,
      extraPaymentCount,
      refundAmount: extraPaymentCount * first.amount,
    });
  }

  return groups.sort((a, b) => a.customer.name.localeCompare(b.customer.name));
}

export async function getIncidentSummary(): Promise<IncidentSummary> {
  const groups = await findDuplicatePaymentGroups();
  const customerIds = new Set(groups.map((group) => group.customer.id));

  return {
    affectedCustomers: customerIds.size,
    affectedOrders: groups.length,
    duplicatePayments: groups.reduce(
      (total, group) => total + group.extraPaymentCount,
      0,
    ),
    totalRefundAmount: groups.reduce(
      (total, group) => total + group.refundAmount,
      0,
    ),
    groups,
  };
}

export async function getOverview(): Promise<Overview> {
  const [customerRows, orderRows, paymentRows, incident] = await Promise.all([
    db().select().from(customers),
    db().select().from(orders),
    db().select().from(payments),
    getIncidentSummary(),
  ]);

  return {
    totalCustomers: customerRows.length,
    totalOrders: orderRows.length,
    totalPayments: paymentRows.length,
    incident: {
      affectedCustomers: incident.affectedCustomers,
      affectedOrders: incident.affectedOrders,
      duplicatePayments: incident.duplicatePayments,
      totalRefundAmount: incident.totalRefundAmount,
    },
  };
}
