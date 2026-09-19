import { Badge } from "@repo/ui/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";
import { api, type Customer, type Ticket } from "../../lib/api";

export const dynamic = "force-dynamic";

export default async function TicketsPage() {
  const [tickets, customers] = await Promise.all([
    api<Ticket[]>("/tickets"),
    api<Customer[]>("/customers"),
  ]);
  const names = new Map(customers.map((customer) => [customer.id, customer.name]));
  const ranked = [...tickets].sort((a, b) => {
    const score = (ticket: Ticket) =>
      /twice|two charges|appears twice|debited twice/i.test(
        `${ticket.subject} ${ticket.description}`,
      )
        ? 0
        : 1;
    return score(a) - score(b);
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tickets</h1>
        <p className="text-sm text-muted-foreground">{tickets.length} records</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {ranked.map((ticket) => (
          <Card key={ticket.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-4 text-base">
                <span>{ticket.subject}</span>
                <Badge variant={ticket.status === "open" ? "destructive" : "outline"}>
                  {ticket.status}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="font-medium">
                {names.get(ticket.customerId) ?? ticket.customerId}
              </p>
              <p className="text-muted-foreground">{ticket.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
