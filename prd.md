# PRD — incido

**Status:** MVP
**Purpose:** MCP live demonstration
**Authentication:** None
**Deployment:** Local only
**Database:** PostgreSQL + Drizzle ORM
**Infrastructure:** Docker Compose
**Monorepo:** Turborepo
**api:** Hono
---

# 1. Product Overview

**incido** is a small fictional payment platform designed to demonstrate how an AI agent can use **MCP (Model Context Protocol)** to interact with an application's data and perform actions.

The application simulates a simple payment system containing:

- Customers
- Orders
- Payments
- Support tickets

The database contains a deliberately seeded **duplicate-payment incident**.

A user can ask Cursor to investigate the incident through MCP.

The agent can:

1. Search support tickets.
2. Find affected orders.
3. Find duplicate payments.
4. Identify affected customers.
5. Calculate the amount that needs to be refunded.
6. Refund affected payments after explicit confirmation.

The project is intentionally small. It is **not intended to become a production SaaS application**.

---

# 2. Demo Story

The entire project revolves around one scenario:

> **Customers are reporting that they were charged twice for the same order.**

The audience sees a simple dashboard showing the incident.

Then the presenter asks Cursor:

> **"Investigate why customers are reporting duplicate charges. Don't modify anything."**

Cursor uses MCP to investigate the application's data.

It discovers that some orders have multiple completed payments for the same amount.

The presenter then asks:

> **"How much money needs to be refunded?"**

Cursor calculates the total.

Finally:

> **"Refund all affected payments."**

The MCP server requires confirmation before performing the destructive action.

After confirmation, the payments are marked as refunded and the dashboard updates.

---

# 3. Goals

## Primary goal

Demonstrate that MCP allows an AI agent to interact with **real application capabilities and data**, rather than only reading the codebase.

## Secondary goals

Demonstrate:

- MCP tool discovery
- MCP tool execution
- Multi-step agent reasoning
- Database-backed tools
- Read operations
- Write operations
- Human approval for destructive actions
- The relationship between an MCP server and an existing application

---

# 4. Non-Goals

The project should **not** include:

- Authentication
- Authorization
- User accounts
- Real payment providers
- Stripe
- Mobile apps
- Email
- Notifications
- Subscriptions
- Deployment infrastructure
- Application monitoring
- Logs
- Kubernetes
- Redis
- Message queues
- Microservices
- Cloud infrastructure
- Real financial transactions
- Complex admin permissions
- Production-grade security

If a feature doesn't help demonstrate MCP, don't build it.

---

# 5. Target Users

There are effectively two users.

### 1. Demo audience

Developers attending the MCP/Cursor presentation.

They should be able to understand the system quickly.

### 2. Presenter

The presenter needs to:

- Start the project easily.
- Reset the database.
- Seed the incident.
- Run the application locally.
- Connect Cursor to MCP.
- Reproduce the demo reliably.

---

# 6. Technology Stack

## Monorepo

**Turborepo**

Suggested structure:

```text
incido/
├── apps/
│   ├── web/
│   ├── api/
│
├── packages/
│   └── db/
│   └── mcp/
│
├── docker-compose.yml
├── package.json
├── turbo.json
└── ...
```

---

## Web

Use the existing frontend stack in the Turborepo.

The web application should be simple.

---

## API

Node.js + TypeScript.

The API provides access to:

- Customers
- Orders
- Payments
- Tickets

---

## Database

**PostgreSQL**

Running through Docker Compose.

Example:

```text
docker compose up -d
```

---

## ORM

**Drizzle ORM**

The database package owns:

- Schema
- Migrations
- Database connection
- Seed script
- Reusable database queries

---

## MCP

Use the official MCP SDK.

The MCP server connects to the application/database layer and exposes domain-level tools to Cursor.

---

# 7. System Architecture

```text
                    ┌──────────────────┐
                    │      Cursor      │
                    └────────┬─────────┘
                             │
                            MCP
                             │
                    ┌────────▼─────────┐
                    │    MCP Server    │
                    └────────┬─────────┘
                             │
                             │
                    ┌────────▼─────────┐
                    │       API        │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │    PostgreSQL    │
                    │     Drizzle      │
                    └──────────────────┘
                             ▲
                             │
                    ┌────────┴─────────┐
                    │       Web        │
                    └──────────────────┘
```

The web application and MCP server ultimately operate on the same application data.

---

# 8. Database Schema

Keep the database to **four tables**.

---

## 8.1 Customers

```text
customers
---------
id
name
email
createdAt
```

### Fields

| Field     | Type      | Description    |
| --------- | --------- | -------------- |
| id        | UUID      | Primary key    |
| name      | text      | Customer name  |
| email     | text      | Customer email |
| createdAt | timestamp | Creation date  |

---

# 8.2 Orders

```text
orders
------
id
customerId
amount
status
createdAt
```

### Fields

| Field      | Type      | Description                         |
| ---------- | --------- | ----------------------------------- |
| id         | UUID      | Primary key                         |
| customerId | UUID      | Customer who placed the order       |
| amount     | integer   | Amount in XAF                       |
| status     | enum      | `pending`, `completed`, `cancelled` |
| createdAt  | timestamp | Order creation date                 |

