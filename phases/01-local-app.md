# Phase 1 — The app on your laptop

Part A. Get the three tiers working locally before you touch Docker Hub or AWS.

## Goal

A React page lists products and can add one. Express reads and writes those rows. PostgreSQL keeps them. Refreshing the page still shows the new product.

## Why these choices

The browser will eventually talk only to Nginx on EC2-1. If the React app calls `http://localhost:3000` or an EC2 IP, that URL is baked into the static build and breaks as soon as you move machines. Call a relative path instead: `/api/products`. On your laptop, the Vite dev server proxies that path to Express. On AWS, host Nginx proxies the same path to EC2-2. One frontend build works in both places, and you do not need CORS, because the browser sees a single origin.

Create the table from the backend when it starts. An SQL file copied onto EC2-3 would break the rule that no application source is placed on the instances.

## What you build

**Database.** Run the official Postgres image locally, with a database name, user, and password you choose. Pick a port on the host (5432 is fine if nothing else uses it).

**Backend.** An Express app that:

- reads `PORT`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME` from the environment
- on startup, connects and runs `CREATE TABLE IF NOT EXISTS` for a `products` table with `id` (serial primary key), `name` (text, required), and `price` (numeric, required)
- `GET /api/products` returns the rows as JSON
- `POST /api/products` accepts JSON `{ "name", "price" }`, inserts one row, and returns the created row
- listens on `0.0.0.0`, not only `127.0.0.1`, so a container can receive traffic later
- rejects a missing name or a non-numeric price with status 400

Use the `pg` package. Keep the password in a local env file that git ignores.

**Frontend.** A Vite React app with:

- a form: name, price, submit
- a list rendered from `GET /api/products`
- `fetch('/api/products')` for both the load and the submit (no host, no port)
- a Vite proxy so `/api` forwards to the Express port during `npm run dev`

After a successful POST, load the list again so the new row appears without a manual refresh. A manual refresh must still show it, because that is what proves the database write.

Suggested local layout:

```text
frontend/    Vite React app
backend/     Express app, its own package.json
```

## Run it

1. Start Postgres.
2. Start the backend with the DB env vars pointed at that Postgres.
3. Start the Vite dev server.
4. Open the Vite URL, add a product, refresh, confirm the row is still there.
5. Stop Postgres and start it again with the same data directory. The row must still be there. If you used a Docker named volume here, you already practiced the idea phase 4 grades.

## Done when

- The page lists products and adds one through the form.
- A refresh still shows the product.
- The browser’s network panel shows calls to `/api/products` on the Vite origin, not to a hardcoded host.
- The backend creates the table by itself on an empty database.

## Usual mistakes

- Calling `http://localhost:3000` from React. That skips the proxy and will not work behind Nginx.
- Creating the table by hand in `psql` and forgetting it is empty on the next database. The backend must create it.
- Listening only on localhost. Fine today, broken inside Docker later.
- Storing price as a string and never checking it. Reject bad input in Express.
