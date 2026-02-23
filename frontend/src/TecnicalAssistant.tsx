import React, { useState } from 'react';

const THEME = {
  accent: '#9333ea',
  card: '#121212cc',
};

const QA_DATA = [
  {
    question: "What is a Verifiable Credential (VC)?",
    answer: "A VC is a digital, tamper-proof version of a physical document. In TrustCycle, it represents your academic recommendation, signed cryptographically by a professor."
  },
  {
    question: "How does IOTA ensure trust?",
    answer: "TrustCycle anchors the 'Hash' of your recommendation on the IOTA Tangle. This makes the record immutable and globally verifiable without central authorities."
  },
  {
    question: "Is my personal data public on the blockchain?",
    answer: "No! We only store the cryptographic hash and metadata. Your actual PDF or text stays private until you choose to share the JSON file with a verifier."
  }
];

export default function TechnicalAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedQa, setSelectedQa] = useState<number | null>(null);

  return (
    <div style={{
      position: 'fixed',
      bottom: '30px',
      right: '30px',
      zIndex: 100,
      fontFamily: 'system-ui, sans-serif'
    }}>

      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '60px', height: '60px', borderRadius: '50%',
          background: THEME.accent, border: 'none', cursor: 'pointer',
          fontSize: '24px', boxShadow: `0 0 20px ${THEME.accent}66`
        }}
      >
        {isOpen ? '✕' : '🤖'}
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute', bottom: '80px', right: 0,
          width: '320px', background: THEME.card, backdropFilter: 'blur(15px)',
          borderRadius: '20px', border: `1px solid ${THEME.accent}44`,
          padding: '20px', color: '#fff', boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
        }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', color: THEME.accent }}>Technical Assistant</h3>
          <p style={{ fontSize: '12px', color: '#aaa', marginBottom: '15px' }}>
            Ask me about the technical architecture of TrustCycle.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {QA_DATA.map((item, index) => (
              <div key={index}>
                <button
                  onClick={() => setSelectedQa(selectedQa === index ? null : index)}
                  style={{
                    width: '100%', textAlign: 'left', padding: '10px',
                    background: 'rgba(255,255,255,0.05)', border: '1px solid #333',
                    borderRadius: '8px', color: '#ddd', fontSize: '13px', cursor: 'pointer'
                  }}
                >
                  {item.question}
                </button>
                {selectedQa === index && (
                  <div style={{
                    padding: '10px', fontSize: '13px', color: '#bbb',
                    lineHeight: '1.4', borderLeft: `2px solid ${THEME.accent}`,
                    marginTop: '5px', background: 'rgba(0,0,0,0.2)'
                  }}>
                    {item.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}