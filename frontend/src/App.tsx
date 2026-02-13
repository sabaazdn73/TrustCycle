import { useState, useMemo, useEffect, useRef } from 'react';
import Globe, { type GlobeMethods } from 'react-globe.gl';

const THEME = {
  bg: '#050505',
  card: '#121212cc',
  accent: '#9333ea',
  text: '#ffffff',
};

type Panel = 'professor' | 'student' | 'university' | 'provider';

// --- Custom Hook for Responsive Design ---
function useWindowSize() {
  const [size, setSize] = useState([window.innerWidth, window.innerHeight]);
  useEffect(() => {
    const handleResize = () => setSize([window.innerWidth, window.innerHeight]);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return size;
}

const BackgroundGlobe = () => {
  const globeEl = useRef<GlobeMethods | undefined>(undefined);
  // --- Use hook to adjust globe position on mobile ---
  const [width] = useWindowSize();
  const isMobile = width < 768;

  const arcsData = useMemo(() => [...Array(25).keys()].map(() => ({
    startLat: (Math.random() - 0.5) * 180,
    startLng: (Math.random() - 0.5) * 360,
    endLat: (Math.random() - 0.5) * 180,
    endLng: (Math.random() - 0.5) * 360,
    color: ['#ffffff', '#9333ea', '#6366f1'][Math.floor(Math.random() * 3)],
  })), []);

  useEffect(() => {
    if (globeEl.current) {
      globeEl.current.pointOfView({ lat: 25, lng: 40, altitude: 1.7 });
      globeEl.current.controls().autoRotate = true;
      globeEl.current.controls().autoRotateSpeed = 0.5;
      globeEl.current.controls().enableZoom = false;
    }
  }, []);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: isMobile ? 0 : '30%',
      width: isMobile ? '100vw' : '100%',
      height: '100%',
      zIndex: 0,
      pointerEvents: 'none'
    }}>
      <Globe
        ref={globeEl}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundColor="rgba(0,0,0,0)"
        width={window.innerWidth}
        height={window.innerHeight}
        showAtmosphere={true}
        atmosphereColor={THEME.accent}
        atmosphereAltitude={0.2}
        arcsData={arcsData}
        arcColor="color"
        arcDashLength={0.5}
        arcDashGap={2}
        arcDashAnimateTime={2000}
        arcStroke={0.4}
      />
    </div>
  );
};

