# Nonprofit Treasurer

Financial management web application for small nonprofit associations. Built with free and open-source technologies.

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    Frontend                          │
│           Next.js 14 + React + Tailwind CSS         │
├─────────────────────────────────────────────────────┤
│                 Next.js API Routes                   │
│    Auth │ Income │ Expenses │ Reports │ Sync        │
├──────┬───────────┬──────────────┬────────────────────┤
│Google│  Google   │   Google     │  Square / PayPal   │
│OAuth │  Sheets   │   Drive      │  APIs (read-only)  │
│      │  (DB)     │  (Receipts)  │                    │
└──────┴───────────┴──────────────┴────────────────────┘
```

**Key decisions:**
- **Next.js** (frontend + backend in one deployment)
- **Google Sheets** as the database (free, accessible, auditable)
- **Google Drive** for receipt file storage
- **Google OAuth** for authentication (free)
- **jsPDF** for PDF report generation (open-source)
- **Recharts** for dashboard charts (open-source)

## Features

| Module | Capabilities |
|--------|-------------|
| **Dashboard** | YTD totals, net surplus/deficit, monthly chart, event summaries |
| **Income** | Track membership, guest fees, event entry, donations |
| **Sponsorship** | Annual & event-specific, paid/pending status tracking |
| **Expenses** | General & event-based, categorized, receipt uploads to Google Drive |
| **Reimbursements** | Request/approve/reimburse workflow with receipt attachments |
| **Transactions** | Pull from Square & PayPal, deduplicate, tag and categorize |
| **Reports** | Event, Monthly, Annual reports in PDF and CSV |
| **Events** | Central event management used across all modules |
| **Auth** | Google OAuth with role-based access (admin/treasurer/viewer) |

## Google Sheets Schema

The application uses a single Google Spreadsheet with the following tabs:

### Income
| Column | Description |
|--------|-------------|
| id | Unique identifier |
| incomeType | Membership, Guest Fee, Event Entry, Donation, Other |
| eventName | Associated event (optional) |
| amount | Dollar amount |
| date | Date of income |
| paymentMethod | Cash, Check, Square, PayPal, Zelle, Bank Transfer |
| payerName | Name of payer |
| notes | Additional notes |
| createdAt | Record creation timestamp |
| updatedAt | Last update timestamp |

### Sponsorship
| Column | Description |
|--------|-------------|
| id | Unique identifier |
| sponsorName | Name of sponsor |
| type | Annual or Event |
| amount | Dollar amount |
| eventName | Associated event (if Event type) |
| paymentMethod | Payment method used |
| paymentDate | Date payment received |
| status | Paid or Pending |
| notes | Additional notes |
| createdAt, updatedAt | Timestamps |

### Expenses
| Column | Description |
|--------|-------------|
| id | Unique identifier |
| expenseType | General or Event |
| eventName | Associated event (if Event type) |
| category | Admin, Venue, Catering, etc. |
| description | Expense description |
| amount | Dollar amount |
| date | Expense date |
| paidBy | Organization or board member name |
| receiptUrl | Google Drive link to receipt |
| receiptFileId | Google Drive file ID |
| notes | Additional notes |
| createdAt, updatedAt | Timestamps |

### Reimbursements
| Column | Description |
|--------|-------------|
| id | Unique identifier |
| expenseId | Link to expense (optional) |
| requestedBy | Board member name |
| amount | Reimbursement amount |
| description | What is being reimbursed |
| eventName | Associated event |
| category | Expense category |
| receiptUrl | Receipt link |
| receiptFileId | Receipt file ID |
| status | Pending, Approved, Reimbursed, Rejected |
| approvedBy | Who approved |
| approvedDate | Approval date |
| reimbursedDate | Reimbursement date |
| notes | Additional notes |
| createdAt, updatedAt | Timestamps |

### Transactions
| Column | Description |
|--------|-------------|
| id | Unique identifier |
| externalId | Square/PayPal transaction ID (for dedup) |
| source | Square, PayPal, or Manual |
| amount | Transaction amount |
| fee | Processing fee |
| netAmount | Amount minus fees |
| description | Transaction description |
| payerName | Payer name |
| payerEmail | Payer email |
| date | Transaction date |
| tag | Membership, Guest Fee, Sponsorship, Event Entry, etc. |
| eventName | Associated event |
| syncedAt | When imported |
| notes | Additional notes |

### Events
| Column | Description |
|--------|-------------|
| id | Unique identifier |
| name | Event name |
| date | Event date |
| description | Description |
| status | Upcoming, Completed, Cancelled |
| createdAt | Creation timestamp |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST/PUT/DELETE | `/api/income` | Income CRUD |
| GET/POST/PUT/DELETE | `/api/sponsorship` | Sponsorship CRUD |
| GET/POST/PUT/DELETE | `/api/expenses` | Expenses CRUD |
| GET/POST/PUT/DELETE | `/api/reimbursements` | Reimbursements CRUD |
| GET/PUT | `/api/transactions` | List/update transactions |
| POST | `/api/transactions` | Sync from Square/PayPal |
| POST | `/api/upload` | Upload receipt to Google Drive |
| GET | `/api/dashboard?year=YYYY` | Dashboard summary data |
| GET | `/api/reports?type=event&event=NAME&format=pdf` | Event report |
| GET | `/api/reports?type=monthly&year=Y&month=M&format=pdf` | Monthly report |
| GET | `/api/reports?type=annual&year=YYYY&format=pdf` | Annual report |
| GET/POST/PUT/DELETE | `/api/events` | Events CRUD |
| * | `/api/auth/[...nextauth]` | NextAuth Google OAuth |

## Setup Guide

### Prerequisites

- Node.js 18+ installed
- A Google account
- (Optional) Square and/or PayPal business accounts

### Step 1: Clone and Install

```bash
git clone <repository-url>
cd nonprofit-treasurer
npm install
```

### Step 2: Google Cloud Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use existing)
3. Enable these APIs:
   - Google Sheets API
   - Google Drive API
4. Create **OAuth 2.0 credentials**:
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
   - Save the **Client ID** and **Client Secret**
5. Create a **Service Account**:
   - Go to IAM & Admin > Service Accounts
   - Create a new service account
   - Download the JSON key file
   - Note the email address (e.g., `xxx@project.iam.gserviceaccount.com`)
   - Extract the `private_key` from the JSON file

### Step 3: Google Sheets Setup

1. Create a new Google Spreadsheet
2. Copy the **Spreadsheet ID** from the URL:
   `https://docs.google.com/spreadsheets/d/{THIS_IS_THE_ID}/edit`
