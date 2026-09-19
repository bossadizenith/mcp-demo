import { Badge } from "@repo/ui/components/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/table";
import { api, formatXaf, shortId, type Customer, type Order } from "../../lib/api";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const [orders, customers] = await Promise.all([
    api<Order[]>("/orders"),
    api<Customer[]>("/customers"),
  ]);
  const names = new Map(customers.map((customer) => [customer.id, customer.name]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
        <p className="text-sm text-muted-foreground">{orders.length} records</p>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Customer</TableHead>
            <TableHead>Order</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell>{names.get(order.customerId) ?? order.customerId}</TableCell>
              <TableCell className="font-mono text-xs">{shortId(order.id)}</TableCell>
              <TableCell>{formatXaf(order.amount)}</TableCell>
              <TableCell>
                <Badge variant="outline">{order.status}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
