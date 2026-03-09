# TrustCycle — Backend

Node.js/Express API server providing identity verification, Verifiable Credential generation, IOTA blockchain interaction, and persistent credential storage.

---

## Technology Stack

- **Runtime:** Node.js v18+
- **Framework:** Express.js
- **Database:** MongoDB Atlas (via Mongoose)
- **Blockchain:** IOTA Rebased Testnet (`@iota/iota-sdk`)
- **Cryptography:** Ed25519 (`@iota/iota-sdk/keypairs/ed25519`), AES-256-CBC (`crypto`)
- **Credential Standard:** W3C Verifiable Credentials
- **Email:** Resend API
- **Identity Verification:** SerpAPI (Google Knowledge Graph)
- **File Handling:** Multer (PDF upload support, max 5MB)

---

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/verify-email` | Verifies academic identity via Google Knowledge Graph. Returns identity profile and issuance permission. |
| POST | `/api/auth/send-otp` | Sends a 6-digit OTP to the verified email address. |
| POST | `/api/auth/verify-otp` | Validates the submitted OTP and authorises session. |

### Credential Lifecycle

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/issue` | Issues a signed W3C Verifiable Credential. Accepts text or PDF. Anchors content hash and passport hash to IOTA L1. |
| POST | `/api/revoke` | Revokes an existing credential on-chain. Flips the `active` flag on the Move Shared Object. |

### Verification & Retrieval

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/student/search` | Retrieves credentials by student name and passport hash. |
| GET | `/api/verify/:id` | Returns full credential record. Performs live IOTA state sync to detect on-chain revocation. |
| GET | `/api/vc/:id` | Exports a portable W3C VC JSON package including network metadata and on-chain object ID. |

### Administration

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/whitelist` | Adds or removes an email from the authorised issuer whitelist. Requires admin key. |

---

## Credential Issuance Flow

```
1. Identity verified via Google KG + institutional whitelist check
2. OTP sent and verified → session authorised
3. Professor submits student name, passport ID, recommendation (text or PDF)
4. Backend generates W3C VC payload (JSON)
5. Ed25519 signature applied using admin keypair (custodial Phase 1 mode)
6. SHA-256 hashes computed: passportHash, contentHash
7. Move transaction submitted to IOTA L1:
   issue_recommendation(authId, protocolConfig, studentName, passportHash, contentHash, clock)
8. Transaction confirmed → on-chain Object ID retrieved
9. Full record (encrypted passport, VC, hashes, tx digest) persisted to MongoDB
10. Reference ID returned to professor
```

---

## Data Storage Model

Sensitive data is separated across two layers:

| Field | Storage | Protection |
|-------|---------|------------|
| `passportHash` | IOTA L1 + MongoDB | SHA-256 one-way hash |
| `contentHash` | IOTA L1 + MongoDB | SHA-256 one-way hash |
| `encryptedPassport` | MongoDB only | AES-256-CBC encryption |
| `content` (full text/PDF) | MongoDB only | Base64 encoded for PDF |
| `vc` (signed credential) | MongoDB only | Ed25519 signed JSON |

---

## Environment Variables

Create a `.env` file in the `/backend` directory with the following variables:

```env
# MongoDB
MONGO_URI=                  # MongoDB Atlas connection string

# IOTA Blockchain
IOTA_NODE_URL=              # IOTA node URL (defaults to testnet fullnode)
PACKAGE_ID=                 # Deployed Move package ID
PROTOCOL_CONFIG_ID=         # Shared ProtocolConfig object ID
ISSUER_MNEMONIC=            # BIP39 mnemonic for the admin keypair (custodial signer)

# Encryption
ENCRYPTION_KEY=             # Exactly 32-character string for AES-256-CBC

# Email
RESEND_API_KEY=             # Resend API key for OTP delivery
EMAIL_FROM=                 # Sender email address

# Identity Verification
SERP_API_KEY=               # SerpAPI key for Google Knowledge Graph lookups

# Administration
ADMIN_ACCESS_KEY=           # Secret key for /api/admin/whitelist endpoint
```

> ⚠️ Never commit `.env` to version control. All secrets are excluded via `.gitignore`.

---

## Installation & Running

```bash
cd backend
npm install
cp .env.example .env   # Fill in your values
node server.js
```

Server starts on port `3001` by default (configurable via `PORT` env variable).

---

## Security Notes

- Passport numbers are never stored in plaintext. They are AES-256-CBC encrypted at rest and SHA-256 hashed for on-chain reference.
- The admin keypair operates in custodial mode (Phase 1). Migration to per-issuer non-custodial DID signing is planned for Phase 2.
- OTPs are single-use and deleted from memory immediately after verification.
- File uploads are capped at 5MB and processed in-memory (no disk writes).
