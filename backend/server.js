require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose')
const axios = require('axios');
const { sha256 } = require('js-sha256');
const crypto = require('crypto'); // Added for AES Encryption
const { IotaClient, getFullnodeUrl } = require('@iota/iota-sdk/client');
const { Ed25519Keypair } = require('@iota/iota-sdk/keypairs/ed25519');
const { Transaction } = require('@iota/iota-sdk/transactions');
const { Resend } = require('resend');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

/* ======================================================
   0. ENCRYPTION UTILS (For Passport Privacy)
====================================================== */
// Fallback provided for the hackathon demo
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 32) {
    console.error("❌ Error: ENCRYPTION_KEY is missing or not exactly 32 characters in .env");
    process.exit(1);
}
const IV_LENGTH = 16;

function encrypt(text) {
    let iv = crypto.randomBytes(IV_LENGTH);
    let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
    let textParts = text.split(':');
    let iv = Buffer.from(textParts.shift(), 'hex');
    let encryptedText = Buffer.from(textParts.join(':'), 'hex');
    let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}

/* ======================================================
   0.1 DATABASE CONNECTION (MongoDB) 
====================================================== */
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB Atlas (Persistent Storage)'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

const RecSchema = new mongoose.Schema({
    id: String,           
    issuerEmail: String,
    studentName: String,
    encryptedPassport: String, // SECURE: AES Encrypted Passport
    passportHash: String,      // SECURE: Hash for searching
    content: String,      
    contentHash: String,
    status: { type: String, default: 'Verified' },
    txDigest: String,
    timestamp: { type: Date, default: Date.now }
});

const Recommendation = mongoose.model('Recommendation', RecSchema);

/* ======================================================
   1. IOTA + SERVICE SETUP
====================================================== */
const client = new IotaClient({ url: process.env.IOTA_NODE_URL || getFullnodeUrl('testnet') });
const resend = new Resend(process.env.RESEND_API_KEY);

const PACKAGE_ID = process.env.PACKAGE_ID;
const PROTOCOL_CONFIG_ID = process.env.PROTOCOL_CONFIG_ID; 
const ADMIN_SECRET = process.env.ADMIN_ACCESS_KEY || 'Fendi';
const SERP_API_KEY = process.env.SERP_API_KEY;

const ISSUER_AUTH_ID = "0x823e7925487a829195d2693a8be96c9dacfb505220a503ac176cf06deef65ad7";

if (!process.env.ISSUER_MNEMONIC) {
    console.error("❌ Error: ISSUER_MNEMONIC is missing in .env");
    process.exit(1);
}
const adminKeypair = Ed25519Keypair.deriveKeypair(process.env.ISSUER_MNEMONIC);
const adminAddress = adminKeypair.toIotaAddress();
console.log(`🤖 Admin Address loaded: ${adminAddress}`);

/* ======================================================
   2. IN-MEMORY STATE
====================================================== */
let whitelist = ['s-sazadegan@ucp.pt', 'admin@trustcycle.edu']; 
let otpStore = {};

/* ======================================================
   3. HELPER: STRING TO BYTES
====================================================== */
const hexToBytes = (hex) => Uint8Array.from(Buffer.from(hex, 'hex'));
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

    if (response.data.knowledge_graph) {
      identity.fullName = response.data.knowledge_graph.title || safeName;
      identity.title = response.data.knowledge_graph.type || 'Academic';
      identity.photo = response.data.knowledge_graph.header_images?.[0]?.image;
      identity.verifiedAcademic = true;
    } else if (response.data.organic_results?.[0]) {
      const snippet = response.data.organic_results[0].snippet.toLowerCase();
      if (snippet.includes('professor') || snippet.includes('faculty') || snippet.includes('university') || snippet.includes('lecturer')) {
        identity.verifiedAcademic = true;
        identity.title = 'Verified Academic';
      }
    }
    return identity;
  } catch (e) {
    console.error('SERP API Error:', e.message);
    return null; 
  }
};

