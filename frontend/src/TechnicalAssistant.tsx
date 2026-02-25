import { useState, useEffect } from 'react';

// 1. Project-specific questions and answers here
const QA_DATA = [
  {
    question: "What problem does TrustCycle actually solve?",
    answer: "TrustCycle eliminates the '300-letter bottleneck' in academic admissions. Instead of professors repeatedly emailing recommendation letters to multiple universities, each recommendation is issued once as a unique on-chain Move object. Universities verify authenticity directly from the IOTA ledger using a reference ID—no manual email validation required."
  },
  {
    question: "Is this fully decentralized or partially custodial?",
    answer: "TrustCycle is intentionally designed as Web2.5. Professors do not need crypto wallets. The backend signs transactions custodially to reduce adoption friction. However, the final credential state is anchored on-chain, making verification independent of our database."
  },
  {
    question: "What exactly is stored on the blockchain?",
    answer: "Only cryptographic hashes and structural metadata are stored on-chain. Specifically: the content hash, the subject reference hash, the issuer authorization ID, and the issuance timestamp. No raw personal data is published."
  },
  {
    question: "How does Move prevent forgery or duplication?",
    answer: "Each recommendation is modeled as a Move resource with `has key, store`. Move's resource-oriented type system prevents duplication at the language level. The object capability model ensures that only the authorized issuer can revoke or modify credential state."
  },
  {
    question: "How does revocation work?",
    answer: "Revocation is performed by calling `revoke_recommendation` in the Move contract. The credential's `active` field is set to false on-chain. During verification, the system cross-checks blockchain state to ensure the credential has not been revoked."
  },
  {
    question: "How is student privacy preserved?",
    answer: "Student passport data is encrypted using AES-256 before storage in the backend database. On-chain, only a SHA-256 hash of the passport is stored. This ensures GDPR-aligned privacy while maintaining cryptographic verifiability."
  },
  {
    question: "What happens if your database is compromised?",
    answer: "The database is not the source of truth. During verification, the system queries the IOTA ledger to validate the credential's active status. Any inconsistency between database records and on-chain state invalidates the credential."
  },
  {
    question: "How does this align with W3C Verifiable Credentials?",
    answer: "TrustCycle exports credentials as JSON-LD documents compliant with the W3C Verifiable Credentials standard. The proof section anchors verification to an IOTA transaction digest, enabling interoperability beyond the TrustCycle interface."
  },
  {
    question: "Why use IOTA instead of Ethereum?",
    answer: "IOTA's architecture enables efficient object-based state management and scalable execution. For high-volume academic credentialing, the network's optimized structure allows cost-efficient anchoring compared to traditional gas-heavy systems."
  }
];

// 2. Here is the new feature: The AI Typing Effect Component
const TypewriterEffect = ({ text }: { text: string }) => {
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    setDisplayedText(''); // Clear text when a new question is clicked
    let currentIndex = 0;
    
    // Set the typing speed (e.g., 20 milliseconds per character)
    const typingInterval = setInterval(() => {
      setDisplayedText(text.slice(0, currentIndex + 1));
      currentIndex++;
      if (currentIndex >= text.length) {
        clearInterval(typingInterval);
      }
    }, 20);

    return () => clearInterval(typingInterval); // Cleanup on unmount
  }, [text]);

  return <span>{displayedText}</span>;
};

export default function TechnicalAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedQa, setSelectedQa] = useState<number | null>(null);

  return (
    <>
      <span 
        onClick={() => setIsOpen(true)}
        style={{ 
          fontWeight: 'bold', 
          color: '#8c8a8ac7', 
          cursor: 'pointer', 
          borderBottom: '1px dotted #7e7d7d',
          marginLeft: '8px' 
        }}
      >
        AI Assistant
      </span>

      {isOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.8)', zIndex: 2000, display: 'flex',
          alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(5px)'
        }}>
          <div style={{
            width: '90%', maxWidth: '450px', background: '#121212', 
            border: '1px solid #9333ea44', borderRadius: '20px', padding: '25px',
            position: 'relative', boxShadow: '0 20px 50px rgba(0,0,0,1)',
            maxHeight: '80vh', overflowY: 'auto'
          }}>
            <button 
              onClick={() => {setIsOpen(false); setSelectedQa(null);}}
              style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '18px' }}
            >✕</button>
            
            <h3 style={{ color: '#9333ea', marginTop: 0 }}>🤖 Technical Assistant</h3>
            <p style={{ fontSize: '13px', color: '#888', marginBottom: '20px' }}>Ask me about the architecture, security, or W3C standards used in this project.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {QA_DATA.map((item, i) => (
                <div key={i}>
                  <button 
                    onClick={() => setSelectedQa(selectedQa === i ? null : i)}
                    style={{ 
                      width: '100%', textAlign: 'left', background: 'rgba(255,255,255,0.05)', 
                      border: selectedQa === i ? '1px solid #9333ea' : '1px solid transparent', 
                      color: '#eee', padding: '12px', borderRadius: '10px', 
                      cursor: 'pointer', transition: 'all 0.3s ease'
                    }}
                  >
                    {item.question}
                  </button>
                  {/* 3. We replaced {item.answer} with the TypewriterEffect */}
                  {selectedQa === i && (
                    <div style={{ 
                      padding: '15px 10px', fontSize: '14px', color: '#d8b4fe', 
                      lineHeight: '1.6', borderLeft: '2px solid #9333ea', marginLeft: '10px',
                      marginTop: '5px'
                    }}>
                      <TypewriterEffect text={item.answer} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}