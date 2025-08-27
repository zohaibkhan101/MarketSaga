# market-saga

Event-driven marketplace monorepo (TypeScript) demonstrating a Saga Orchestrator, Outbox pattern, idempotent consumers, DLQ, and integration tests.

## ASCII Architecture

```
             +-------------------+
             |   storefront      | (Next.js)
             +---------+---------+
                       |
                       v HTTP
+----------------------+------------------------------+
|                  orders-svc (Nest)                  |
|  POST /checkout, GET /orders/:id                    |
|  - Prisma (Postgres)                                |
|  - Saga Orchestrator                                |
|  - Outbox table + Worker -> RabbitMQ                |
|  - Idempotency keys                                 |
+----------------------+------------------------------+
                       | publish events (RabbitMQ)
            +----------+-----------+
            |                      |
            v                      v
   inventory-svc (Nest)      payments-svc (Nest)
   - Prisma (Postgres)       - Idempotent handlers
   - Reserve/Release         - Charge/Refund (simulated)
   - Idempotent handlers     - Failure by amount=13.37
            ^                      |
            |                      |
            +----------+-----------+
                       | events
                       v
                 products-svc (Nest)
                 - In-memory catalog (for demo)
```

## Quick start

```bash
docker compose up --build
```

Then:
- Create a product: see **Sample cURL** below.
- Successful checkout and failing checkout flows are provided.

### Services URLs
- orders-svc: http://localhost:3001
- products-svc: http://localhost:3002
- inventory-svc: http://localhost:3003
- payments-svc: http://localhost:3004
- storefront: http://localhost:3000

## Sample cURL

### Create a product
```bash
curl -X POST http://localhost:3002/products -H "Content-Type: application/json" -d '{"sku":"SKU-1","name":"Demo Widget","price":100,"stock":5}'
```

### Successful checkout
```bash
curl -X POST http://localhost:3001/checkout -H "Content-Type: application/json" -d '{
  "items":[{"sku":"SKU-1","qty":1}],
  "payment":{"amount":100,"card":"4242-4242-4242-4242"}
}'
```

### Failing checkout (simulate payment failure with amount 13.37 -> triggers refund/compensation)
```bash
curl -X POST http://localhost:3001/checkout -H "Content-Type: application/json" -d '{
  "items":[{"sku":"SKU-1","qty":1}],
  "payment":{"amount":13.37,"card":"4000-0000-0000-0000"}
}'
```

### Get order status
```bash
curl http://localhost:3001/orders/<ORDER_ID>
```

## Environment
Copy `.env.example` to `.env` in each service (Docker already injects via compose).

## Metrics
Each service exposes `/health` and `/metrics` placeholders.

## Tests
Run in CI via GitHub Actions workflow. Locally:
```bash
npm run test -w packages/orders-svc
```
