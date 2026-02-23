// File: verify-standalone.js
const fs = require('fs');
const { IotaClient, getFullnodeUrl } = require('@iota/iota-sdk/client');
const { verifyPersonalMessageSignature } = require('@iota/iota-sdk/verify');

async function verifyIndependentCredential(filePath) {
    console.log("🔍 Verifying the credential...");

    try {
        const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        // Verify Credential structure
        const { onChainObjectId, credential } = fileData;

        // ==========================================
        // Step 1: Check Signature (The most sensitive part)
        // ==========================================
        const signature = credential.proof.proofValue;
        const issuerAddress = credential.issuer.replace('did:iota:', '');

        // Recreate te exact payload tat was signed during issuance.
        // Te payload must be exactly te same
        const vcPayloadForVerification = {
            "@context": credential["@context"],
            "type": credential.type,
            "issuer": credential.issuer,
            "issuanceDate": credential.issuanceDate,
            "credentialSubject": credential.credentialSubject
        };

        // Convert to bytes
        const payloadString = JSON.stringify(vcPayloadForVerification);
        const messageBytes = new TextEncoder().encode(payloadString);
        
        const publicKey = await verifyPersonalMessageSignature(messageBytes, signature);
        const recoveredAddress = publicKey.toIotaAddress();

        if (recoveredAddress !== issuerAddress) {
            throw new Error("Address mismatch!");
        }
        console.log("✅ Step 1: Signature is VALID.");

        // ==========================================
        // Step 2: Blockchain Check
        // ==========================================
        const client = new IotaClient({ url: getFullnodeUrl('testnet') });
        const onChainObj = await client.getObject({
            id: onChainObjectId,
            options: { showContent: true }
        });

        if (onChainObj.data && onChainObj.data.content.fields.active) {
            console.log("✅ Step 2: Credential is ACTIVE on IOTA.");
            console.log("🎉 SUCCESS: This is a valid, untampered portable VC.");
        } else {
            console.log("❌ Step 2: Credential has been REVOKED.");
        }

    } catch (err) {
        console.error("❌ VERIFICATION FAILED:", err.message);
        console.log("\n💡 TIP: Make sure 'student-vc.json' has the exact same fields as created during issuance.");
    }
}
        // ==========================================
        // A sample file exist on te repo, but you can create your own from te TrustCycle Demo App. 
        // Just download the VC as JSON and save it as 'student-vc.json' in te same folder as this script.
        // ==========================================
verifyIndependentCredential('./student-vc.json');