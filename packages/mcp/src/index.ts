import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const API_URL = process.env.API_URL ?? "http://localhost:4000";

type Customer = {
  id: string;
  name: string;
  email: string;
};

type Payment = {
  id: string;
  customerId: string;
  orderId: string;
  amount: number;
  status: string;
  transactionId: string;
};

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, init);
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? `API request failed: ${path}`);
  }
  return data;
}

function text(value: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: typeof value === "string" ? value : JSON.stringify(value, null, 2),
      },
    ],
  };
}

const server = new McpServer({
  name: "incido",
  version: "1.0.0",
});

server.tool(
  "search_customers",
  "Find customers by name or email. Use this to identify people involved in payment issues.",
  { query: z.string().describe("Name or email fragment") },
  async ({ query }) => text(await api(`/customers?query=${encodeURIComponent(query)}`)),
);

server.tool(
  "search_orders",
  "Search orders. Filter by customer and status when investigating charges.",
  {
    customerId: z.string().optional().describe("Customer UUID"),
    status: z.enum(["pending", "completed", "cancelled"]).optional(),
  },
  async ({ customerId, status }) => {
    const params = new URLSearchParams();
    if (customerId) params.set("customerId", customerId);
    if (status) params.set("status", status);
    const suffix = params.size ? `?${params}` : "";
    return text(await api(`/orders${suffix}`));
  },
);

server.tool(
  "search_payments",
  "Search payment records. Filter by customer, order, or status. Duplicate completed payments on the same order are the incident.",
  {
    customerId: z.string().optional().describe("Customer UUID"),
    orderId: z.string().optional().describe("Order UUID"),
    status: z.enum(["pending", "completed", "failed", "refunded"]).optional(),
  },
  async ({ customerId, orderId, status }) => {
    const params = new URLSearchParams();
    if (customerId) params.set("customerId", customerId);
    if (orderId) params.set("orderId", orderId);
    if (status) params.set("status", status);
    const suffix = params.size ? `?${params}` : "";
    return text(await api(`/payments${suffix}`));
  },
);

server.tool(
  "search_tickets",
  "Search customer support tickets by subject or description.",
  { query: z.string().describe("Ticket text, for example 'charged twice'") },
  async ({ query }) => text(await api(`/tickets?query=${encodeURIComponent(query)}`)),
);

server.tool(
  "refund_payment",
  "Refund a completed payment. This changes application data. Call once without confirm to preview, then again with confirm=true after the user agrees.",
  {
    paymentId: z.string().describe("Payment UUID to refund"),
    confirm: z
      .boolean()
      .optional()
      .describe("Must be true to perform the refund"),
  },
  async ({ paymentId, confirm }) => {
    const payment = await api<Payment>(`/payments/${paymentId}`);
    const customer = await api<Customer>(`/customers/${payment.customerId}`);

    if (!confirm) {
      return text(
        [
          `You are about to refund payment ${payment.id}`,
          `Amount: ${payment.amount.toLocaleString("en-US")} XAF`,
          `Customer: ${customer.name}`,
          `Order: ${payment.orderId}`,
          `Transaction: ${payment.transactionId}`,
          "",
          "Confirmation required.",
          "Call refund_payment again with confirm=true to proceed.",
        ].join("\n"),
      );
    }

    const refunded = await api<Payment>(`/payments/${paymentId}/refund`, {
      method: "POST",
    });

    return text({
      message: "Payment refunded",
      payment: refunded,
    });
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("incido MCP server running on stdio");