3. **Share the spreadsheet** with the service account email (Editor access)

### Step 4: Google Drive Setup

1. Create a folder in Google Drive for receipt uploads
2. Copy the **Folder ID** from the URL:
   `https://drive.google.com/drive/folders/{THIS_IS_THE_FOLDER_ID}`
3. **Share the folder** with the service account email (Editor access)

### Step 5: Environment Variables

Copy the example env file and fill in your values:

```bash
cp .env.example .env.local
```

Fill in all values in `.env.local`:

```env
GOOGLE_CLIENT_ID=your_oauth_client_id
GOOGLE_CLIENT_SECRET=your_oauth_client_secret
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=run_openssl_rand_base64_32

GOOGLE_SPREADSHEET_ID=your_spreadsheet_id
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-sa@project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_DRIVE_FOLDER_ID=your_drive_folder_id

ADMIN_EMAILS=your-email@gmail.com
TREASURER_EMAILS=treasurer@yourorg.com
```

Generate NEXTAUTH_SECRET:
```bash
openssl rand -base64 32
```

### Step 6: Initialize Sheets

Run the setup script to create all tabs with headers:

```bash
npm run setup-sheets
```

### Step 7: Run the Application

```bash
npm run dev
```

Visit `http://localhost:3000` and sign in with Google.

### Step 8: Square Setup (Optional)

