# TrustCycle — Decentralized Recommendation System

**An On-Chain Solution for Academia Based on the IOTA Trust Framework**  
*Built for the MasterZ × IOTA European Web3 Hackathon 2026*

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-black?style=flat-square)](https://trust-cycle-drs.vercel.app)
[![Network](https://img.shields.io/badge/Network-IOTA%20Testnet-blue?style=flat-square)](https://explorer.rebased.iota.org)

---

## Overview

TrustCycle replaces inefficient, email-based academic recommendation loops with a trustless, cryptographically verifiable system anchored to the IOTA L1 network. The platform bridges standard Web2 user interfaces with Web3 infrastructure, requiring no crypto wallets or blockchain knowledge from end users.

> *"Complexity belongs in the infrastructure, not in the user journey."*

The system serves three primary participants: **Professors** who issue recommendations, **Students** who hold and present them, and **Universities** that independently verify their authenticity — all without relying on any centralized intermediary.

---

## Architecture

The trust model is deliberately decoupled from the application layer and anchored in two verifiable components:

```
[Professor] → Identity Check (Google KG + OTP) → Backend Signs VC (Ed25519)
                                                        ↓
                                          Hash anchored to IOTA L1 (Move Object)
                                                        ↓
[Student]   ← Portable JSON (VC) ←─────────────────────┘
                    ↓
[University/Verifier] → Offline signature check + Online IOTA state check
```

**Two-layer verification:**
- **Offline:** Ed25519 cryptographic signature verification against the issuer's DID
- **Online:** Live IOTA L1 state check confirming the credential has not been revoked

**Key design principle:** Only content hashes and passport hashes are stored on-chain. The full credential travels as a portable, self-contained W3C Verifiable Credential JSON file — independently verifiable by any third party without platform dependency.

---

## Repository Structure

```
TrustCycle/
├── backend/          # Node.js/Express API server
├── frontend/         # React/TypeScript UI (Vite)
├── sources/          # Move smart contract (IOTA L1)
├── tests/            # Contract and backend test suites
├── verify-standalone.js   # Standalone offline VC verifier script
├── student-vc.json        # Example Verifiable Credential output
├── Move.toml              # Move package configuration
└── package.json
```

---

## Core Components

| Component | Technology | Purpose |
|-----------|------------|---------|
| Smart Contract | Move (IOTA Rebased) | On-chain state management, issuance & revocation |
| Backend | Node.js, Express, MongoDB | VC generation, Ed25519 signing, identity verification |
| Frontend | React, TypeScript, Vite | Web2 interface for all user roles |
| Identity Bridge | Google Knowledge Graph API | Academic identity verification without wallets |
| Credential Standard | W3C Verifiable Credentials | Portable, interoperable credential format |

---

## User Roles

- **Professor** — Verifies academic identity via Google KG + OTP, issues signed recommendations as text or PDF
- **Student** — Retrieves credentials by name/passport, downloads portable VC JSON, shares reference IDs
- **University** — Verifies authenticity via reference ID or uploaded VC JSON through dual-layer check
- **Verifier** — Standalone offline+online verification of any exported VC JSON file
- **Provider** — Administrative panel for managing the authorized issuer whitelist

---

## Intentional Demo Tradeoffs

This MVP was built to validate core logic and demonstrate a seamless user experience. The following architectural tradeoffs were made deliberately and are resolved in the production roadmap:

| Demo Simplification | Reason | Production Resolution |
|---------------------|--------|-----------------------|
| Backend custodial signing | Removes wallet friction for professors | True non-custodial DID issuance per issuer |
| Google SERP API identity bridge | Immediate Web2 verification | On-chain DID lifecycle governance |
| MongoDB storage | Speed and UI responsiveness | Decentralized storage (Walrus/IPFS) |
| Static passport hashing | Fast verifiability | Zero-Knowledge Proof selective disclosure |

Full roadmap available in the [Litepaper](https://trust-cycle-drs.vercel.app) (accessible via the live demo).

---

## Quick Start

### Prerequisites
- Node.js v18+
- MongoDB Atlas account
- IOTA testnet wallet (for contract interaction)

### Installation

```bash
git clone https://github.com/sabaazdn73/TrustCycle-DRS.git
cd TrustCycle-DRS

# Install root dependencies
npm install

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

See `/backend/README.md` and `/frontend/README.md` for environment variable setup and individual run instructions.

---

## Live Demo

**→ [https://trust-cycle-drs.vercel.app](https://trust-cycle-drs.vercel.app)**

A live testnet deployment is available. The standalone verifier panel allows fully independent, platform-free verification of any exported VC JSON file directly in the browser.

---

## On-Chain Deployment

- **Network:** IOTA Rebased Testnet  
- **Package ID:** *(see `/backend/README.md`)*  
- **Explorer:** [explorer.rebased.iota.org](https://explorer.rebased.iota.org)

---

## Author

**Saba Azadegan**  
MSc Business, Católica Lisbon School of Business and Economics   

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-blue?style=flat-square)](https://www.linkedin.com/in/saba-azadegan-2974b622a)
[![GitHub](https://img.shields.io/badge/GitHub-Profile-black?style=flat-square)](https://github.com/sabaazdn73)

---

*Built for MasterZ × IOTA European Web3 Hackathon 2026*
