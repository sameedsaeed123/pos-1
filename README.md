# Kiryana POS (Next.js + Neon PostgreSQL + Dexie PWA)

A production grade Point of Sale (POS) and inventory management system designed specifically for Pakistani general stores, kiryana shops, and mini marts.

---

## Key Highlights

- **Bilingual English and Urdu RTL**: Instant toggle with full Right to Left mirroring, while preserving Left to Right display for barcodes, phone numbers, and prices.
- **Offline First Resilience**: Seamless operation during internet interruptions and load shedding. Sales are saved locally in IndexedDB (Dexie) and automatically synchronized with the server when reconnected.
- **Paisa Integer Arithmetic**: All monetary transactions are computed in integer paisa, completely eliminating floating point rounding errors. Cashier totals show whole rupees with South Asian numbering formatting (`Rs 1,245,000`).
- **Safe Hardware Keyboard Shortcuts**: Cashier ergonomics designed for continuous keyboard usage without mouse intervention:
  - `F1`: Focus search / barcode entry
  - `F2`: Cash payment
  - `F3`: Digital / Split payment
  - `F4`: Udhaar / Khata settlement
  - `F6`: Recall parked bills (safe alternative to F5 browser reload)
  - `F7`: Reprint receipt (safe alternative to F12 devtools)
  - `F8`: Park bill
  - `F9`: Quick add unknown product
  - `F10`: Void line
- **Pakistani Currency & Payment Integrations**:
  - Note shortcuts: Rs 10, Rs 20, Rs 50, Rs 100, Rs 500, Rs 1,000, Rs 5,000.
  - Payment rails: Cash, Card, JazzCash, Easypaisa, Raast Dynamic QR, and Udhaar (Customer Khata).
  - FBR POS integration simulation with 22 digit invoice numbers and verification QR codes.
- **Thermal Receipts (80mm & 58mm)**: Clean monochrome layouts, canvas QR codes, and digital receipt sharing via WhatsApp.
- **Shift Reconciliation & Z-Report**: Cash float tracking, blind cash close to prevent cashier theft, and discrepancy reporting.
- **Customer Facing Display**: Dedicated secondary screen (`/pos/customer-display`) using the HTML5 BroadcastChannel API.

---

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack, React 19)
- **Language**: TypeScript strict mode
- **Database**: PostgreSQL (Neon Serverless)
- **ORM**: Prisma ORM 6
- **Styling**: Tailwind CSS with custom WCAG AA compliant palette
- **Client Cache**: Dexie.js (IndexedDB)
- **Audio Feedback**: Web Audio API synthetic beeps
- **Testing**: Vitest with unit tests for domain math and barcode algorithms

---

## Seeded Demo Users & Roles

| User | Role | PIN | Access Level |
| :--- | :--- | :--- | :--- |
| **Tariq Mehmood** | OWNER | `1234` | Full access, blind close audit, 100% discount limit, product creation |
| **Kamran Akmal** | MANAGER | `5678` | Void bills, approve unknown barcodes, price overrides, 25% discount limit |
| **Bilal Ahmed** | CASHIER | `9999` | Fast scanning, cash tender, parked bills, 5% discount limit |
| **Hamza Khan** | STOCK_KEEPER | `0000` | Inventory view, stock counts, receiving batches |

---

## Quick Start

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/sameedsaeed123/pos-1.git
cd pos-1
pnpm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and set your Neon PostgreSQL database connection string:

```bash
cp .env.example .env
```

### 3. Database Migration & Seeding

Run the Prisma migrations and populate 302 authentic Pakistani kiryana SKUs:

```bash
pnpm prisma db push
pnpm tsx prisma/seed.ts
```

### 4. Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Verification & Tests

To execute the unit test suite:

```bash
pnpm vitest run
```

To run TypeScript verification:

```bash
pnpm tsc --noEmit
```

To run production build:

```bash
pnpm build
```

---

## Documentation

- [Research Feature Matrix](file:///Users/m1air/pos/docs/research/feature-matrix.md)
- [Design System & Palette Tokens](file:///Users/m1air/pos/docs/design-system.md)
- [Product Walkthrough & Feature Verification](file:///Users/m1air/pos/docs/walkthrough.md)
