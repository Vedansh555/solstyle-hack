# SolStyle

### AI-Curated Fashion Drops on Solana

**SolStyle** is a decentralized platform bridging the gap between digital identity and physical fashion. By combining **Real Icons** (Kylie Jenner, Ronaldo) with **AI Influencers** (Zaara, Neo), we enable users to generate, mint, and own exclusive fashion drops as verifiable NFTs on the Solana blockchain.

![SolStyle Interface](https://via.placeholder.com/1200x600.png?text=SolStyle+Interface+Preview)

---

## Live Application
**URL:** [https://solstyle-hack.vercel.app](https://solstyle-hack.vercel.app)  


## The Challenge
* **Monetization:** Creators and fans lack direct ways to monetize aesthetic curation.
* **Ownership:** Web2 platforms gatekeep digital assets; users rent pixels rather than owning them.
* **Logistics:** The bridge between owning a digital collectible and receiving a physical product is often broken or non-existent in crypto.

## 🛠 The Solution
SolStyle provides a seamless pipeline for:
1.  **Curation:** Users select from a roster of AI and Real-world icons.
2.  **Generation:** Our engine designs a bespoke outfit based on the curator's specific aesthetic.
3.  **Ownership:** Instant micro-payments (0.1 SOL) mint the asset as an NFT.
4.  **Fulfillment:** Integrated shipping logic connects the digital purchase to physical delivery tracking.

---

## Core Features

### Curator Engine
Select from a diverse roster of style icons—from AI-native stars like Zaara to global athletes like Ronaldo. The system generates unique metadata based on the selected persona.

### Instant Settlement
Leveraging Solana's high throughput, purchases are settled in seconds. The outfit is minted as an SPL Token (NFT) and deposited directly into the user's wallet.

### Phygital Logistics
A complete e-commerce flow. Users input shipping details post-purchase and receive a unique tracking number, bridging the gap between on-chain ownership and off-chain delivery.

### Viral Growth
Integrated "Share on X" functionality allows users to instantly broadcast their exclusive drops, driving organic platform growth.

---

## Technical Stack

* **Network:** Solana Devnet
* **Smart Contract:** Anchor Framework (Rust)
* **Frontend:** Next.js 14 (TypeScript)
* **Styling:** Tailwind CSS
* **Storage:** IPFS (Pinata)
* **Standards:** SPL Token & Metaplex

---

## 🏗 Architecture

**Smart Contract (`solstyle_program`)**
* `CreateDrop`: Initializes a new collection with defined commission parameters.
* `BuyDrop`: Executes the micro-payment, distributes a 5% commission to the curator, and mints the NFT to the buyer.

**Client (Frontend)**
* Wallet Adapter for Phantom connection.
* On-chain data fetching for Drop status.
* Local state management for Order History and Tracking logic.

---

## 📦 Installation & Setup

### Prerequisites
* Node.js v20+
* Rust & Anchor CLI
* Solana CLI

### 1. Clone Repository
```bash
git clone [https://github.com/Vedansh555/solstyle-hack.git](https://github.com/Vedansh555/solstyle-hack.git)
cd solstyle-hack

2.Smart Contract
cd programs/solstyle_program
anchor build
anchor test

3. Client
Bash

cd app
npm install
npm run dev

Deployment Details
Program ID: 3PAQx8QnCzQxywuN2WwSyc8G7UNH95zqb1ZdsFm5fZC6

Cluster: Devnet

Hackathon Tracks
Consumer Crypto

Payment/Commerce

AI + Crypto
