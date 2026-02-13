require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose')
const axios = require('axios');
const { sha256 } = require('js-sha256');
const { IotaClient, getFullnodeUrl } = require('@iota/iota-sdk/client');
const { Ed25519Keypair } = require('@iota/iota-sdk/keypairs/ed25519');
const { Transaction } = require('@iota/iota-sdk/transactions');
const { Resend } = require('resend');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());
/* ======================================================
   0. DATABASE CONNECTION (MongoDB) 
====================================================== */
//read link from .env and connect to MongoDB Atlas
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB Atlas (Persistent Storage)'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// Data types 
const RecSchema = new mongoose.Schema({
    id: String,           // IOTA Object ID
    issuerEmail: String,
    studentName: String,
    passport: String,
    passportHash: String,
    content: String,      // Recomms content save
    contentHash: String,
    status: { type: String, default: 'Verified' },
    txDigest: String,
    timestamp: { type: Date, default: Date.now }
});

const Recommendation = mongoose.model('Recommendation', RecSchema);
/* ======================================================
   1. IOTA + SERVICE SETUP
====================================================== */

// Initialize Client for Testnet
const client = new IotaClient({ url: process.env.IOTA_NODE_URL || getFullnodeUrl('testnet') });
const resend = new Resend(process.env.RESEND_API_KEY);

// Environment Variables
const PACKAGE_ID = process.env.PACKAGE_ID;
const PROTOCOL_CONFIG_ID = process.env.PROTOCOL_CONFIG_ID; 
const ADMIN_SECRET = process.env.ADMIN_ACCESS_KEY || 'Fendi';
const SERP_API_KEY = process.env.SERP_API_KEY;

// Admin Signer (Payer & Authority)
if (!process.env.ISSUER_MNEMONIC) {
    console.error("❌ Error: ISSUER_MNEMONIC is missing in .env");
    process.exit(1);
}
const adminKeypair = Ed25519Keypair.deriveKeypair(process.env.ISSUER_MNEMONIC);
const adminAddress = adminKeypair.toIotaAddress();

console.log(`🤖 Admin Address loaded: ${adminAddress}`);

/* ======================================================
   2. IN-MEMORY STATE (For Hackathon Demo)
====================================================== */
let whitelist = ['s-sazadegan@ucp.pt', 'admin@trustcycle.edu']; 
let otpStore = {};

/* ======================================================
   3. HELPER: STRING TO BYTES
====================================================== */
// Helper to convert hex string to byte array for Move vector<u8>
const hexToBytes = (hex) => Uint8Array.from(Buffer.from(hex, 'hex'));

// Helper to convert Text string to byte array
const stringToBytes = (str) => new TextEncoder().encode(str);

/* ======================================================
   4. IDENTITY LOOKUP (SERP / GOOGLE)
====================================================== */

const verifyWebPresence = async (email, fullName) => {
  try {
    if (!SERP_API_KEY) return null;

    const safeName = fullName?.trim() || email.split('@')[0];
    const query = `"${safeName}" ${email} site:linkedin.com OR site:researchgate.net OR site:scholar.google.com OR professor OR faculty`;

    const response = await axios.get('https://serpapi.com/search.json', {
      params: { q: query, api_key: SERP_API_KEY, engine: 'google' }
    });

    let identity = {
      fullName: safeName,
      title: 'Professional',
      verifiedAcademic: false,
      photo: null
    };

    // 1. Check Knowledge Graph (High Confidence)
    if (response.data.knowledge_graph) {
      identity.fullName = response.data.knowledge_graph.title || safeName;
      identity.title = response.data.knowledge_graph.type || 'Academic';
      identity.photo = response.data.knowledge_graph.header_images?.[0]?.image;
      identity.verifiedAcademic = true;
    } 
    // 2. Check Organic Results (Medium Confidence)
    else if (response.data.organic_results?.[0]) {
      const snippet = response.data.organic_results[0].snippet.toLowerCase();
      if (
        snippet.includes('professor') ||
        snippet.includes('faculty') ||
        snippet.includes('university') ||
        snippet.includes('lecturer')
      ) {
        identity.verifiedAcademic = true;
        identity.title = 'Verified Academic';
      }
    }

    return identity;
  } catch (e) {
    console.error('SERP API Error:', e.message);
    return null; // Fail gracefully
  }
};

/* ======================================================
   5. ROUTES
====================================================== */

/* ---------- Provider Admin: Whitelist Management ---------- */
app.post('/api/admin/whitelist', (req, res) => {
  const { email, action, adminKey } = req.body;

  if (adminKey !== ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized: Invalid Admin Key' });
  }

  if (action === 'add' && !whitelist.includes(email)) {
    whitelist.push(email);
  } else if (action === 'delete') {
    whitelist = whitelist.filter(e => e !== email);
  }

  res.json({ success: true, list: whitelist });
});

/* ---------- Professor Auth: Verify Identity ---------- */
app.post('/api/auth/verify-email', async (req, res) => {
  const { email, fullName } = req.body;

  // 1. Check Whitelist
  const isWhitelisted = whitelist.includes(email);
  
  // 2. Check Web Presence (Google)
  let identity = await verifyWebPresence(email, fullName);

  // 3. Fallback / Override Logic
  if (!identity) {
    if (isWhitelisted) {
      identity = {
        fullName: fullName || 'System Administrator',
        title: 'Authorized Issuer',
        verifiedAcademic: true,
        photo: null
      };
    } else {
        return res.status(404).json({
            success: false,
            error: 'Identity could not be verified via public web search.'
        });
    }
  }

  // 4. Final Permission Check
  const canProceed = isWhitelisted || identity.verifiedAcademic;

  // 5. Fetch previous history for this issuer
  const history = await Recommendation.find({ issuerEmail: email });
  res.json({ success: true, identity, canProceed, history });
});

