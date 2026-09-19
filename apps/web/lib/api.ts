const API_URL = process.env.API_URL ?? "http://localhost:4000";

export type Customer = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
};

export type Order = {
  id: string;
  customerId: string;
  amount: number;
  status: "pending" | "completed" | "cancelled";
  createdAt: string;
};

export type Payment = {
  id: string;
  customerId: string;
  orderId: string;
  amount: number;
  status: "pending" | "completed" | "failed" | "refunded";
  transactionId: string;
  createdAt: string;
};

export type Ticket = {
  id: string;
  customerId: string;
  subject: string;
  description: string;
  status: "open" | "resolved";
  createdAt: string;
};

export type Overview = {
  totalCustomers: number;
  totalOrders: number;
  totalPayments: number;
  incident: {
    affectedCustomers: number;
    affectedOrders: number;
    duplicatePayments: number;
    totalRefundAmount: number;
  };
};

export async function api<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`API ${path} failed with ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export function formatXaf(amount: number) {
  return `${amount.toLocaleString("en-US")} XAF`;
}

export function shortId(id: string) {
  return id.slice(0, 8);
}