Relationship:

```text
Customer
   │
   └── has many Orders
```

---

# 8.3 Payments

```text
payments
--------
id
customerId
orderId
amount
status
transactionId
createdAt
```

### Fields

| Field         | Type      | Description                                  |
| ------------- | --------- | -------------------------------------------- |
| id            | UUID      | Primary key                                  |
| customerId    | UUID      | Customer                                     |
| orderId       | UUID      | Related order                                |
| amount        | integer   | Payment amount in XAF                        |
| status        | enum      | `pending`, `completed`, `failed`, `refunded` |
| transactionId | text      | Simulated transaction reference              |
| createdAt     | timestamp | Payment date                                 |

Relationships:

```text
Customer
   │
   └── has many Payments

Order
   │
   └── has many Payments
```

The incident is represented by **multiple completed payments attached to the same order**.

---

# 8.4 Support Tickets

```text
tickets
-------
id
customerId
subject
description
status
createdAt
```

### Fields

| Field       | Type      | Description        |
| ----------- | --------- | ------------------ |
| id          | UUID      | Primary key        |
| customerId  | UUID      | Customer           |
| subject     | text      | Ticket title       |
| description | text      | Customer complaint |
| status      | enum      | `open`, `resolved` |
| createdAt   | timestamp | Creation date      |

---

# 9. Seed Data

The seed system should create a believable dataset.

For example:

```text
500 customers
800 orders
900 payments
100 support tickets
```

The exact numbers aren't important.

The important thing is the **incident data**.

---

## Incident

Create approximately:

```text
30–50 affected customers
```

For each affected customer:

```text
Order
  ├── Payment A → completed
  └── Payment B → completed
```

Both payments have:

```text
same customer
same order
same amount
different transaction IDs
```

Example:

```text
Order #ORD-1001

Amount: 25,000 XAF

Payment #PAY-5001
25,000 XAF
completed

Payment #PAY-5002
25,000 XAF
completed
```

---

## Support tickets

Generate tickets describing the problem:

```text
"I was charged twice."

"I see two charges for the same order."

"My payment appears twice."

"I was debited twice for one purchase."
```

The tickets should reference the affected customers.

---

# 10. API

The API should remain simple REST.

## Customers

```http
GET /customers
GET /customers/:id
```

---

## Orders

```http
GET /orders
GET /orders/:id
```

---

## Payments

```http
GET /payments
GET /payments/:id
POST /payments/:id/refund
```

---

## Tickets

```http
GET /tickets
GET /tickets/:id
```

---

## Incident

A useful convenience endpoint can be:

```http
GET /incidents/duplicate-payments
```

It returns:

```json
{
  "affectedCustomers": 47,
  "affectedOrders": 47,
  "duplicatePayments": 47,
  "totalRefundAmount": 1284500
}
```

This endpoint is optional; don't make the MCP demo depend entirely on it.

---

# 11. MCP Server

The MCP server is the primary feature.

It exposes **five tools**.

---

## Tool 1 — `search_customers`

Purpose:

Find customers.

Example input:

```json
{
  "query": "John"
}
```

Returns relevant customers.

---

## Tool 2 — `search_orders`

Purpose:

Search orders.

Possible filters:

```json
{
  "customerId": "...",
  "status": "completed"
}
```

---

## Tool 3 — `search_payments`

Purpose:

Search payment records.

Possible filters:

```json
{
  "customerId": "...",
  "orderId": "...",
  "status": "completed"
}
```

---

## Tool 4 — `search_tickets`

Purpose:

Search customer support tickets.

Example:

```json
{
  "query": "charged twice"
}
```

---

## Tool 5 — `refund_payment`

Purpose:

Refund a payment.

Input:

```json
{
  "paymentId": "..."
}
```

Before executing the operation, the server must require explicit confirmation.

---

# 12. MCP Safety

The most important distinction:

### Read tools

These can execute immediately:

```text
search_customers
search_orders
search_payments
search_tickets
```

### Write tool

This requires confirmation:

```text
refund_payment
```

The MCP server should return a confirmation requirement before performing the refund.

Example:

```text
You are about to refund payment PAY-5002
Amount: 25,000 XAF
Customer: John Doe

Confirmation required.
```

This lets the presenter demonstrate that **giving an agent capabilities does not mean allowing every capability to execute blindly.**

---

# 13. Web Application

The web application is intentionally minimal.

It exists primarily to:

1. Make the system feel real.
2. Give the audience something visual.
3. Show the state before and after the MCP interaction.

---

# 14. Dashboard

Route:

```text
/
```

Display:

```text
incido
────────────────────────────

Payment Overview

Total Customers       500
Total Orders          800
Total Payments        900

────────────────────────────

Duplicate Payment Incident

Affected Customers        47
Duplicate Payments        47
Refund Amount             1,284,500 XAF
```

---

# 15. Payments Page

Route:

```text
/payments
```

Display a simple table:

```text
Customer       Order        Amount       Status
--------------------------------------------------
John Doe       ORD-1001     25,000       Completed
John Doe       ORD-1001     25,000       Completed
```