/* ---------- OTP Generation ---------- */
app.post('/api/auth/send-otp', async (req, res) => {
  const { email } = req.body;
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore[email] = otp;

  console.log(`🔐 OTP Generated for ${email}: ${otp}`);

  try {
    if (process.env.RESEND_API_KEY) {
        await resend.emails.send({
        from: process.env.EMAIL_FROM || 'onboarding@resend.dev', 
        to: email,
        subject: 'TrustCycle Verification Code',
        html: `<p>Your verification code is: <strong>${otp}</strong></p><p>This code expires in 5 minutes.</p>`
        });
        res.json({ success: true, message: "Email sent" });
    } else {
        res.json({ success: true, message: "OTP logged to console (Dev Mode)" });
    }
  } catch (err) {
    console.error("Email Error:", err);
    res.status(500).json({ error: 'Failed to send email.' });
  }
});

app.post('/api/auth/verify-otp', (req, res) => {
  const { email, otp } = req.body;

  if (otpStore[email] !== otp) {
    return res.status(401).json({ error: 'Invalid or expired OTP' });
  }
  delete otpStore[email];
  res.json({ success: true });
});

/* ======================================================
   6. ISSUE RECOMMENDATION (ON-CHAIN)
====================================================== */

app.post('/api/issue', async (req, res) => {
  try {
    const { authId, studentName, passport, content, issuerEmail } = req.body;

    // Validate inputs
    if (!authId || !studentName || !passport || !content) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    console.log("Creating IOTA Transaction...");

    const tx = new Transaction();

    // Hashing for Privacy on Chain
    const passportHash = sha256(passport); 
    const contentHash = sha256(content);

    // Call the Move function: issue_recommendation
    tx.moveCall({
      target: `${PACKAGE_ID}::recommendation::issue_recommendation`,
      arguments: [
        tx.object(authId),                               // 1. auth: &IssuerAuthorization
        tx.object(PROTOCOL_CONFIG_ID),                   // 2. config: &ProtocolConfig
        tx.pure.vector('u8', stringToBytes(studentName)),// 3. subject_name: vector<u8>
        tx.pure.vector('u8', hexToBytes(passportHash)),  // 4. subject_ref_hash: vector<u8>
        tx.pure.vector('u8', hexToBytes(contentHash)),   // 5. content_hash: vector<u8>
        tx.object('0x6')                                 // 6. clock: &Clock
      ]
    });

    // Execute Transaction
    const result = await client.signAndExecuteTransaction({
      transaction: tx,
      signer: adminKeypair,
      options: { 
        showObjectChanges: true,
        showEffects: true
      }
    });

    if (result.effects.status.status !== 'success') {
        throw new Error(`Transaction Failed: ${result.effects.status.error}`);
    }

    // Extract the new Recommendation Object ID
    const createdObj = result.objectChanges?.find(
        o => o.type === 'created' && o.objectType.includes('Recommendation')
    );
    const recId = createdObj ? createdObj.objectId : 'Unknown';

    console.log(`✅ Transaction Success! Digest: ${result.digest}, RecID: ${recId}`);

    // Store in MongoDB - CRITICAL for View/Download feature
    const newRecord = new Recommendation({
      id: recId,
      issuerEmail,
      studentName,
      passport, 
      passportHash,
      content,  
      contentHash,
      status: 'Verified',
      txDigest: result.digest,
    });
    await newRecord.save(); //permanent store

    res.json({ success: true, recId, txId: result.digest });

  } catch (e) {
    console.error("Blockchain Error:", e);
    res.status(500).json({ error: e.message || "Transaction failed" });
  }
});

/* ======================================================
   7. REVOKE RECOMMENDATION (ON-CHAIN)
====================================================== */

app.post('/api/revoke', async (req, res) => {
    try {
        const { recId } = req.body;
        console.log(`Revoking recommendation: ${recId}`);
        
        const record = await Recommendation.findOne({ id: recId });
        if (!record) return res.status(404).json({error: "Record not found"});
        
        // Update Local State
        record.status = 'Revoked';
        await record.save();

        res.json({ success: true });

    } catch (e) {
        console.error("Revoke Error:", e);
        res.status(500).json({ error: "Revocation failed" });
    }
});

/* ======================================================
   8. PUBLIC VERIFICATION API
====================================================== */

app.post('/api/student/search', async (req, res) => {
  const { studentName, passport } = req.body;
  
  if (!studentName || !passport) return res.json([]);

  try {
    const results = await Recommendation.find({
    studentName: { $regex: new RegExp(`^${studentName}$`, `i`)},
    passport: passport
  });

  res.json(results);
} catch (e) {
    console.error("Search Error:", e);
    res.status(500).json({ error: "Search failed" });
}
});

app.get('/api/verify/:id', async (req, res) => {
    try {
  const { id } = req.params;
  const record = await Recommendation.findOne({ id });
  
  if (!record) {
    return res.status(404).json({ error: 'Recommendation not found' });
  }
  // Optional: Verify against blockchain here for extra security
  // const onChainObj = await client.getObject({ id, options: { showContent: true } });
  res.json(record);
} catch (e) {
    console.error("Verify Error:", e);
    res.status(500).json({ error: "Verification failed" });
}
});

/* ======================================================
   9. SERVER START
====================================================== */

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 TrustCycle Backend is live on port ${PORT}`);
  console.log(`🔗 Connected to IOTA Node`);
});