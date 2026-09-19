import { Badge } from "@repo/ui/components/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/table";
import { api, formatXaf, shortId, type Customer, type Payment } from "../../lib/api";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const [payments, customers] = await Promise.all([
    api<Payment[]>("/payments"),
    api<Customer[]>("/customers"),
  ]);
  const names = new Map(customers.map((customer) => [customer.id, customer.name]));

  const completedByOrder = new Map<string, number>();
  for (const payment of payments) {
    if (payment.status !== "completed") {
      continue;
    }
    const key = `${payment.orderId}:${payment.amount}`;
    completedByOrder.set(key, (completedByOrder.get(key) ?? 0) + 1);
  }

  const ranked = [...payments].sort((a, b) => {
    const aDup = (completedByOrder.get(`${a.orderId}:${a.amount}`) ?? 0) > 1 ? 0 : 1;
    const bDup = (completedByOrder.get(`${b.orderId}:${b.amount}`) ?? 0) > 1 ? 0 : 1;
    return aDup - bDup;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Payments</h1>
        <p className="text-sm text-muted-foreground">
          Duplicate completed charges are listed first and highlighted.
        </p>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Customer</TableHead>
            <TableHead>Order</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Transaction</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ranked.map((payment) => {
            const isDuplicate =
              payment.status === "completed" &&
              (completedByOrder.get(`${payment.orderId}:${payment.amount}`) ?? 0) > 1;

            return (
              <TableRow
                key={payment.id}
                className={isDuplicate ? "bg-destructive/10" : undefined}
              >
                <TableCell>
                  {names.get(payment.customerId) ?? payment.customerId}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {shortId(payment.orderId)}
                </TableCell>
                <TableCell>{formatXaf(payment.amount)}</TableCell>
                <TableCell>
                  <Badge variant={isDuplicate ? "destructive" : "outline"}>
                    {payment.status}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {payment.transactionId}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
