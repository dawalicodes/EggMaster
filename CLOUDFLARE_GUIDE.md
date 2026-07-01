# EggMaster Pro - Cloudflare Offline Development & Deployment Guide

This guide shows you how to download, set up, and run this application completely offline with a serverless relational SQL database, and then deploy it to **Cloudflare** for production.

---

## Architecture Overview
* **Frontend**: React SPA styled with Tailwind CSS, built with Vite, hosted on **Cloudflare Pages** (global CDN).
* **Backend**: Serverless API hosted on **Cloudflare Workers** built using the **Hono web framework** (fast, Express-style router).
* **Database**: **Cloudflare D1** (serverless SQL relational database built on SQLite). Awesome for multiple clients (e.g. your upcoming **Flutter application**!).

---

## Phase 1: Local Offline Development Setup

### 1. Download & Extract Code
Download the project ZIP from the Google AI Studio settings menu (or export to GitHub) and extract it onto your local machine.

### 2. Set Up the Backend (Cloudflare Worker with D1)
Open your terminal, navigate to the `cloudflare-backend` directory, install its dependencies, initialize your local SQLite SQL database, and start the development server:

```bash
cd cloudflare-backend
npm install

# 1. Initialize your local D1 SQLite database from the schema file
npx wrangler d1 execute eggmaster_pro_db --local --file=./schema.sql

# 2. Boot your Wrangler local development server
npm run dev
```
* This boots a local serverless environment on **`http://localhost:8787`**.
* It emulates the SQL database locally inside the `.wrangler` folder.

### 3. Set Up the Frontend (Vite + React)
Open a separate terminal window, navigate back to the root of your project, install dependencies, and run the Vite server:
```bash
# Return to root directory
cd ..
npm install
npm run dev -- --port 3000
```
* This runs your frontend on **`http://localhost:3000`**.

> **💡 Smart Proxy Configuration**: 
> To test the API calls seamless offline, you can add a proxy to your local `vite.config.ts` so that all requests to `/api/*` are automatically forwarded to your Wrangler worker on port `8787`. Add this `proxy` block to your `server` configuration in `vite.config.ts`:
> ```typescript
> server: {
>   port: 3000,
>   proxy: {
>     '/api': 'http://localhost:8787'
>   }
> }
> ```

---

## Phase 2: Production Deployment to Cloudflare

Once you are ready to make your app public, follow these quick steps:

### 1. Deploy the Cloudflare D1 SQL Database (Backend)
1. Log into your Cloudflare account from your terminal:
   ```bash
   cd cloudflare-backend
   npx wrangler login
   ```
2. Create your production D1 relational database:
   ```bash
   npx wrangler d1 create eggmaster_pro_db
   ```
   * Cloudflare will print out your new database binding credentials, like:
     ```toml
     [[d1_databases]]
     binding = "DB"
     database_name = "eggmaster_pro_db"
     database_id = "8b6ef2c5-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
     ```
3. Open `cloudflare-backend/wrangler.toml` and replace the placeholder `YOUR_D1_DATABASE_ID_HERE` with the actual `database_id` printed above.
4. Run your SQL migration schema file directly on your production D1 database at the edge:
   ```bash
   npx wrangler d1 execute eggmaster_pro_db --remote --file=./schema.sql
   ```
5. Deploy the Hono Worker backend:
   ```bash
   npm run deploy
   ```
   * Write down your deployed Worker API URL (e.g., `https://eggmaster-pro-api.<your-subdomain>.workers.dev`).

### 2. Deploy the Vite React App (Cloudflare Pages)
There are two ways to deploy your frontend to Pages:

#### Option A: Deploy via GitHub (Highly Recommended)
1. Push your code to a private or public GitHub repository.
2. Go to your Cloudflare Dashboard -> **Workers & Pages** -> **Create Application** -> **Pages** -> **Connect to Git**.
3. Select your repository and use these build settings:
   * **Framework Preset**: `Vite`
   * **Build Command**: `npm run build`
   * **Build Output Directory**: `dist`
4. Click **Save and Deploy**. Cloudflare will automatically build and publish your app on every commit!

#### Option B: Deploy via Wrangler CLI
1. Build the production files locally from the root folder:
   ```bash
   npm run build
   ```
2. Direct-upload the build files:
   ```bash
   npx wrangler pages deploy dist
   ```

---

## Phase 3: Stitching Frontend and Backend Together (DNS Routing)

To ensure that your React app (or Flutter app) can securely call the Cloudflare Worker `/api` without CORS blocks or complex absolute URL configurations:

1. Go to your **Cloudflare Dashboard** -> **Workers & Pages** -> select your `eggmaster-pro-api` worker.
2. Go to the **Triggers** tab -> **Custom Domains**.
3. Click **Add Custom Domain** and set it to a subroute of your custom domain (e.g., `api.yourdomain.com`).
4. Alternatively, you can use **Routes** to map your worker directly under your main domain (e.g., `yourdomain.com/api/*`). This keeps relative paths (`/api/login`, etc.) working flawlessly out of the box in production!

---

## Phase 4: Connecting your Flutter App!

Since you migrated to a true **D1 relational SQL database**, your upcoming **Flutter App** can now easily perform real-time granular API calls. Here are some of the endpoints available on your new backend:

* **Authentication**: `POST /api/login` (body: `username`, `password`)
* **Get Batches**: `GET /api/batches`
* **Create Batch**: `POST /api/batches` (body: JSON object representing the batch)
* **Delete Batch**: `DELETE /api/batches/:id`
* **Get Daily Records**: `GET /api/dailyRecords`
* **Add Daily Record**: `POST /api/dailyRecords` (body: JSON object representing the daily record)
* **Expenses**: `GET /api/expenses`, `POST /api/expenses`
* **Income**: `GET /api/income`, `POST /api/income`
* **Vaccination Logs**: `GET /api/vaccinationLogs`, `POST /api/vaccinationLogs`
* **Suppliers & Customers**: `GET /api/suppliers`, `GET /api/customers`
