# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Nonprofit Treasurer — a financial management web app for small nonprofit associations. Uses Google Sheets as its database, Google Drive for receipt storage, and integrates with Square/PayPal for transaction syncing. Authentication is via Google OAuth with role-based access (admin/treasurer/viewer).

## Build and Development Commands

- `npm run dev` — start Next.js dev server at http://localhost:3000
- `npm run build` — production build
- `npm run lint` — run ESLint (Next.js config)
- `npm run setup-sheets` — initialize Google Sheets tabs with headers (requires `.env.local` configured)

There is no test suite configured in this project.

## Architecture

### Stack

Next.js 14 (App Router) with TypeScript, Tailwind CSS, Google Sheets as database via `googleapis`, Google Drive for file storage, NextAuth for authentication, jsPDF for PDF reports, Recharts for charts.

### Data Flow

All data lives in a single Google Spreadsheet with one tab per entity (Income, Sponsorship, Sponsors, Expenses, Reimbursements, Transactions, Events, Members). The `src/lib/google-sheets.ts` module is the database layer — it provides generic CRUD functions (`getRows`, `appendRow`, `updateRow`, `deleteRow`, `getRowById`) that operate on any sheet tab. Column schemas are defined in `SHEET_SCHEMAS` in that same file, and tab name constants live in `SHEET_TABS` in `src/types/index.ts`.

Every record uses `id` as the first column. IDs are generated client-side via `generateId()` in `src/lib/utils.ts` (timestamp + random string).

### API Route Pattern

All API routes are in `src/app/api/*/route.ts` and follow the same pattern:
1. Check auth using helpers from `src/lib/api-helpers.ts` — `requireAuth()` for read operations, `requireEditor()` for writes
2. If auth returns a `Response` (error), return it immediately
3. Perform Google Sheets CRUD via `src/lib/google-sheets.ts`
4. Return responses via `jsonResponse()` / `errorResponse()` — all API responses are wrapped in `{ success: boolean, data?, error? }`

When adding a new API route, follow this exact auth-check-then-CRUD pattern (see `src/app/api/income/route.ts` as the canonical example).

### Auth and Roles

NextAuth with Google provider, configured in `src/lib/auth.ts`. Roles are assigned by matching the user's email against `ADMIN_EMAILS` and `TREASURER_EMAILS` env vars (comma-separated). The role is stored in the JWT token. `canEdit()` returns true for admin and treasurer roles. All pages redirect unauthenticated users to `/`.

### Frontend Pattern

Pages use the Next.js App Router. Each page under `src/app/` (dashboard, income, expenses, etc.) is a `'use client'` component wrapped in `AppLayout` (provides sidebar + auth guard). Data fetching uses the `useApi` and `useFetch` hooks from `src/hooks/useApi.ts`, which handle loading/error states and toast notifications automatically.

Reusable UI components are in `src/components/ui/` (Modal, DataTable, FileUpload, PageHeader, StatCard, StatusBadge). Layout components (AppLayout, Sidebar, Providers) are in `src/components/layout/`.

### External Integrations

- **Google Drive** (`src/lib/google-drive.ts`): receipt upload/delete via service account. Uploaded files are set to "anyone with link" read access.
- **Square** (`src/lib/square.ts`): read-only, fetches completed orders via Orders API with cursor-based pagination.
- **PayPal** (`src/lib/paypal.ts`): read-only, fetches transactions via Reporting API with page-based pagination. Uses client credentials OAuth flow.
- **PDF generation** (`src/lib/pdf.ts`): server-side PDF generation using jsPDF + jspdf-autotable. Three report types: event, monthly, annual.

### Path Aliases

`@/*` maps to `./src/*` (configured in `tsconfig.json`). Always use `@/` imports for project files.

### Key Conventions

- All monetary amounts are stored as strings in Google Sheets and parsed with `parseAmount()` from `src/lib/utils.ts`
- Dates are stored as ISO date strings (YYYY-MM-DD)
- The financial year runs January 1 through December 31
- The `scripts/` directory is excluded from tsconfig compilation — scripts use `tsx` to run directly
- The `primary` color in Tailwind config maps to blue shades (matching the app's blue theme)

### Adding a New Entity

1. Add the type definition in `src/types/index.ts` and a new `SHEET_TABS` entry
2. Add the column schema to `SHEET_SCHEMAS` in `src/lib/google-sheets.ts`
3. Create an API route at `src/app/api/<entity>/route.ts` following the income route pattern
4. Create a page at `src/app/<entity>/page.tsx`
5. Add a sidebar link in `src/components/layout/Sidebar.tsx`
6. Run `npm run setup-sheets` to create the new tab in Google Sheets
