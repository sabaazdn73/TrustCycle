require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose')
const axios = require('axios');
const { sha256 } = require('js-sha256');
const crypto = require('crypto'); // FIX: Duplicate removed
const { IotaClient, getFullnodeUrl } = require('@iota/iota-sdk/client');
const { Ed25519Keypair } = require('@iota/iota-sdk/keypairs/ed25519');
const { Transaction } = require('@iota/iota-sdk/transactions');
const { Resend } = require('resend');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();
app.set('trust proxy', 1); // FIX: Required for Render to avoid X-Forwarded-For error
app.use(express.json());
app.use(cors());

/* ======================================================
   0. ENCRYPTION UTILS (For Passport Privacy)
====================================================== */
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
    issuerName: String,
    issuerUniversity: String,
    studentName: String,
    encryptedPassport: String, 
    passportHash: String,      
    content: String,      
    contentHash: String,
    vc: Object, 
    status: { type: String, default: 'Verified' },
    txDigest: String,
    timestamp: { type: Date, default: Date.now }
});

const Recommendation = mongoose.model('Recommendation', RecSchema);

/* ======================================================
   1. IOTA + SERVICE SETUP (FIX: Trim hidden spaces from Render)
====================================================== */
const client = new IotaClient({ url: process.env.IOTA_NODE_URL || getFullnodeUrl('testnet') });
const resend = new Resend(process.env.RESEND_API_KEY);

const PACKAGE_ID = process.env.PACKAGE_ID ? process.env.PACKAGE_ID.trim() : undefined;
const PROTOCOL_CONFIG_ID = process.env.PROTOCOL_CONFIG_ID ? process.env.PROTOCOL_CONFIG_ID.trim() : undefined; 
const ADMIN_SECRET = process.env.ADMIN_ACCESS_KEY || 'Fendi';
const SERP_API_KEY = process.env.SERP_API_KEY;

const ISSUER_AUTH_ID = "0x823e7925487a829195d2693a8be96c9dacfb505220a503ac176cf06deef65ad7".trim();

if (!process.env.ISSUER_MNEMONIC) {
    console.error("❌ Error: ISSUER_MNEMONIC is missing in .env");
    process.exit(1);
}
const adminKeypair = Ed25519Keypair.deriveKeypair(process.env.ISSUER_MNEMONIC.trim());
const adminAddress = adminKeypair.toIotaAddress();
console.log(`🤖 Admin Address loaded: ${adminAddress}`);

/* ======================================================
   2. IN-MEMORY STATE
====================================================== */
let whitelist = ['s-sazadegan@ucp.pt', 'admin@trustcycle.edu']; 
let otpStore = {};

/* ======================================================
   2.5 RATE LIMITING (Fix: Added skip for Saba)
====================================================== */
const skipSaba = (req) => req.body.email === 's-sazadegan@ucp.pt';

const otpLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 3,
  skip: skipSaba,
  message: { error: 'Too many OTP requests. Please try again tomorrow.' }
});

const verifyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  skip: skipSaba,
  message: { error: 'Too many requests. Please try again later.' }
});

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

