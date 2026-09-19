import { Hono } from "hono";
import { cors } from "hono/cors";
import {
  getCustomer,
  getIncidentSummary,
  getOrder,
  getOverview,
  getPayment,
  getTicket,
  listCustomers,
  listOrders,
  listPayments,
  listTickets,
  refundPayment,
  searchCustomers,
  searchOrders,
  searchPayments,
  searchTickets,
} from "@repo/db";

const app = new Hono();

app.use("/*", cors());

app.get("/health", (c) => c.json({ ok: true }));

app.get("/customers", async (c) => {
  const query = c.req.query("query");
  const rows = query ? await searchCustomers(query) : await listCustomers();
  return c.json(rows);
});

app.get("/customers/:id", async (c) => {
  const customer = await getCustomer(c.req.param("id"));
  if (!customer) {
    return c.json({ error: "Customer not found" }, 404);
  }
  return c.json(customer);
});

app.get("/orders", async (c) => {
  const customerId = c.req.query("customerId");
  const status = c.req.query("status") as
    | "pending"
    | "completed"
    | "cancelled"
    | undefined;
  if (customerId || status) {
    return c.json(await searchOrders({ customerId, status }));
  }
  return c.json(await listOrders());
});

app.get("/orders/:id", async (c) => {
  const order = await getOrder(c.req.param("id"));
  if (!order) {
    return c.json({ error: "Order not found" }, 404);
  }
  return c.json(order);
});

app.get("/payments", async (c) => {
  const customerId = c.req.query("customerId");
  const orderId = c.req.query("orderId");
  const status = c.req.query("status") as
    | "pending"
    | "completed"
    | "failed"
    | "refunded"
    | undefined;
  if (customerId || orderId || status) {
    return c.json(await searchPayments({ customerId, orderId, status }));
  }
  return c.json(await listPayments());
});

app.get("/payments/:id", async (c) => {
  const payment = await getPayment(c.req.param("id"));
  if (!payment) {
    return c.json({ error: "Payment not found" }, 404);
  }
  return c.json(payment);
});

app.post("/payments/:id/refund", async (c) => {
  try {
    const payment = await refundPayment(c.req.param("id"));
    return c.json(payment);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Refund failed";
    const status = message === "Payment not found" ? 404 : 400;
    return c.json({ error: message }, status);
  }
});

app.get("/tickets", async (c) => {
  const query = c.req.query("query");
  const rows = query ? await searchTickets(query) : await listTickets();
  return c.json(rows);
});

app.get("/tickets/:id", async (c) => {
  const ticket = await getTicket(c.req.param("id"));
  if (!ticket) {
    return c.json({ error: "Ticket not found" }, 404);
  }
  return c.json(ticket);
});

app.get("/incidents/duplicate-payments", async (c) => {
  const incident = await getIncidentSummary();
  return c.json({
    affectedCustomers: incident.affectedCustomers,
    affectedOrders: incident.affectedOrders,
    duplicatePayments: incident.duplicatePayments,
    totalRefundAmount: incident.totalRefundAmount,
  });
});

app.get("/overview", async (c) => {
  return c.json(await getOverview());
});

export default {
  port: 4000,
  fetch: app.fetch,
};

console.error("incido API listening on http://localhost:4000");