/* ======================================================
   5. ROUTES
====================================================== */
app.post('/api/admin/whitelist', (req, res) => {
  const { email, action, adminKey } = req.body;
  if (adminKey !== ADMIN_SECRET) return res.status(401).json({ error: 'Unauthorized: Invalid Admin Key' });
  if (action === 'add' && !whitelist.includes(email)) whitelist.push(email);
  else if (action === 'delete') whitelist = whitelist.filter(e => e !== email);
  res.json({ success: true, list: whitelist });
});

app.post('/api/auth/verify-email', async (req, res) => {
  const { email, fullName } = req.body;
  if (!email || !fullName || email.trim() === '' || fullName.trim() ==='') {
    return res.status(400).json({ success: false, error: 'Please enter both Full Name and Academic Email.' })
  }
  const isWhitelisted = whitelist.includes(email);
  let identity = await verifyWebPresence(email, fullName);

  if (!identity) {
    if (isWhitelisted) {
      identity = { fullName: fullName || 'System Administrator', title: 'Authorized Issuer', verifiedAcademic: true, photo: null };
    } else {
        return res.status(404).json({ success: false, error: 'Identity could not be verified via public web search.' });
    }
  }
  const canProceed = isWhitelisted || identity.verifiedAcademic;
  const history = await Recommendation.find({ issuerEmail: email });
  res.json({ success: true, identity, canProceed, history });
});

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
        html: `<p>Your verification code is: <strong>${otp}</strong></p>`
        });
        res.json({ success: true, message: "Email sent", demoOTP: otp });
    } else {
        res.json({ success: true, message: "OTP logged to console (Dev Mode)", demoOTP: otp });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to send email.' });
  }
});

app.post('/api/auth/verify-otp', (req, res) => {
  const { email, otp } = req.body;
  if (otpStore[email] !== otp) return res.status(401).json({ error: 'Invalid or expired OTP' });
  delete otpStore[email];
  res.json({ message: 'OTP verified'});
});

