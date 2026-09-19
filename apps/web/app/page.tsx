import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";
import { api, formatXaf, type Overview } from "../lib/api";

export const dynamic = "force-dynamic";

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tracking-tight">{value}</p>
      </CardContent>
    </Card>
  );
}

export default async function Page() {
  const overview = await api<Overview>("/overview");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Payment overview</h1>
        <p className="text-sm text-muted-foreground">
          Same data the MCP server can read and change.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Total customers" value={overview.totalCustomers} />
        <Stat label="Total orders" value={overview.totalOrders} />
        <Stat label="Total payments" value={overview.totalPayments} />
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">
          Duplicate payment incident
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat
            label="Affected customers"
            value={overview.incident.affectedCustomers}
          />
          <Stat
            label="Duplicate payments"
            value={overview.incident.duplicatePayments}
          />
          <Stat
            label="Refund amount"
            value={formatXaf(overview.incident.totalRefundAmount)}
          />
        </div>
      </section>
    </div>
  );
}
