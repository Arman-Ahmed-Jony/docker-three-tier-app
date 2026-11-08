# docker-three-tier-app

## Run locally

Postgres is the `shoplite-db` container. Start it, then start the API and the Vite app in two terminals.

```bash
docker start shoplite-db
```

```bash
cd backend && npm start
```

```bash
cd frontend && npm run dev
```

Open http://127.0.0.1:5173. Copy `backend/.env.example` to `backend/.env` and set `DB_PASSWORD` before the first backend start. The local database is published on port 5433.
