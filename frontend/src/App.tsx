import { useState, useEffect} from 'react';
import BackgroundGlobe from './BackgroundGlobe';
import TechnicalAssistant from './TechnicalAssistant';
import Certificate from './Certificate'; 

const THEME = {
  bg: '#050505',
  card: '#121212cc',
  accent: '#9333ea',
  text: '#ffffff',
};

type Panel = 'professor' | 'student' | 'university' | 'verifier'| 'provider';

function useWindowSize() {
  const [size, setSize] = useState<[number, number]>([0, 0]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const updateSize = () => setSize([window.innerWidth, window.innerHeight]);
      updateSize();
      window.addEventListener('resize', updateSize);
      return () => window.removeEventListener('resize', updateSize);
    }
  }, []);

  return size;
}

export default function App() {
  const [panel, setPanel] = useState<Panel>('professor');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [issuedRef, setIssuedRef] = useState<string>('');
  const [identity, setIdentity] = useState<{ fullName: string, title?: string, photo?: string, org?: string, verifiedAcademic?: boolean } | null>(null);
  const [canProceed, setCanProceed] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [passport, setPassport] = useState('');
  const [content, setContent] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [searchRes, setSearchRes] = useState<any[]>([]);
  const [selectedRec, setSelectedRec] = useState<any>(null);
  const [emailInput, setEmailInput] = useState('');
  const [fullNameInput, setFullNameInput] = useState('');
  const [issuerUniversity, setIssuerUniversity] = useState(''); 
  const [otpInput, setOtpInput] = useState('');
  const [adminKey, setAdminKey] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [studentRefInput, setStudentRefInput] = useState('');
  const [uniRefInput, setUniRefInput] = useState('');
  const [verifyLogs, setVerifyLogs] = useState<string[]>([]);
  const [verifiedVC, setVerifiedVC] = useState<any>(null);
  const [verifyStatus, setVerifyStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [width] = useWindowSize();
  const isMobile = width < 768; 

  const centeredLayout: React.CSSProperties = {
    minHeight: '100vh', width: '100vw',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', color: THEME.text, fontFamily: 'system-ui, sans-serif',
    position: 'relative', overflowX: 'hidden', background: THEME.bg,
    padding: isMobile ? '10px' : '0'
  };

  const cardStyle: React.CSSProperties = {
    background: THEME.card, 
    padding: isMobile ? '20px' : '40px', 
    borderRadius: '24px',
    border: `1px solid ${THEME.accent}44`, 
    width: isMobile ? '95%' : '520px', 
    textAlign: 'center',
    boxShadow: `0 0 50px ${THEME.accent}22`, zIndex: 10, backdropFilter: 'blur(12px)',
    position: 'relative', 
    marginRight: isMobile ? '0' : '35%',
    maxWidth: '100%' 
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px', marginBottom: '12px', borderRadius: '10px',
    border: '1px solid #333', background: '#000', color: '#fff', fontSize: '14px', boxSizing: 'border-box', outline: 'none'
  };

  const buttonStyle = (bg = THEME.accent): React.CSSProperties => ({
    width: '100%', padding: '12px', background: loading ? '#444' : bg, color: '#fff', border: 'none',
    borderRadius: '10px', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 'bold', marginTop: '10px',
    transition: '0.2s opacity'
  });

  const handleAdminWhitelist = async (action: 'add' | 'delete') => {
    setLoading(true);
    try {
      const res = await fetch('https://trustcycle.onrender.com/api/admin/whitelist', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput, adminKey, action })
      });
      const data = await res.json();
      setStatusMsg(res.ok ? `Successfully ${action}ed ${emailInput}` : `Error: ${data.error}`);
    } catch (e) {
      setStatusMsg('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleProfessorAuth = async () => {
    if (!emailInput || !fullNameInput) {
      alert("Please enter both Name and Email");
      return;
    }
    setLoading(true);
    setStatusMsg('Verifying identity — this may take a few seconds...');
    try {
      const res = await fetch('https://trustcycle.onrender.com/api/auth/verify-email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput, fullName: fullNameInput })
      });
      if (res.ok) {
        const data = await res.json();
        setIdentity(data.identity);
        setHistory(data.history || []);
        setCanProceed(data.canProceed); 
        setStep(2); 
      } else {
        const err = await res.json();
        alert(err.error || 'Identity not found or unauthorized.');
      }
    } catch (e) {
      alert('Network error during verification.');
    } finally {
      setLoading(false);
      setStatusMsg('');
    }
  };

  const sendOtp = async () => {
    setLoading(true);
    try {
      const res = await fetch('https://trustcycle.onrender.com/api/auth/send-otp', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput })
      });
      
      if (res.ok) {
        setStatusMsg('OTP sent successfully to your email.');
      } else {
        const data = await res.json();
        setStatusMsg('Backend Error: ' + (data.error || 'Failed to send OTP.'));
      }
    } catch (e) {
      setStatusMsg('Network Error: Could not reach backend.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    setLoading(true);
    try {
      const res = await fetch('https://trustcycle.onrender.com/api/auth/verify-otp', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput, otp: otpInput })
      });
      if (res.ok) {
        setStep(3);
      } else {
        const e = await res.json();
        alert(e.error || 'Invalid OTP');
      }
    } catch (e) {
      alert('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleIssue = async () => {
    if (!studentName || !passport) {
      alert("Please fill student name and passport.");
      return;
    }
    if (!content && !pdfFile) {
      alert("Please provide recommendation text OR upload a PDF.");
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('studentName', studentName);
      formData.append('passport', passport);
      formData.append('issuerEmail', emailInput);
      formData.append('issuerName', identity?.fullName || fullNameInput);
      formData.append('issuerUniversity', issuerUniversity); 
      formData.append('authId', "0x823e7925487a829195d2693a8be96c9dacfb505220a503ac176cf06deef55ad7");

      if (pdfFile) {
        formData.append('file', pdfFile);
      } else {
        formData.append('content', content);
      }

      const res = await fetch('https://trustcycle.onrender.com/api/issue', {
        method: 'POST',
        body: formData 
      });
      
      const data = await res.json();
      if (res.ok) {
        setIssuedRef(data.recId);
        setStep(6);
      } else {
        alert(data.error || 'Issue failed');
      }
    } catch (e: any) {
      alert('Network/Backend error during issuance: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (recId: string) => {
    if(!confirm("Are you sure you want to revoke this recommendation? This action is irreversible on-chain.")) return;
    
    setLoading(true);
    try {
        const res = await fetch('https://trustcycle.onrender.com/api/revoke', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ recId, email: emailInput })
        });

        if (res.ok) {
             const newHistory = history.map(h => h.id === recId ? {...h, status: 'Revoked'} : h);
             setHistory(newHistory);
        } else {
            alert('Revoke failed');
        }
    } catch (e) {
        alert('Network error');
    } finally {
        setLoading(false);
    }
  };

  const handleStudentSearch = async () => {
    setLoading(true);
    try {
      const res = await fetch('https://trustcycle.onrender.com/api/student/search', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentName, passport })
      });
      const data = await res.json();
      setSearchRes(data);
      setStep(3); 
    } catch (e) {
      alert('Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyId = async (id: string) => {
    if(!id) return;
    setLoading(true);
    try {
      const res = await fetch(`https://trustcycle.onrender.com/api/verify/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedRec(data);
      } else {
        alert('Reference not found');
      }
    } catch (e) {
      alert('Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/cert/')) {
      const id = path.split('/')[2];
      if (id) handleVerifyId(id);
    }
  }, []);

  const handleDownloadJSON = async (recId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`https://trustcycle.onrender.com/api/vc/${recId}`);
      if (!response.ok) throw new Error("Verifiable Credential not found");
      const vcData = await response.json();

      const fileName = `TrustCycle-Credential-${recId.substring(0, 8)}.json`;
      const blob = new Blob([JSON.stringify(vcData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      alert("Error downloading JSON: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyUploadedVC = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const { IotaClient, getFullnodeUrl } = await import('@iota/iota-sdk/client');
    const { verifyPersonalMessageSignature } = await import('@iota/iota-sdk/verify');
    const file = e.target.files?.[0];
    if (!file) return;

    setVerifyStatus('loading');
    setVerifiedVC(null);
    setVerifyLogs(["🔍 Reading VC file..."]);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const jsonText = event.target?.result as string;
        const fileData = JSON.parse(jsonText);
        const { onChainObjectId, credential } = fileData;
        
        setVerifyLogs(prev => [...prev, "✅ File parsed. Checking Ed25519 signature..."]);

        const signature = credential.proof.proofValue;
        const issuerAddress = credential.issuer.replace('did:iota:', '');

        const vcPayloadForVerification = {
            "@context": credential["@context"],
            "type": credential.type,
            "issuer": credential.issuer,
            "issuanceDate": credential.issuanceDate,
            "credentialSubject": credential.credentialSubject
        };

        const payloadString = JSON.stringify(vcPayloadForVerification);
        const messageBytes = new TextEncoder().encode(payloadString);
        
        const publicKey = await verifyPersonalMessageSignature(messageBytes, signature);
        const recoveredAddress = publicKey.toIotaAddress();

        if (recoveredAddress !== issuerAddress) {
            throw new Error("Signature is invalid or file was tampered with!");
        }
        setVerifyLogs(prev => [...prev, "✅ Step 1: Signature is VALID. Content is authentic."]);

        setVerifyLogs(prev => [...prev, "🌐 Connecting to IOTA Rebased Testnet..."]);
        const client = new IotaClient({ url: getFullnodeUrl('testnet') });
        
        const onChainObj = await client.getObject({
            id: onChainObjectId,
            options: { showContent: true }
        });

        if (onChainObj.data && (onChainObj.data.content as any).fields.active) {
            setVerifyLogs(prev => [...prev, "✅ Step 2: Credential is ACTIVE on-chain.", "🎉 SUCCESS! VC is 100% Valid."]);
            setVerifiedVC(fileData);
            setVerifyStatus('success');
        } else {
            throw new Error("This credential has been REVOKED by the issuer on-chain.");
        }

      } catch (err: any) {
        setVerifyLogs(prev => [...prev, `❌ ERROR: ${err.message}`]);
        setVerifyStatus('error');
      }
    };
    reader.readAsText(file);
  };

  const resetFlow = (nextPanel: Panel) => {
    setPanel(nextPanel);
    setStep(1);
    setIdentity(null);
    setIssuedRef('');
    setStudentName('');
    setPassport('');
    setContent('');
    setPdfFile(null);
    setIssuerUniversity(''); 
    setHistory([]);
    setSearchRes([]);
    setSelectedRec(null);
    setStatusMsg('');
    setCanProceed(false);
    setStudentRefInput('');
    setUniRefInput('');
  };

  const IdentityCard = () => {
    if (!identity) return null;
    return (
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12, background: 'rgba(255,255,255,0.05)', padding: 10, borderRadius: 12 }}>
        <img 
          src={(identity.photo || '/logo-galaxy.png')} 
          alt="photo" 
          style={{ 
            width: 50, 
            height: 50, 
            borderRadius: '50%', 
            objectFit: 'cover', 
            border: `2px solid ${canProceed ? '#4ade80' : '#666'}` 
          }} 
        />
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
            {identity.fullName}
            {canProceed && <span style={{ color: '#4ade80', fontSize: '0.9rem' }}>✔</span>} 
          </div>
          <div style={{ fontSize: '0.85rem', color: '#bbb' }}>{identity.title || 'Academic'}</div>
          <div style={{ fontSize: '0.75rem', marginTop: 2, color: canProceed ? '#4ade80' : '#f59e0b' }}>
            {canProceed ? 'Verified Identity' : 'Public Identity (Restricted Access)'}
          </div>
        </div>
      </div>
    );
  };


  const downloadPdfFromBase64 = (base64String: string, fileName: string) => {
  try {
    const base64Data = base64String.split('base64,')[1];
    const link = document.createElement("a");
    link.href = `data:application/pdf;base64,${base64Data}`;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    alert("Error processing PDF file.");
  }
};

  return (
    
    <div style={centeredLayout}>

      {window.location.pathname.startsWith('/cert/') ? (
        <div style={{ width: '90%', maxWidth:'800px', zIndex: 10}}>
          {selectedRec ? <Certificate data={selectedRec} /> : <h2>Loading Certificate ... </h2>}
        </div>
      ) : (
        <>
      <BackgroundGlobe isMobile={isMobile} accentColor={THEME.accent} />
      <div style={{ 
        position: 'absolute', 
        top: isMobile ? 10 : 20,    
        left: isMobile ? 10 : 20,   
        zIndex: 20 
      }}>
        <img 
          src="/masterz_iota.png" 
          alt="masterz iota" 
          style={{ 
            height: isMobile ? 40 : 120, 
            opacity: 0.9 
          }} 
        />
      </div>

      <div style={{ 
        textAlign: 'center', 
        marginBottom: '20px', 
        zIndex: 10, 
        marginRight: isMobile ? '0' : '35%' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <img src="/logo-galaxy.png" 
          alt="logo" 
          style={{ 
            width: isMobile ? 40 : 80, 
            height: isMobile ? 70 : 110 
            }}/>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: 0, letterSpacing: '-1.5px' }}>
            Trust<span style={{ color: THEME.accent }}>Cycle</span>
          </h1>
        </div>
        <p style={{ fontSize: '0.95rem', color: '#aaa', marginTop: '4px', fontWeight: 300 }}>
          Decentralized Recommendation System <br />
          <span style={{ fontSize: '0.75rem', opacity: 0.6, letterSpacing: 1 }}>An On-Chain Solution for Academia Based on the IOTA Trust Framework v0.1</span>
        </p>
      </div>


      <div style={{ 
        display: 'flex', 
        gap: '10px', 
        marginBottom: '25px', 
        zIndex: 10, 
        marginRight: isMobile ? '0' : '35%',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        {(['professor', 'student', 'university', 'verifier', 'provider'] as Panel[]).map(p => (
          <button 
            key={p} 
            onClick={() => resetFlow(p)} 
            style={{ 
                background: panel === p ? THEME.accent : 'rgba(255,255,255,0.03)', 
                color: panel === p ? '#fff' : '#888',
                border: `1px solid ${panel === p ? THEME.accent : '#333'}`, 
                padding: '0 16px', 
                height: '36px',
                display: 'inline-flex',
                borderRadius: '100px', 
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 600,
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.3s ease'
            }}
          >
            {p.toUpperCase()}
          </button>
        ))}

        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '8px', 
          marginLeft: isMobile ? '0' : 'auto',
          alignItems: isMobile ? 'center' : 'flex-end',
          marginTop: isMobile ? '12px' : '0'
        }}>
          
          <a 
            href="/final-report.html" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{
              background: 'rgba(147, 51, 234, 0.08)', 
              border: `1px solid rgba(147, 51, 234, 0.5)`, 
              color: '#d8b4fe',
              padding: '0 12px',
              height: '30px',
              boxSizing: 'border-box',
              borderRadius: '100px', 
              textDecoration: 'none',
              fontSize: '0.75rem',    
              fontWeight: 500, 
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '135px', 
              gap: '6px',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
            }}
          >
            <svg width="12" height="12" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.381z" clipRule="evenodd" />
            </svg>
            FINAL REPORT
          </a>

          <a 
            href="/TrustCycle_Litepaper.pdf" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{
              background: 'rgba(147, 51, 234, 0.08)', 
              border: `1px solid rgba(147, 51, 234, 0.5)`, 
              color: '#d8b4fe',
              padding: '0 12px',
              height: '30px',
              boxSizing: 'border-box',
              borderRadius: '100px', 
              textDecoration: 'none',
              fontSize: '0.75rem',    
              fontWeight: 500, 
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '135px', 
              gap: '6px',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
            }}
          >
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            LITEPAPER
          </a>

        </div>
      </div>
      
      <div style={cardStyle}>
        {panel === 'provider' && (
          <>
            <h2 style={{ color: THEME.accent, marginTop: 0 }}>Provider Admin</h2>
            <input style={inputStyle} type="password" placeholder="Admin Access Key" value={adminKey} onChange={e => setAdminKey(e.target.value)} />
            <input style={inputStyle} placeholder="Professor Email" value={emailInput} onChange={e => setEmailInput(e.target.value)} />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button disabled={loading} style={buttonStyle()} onClick={() => handleAdminWhitelist('add')}>Add to Whitelist</button>
              <button disabled={loading} style={buttonStyle('#ef4444')} onClick={() => handleAdminWhitelist('delete')}>Remove</button>
            </div>
            {statusMsg && <p style={{ color: THEME.accent, marginTop: '10px', fontSize: 14 }}>{statusMsg}</p>}
          </>
        )}
        
        {panel === 'professor' && (
          <>
            <h2 style={{ color: THEME.accent, marginTop: 0 }}>Professor Portal</h2>

            {step === 1 && (
              <>
                <p style={{fontSize: 14, color: '#888', marginBottom: 20}}>Connect your Web2 academic identity to Web3.</p>
                <input style={inputStyle} placeholder="Full Name" value={fullNameInput} onChange={e => setFullNameInput(e.target.value)} />
                <input style={inputStyle} placeholder="Institutional Email" value={emailInput} onChange={e => setEmailInput(e.target.value)} />
                <button disabled={loading} style={buttonStyle()} onClick={handleProfessorAuth}>{loading ? "Checking..." : "Verify Identity"}</button>
                <p style={{ color: '#555', marginTop: 12, fontSize: 11 }}>Academic identity is verified via Google Knowledge Graph & institutional records.</p>
              </>
            )}

            {step === 2 && (
              <>
                <IdentityCard />
                <p style={{ marginBottom: '15px', fontSize: '0.95rem', color: '#ccc' }}>
                  Welcome back, <strong style={{ color: '#fff' }}>{identity?.fullName || fullNameInput}</strong>.
                </p>
                
                <div style={{ display: 'flex', gap: 8 }}>
                    <input style={{...inputStyle, marginBottom: 0}} placeholder="Enter OTP Code" value={otpInput} onChange={e => setOtpInput(e.target.value)} />
                    <button 
                        style={{ ...buttonStyle(), width: 'auto', minWidth: 100, marginTop: 0 }} 
                        onClick={sendOtp} 
                        disabled={!canProceed || loading}
                    >
                        {loading ? '...' : 'Get OTP'}
                    </button>
                </div>

                <button disabled={loading || !otpInput} style={buttonStyle()} onClick={handleVerifyOTP}>Login</button>
                
                {!canProceed && (
                  <p style={{ fontSize: 12, color: '#f59e0b', marginTop: 12, background: 'rgba(245, 158, 11, 0.1)', padding: 8, borderRadius: 6 }}>
                    ⚠️ Your identity is visible, but issuance is currently restricted to verified academics.
                  </p>
                )}
                
                <button style={{ marginTop: 12, background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 12 }} onClick={() => setStep(1)}>Different User?</button>
              </>
            )}

            {step === 3 && (
              <>
                <div style={{ textAlign: 'left' }}>
                  <h3 style={{ margin: 0, fontSize: '1.4rem' }}>Hello, Prof. <span style={{ color: THEME.accent }}>{identity?.fullName?.split(' ')[0] || fullNameInput.split(' ')[0]}</span> 👋</h3>
                  <p style={{ color: '#888', marginTop: 4, fontSize: 13 }}>You are authorized to issue immutable recommendations.</p>
                </div>
                <div style={{ marginTop: 24, display: 'grid', gap: 12 }}>
                  <button style={buttonStyle()} onClick={() => setStep(4)}>➕ Issue Recommendation</button>
                  <button style={{ ...buttonStyle('#222'), marginTop: 0 }} onClick={() => setStep(5)}>📋 View History</button>
                </div>
              </>
            )}

            {step === 4 && (
              <div style={{ textAlign: 'left' }}>
                <button onClick={() => setStep(3)} style={{ color: THEME.accent, background: 'none', border: 'none', cursor: 'pointer', marginBottom: '15px', padding: 0 }}>← Back</button>
                
                <p style={{ fontSize: '13px', color: '#aaa', marginBottom: '8px' }}>Issuer Information:</p>
                <input style={inputStyle} placeholder="Your University Name (e.g., Católica Lisbon)" value={issuerUniversity} onChange={e => setIssuerUniversity(e.target.value)} />
                
                <hr style={{ borderColor: '#333', margin: '15px 0' }} />
                
                <p style={{ fontSize: '13px', color: '#aaa', marginBottom: '8px' }}>Student Information:</p>
                <input style={inputStyle} placeholder="Student Full Name" value={studentName} onChange={e => setStudentName(e.target.value)} />
                <input style={inputStyle} placeholder="Student Passport / ID Number" value={passport} onChange={e => setPassport(e.target.value)} />
                
                <hr style={{ borderColor: '#333', margin: '15px 0' }} />
                <p style={{ fontSize: '13px', color: '#aaa', marginBottom: '10px' }}>Write recommendation <b>OR</b> upload PDF:</p>

                <textarea 
                  style={{ 
                    ...inputStyle, 
                    height: 100, 
                    fontFamily: 'sans-serif',
                    opacity: pdfFile ? 0.5 : 1 
                  }} 
                  placeholder="Recommendation content..." 
                  value={content} 
                  onChange={e => setContent(e.target.value)} 
                  disabled={!!pdfFile} 
                />

                <input 
                  type="file" 
                  accept=".pdf"
                  style={{ 
                    ...inputStyle, 
                    background: 'rgba(255,255,255,0.05)',
                    opacity: content ? 0.5 : 1 
                  }}
                  onChange={e => setPdfFile(e.target.files?.[0] || null)}
                  disabled={content.length > 0} 
                />

                <button 
                  disabled={loading || (!content && !pdfFile)} 
                  style={buttonStyle()} 
                  onClick={handleIssue}
                >
                  {loading ? "Anchoring to IOTA..." : "Sign & Issue"}
                </button>
              </div>
            )}

            {step === 5 && (
              <div style={{ textAlign: 'left' }}>
                <button onClick={() => setStep(3)} style={{ color: THEME.accent, background: 'none', border: 'none', cursor: 'pointer', marginBottom: '15px', padding: 0 }}>← Back</button>
                <div style={{ maxHeight: 300, overflowY: 'auto', paddingRight: 4 }}>
                    {history.length === 0 && <p style={{ color: '#888', textAlign: 'center' }}>No recommendations issued yet.</p>}
                    {history.map((rec: any, idx) => (
                    <div key={idx} style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: 10, marginBottom: 10, border: '1px solid #333' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 14 }}>{rec.studentName}</div>
                            <div style={{ fontSize: 11, color: '#666' }}>{new Date(rec.timestamp).toLocaleDateString()}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 12, color: rec.status === 'Verified' ? '#4ade80' : '#ef4444', marginBottom: 4 }}>{rec.status}</div>
                            {rec.status === 'Verified' && (
                                <button onClick={() => handleRevoke(rec.id)} style={{ padding: '4px 8px', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', borderRadius: 4, border: 'none', cursor: 'pointer', fontSize: 10 }}>Revoke</button>
                            )}
                        </div>
                        </div>
                    </div>
                    ))}
                </div>
              </div>
            )}

            {step === 6 && (
              <>
                <div style={{width: 60, height: 60, background: '#4ade80', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px'}}>
                    <span style={{fontSize: 30, color: '#000'}}>✔</span>
                </div>
                <h3 style={{ margin: 0 }}>Successfully Issued</h3>
                <p style={{ fontSize: 14, color: '#aaa' }}>The recommendation is now on-chain.</p>
                <div style={{ background: '#000', padding: 16, borderRadius: 12, marginTop: 16, border: '1px dashed #444' }}>
                    <p style={{fontSize: 11, color: '#666', margin: '0 0 6px'}}>REFERENCE ID</p>
                    <code style={{ color: THEME.accent, fontSize: 13, wordBreak: 'break-all' }}>{issuedRef}</code>
                </div>
                
                <button 
                  style={{ ...buttonStyle('#c084fc'), marginTop: 15 }} 
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/cert/${issuedRef}`);
                    alert("🔗 Shareable Link Copied!");
                  }}
                >
                  🔗 Copy Shareable Link
                </button>

                <button style={{ ...buttonStyle('#222'), marginTop: 24 }} onClick={() => setStep(3)}>Return to Dashboard</button>
              </>
            )}
          </>
        )}

        {panel === 'student' && (
          <>
            <h2 style={{ color: THEME.accent, marginTop: 0 }}>Student Vault</h2>
            
            {step === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button style={buttonStyle()} onClick={() => setStep(2)}>🔍 Find My Records</button>
                <button style={buttonStyle('#222')} onClick={() => setStep(4)}>🔗 Verify Reference Code</button>
              </div>
            )}

            {step === 2 && (
              <>
                <button onClick={() => setStep(1)} style={{ color: THEME.accent, background: 'none', border: 'none', cursor: 'pointer', marginBottom: '15px', float: 'left' }}>← Back</button>
                <div style={{clear: 'both'}}></div>
                <input style={inputStyle} placeholder="Your Full Name" value={studentName} onChange={e => setStudentName(e.target.value)} />
                <input style={inputStyle} placeholder="Your Passport Number" value={passport} onChange={e => setPassport(e.target.value)} />
                <button disabled={loading} style={buttonStyle()} onClick={handleStudentSearch}>Search Blockchain</button>
              </>
            )}

            {step === 3 && (
              <div style={{ textAlign: 'left' }}>
                <button onClick={() => setStep(2)} style={{ color: THEME.accent, background: 'none', border: 'none', cursor: 'pointer', marginBottom: '10px', padding: 0 }}>← Back</button>
                {searchRes.length === 0 && <p style={{ color: '#888', textAlign: 'center', marginTop: 20 }}>No records found.</p>}
                {searchRes.map((r: any, idx) => (
                  <div key={idx} style={{ background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 10, marginBottom: 10, border: '1px solid #333' }}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                        <span style={{fontSize: 11, color: THEME.accent, fontFamily: 'monospace'}}>
                          ID: {r.id.slice(0, 6)}...{r.id.slice(-4)}
                        </span>
                        <span>{r.status === 'Verified' ? '✅' : '❌'}</span>
                    </div>
                    <div style={{marginTop: 8, fontSize: 13, color: '#ccc'}}>
                      {r.content.startsWith('file:') ? "📄 PDF Document" : r.content.substring(0, 50) + "..."}
                    </div>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '12px', flexWrap: 'wrap' }}>
                      <button style={{ background: 'none', border: 'none', color: THEME.accent, fontSize: 12, cursor: 'pointer', fontWeight: 'bold' }} onClick={() => handleVerifyId(r.id)}>View Details</button>
                      <button style={{ background: 'none', border: 'none', color: '#4ade80', fontSize: 12, cursor: 'pointer', fontWeight: 'bold' }} onClick={() => handleDownloadJSON(r.id)}>Download VC</button>
                      {/* دکمه کپی لینک مستقیم برای دانشجو */}
                      <button style={{ background: 'none', border: 'none', color: '#c084fc', fontSize: 12, cursor: 'pointer', fontWeight: 'bold' }} onClick={() => {navigator.clipboard.writeText(`${window.location.origin}/cert/${r.id}`); alert('🔗 Shareable Link Copied!');}}>Copy Link</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {step === 4 && (
              <>
                <button onClick={() => setStep(1)} style={{ color: THEME.accent, background: 'none', border: 'none', cursor: 'pointer', marginBottom: '15px', float: 'left' }}>← Back</button>
                <div style={{clear: 'both'}}></div>
                <input style={inputStyle} placeholder="Paste Reference Code" value={studentRefInput} onChange={(e) => setStudentRefInput(e.target.value)} />
                <button style={buttonStyle()} onClick={() => handleVerifyId(studentRefInput)}>Fetch Data</button>
              </>
            )}

          
            {selectedRec && (
              <div style={{ marginTop: '20px', width: '100%', textAlign: 'center' }}>
                <Certificate data={selectedRec} />
                
                <div style={{ borderTop: '1px solid #222', paddingTop: 12, marginTop: 15 }}>
                    <p style={{fontSize: 10, color: '#666', margin: '0 0 4px 0'}}>REFERENCE ID</p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 10 }}>
                      <code style={{fontSize: 12, color: THEME.accent}}>
                        {selectedRec.id.slice(0, 8)}...{selectedRec.id.slice(-6)}
                      </code>
                      <button 
                        onClick={() => {navigator.clipboard.writeText(`${window.location.origin}/cert/${selectedRec.id}`); alert('🔗 Direct Link Copied!');}}
                        style={{ background: '#222', border: 'none', color: '#888', fontSize: 9, borderRadius: 4, padding: '2px 6px', cursor: 'pointer' }}
                      >Copy Link</button>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                      <button style={{...buttonStyle(), width: 'auto', padding: '10px 15px'}} onClick={() => handleDownloadJSON(selectedRec.id)}>⬇️ Download VC (JSON)</button>
                      
                      {selectedRec.content.startsWith('file:') && selectedRec.status === 'Verified' && (
                        <button 
                          style={{...buttonStyle('#22c55e'), width: 'auto', padding: '10px 15px'}} 
                          onClick={() => downloadPdfFromBase64(selectedRec.content, `Recommendation_${selectedRec.studentName}.pdf`)}
                        >
                          📥 Download PDF
                        </button>
                      )}
                    </div>
                </div>
              </div>
            )}
          </>
        )}

        {panel === 'university' && (
          <>
            <h2 style={{ color: THEME.accent, marginTop: 0 }}>University Check</h2>
            <p style={{fontSize: 13, color: '#888', marginBottom: 20}}>Verify applicant authenticity via IOTA.</p>
            <input style={inputStyle} placeholder="Enter Hash Code" value={uniRefInput} onChange={(e) => setUniRefInput(e.target.value)} />
            <button disabled={loading} style={buttonStyle()} onClick={() => handleVerifyId(uniRefInput)}>Verify Authenticity</button>
            
           
            {selectedRec && (
              <div style={{ marginTop: '24px', width: '100%', textAlign: 'center' }}>
                <Certificate data={selectedRec} />
                <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
                    <button style={{...buttonStyle(), width: 'auto', padding: '10px 15px'}} onClick={() => handleDownloadJSON(selectedRec.id)}>⬇️ Download Official VC</button>
                    {selectedRec.content.startsWith('file:') && selectedRec.status === 'Verified' && (
                        <button 
                            style={{...buttonStyle('#22c55e'), width: 'auto', padding: '10px 15px'}} 
                            onClick={() => downloadPdfFromBase64(selectedRec.content, `Recommendation_${selectedRec.studentName}.pdf`)}
                        >
                            📥 Download Official PDF
                        </button>
                    )}
                </div>
              </div>
            )}
          </>
        )}

        {panel === 'verifier' && (
          <>
            <h2 style={{ color: THEME.accent, marginTop: 0 }}>🛡️ Standalone Verifier</h2>
            <div style={{ border: `2px dashed ${THEME.accent}44`, borderRadius: 16, padding: 30, background: 'rgba(147,51,234,0.03)', position: 'relative' }}>
              <input type="file" accept=".json" onChange={handleVerifyUploadedVC} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
              <div style={{ fontSize: 40, marginBottom: 10 }}>🔮</div>
              <p style={{ fontWeight: 'bold', color: '#e9d5ff', margin: 0 }}>Drop VC JSON Here</p>
            </div>
            
            {verifyLogs.length > 0 && (
              <div style={{ marginTop: 20, background: '#080808', padding: 12, borderRadius: 10, textAlign: 'left', fontFamily: 'monospace', fontSize: 11, color: '#d8b4fe', maxHeight: 120, overflowY: 'auto' }}>
                {verifyLogs.map((log, i) => <div key={i} style={{ marginBottom: 4 }}>{log}</div>)}
              </div>
            )}

            {verifyStatus === 'success' && verifiedVC && (
              <div style={{ marginTop: 20, padding: 15, background: 'rgba(74, 222, 128, 0.1)', borderRadius: 10, border: '1px solid #4ade8044', textAlign: 'left' }}>
                <h4 style={{ color: '#4ade80', margin: '0 0 10px 0' }}>✨ Verified Successfully</h4>
                <p style={{ fontSize: 12, margin: 0 }}><b>Student:</b> {verifiedVC.credential.credentialSubject.studentName}</p>
            
            {verifiedVC.credential.credentialSubject.recommendationText.startsWith('file:') && (
              <button 
                style={{ ...buttonStyle('#c084fc'), marginTop: 15 }} 
                onClick={() => downloadPdfFromBase64(
                  verifiedVC.credential.credentialSubject.recommendationText, 
                  `Verified_Doc_${verifiedVC.credential.credentialSubject.studentName}.pdf`
                )}
              >
                ⬇️ Download Decrypted PDF
              </button>
            )}
         </div>
        )}
      </>
     )}
     </div>

      <div style={{ 
          position: isMobile ? 'relative' : 'absolute', bottom: isMobile ? 'auto' : 20, right: isMobile ? 'auto' : 30,
          marginTop: isMobile ? '40px' : 0, paddingBottom: isMobile ? '20px' : 0, zIndex: 30, textAlign: isMobile ? 'center' : 'right'
      }}>
        <p style={{ fontSize: '11px', color: '#817d7de9', margin: 0, fontFamily: 'monospace' }}>
          Crafted by <a href="https://www.linkedin.com/in/saba-azadegan-2974b622a" target="_blank" style={{ fontWeight: 'bold', color: '#8c8a8ac7', textDecoration: 'none', borderBottom: '1px dotted #7e7d7d' }}>Saba Azadegan</a>
         {' '}for{' '}
          <a href="https://blog.iota.org/masterz-hackathon" target="_blank" style={{ fontWeight: 'bold', color: '#8c8a8ac7', textDecoration: 'none', borderBottom: '1px dotted #7e7d7d' }}>MasterZ*IOTA</a>
          {' '}Hackathon 2026.
        </p>
        
        <p style={{ fontSize: '11px', color: '#817d7de9', margin: '6px 0 0', fontFamily: 'monospace', textAlign: 'center'}}>
          <a href="https://drive.google.com/drive/folders/1rtBrhNahC8Na8NPhuNywd6xPCAXNeStK?usp=sharing" target="_blank" style={{ fontWeight: 'bold', color: '#8c8a8ac7', textDecoration: 'none', borderBottom: '1px dotted #7e7d7d' }}>Docs</a>
          {' . '}
          <a href="https://github.com/sabaazdn73/TrustCycle-DRS" target="_blank" style={{ fontWeight: 'bold', color: '#8c8a8ac7', textDecoration: 'none', borderBottom: '1px dotted #7e7d7d' }}>GitHub</a>
          {' .'}
          <TechnicalAssistant />
        </p>

        <p style={{ fontSize: '11px', color: '#817d7de9', margin: '6px 0 0', fontFamily: 'monospace', textAlign: 'center'}}>
          <a href="https://youtu.be/OXa0zkTi3Vs" target="_blank" style={{ fontWeight: 'bold', color: '#8c8a8ac7', textDecoration: 'none', borderBottom: '1px dotted #7e7d7d' }}> Demo Walkthrough </a>
          </p>

      </div>
      </>
      )}
    </div>
  );
}