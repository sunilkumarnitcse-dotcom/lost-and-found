# Smart Campus Lost & Found Management System

A web app for a college campus: students and staff can report lost or found
items, search approved found items, see possible matches, and claim an item
with ownership evidence. Staff review reports and claims, and Admin manages
categories, staff accounts and the dashboard.

Built from the **SRS, SDS and ADT** documents for this project.

## SRS vs this build — please read this first (viva me kaam aayega)

| Topic | SRS planned | This codebase |
|---|---|---|
| Backend | Java + Spring Boot (planned) | **Node.js + Express** |
| Database | NoSQL, exact product **TBD (TBD-01)** | **MongoDB (Mongoose)** — this is the NoSQL implementation chosen here |
| Frontend ↔ DB | REST API, JSON | Same: browser → Express REST API → MongoDB. The frontend never talks to MongoDB directly. |

So do **not** say in viva that this code uses Java / Spring Boot — it does not.
Say: *"SRS me NoSQL planned tha, product TBD tha, isliye implementation me
MongoDB (Mongoose) choose kiya — flow SRS jaisa hi hai."*

## What is inside

- **Report lost / found** — item name, category, description, location, date,
  optional photo reference, reporter name + contact. Mandatory fields are
  validated. Every accepted report gets a unique ID like `LF-2026-0001`
  and starts as **Pending** (FR-03, FR-04, FR-05).
- **Found board** — only approved (Available) found items are shown publicly.
  Search and filter by keyword, category, date, location, type (FR-01, FR-02).
- **Item details + Possible Matches** — matched by category, keywords,
  location and date. A match is a **suggestion only**, never proof of
  ownership (FR-12).
- **Claims** — claim an Available found item with ownership evidence.
  Staff approve / reject. Approving a claim returns the item and
  auto-rejects other pending claims, so one item can never be returned
  to two people (FR-09 to FR-13).
- **Roles** — Campus User (no login needed), Staff and Admin.
  Staff/Admin log in with a PIN (demo only — see below) (FR-08).
- **Admin dashboard** — total / pending / available / returned counts,
  pending claims, open inquiries and an activity log (FR-14, FR-15).
- **Categories and staff accounts** — Admin can add / delete categories
  and create / deactivate staff accounts (FR-07).
- **Campus Search-Sweep Tracker** — last known location/time, a checklist
  of campus areas (Pending / Checked / Found), progress, and no duplicate
  area task for the same item (FR-17 to FR-20).
- **Contact / inquiry form** (FR-16).
- **Privacy** — reporter contact details and claim evidence are **never**
  shown on the public board. Only Staff/Admin can see them (NFR-04).

## How to run locally

### 1. You need

- Node.js 18 or newer (`node --version`)
- A **MongoDB Atlas** account and cluster (free tier is enough).
  Create one at https://www.mongodb.com/atlas — the app does **not**
  come with a database, and no connection string is included here.

### 2. Set up

```bash
git clone https://github.com/sunilkumarnitcse-dotcom/lost-and-found.git
cd lost-and-found
npm install
cp .env.example .env
```

### 3. Set your MongoDB connection string

Open `.env` and replace the placeholder with **your own** Atlas string:

```text
MONGODB_URI=mongodb+srv://<your-user>:<your-password>@<your-cluster>/lostfound
```

In Atlas, also allow your IP in **Network Access** (or use `0.0.0.0/0`
for a college demo) and create a database user for the cluster.

> **Important:** MongoDB is **not connected yet** in this code as given —
> Sunil has not provided any Atlas cluster or connection string yet.
> If `MONGODB_URI` is missing or still has `<user>` / `<password>` /
> `<cluster>` placeholders, the server **will not start**. It prints a
> clear error and exits. It never silently uses another database.

### 4. Start the server

```bash
npm start
```

Open http://localhost:3000

Demo logins (change them in `.env` before any real use):

- Staff PIN: `staff123` (set with `STAFF_PIN`)
- Admin PIN: `admin123` (set with `ADMIN_PIN`)

These PINs are demo-only. A real system must use properly hashed
passwords (SRS NFR-03), not plain PINs.

## Demo flow (2 minutes, isi order me dikhao)

1. **Report a lost item** (e.g. Brown Wallet, Library) → you get a
   reference ID like `LF-2026-0001`, status **Pending**.
2. **Staff login** (PIN `staff123`) → Pending Reports → **Approve** →
   the item appears on the Found Board as **Available**.
3. **Search / filter** on the board, and open the item to see
   **Possible Matches**.
4. **Submit a claim** with ownership evidence → item becomes **Claimed**.
5. **Staff reviews the claim** → Approve → item becomes **Returned**.
   Other pending claims for the same item are auto-rejected.
6. **Admin login** (PIN `admin123`) → dashboard, categories,
   staff accounts, activity log.

## API (main routes)

| Method | Route | Who can use it |
|---|---|---|
| POST | `/api/items` | Anyone (report lost/found) |
| GET | `/api/items?q=&category=&date=&location=&type=` | Anyone (approved found items only) |
| GET | `/api/items/:referenceId` | Anyone (approved items) |
| GET | `/api/items/:referenceId/matches` | Anyone |
| POST | `/api/items/:referenceId/claims` | Anyone |
| POST | `/api/auth/login` | Staff / Admin (PIN) |
| GET | `/api/items/staff/all` | Staff / Admin |
| PATCH | `/api/items/staff/:referenceId/status` | Staff / Admin |
| GET / PATCH | `/api/staff/claims`, `/api/staff/claims/:id/decision` | Staff / Admin |
| GET / POST | `/api/items/:referenceId/sweep` | Staff / Admin |
| PATCH | `/api/sweep/:id` | Staff / Admin |
| GET | `/api/admin/dashboard`, `/api/admin/activity` | Admin |
| GET / POST / DELETE | `/api/admin/categories` | Admin |
| GET / POST / PATCH | `/api/admin/staff-accounts` | Admin |
| POST | `/api/inquiries` | Anyone |
| GET | `/api/inquiries/staff/all` | Staff / Admin |

## Project structure

```text
server.js                  Entry point — Express app, static frontend
src/config/db.js           MongoDB connection (MONGODB_URI only, no fallback)
src/models/                Mongoose models: Item, Claim, Category,
                           StaffAccount, ActivityLog, SweepTask,
                           Inquiry, Counter (for LF-2026-XXXX IDs)
src/routes/                auth, items, claims, sweep, inquiries, admin
src/middleware/auth.js     PIN login sessions + role checks (FR-08)
src/utils/validate.js      ItemReport ADT validateItem()
src/utils/matching.js      Possible-match scoring (FR-12)
src/seed.js                First-run categories + demo Staff/Admin
public/                    Frontend: index.html, styles.css, app.js
.env.example               Placeholder config — NO real credentials
```

## Files NOT in this repo

- `.env` — your real connection string. It is in `.gitignore`.
- `node_modules/` — installed with `npm install`. Also in `.gitignore`.

## Future scope (SRS — not implemented, mat bolna ki hai)

Email notifications, advanced matching, QR-based identification,
multi-campus support.