/* ======================================================
   6. ISSUE RECOMMENDATION (ON-CHAIN)
====================================================== */
app.post('/api/issue', async (req, res) => {
  try {
    const { authId, studentName, passport, content, issuerEmail } = req.body;
    if (!authId || !studentName || !passport || !content) return res.status(400).json({ error: "Missing required fields" });

    // Formatting the final immutable content
    // NOTE: Keeping 'passport' out of this formatted text to ensure DB privacy
    const dateIssued = new Date().toUTCString();
    const formattedContent = `*** TRUSTCYCLE VERIFIED ***\nThis is a demo version for MasterZ*IOTA first Europe Hackathon 2026.\n\nDate: ${dateIssued}\nIssuer Email: ${issuerEmail}\nStudent Name: ${studentName}\n\nRecommendation:\n${content}`;

    console.log("Creating IOTA Transaction...");
    const tx = new Transaction();

    const passportHash = sha256(passport); 
    const contentHash = sha256(formattedContent);
    const encryptedPassport = encrypt(passport); // AES Encryption

    tx.moveCall({
      target: `${PACKAGE_ID}::recommendation::issue_recommendation`,
      arguments: [
        tx.object(authId),                               
        tx.object(PROTOCOL_CONFIG_ID),                   
        tx.pure.vector('u8', stringToBytes(studentName)),
        tx.pure.vector('u8', hexToBytes(passportHash)),  
        tx.pure.vector('u8', hexToBytes(contentHash)),   
        tx.object('0x6')                                 
      ]
    });

    const result = await client.signAndExecuteTransaction({
      transaction: tx, signer: adminKeypair, options: { showObjectChanges: true, showEffects: true }
    });

    if (result.effects.status.status !== 'success') throw new Error(`Transaction Failed: ${result.effects.status.error}`);

    const createdObj = result.objectChanges?.find(o => o.type === 'created' && o.objectType.includes('Recommendation'));
    const recId = createdObj ? createdObj.objectId : 'Unknown';

    console.log(`✅ Transaction Success! Digest: ${result.digest}, RecID: ${recId}`);

    const newRecord = new Recommendation({
      id: recId,
      issuerEmail,
      studentName,
      encryptedPassport, // Storing ONLY the encrypted cipher
      passportHash, 
      content: formattedContent,  
      contentHash,
      status: 'Verified',
      txDigest: result.digest,
    });
    await newRecord.save(); 

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
        console.log(`Revoking recommendation on-chain: ${recId}`);
        
        const record = await Recommendation.findOne({ id: recId });
        if (!record) return res.status(404).json({error: "Record not found"});
        
        const tx = new Transaction();
        tx.moveCall({
            target: `${PACKAGE_ID}::recommendation::revoke_recommendation`,
            arguments: [
                tx.object(ISSUER_AUTH_ID),         
                tx.object(PROTOCOL_CONFIG_ID),     
                tx.object(recId)                   
            ]
        });

        const result = await client.signAndExecuteTransaction({
            transaction: tx, signer: adminKeypair, options: { showEffects: true }
        });

        if (result.effects.status.status !== 'success') throw new Error("On-chain revocation failed");

        record.status = 'Revoked';
        await record.save();
        res.json({ success: true, txDigest: result.digest });

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
    const searchHash = sha256(passport); 
    let results = await Recommendation.find({
        studentName: { $regex: new RegExp(`^${studentName}$`, `i`)},
        passportHash: searchHash 
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
    if (!record) return res.status(404).json({ error: 'Recommendation not found' });

    // Decrypt Passport on-the-fly for the University
    let decryptedPassport = '';
    if (record.encryptedPassport) {
        try { decryptedPassport = decrypt(record.encryptedPassport); } 
        catch (err) { console.error("Decryption failed", err); }
    }

    // Trustless Verification: Cross-reference with IOTA Blockchain state
    try {
        const onChainObj = await client.getObject({ id, options: { showContent: true } });
        if (onChainObj.data && onChainObj.data.content) {
            const isActiveOnChain = onChainObj.data.content.fields.active;
            if (!isActiveOnChain && record.status !== 'Revoked') {
                record.status = 'Revoked';
                await record.save();
            }
        }
    } catch (chainErr) {
        console.warn("Could not cross-reference with blockchain:", chainErr.message);
    }

    // Return the response with the decrypted passport appended
    const responseData = {
        ...record.toObject(),
        passport: decryptedPassport 
    };

    res.json(responseData);
  } catch (e) {
      console.error("Verify Error:", e);
      res.status(500).json({ error: "Verification failed" });
  }
});

/* ======================================================
   8.5 W3C VERIFIABLE CREDENTIAL API (Standard Export)
====================================================== */
app.get('/api/vc/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 1. Finding Recommendation from IOTA (DB)
    const record = await Recommendation.findOne({ id });
    
    if (!record) {
        return res.status(404).json({ error: 'Credential not found' });
    }

    if (record.status === 'Revoked') {
        return res.status(400).json({ error: 'This credential has been revoked by the issuer.' });
    }

    
    
    // 2. Standard VC Format (W3C + Custom Fields for IOTA)
    const vcDocument = {
        "@context": [
            "https://www.w3.org/2018/credentials/v1",
            "https://trustcycle.io/credentials/v1"
        ],
        "type": ["VerifiableCredential", "AcademicRecommendation"],
        "id": `urn:uuid:${record.id}`,
        "issuer": {
            "id": `did:iota:${adminAddress}`,
            "name": record.issuerEmail,
            "verificationMethod": "Google Knowledge Graph via TrustCycle"
        },
        "issuanceDate": new Date(record.timestamp).toISOString(),
        "credentialSubject": {
            "id": `did:student:${record.passportHash}`,
            "studentName": record.studentName,
            "contentHash": record.contentHash 
        },
        "proof": {
            "type": "IotaMoveAnchoredSignature2026",
            "created": new Date(record.timestamp).toISOString(),
            "proofPurpose": "assertionMethod",
            "verificationMethod": `https://explorer.iota.org/txblock/${record.txDigest}?network=testnet`,
            "transactionDigest": record.txDigest
        }
    };

    // 3. Standrd JSON-LD Response
    res.setHeader('Content-Type', 'application/ld+json');
    res.json(vcDocument);

  } catch (e) {
      console.error("VC Generation Error:", e);
      res.status(500).json({ error: "Failed to generate Verifiable Credential" });
  }
});

/* ======================================================
   9. SERVER START
====================================================== */
const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0' , () => {
  console.log(`🚀 TrustCycle Backend is live on port ${PORT}`);
  console.log(`🔗 Connected to IOTA Node`);
});