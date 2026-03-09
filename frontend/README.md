# TrustCycle — Frontend

React/TypeScript single-page application providing a Web2 interface for all TrustCycle user roles. Abstracts all blockchain complexity from end users — no wallets, no crypto jargon.

---

## Technology Stack

- **Framework:** React 18 with TypeScript
- **Build Tool:** Vite
- **Styling:** Inline styles with responsive design (no external CSS framework)
- **Blockchain SDK:** `@iota/iota-sdk` (client-side, for standalone verification only)
- **Deployment:** Vercel

---

## User Panels

The application is structured around five distinct role-based panels, accessible via the top navigation bar:

### Professor
Multi-step issuance flow:
1. **Identity verification** — Full name and institutional email submitted for Google Knowledge Graph lookup
2. **OTP authentication** — 6-digit code sent to verified email
3. **Dashboard** — Issue new recommendations or view issuance history with revocation controls
4. **Issuance form** — Student name, passport/ID number, and recommendation content (plain text or PDF upload)
5. **Confirmation** — On-chain reference ID returned upon successful IOTA transaction

### Student Vault
Two access methods:
- **Search by identity** — Name and passport number query returns all associated credentials
- **Reference code lookup** — Direct retrieval by on-chain Object ID

Credential view includes status, content preview, and W3C VC JSON export.

### University Check
Single-input verification by reference hash. Returns credential status, student details, and official document download (PDF if applicable). Performs live IOTA state check via backend.

### Verifier (Standalone)
Fully independent, platform-free verification panel. Accepts an exported VC JSON file and performs:
- **Step 1 (Offline):** Ed25519 signature reconstruction and validation against the issuer DID
- **Step 2 (Online):** Direct IOTA testnet query for credential active state

This panel requires no backend connection — it interacts with IOTA directly from the browser.

### Provider (Admin)
Whitelist management interface for authorised issuers. Requires admin access key.

---

## Key Design Decisions

**No wallet requirement** — All blockchain signing is handled by the backend custodial layer. Professors interact purely through email and OTP. This is an intentional Phase 1 tradeoff documented in the litepaper.

**Responsive layout** — The application detects viewport width and adjusts layout, font sizes, and component dimensions for mobile and desktop.

**Client-side IOTA verification** — The Verifier panel dynamically imports `@iota/iota-sdk/client` and `@iota/iota-sdk/verify` at runtime, enabling trustless, independent credential verification without any server involvement.

**PDF support** — Professors can upload PDF recommendation letters (max 5MB). PDFs are Base64-encoded and stored off-chain. The content hash is what gets anchored on-chain.

---

## Environment Variables

Create a `.env` file in the `/frontend` directory:

```env
VITE_API_URL=    # Backend API base URL (e.g. https://trustcycle-drs.onrender.com)
```

---

## Installation & Running

```bash
cd frontend
npm install
cp .env.example .env   # Fill in your backend URL
npm run dev            # Development server
npm run build          # Production build
```

---

## Deployment

The frontend is deployed on Vercel. Connect the `/frontend` directory as the project root in your Vercel configuration, with the following build settings:

```
Build Command:    npm run build
Output Directory: dist
```

**Live deployment:** [https://trust-cycle-drs.vercel.app](https://trust-cycle-drs.vercel.app)