1. Go to [Square Developer Dashboard](https://developer.squareup.com/)
2. Create an application
3. Get the **Access Token** from the Credentials tab
4. Get your **Location ID** from the Locations API or dashboard
5. Add to `.env.local`:
   ```
   SQUARE_ACCESS_TOKEN=your_token
   SQUARE_ENVIRONMENT=sandbox  # or production
   SQUARE_LOCATION_ID=your_location_id
   ```

### Step 9: PayPal Setup (Optional)

1. Go to [PayPal Developer Dashboard](https://developer.paypal.com/)
2. Create an app under REST API apps
3. Get **Client ID** and **Secret**
4. Add to `.env.local`:
   ```
   PAYPAL_CLIENT_ID=your_client_id
   PAYPAL_CLIENT_SECRET=your_secret
   PAYPAL_ENVIRONMENT=sandbox  # or production
   ```

## Deployment

### Vercel (Recommended - Free Tier)

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and import the repository
3. Add all environment variables from `.env.local`
4. Update `NEXTAUTH_URL` to your Vercel domain
5. Update Google OAuth redirect URI to:
   `https://your-app.vercel.app/api/auth/callback/google`
6. Deploy

### Render (Alternative - Free Tier)

1. Push to GitHub
2. Go to [render.com](https://render.com) and create a new Web Service
3. Connect your GitHub repo
4. Build command: `npm run build`
5. Start command: `npm start`
6. Add environment variables
7. Deploy

### Railway (Alternative - Free Tier)

1. Go to [railway.app](https://railway.app)
2. Create a new project from GitHub
3. Add environment variables
4. Deploy

## Folder Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/                # API routes
│   │   ├── auth/           # NextAuth endpoints
│   │   ├── income/         # Income CRUD
│   │   ├── sponsorship/    # Sponsorship CRUD
│   │   ├── expenses/       # Expenses CRUD
│   │   ├── reimbursements/ # Reimbursements CRUD
│   │   ├── transactions/   # Transaction sync & management
│   │   ├── reports/        # PDF/CSV report generation
│   │   ├── upload/         # Receipt upload to Google Drive
│   │   ├── dashboard/      # Dashboard aggregation
│   │   └── events/         # Events CRUD
│   ├── dashboard/          # Dashboard page
│   ├── income/             # Income management page
│   ├── sponsorship/        # Sponsorship management page
│   ├── expenses/           # Expense management page
│   ├── reimbursements/     # Reimbursement management page
│   ├── transactions/       # Transaction sync page
│   ├── reports/            # Report generation page
│   └── settings/           # Settings & event management
├── components/
│   ├── layout/             # App shell, sidebar, providers
│   ├── charts/             # Recharts components
│   └── ui/                 # Reusable UI: Modal, DataTable, etc.
├── lib/
│   ├── auth.ts             # NextAuth configuration
│   ├── google-sheets.ts    # Sheets API CRUD layer
│   ├── google-drive.ts     # Drive API upload layer
│   ├── square.ts           # Square API integration
│   ├── paypal.ts           # PayPal API integration
│   ├── pdf.ts              # PDF report generation
│   ├── api-helpers.ts      # API route utilities
│   └── utils.ts            # Shared utility functions
├── hooks/
│   └── useApi.ts           # React hooks for API calls
├── types/
│   ├── index.ts            # TypeScript type definitions
│   └── next-auth.d.ts      # NextAuth type augmentation
└── scripts/
    └── setup-sheets.ts     # Sheet initialization script
```

## Role-Based Access

| Role | View | Create/Edit | Delete | Settings |
|------|------|-------------|--------|----------|
| **Admin** | All | All | All | All |
| **Treasurer** | All | All | All | Limited |
| **Viewer** | All | None | None | None |

Roles are assigned based on email matching in environment variables:
- `ADMIN_EMAILS` - comma-separated admin emails
- `TREASURER_EMAILS` - comma-separated treasurer emails
- All other authenticated users get `viewer` role

## Security Notes

- All API routes check authentication via NextAuth session
- Write operations require `admin` or `treasurer` role
- Google API credentials use a service account (never exposed to browser)
- File uploads validated for type and size (10MB max)
- Square/PayPal tokens stored server-side only
- OAuth tokens are not stored; session uses JWT

## Financial Year

The financial year runs **January 1 through December 31**. All dashboard calculations, monthly reports, and annual reports follow this calendar year convention.
