# TrustCycle — Smart Contract

Move smart contract deployed on the IOTA Rebased Testnet. Provides on-chain state management for the TrustCycle credentialing system, including issuance, revocation, and protocol governance.

---

## Overview

The contract implements a permission-layered credentialing architecture with three distinct roles: a **University authority** that governs the protocol, **Issuers** (professors) who hold authorisation badges, and the **ProtocolConfig** shared object that controls system-wide issuance and revocation flags.

All `Recommendation` objects are published as **Move Shared Objects**, making them publicly queryable by any third party directly on the IOTA network — without platform dependency.

---

## Contract Structure

```
sources/
└── hackathon.move    # Main contract module (hackathon::recommendation)
```

---

## Object Model

### `ProtocolConfig` (Shared Object)
System-wide configuration. Controls whether issuance and revocation are enabled. Holds a protocol version number for future upgrade governance.

```move
public struct ProtocolConfig has key, store {
    id: UID,
    issuance_enabled: bool,
    revocation_enabled: bool,
    protocol_version: u64,
}
```

### `IssuerAuthorization`
Capability object held by each authorised professor. Contains a hash of the issuer's email for identity binding and an `active` flag for revocation of issuer privileges.

```move
public struct IssuerAuthorization has key, store {
    id: UID,
    issuer_email_hash: vector<u8>,
    active: bool,
}
```

### `Recommendation` (Shared Object)
The core on-chain credential record. Stores only hashes — no personal data or content is written to the ledger.

```move
public struct Recommendation has key, store {
    id: UID,
    issuer_auth_id: ID,
    subject_name: vector<u8>,
    subject_ref_hash: vector<u8>,   // SHA-256 hash of passport/ID
    content_hash: vector<u8>,        // SHA-256 hash of signed VC JSON
    issued_at: u64,                  // IOTA Clock timestamp (ms)
    active: bool,                    // false = revoked
}
```

---

## Entry Functions

### `accredit_professor` (UniversityCap required)
Issues an `IssuerAuthorization` badge to a professor's address. Only callable by the university authority.

```move
public entry fun accredit_professor(
    _: &UniversityCap,
    issuer_email_hash: vector<u8>,
    professor_address: address,
    ctx: &mut TxContext
)
```

### `issue_recommendation` (IssuerAuthorization required)
Creates and shares a new `Recommendation` object on-chain. Checks that issuance is enabled and the issuer badge is active. Emits a `RecommendationIssued` event.

```move
public entry fun issue_recommendation(
    auth: &IssuerAuthorization,
    config: &ProtocolConfig,
    subject_name: vector<u8>,
    subject_ref_hash: vector<u8>,
    content_hash: vector<u8>,
    clock: &Clock,
    ctx: &mut TxContext
)
```

### `revoke_recommendation` (IssuerAuthorization required)
Sets `active = false` on an existing `Recommendation`. Enforces that only the original issuer (`issuer_auth_id` match) can revoke. Emits a `RecommendationRevoked` event.

```move
public entry fun revoke_recommendation(
    auth: &IssuerAuthorization,
    config: &ProtocolConfig,
    rec: &mut Recommendation
)
```

### `update_config` (ConfigCap required)
Updates protocol-level flags. Allows the university authority to pause issuance or revocation system-wide.

---

## Events

| Event | Fields | Trigger |
|-------|--------|---------|
| `RecommendationIssued` | `recommendation_id`, `issuer_auth_id`, `subject_ref_hash`, `issued_at` | On successful issuance |
| `RecommendationRevoked` | `recommendation_id`, `revoked_by_auth_id` | On successful revocation |

---

## Deployment

- **Network:** IOTA Rebased Testnet
- **Package ID:** `0x...` *(see `.env` configuration in `/backend`)*
- **Explorer:** [explorer.rebased.iota.org](https://explorer.rebased.iota.org)

### Build & Deploy

```bash
# From repo root
iota move build
iota client publish --gas-budget 100000000
```

After deployment, note the `Package ID` and the `ProtocolConfig` shared object ID and add them to your backend `.env`.

---

## Security Properties

- **Issuer-bound revocation:** The `E_WRONG_ISSUER` guard ensures a credential can only be revoked by the same `IssuerAuthorization` object that issued it. Cross-issuer revocation is impossible.
- **No personal data on-chain:** Only SHA-256 hashes are stored. Raw passport numbers and recommendation content never touch the ledger.
- **Double-revocation protection:** `E_ALREADY_REVOKED` prevents redundant state writes.
- **Protocol kill switch:** `issuance_enabled` and `revocation_enabled` flags allow the university authority to pause the system without contract migration.
