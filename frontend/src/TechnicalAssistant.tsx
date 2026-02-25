import { useState, useEffect } from 'react';

// 1. We added project-specific questions and answers here
const QA_DATA = [
  { 
    question: "What exactly does this platform do?", 
    answer: "This platform is a decentralized verification graph. It bridges Web2 institutional identities (like Universities or Evaluators) with Web3 infrastructures. It allows authorized issuers to create tamper-proof 'Verifiable Credentials' (VCs) for students or beneficiaries." 
  },
  { 
    question: "How does the blockchain secure my data?", 
    answer: "We use the IOTA network and the Move programming language. When a credential is issued, a cryptographic hash of the content is stored on-chain. Move's resource-oriented architecture ensures that credentials behave like unique physical assets—they cannot be duplicated, forged, or altered." 
  },
  { 
    question: "Is my personal data (like my passport) visible on the blockchain?", 
    answer: "No. The system uses a privacy-preserving architecture. Your sensitive data is encrypted using AES-256 before being stored in our off-chain database. Only cryptographic hashes and Decentralized Identifiers (DIDs) are published on the IOTA ledger, ensuring full W3C compliance and GDPR privacy." 
  },
  { 
    question: "Who pays the blockchain transaction fees?", 
    answer: "Thanks to IOTA's underlying DAG (Directed Acyclic Graph) architecture, the network operates with highly optimized, near-zero fees compared to traditional blockchains like Ethereum. This makes high-volume academic or impact credentialing economically viable." 
  },
  { 
    question: "What happens if a credential needs to be revoked?", 
    answer: "The authorized issuer (e.g., the Professor) can call the 'revoke_recommendation' function on the Move smart contract. This updates the on-chain status to inactive. Anyone verifying the W3C credential later will instantly see that it has been revoked." 
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