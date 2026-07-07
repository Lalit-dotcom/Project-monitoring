# NPMS Project Monitoring (Monorepo)

This repository is structured as a monorepo containing the frontend React client and the backend Express database API.

## Folder Structure

```
Project Monitoring/
├── frontend/          # React + TS + Vite Client (port 5173)
├── backend/           # Express + TS + PostgreSQL API (port 4000)
└── README.md          # Top-level instructions
```

---

## 1. Prerequisites & Database Setup

Ensure you have **Node.js (v18+)** and a **PostgreSQL** instance running.

### Spin up PostgreSQL (Docker alternative)
```bash
docker run --name npms-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=npms_db -p 5432:5432 -d postgres:16
```

### Apply Schema Layout
Navigate to the root directory and apply the schema to your PostgreSQL database:
```bash
psql postgresql://postgres:postgres@localhost:5432/npms_db -f backend/db/schema.sql
```

---

## 2. Backend Setup (`backend/`)

1. Navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure the environment variables by copying `.env.example` to `.env` and adjusting the values (especially your database password):
   ```bash
   cp .env.example .env
   ```
4. Seed the database with the cleaned project billing data:
   ```bash
   npm run db:seed
   ```
5. Start the Express development server:
   ```bash
   npm run dev
   ```

The backend API will start at **http://localhost:4000**.
- Health Check: [http://localhost:4000/api/health](http://localhost:4000/api/health)
- Projects Data Payload: [http://localhost:4000/api/projects](http://localhost:4000/api/projects)

---

## 3. Frontend Setup (`frontend/`)

1. Navigate to the frontend folder:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure target backend address by copying `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
4. Start the Vite development server:
   ```bash
   npm run dev
   ```

The React frontend client will open at **http://localhost:5173**.
