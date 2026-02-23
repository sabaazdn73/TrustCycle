import { useState } from 'react';

const QA_DATA = [
  { question: "Sample Question 1?", answer: "Answer 1..." },
  { question: "Sample Question 2?", answer: "Answer 2..." },
];

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
            width: '90%', maxWidth: '400px', background: '#121212', 
            border: '1px solid #9333ea44', borderRadius: '20px', padding: '25px',
            position: 'relative', boxShadow: '0 20px 50px rgba(0,0,0,1)'
          }}>
            <button 
              onClick={() => {setIsOpen(false); setSelectedQa(null);}}
              style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '18px' }}
            >✕</button>
            
            <h3 style={{ color: '#9333ea', marginTop: 0 }}>🤖 Technical Assistant</h3>
            <p style={{ fontSize: '13px', color: '#888', marginBottom: '20px' }}>Frequently Asked Questions</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {QA_DATA.map((item, i) => (
                <div key={i}>
                  <button 
                    onClick={() => setSelectedQa(selectedQa === i ? null : i)}
                    style={{ width: '100%', textAlign: 'left', background: 'rgba(255,255,255,0.05)', border: 'none', color: '#eee', padding: '12px', borderRadius: '10px', cursor: 'pointer' }}
                  >
                    {item.question}
                  </button>
                  {selectedQa === i && (
                    <div style={{ padding: '10px', fontSize: '13px', color: '#aaa', lineHeight: '1.5' }}>
                      {item.answer}
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