app.post('/api/auth/verify-email', verifyLimiter, async (req, res) => {
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

app.post('/api/auth/send-otp', otpLimiter, async (req, res) => {
  const { email } = req.body;
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore[email] = otp;
  // SECURITY FIX: Sanitized log
  console.log(`🔐 OTP Generated for email: ${email}`);

  try {
    if (process.env.RESEND_API_KEY) {
        await resend.emails.send({
          from: process.env.EMAIL_FROM || 'onboarding@resend.dev', 
          to: email,
          subject: 'TrustCycle Verification Code',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto; padding: 32px;">
              <h2 style="color: #7B2D8B;">TrustCycle</h2>
              <p>Your verification code is:</p>
              <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #7B2D8B; padding: 16px 0;">
                ${otp}
              </div>
              <p style="color: #666; font-size: 13px;">This code expires in 10 minutes. If you did not request this, please ignore this email.</p>
            </div>
          `
        });
        res.json({ success: true, message: "Verification code sent to your email." });
    } else {
        res.json({ success: true, message: "Dev mode: check server console for OTP." });
    }
  } catch (err) {
    console.error("❌ Resend API Error:", err);
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
===================================================== */
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage, limits: { fileSize: 5 * 1024 * 1024 } });

app.post('/api/issue', upload.single('file'), async (req, res) => {
  try {
    let { authId, studentName, passport, content, issuerEmail, issuerName, issuerUniversity } = req.body;

    if (!authId || !studentName || !passport) {
      throw new Error("Missing required fields (Name, Passport, or AuthID)");
    }

    let finalContent = content || "";
    if (req.file) {
      finalContent = `file:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    }

    const vcPayload = {
        "@context": ["https://www.w3.org/2018/credentials/v1"],
        "type": ["VerifiableCredential", "AcademicRecommendation"],
        "issuer": `did:iota:${adminAddress}`,
        "issuanceDate": new Date().toISOString(),
        "credentialSubject": { studentName, passportHash: sha256(passport), recommendationText: finalContent, issuerUniversity }
    };

    const { signature } = await adminKeypair.signPersonalMessage(new TextEncoder().encode(JSON.stringify(vcPayload)));
    const signedVc = { ...vcPayload, proof: { type: "Ed25519Signature2018", proofValue: signature } };
    const contentHash = sha256(JSON.stringify(signedVc));

    console.log("Creating IOTA Transaction...");
    const tx = new Transaction();
    
    tx.setSender(adminAddress);
    tx.setGasBudget(BigInt(500000000)); 

    const passportHash = sha256(passport); 
    const encryptedPassport = encrypt(passport); 

    tx.moveCall({
      target: `${PACKAGE_ID.trim()}::recommendation::issue_recommendation`,
      arguments: [
        tx.object(authId.trim()), 
        tx.object(PROTOCOL_CONFIG_ID.trim()),
        tx.pure.vector('u8', Array.from(stringToBytes(studentName))),
        tx.pure.vector('u8', Array.from(hexToBytes(passportHash))),
        tx.pure.vector('u8', Array.from(hexToBytes(contentHash))),
        tx.object('0x6') // Clock object
      ]
    });

    const result = await client.signAndExecuteTransaction({
      transaction: tx, signer: adminKeypair
    });

    if (result.effects?.status?.status !== 'success') {
        throw new Error(`TX Failed: ${result.effects?.status?.error || 'Unknown'}`);
    }

    const recId = result.objectChanges?.find(o => o.type === 'created' && o.objectType.includes('Recommendation'))?.objectId;

    await new Recommendation({
      id: recId, issuerEmail, issuerName, issuerUniversity, studentName,
      encryptedPassport, passportHash, content: finalContent, contentHash,
      vc: signedVc, status: 'Verified', txDigest: result.digest,
    }).save(); 

    res.json({ success: true, recId, txId: result.digest });
  } catch (e) {
    console.error("Blockchain Error (Detailed):", e.message);
    res.status(500).json({ error: e.message });
  }
});

/* ======================================================
   7. REVOKE RECOMMENDATION (ON-CHAIN)
====================================================== */
app.post('/api/revoke', async (req, res) => {
    try {
        const { recId } = req.body;
        const record = await Recommendation.findOne({ id: recId });
        if (!record) return res.status(404).json({error: "Record not found"});
        
        const tx = new Transaction();
        
        // ---- FIX APPLIED HERE AS WELL ----
        tx.setSender(adminAddress);
        tx.setGasBudget(100000000);
        
        tx.moveCall({
            target: `${PACKAGE_ID}::recommendation::revoke_recommendation`,
            arguments: [
                tx.object(ISSUER_AUTH_ID),         
                tx.object(PROTOCOL_CONFIG_ID),     
                tx.object(recId.trim())                   
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
        console.error("Revocation Error:", e.message);
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
    res.status(500).json({ error: "Search failed" });
  }
});

app.get('/api/verify/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const record = await Recommendation.findOne({ id });
    if (!record) return res.status(404).json({ error: 'Recommendation not found' });

    let decryptedPassport = '';
    if (record.encryptedPassport) {
        try { decryptedPassport = decrypt(record.encryptedPassport); } 
        catch (err) { console.error("Decryption failed", err); }
    }

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
        console.warn("Blockchain check failed:", chainErr.message);
    }

    const responseData = { ...record.toObject(), passport: decryptedPassport };
    res.json(responseData);
  } catch (e) {
      res.status(500).json({ error: "Verification failed" });
  }
});

/* ======================================================
   8.5 PUBLIC VC EXPORT API (W3C Standard)
====================================================== */
app.get('/api/vc/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const record = await Recommendation.findOne({ id });
    
    if (!record || !record.vc) return res.status(404).json({ error: 'VC not found' });
    if (record.status === 'Revoked') return res.status(400).json({ error: 'Revoked' });

    const portableCredential = {
      network: "iota-testnet",
      onChainObjectId: record.id, 
      credential: record.vc
    };

    res.setHeader('Content-Type', 'application/json');
    res.json(portableCredential); 

  } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed" });
  }
});

/* ======================================================
   8.6 PUBLIC CERTIFICATE API
====================================================== */
app.get('/api/certificate/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const record = await Recommendation.findOne({ id });
    if (!record) return res.status(404).json({ error: 'Certificate not found' });

    let onChainActive = true;
    try {
      const onChainObj = await client.getObject({ id, options: { showContent: true } });
      if (onChainObj.data?.content?.fields) {
        onChainActive = onChainObj.data.content.fields.active;
      }
    } catch (chainErr) {
      console.warn("On-chain check warning");
    }

    res.json({
      studentName: record.studentName,
      issuerName: record.issuerName,
      issuerUniversity: record.issuerUniversity || null,
      objectId: record.id,
      contentHash: record.contentHash,
      txDigest: record.txDigest,
      timestamp: record.timestamp,
      status: onChainActive ? record.status : 'Revoked',
      content: record.content?.startsWith('file:') ? null : record.content,
      explorerUrl: `https://explorer.iota.org/object/${record.id}?network=testnet`
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to load certificate' });
  }
});

/* ====================================================
   9. SERVER START
====================================================== */
const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 TrustCycle Backend live on port ${PORT}`);
});