export default function App() {
  const [panel, setPanel] = useState<Panel>('professor');
  const [demoOtp, setDemoOtp] = useState<string>(''); 
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
  const [otpInput, setOtpInput] = useState('');
  const [adminKey, setAdminKey] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  // --- Responsive Logic ---
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
      const res = await fetch('https://trustcycle-drs.onrender.com/api/admin/whitelist', {
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
    setLoading(true);
    setStatusMsg('Verifying identity — this may take a few seconds...');
    try {
      const res = await fetch('https://trustcycle-drs.onrender.com/api/auth/verify-email', {
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
      const res = await fetch('https://trustcycle-drs.onrender.com/api/auth/send-otp', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput })
      });
      const data = await res.json();
      if (res.ok) {
        if(data.demoOTP || data.demoOtp) setDemoOtp(data.demoOTP || data.demoOtp);
        setStatusMsg('OTP sent! For demo purposes, you can see it below.');
      }
    } catch (e) {
      setStatusMsg('OTP send failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    setLoading(true);
    try {
      const res = await fetch('https://trustcycle-drs.onrender.com/api/auth/verify-otp', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput, otp: otpInput })
      });
      if (res.ok) {
        setDemoOtp(''); 
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
    setLoading(true);
    try {
      const res = await fetch('https://trustcycle-drs.onrender.com/api/issue', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName, passport, content, issuerEmail: emailInput,
          authId: "0x823e7925487a829195d2693a8be96c9dacfb505220a503ac176cf06deef65ad7",
          hasFile: !!pdfFile
        })
      });
      const data = await res.json();
      if (res.ok) {
        setIssuedRef(data.recId);
        setStep(6);
      } else {
        alert(data.error || 'Issue failed');
      }
    } catch (e) {
      alert('Network/Backend error during issuance.');
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (recId: string) => {
    if(!confirm("Are you sure you want to revoke this recommendation? This action is irreversible on-chain.")) return;
    
    setLoading(true);
    try {
        const res = await fetch('https://trustcycle-drs.onrender.com/api/revoke', { 
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
      const res = await fetch('https://trustcycle-drs.onrender.com/api/student/search', {
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
      const res = await fetch(`https://trustcycle-drs.onrender.com/api/verify/${id}`);
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

  const resetFlow = (nextPanel: Panel) => {
    setPanel(nextPanel);
    setStep(1);
    setIdentity(null);
    setIssuedRef('');
    setStudentName('');
    setPassport('');
    setContent('');
    setPdfFile(null);
    setHistory([]);
    setSearchRes([]);
    setSelectedRec(null);
    setStatusMsg('');
    setCanProceed(false);
    setDemoOtp('');
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

  return (
    <div style={centeredLayout}>
      <BackgroundGlobe />

      {/* --- UPDATED: Responsive styling for the MasterZ logo --- */}
      <div style={{ 
        position: 'absolute', 
        top: isMobile ? 15 : 32,    // Move up on mobile
        left: isMobile ? 15 : 32,   // Move left on mobile
        zIndex: 20 
      }}>
        <img 
          src="/masterz_iota.png" 
          alt="masterz iota" 
          style={{ 
            height: isMobile ? 45 : 80, // Smaller on mobile
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
          <img src="/logo-galaxy.png" alt="logo" style={{ width: 50, height: 50 }} />
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: 0, letterSpacing: '-1.5px' }}>
            Trust<span style={{ color: THEME.accent }}>Cycle</span>
          </h1>
        </div>
        <p style={{ fontSize: '0.95rem', color: '#aaa', marginTop: '4px', fontWeight: 300 }}>
          Decentralized Recommendation System <br />
          <span style={{ fontSize: '0.75rem', opacity: 0.6, letterSpacing: 1 }}>An Academia Solution Based on IOTA Trust Framework</span>
        </p>
      </div>

      <div style={{ 
        display: 'flex', 
        gap: '10px', 
        marginBottom: '25px', 
        zIndex: 10, 
        marginRight: isMobile ? '0' : '35%',
        flexWrap: 'wrap',
        justifyContent: 'center'
      }}>
        {(['professor', 'student', 'university', 'provider'] as Panel[]).map(p => (
          <button 
            key={p} 
            onClick={() => resetFlow(p)} 
            style={{ 
                background: panel === p ? THEME.accent : 'rgba(255,255,255,0.03)', 
                color: panel === p ? '#fff' : '#888',
                border: `1px solid ${panel === p ? THEME.accent : '#333'}`, 
                padding: '8px 16px', 
                borderRadius: '100px', 
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 600,
                transition: 'all 0.3s ease'
            }}
          >
            {p.toUpperCase()}
          </button>
        ))}
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
                <p style={{ color: '#555', marginTop: 12, fontSize: 11 }}>We verify public web presence via Google Knowledge Graph.</p>
              </>
            )}

            {step === 2 && (
              <>
                <IdentityCard />
                <p style={{ marginBottom: '15px', fontSize: '0.95rem', color: '#ccc' }}>
                  Welcome back, <strong style={{ color: '#fff' }}>{identity?.fullName || fullNameInput}</strong>.
                </p>
                
                {/* --- DEMO OTP BOX --- */}
                {demoOtp && (
                  <div style={{ 
                    background: 'rgba(147, 51, 234, 0.1)', 
                    border: '1px dashed #9333ea', 
                    padding: '10px', 
                    borderRadius: '10px', 
                    marginBottom: '15px',
                    color: '#9333ea',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}>
                    ✨ Demo Access Code: {demoOtp}
                  </div>
                )}

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
                <input style={inputStyle} placeholder="Student Full Name" value={studentName} onChange={e => setStudentName(e.target.value)} />
                <input style={inputStyle} placeholder="Student Passport / ID Number" value={passport} onChange={e => setPassport(e.target.value)} />
                <textarea style={{ ...inputStyle, height: 100, fontFamily: 'sans-serif' }} placeholder="Recommendation content..." value={content} onChange={e => setContent(e.target.value)} />
                <button disabled={loading} style={buttonStyle()} onClick={handleIssue}>{loading ? "Anchoring to IOTA..." : "Sign & Issue"}</button>
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
                <button style={buttonStyle('#222')} onClick={() => setStep(4)}>🎫 Validate a Code</button>
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
                <button onClick={() => setStep(1)} style={{ color: THEME.accent, background: 'none', border: 'none', cursor: 'pointer', marginBottom: '10px', padding: 0 }}>← Back</button>
                {searchRes.length === 0 && <p style={{ color: '#888', textAlign: 'center', marginTop: 20 }}>No records found for this identity.</p>}
                {searchRes.map((r: any, idx) => (
                  <div key={idx} style={{ background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 8, marginBottom: 10, border: '1px solid #333' }}>
                    <div style={{display: 'flex', justifyContent: 'space-between'}}>
                        <span style={{fontSize: 12, color: '#888'}}>Ref: {r.id.substring(0,12)}...</span>
                        <span style={{fontSize: 12}}>{r.status === 'Verified' ? '✅' : '❌'}</span>
                    </div>
                    <div style={{marginTop: 8, fontSize: 14}}>{r.content}</div>
                    <button style={{ background: 'none', border: 'none', color: THEME.accent, marginTop: 8, fontSize: 12, padding: 0, cursor: 'pointer' }} onClick={() => handleVerifyId(r.id)}>View Full Details</button>
                  </div>
                ))}
              </div>
            )}
            {step === 4 && (
              <>
                <button onClick={() => setStep(1)} style={{ color: THEME.accent, background: 'none', border: 'none', cursor: 'pointer', marginBottom: '15px', float: 'left' }}>← Back</button>
                <div style={{clear: 'both'}}></div>
                <input style={inputStyle} placeholder="Paste Reference Code Here" id="refInput" />
                <button style={buttonStyle()} onClick={() => handleVerifyId((document.getElementById('refInput') as any).value)}>Fetch Data</button>
              </>
            )}
            {selectedRec && (
              <div style={{ marginTop: 16, background: '#000', padding: 16, borderRadius: 12, border: '1px solid #333', textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontSize: 11, color: '#666' }}>STATUS</span>
                    <span style={{ color: selectedRec.status === 'Verified' ? '#4ade80' : '#ef4444', fontWeight: 'bold', fontSize: 12 }}>{selectedRec.status.toUpperCase()}</span>
                </div>
                <p style={{ color: '#eee', fontSize: 14, lineHeight: 1.5 }}>"{selectedRec.content}"</p>
                <div style={{ marginTop: 12, borderTop: '1px solid #333', paddingTop: 8 }}>
                    <p style={{fontSize: 11, color: '#666', margin: 0}}>ISSUER</p>
                    <p style={{fontSize: 12, color: '#aaa', margin: 0}}>{selectedRec.issuerEmail}</p>
                </div>
              </div>
            )}
          </>
        )}

        {panel === 'university' && (
          <>
            <h2 style={{ color: THEME.accent, marginTop: 0 }}>University Check</h2>
            <p style={{fontSize: 13, color: '#888', marginBottom: 20}}>Verify the authenticity of an applicant's recommendation.</p>
            <input style={inputStyle} placeholder="Enter Recommendation Reference Hash" id="uniRef" />
            <button disabled={loading} style={buttonStyle()} onClick={() => handleVerifyId((document.getElementById('uniRef') as any).value)}>Verify Authenticity</button>
            {selectedRec && (
              <div style={{ marginTop: 24, padding: 20, background: 'rgba(255,255,255,0.02)', borderRadius: 12 }}>
                <div style={{fontSize: 40, marginBottom: 10}}>{selectedRec.status === 'Verified' ? '🛡️' : '⚠️'}</div>
                <h3 style={{ margin: 0, color: selectedRec.status === 'Verified' ? '#4ade80' : '#ef4444' }}>
                  {selectedRec.status === 'Verified' ? 'Authentic Document' : 'Invalid or Revoked'}
                </h3>
                <p style={{ fontSize: 13, color: '#888' }}>
                    Timestamp: {new Date(selectedRec.timestamp).toLocaleString()}
                </p>

                {selectedRec.status === 'Verified' && (
                    <div style={{ marginTop: 20, borderTop: '1px solid #333', paddingTop: 20 }}>
                        <div style={{ textAlign: 'left', background: '#000', padding: 15, borderRadius: 8, marginBottom: 15 }}>
                            <p style={{ fontSize: 11, color: '#666', margin: '0 0 8px 0', fontWeight: 'bold' }}>RECOMMENDATION TEXT</p>
                            <p style={{ color: '#fff', fontSize: 14, lineHeight: 1.5, margin: 0 }}>"{selectedRec.content}"</p>
                            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#aaa' }}>
                                <span>Student: {selectedRec.studentName}</span>
                                <span>Passport: {selectedRec.passport}</span>
                            </div>
                        </div>

                        <button 
                            style={{ ...buttonStyle(THEME.accent), marginTop: 0 }}
                            onClick={() => {
                                const txt = `TRUSTCYCLE VERIFIED\n\nStudent: ${selectedRec.studentName}\nPassport: ${selectedRec.passport}\nDate: ${new Date(selectedRec.timestamp).toLocaleString()}\n\nRecommendation:\n"${selectedRec.content}"\n\nIssuer: ${selectedRec.issuerEmail}\nSignature: ${selectedRec.id}`;
                                const blob = new Blob([txt], { type: 'text/plain' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `Rec_${selectedRec.studentName}.txt`;
                                a.click();
                                URL.revokeObjectURL(url);
                            }}
                        >
                            ⬇️ Download / Save Record
                        </button>
                    </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <div style={{ position: 'absolute', bottom: 20, right: 30, zIndex: 30 }}>
        <p style={{ 
            fontSize: '11px', 
            color: '#817d7de9', 
            margin: 0, 
            fontFamily: 'monospace',
            letterSpacing: '0.5px',
            cursor: 'default',
        }}>
          Crafted by{' '}
          <a
            href="https://www.linkedin.com/in/saba-azadegan-2974b622a/"
            target="_blank" 
            rel="noopener noreferrer"
            style={{
              fontWeight: 'bold',
              color: '#8c8a8ac7',
              textDecoration: 'none',
              cursor: 'pointer',
              transition: 'color 0.2s ease',
              borderBottom: '1px dotted #7e7d7d'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = THEME.accent}
            onMouseLeave={(e) => e.currentTarget.style.color = '#666'}
          >
            Saba Azadegan
          </a>
          {' '}for {' '}
          <a
            href="https://blog.iota.org/masterz-hackathon/"
            target="_blank" 
            rel="noopener noreferrer"
            style={{
              fontWeight: 'bold',
              color: '#8c8a8ac7',
              textDecoration: 'none',
              cursor: 'pointer',
              transition: 'color 0.2s ease',
              borderBottom: '1px dotted #7e7d7d'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = THEME.accent}
            onMouseLeave={(e) => e.currentTarget.style.color = '#666'}
          >
            MasterZ*IOTA Hackathon
          </a>
          {' '}
        </p>
      </div>
    </div>
  );
}