The duplicate records should be visually obvious.

---

# 16. Tickets Page

Route:

```text
/tickets
```

Display:

```text
#1024

John Doe

"I was charged twice for my order."

Open
```

---

# 17. Customers Page

Route:

```text
/customers
```

Simple customer table:

```text
Name              Email
--------------------------------
John Doe           john@example.com
Jane Doe           jane@example.com
```

No customer authentication is required.

---

# 18. Refund Flow

After Cursor determines that a payment is duplicated, it can invoke:

```text
refund_payment
```

The API updates:

```text
payments.status
```

from:

```text
completed
```

to:

```text
refunded
```

The web dashboard then reflects the new state.

---

# 19. Demo Flow

This is the most important section of the PRD.

## Step 1 — Show the application

Open the dashboard.

Show:

```text
47 affected customers
47 duplicate payments
```

Tell the audience:

> "We have a payment incident."

---

## Step 2 — Open Cursor

Cursor has access to the repository but does not directly have access to the application's business data.

The MCP server is connected.

---

## Step 3 — Investigation

Prompt Cursor:

> **Investigate why customers are reporting duplicate payments. Don't modify anything.**

Cursor should use:

```text
search_tickets
↓
search_customers
↓
search_orders
↓
search_payments
```

It should eventually identify:

```text
47 affected customers
47 affected orders
47 duplicate payments
```

---

# 20. Calculate Impact

Prompt:

> **How much money needs to be refunded?**

Cursor queries the payment data and calculates:

```text
Total affected amount:
1,284,500 XAF
```

---

# 21. Take Action

Prompt:

> **Refund all affected duplicate payments.**

The agent should recognize that this is a destructive operation.

It should request confirmation.

Example:

```text
I found 47 duplicate payments.

Total:
1,284,500 XAF

This action will refund the affected payments.

Proceed?
```

Presenter confirms.

---

# 22. Verify

Cursor performs the refunds.

Then prompt:

> **Verify that no duplicate completed payments remain.**

Cursor searches the payments again.

Expected result:

```text
Duplicate completed payments: 0
```

The web dashboard updates accordingly.

---

# 23. Resetting the Demo

The demo must be easily reset.

Provide:

```bash
pnpm db:reset
```

or equivalent.

The command should:

1. Drop/reset the database.
2. Run migrations.
3. Seed the original dataset.
4. Restore the duplicate-payment incident.

This is **critical for a live presentation**.

You should be able to completely reset the demo in seconds.

---

# 24. Docker Compose

Docker Compose should only manage PostgreSQL.

Conceptually:

```text
docker-compose.yml

services:
  postgres:
    image: postgres
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: incido
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
```

No need to containerize every application during the presentation.

Run:

```text
Postgres → Docker
Web/API/MCP → local development
```

This keeps debugging much easier.

---

# 25. Environment

Minimal environment variables:

```text
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/incido
```

No API keys.

No authentication secrets.

No third-party credentials.

---

# 26. Developer Commands

The project should aim for commands like:

```bash
pnpm install
```

Start database:

```bash
docker compose up -d
```

Run migrations:

```bash
pnpm db:migrate
```

Seed:

```bash
pnpm db:seed
```

Start everything:

```bash
pnpm dev
```

Reset:

```bash
pnpm db:reset
```

---

# 27. Success Criteria

The MVP is complete when all of these work:

### Infrastructure

- [ ] Turborepo runs correctly.
- [ ] PostgreSQL starts with Docker Compose.
- [ ] Drizzle connects successfully.
- [ ] Database migrations work.
- [ ] Database seed works.
- [ ] Database can be reset.

### Application

- [ ] Dashboard works.
- [ ] Customers can be viewed.
- [ ] Orders can be viewed.
- [ ] Payments can be viewed.
- [ ] Tickets can be viewed.
- [ ] Refunds update payment status.

### MCP

- [ ] MCP server connects to Cursor.
- [ ] Cursor can search customers.
- [ ] Cursor can search orders.
- [ ] Cursor can search payments.
- [ ] Cursor can search tickets.
- [ ] Cursor can refund payments.
- [ ] Refunds require confirmation.

### Demo

- [ ] Cursor can independently investigate the incident.
- [ ] Cursor identifies affected customers.
- [ ] Cursor calculates the refund amount.
- [ ] Cursor can execute refunds after confirmation.
- [ ] Cursor can verify the incident has been resolved.
- [ ] Demo can be reset quickly.

---

# 28. What Makes This a Good MCP Demo

The important thing isn't the payment application.

It's this transition:

```text
BEFORE

Cursor
  ↓
Codebase
```

to:

```text
AFTER

Cursor
  ↓
MCP
  ↓
┌───────────────┐
│ Customers     │
│ Orders        │
│ Payments      │
│ Tickets       │
└───────────────┘
```

The agent isn't simply **reading more context**.

It has gained **capabilities**.

It can investigate.

It can query.

It can reason across multiple pieces of application data.

And, with permission, it can **take an action that changes the system**.

That's the entire point of incido.

**Keep the application boring. Make the MCP interaction impressive.**
