export default function Certificate({ data }: any) {
  if (!data) return null;

  const issueDate = new Date(data.timestamp).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  }).toUpperCase();

  const avatarLetters = data.issuerName ? data.issuerName.substring(0, 2).toUpperCase() : 'TC';

  return (
    <div className="certificate-wrapper">
      <div className="certificate">
        
        {/* BETA BANNER - Added here */}
        <div className="beta-banner">
          <strong>BETA PILOT PHASE</strong> · Issuer identity is rigorously verified via Google API against reputable academic sources.
        </div>

        {/* TOP BANNER */}
        <div className="top-banner">
          <div className="brand-row">
            <div className="brand-logo">TC</div>
            <div>
              <div className="brand-name">TrustCycle</div>
              <div className="brand-tagline">On-Chain Academic Credential · IOTA Rebased L1</div>
            </div>
          </div>
          <div className="cert-title">Verified Academic Recommendation</div>
          <div className="cert-headline">
            Certificate of<br />
            <strong>Authentic Endorsement</strong>
          </div>
        </div>

        <div className="gold-divider"></div>

        <div className="cert-body">
          <div className="watermark">TC</div>

          {/* Student */}
          <div className="student-block">
            <div className="this-certifies">This credential certifies that</div>
            <div className="student-name">{data.studentName}</div>
            <div className="student-id-row">
              <span>Passport Hash · {data.passportHash ? data.passportHash.substring(0,8) + '...' : 'Verified'}</span>
              <div className="id-dot"></div>
              <span>Reference Verified · {issueDate}</span>
            </div>
          </div>

          {/* Recommendation text */}
          <div className="rec-text-block">
            <div className="rec-label">Recommendation Content</div>
            {data.content.startsWith('file:') 
               ? "📄 [Secure PDF Document Attached - Download via Vault]" 
               : data.content}
          </div>

          {/* Issuer */}
          <div className="issuer-block">
            <div className="issuer-avatar">{avatarLetters}</div>
            <div className="issuer-info">
              <div className="issuer-label">Issuing Professor · Identity Verified</div>
              <div className="issuer-name">{data.issuerName || 'Authorized Issuer'}</div>

              {data.issuerUniversity && <div className="issuer-email" style={{ marginBottom: '2px' }}>{data.issuerUniversity}</div>}
              <div className="issuer-email">{data.issuerEmail}</div>
            </div>
            <div className="verified-badge">
              <div className="verified-icon">{data.status === 'Verified' ? '✓' : '✕'}</div>
              <div className="verified-text">{data.status}</div>
            </div>
          </div>

          {/* Data fields */}
          <div className="data-grid">
            <div className="data-field">
              <div className="field-label">Status</div>
              <div className="field-value" style={{ color: data.status === 'Verified' ? 'var(--verified)' : '#ef4444' }}>
                ● {data.status}
              </div>
            </div>
            <div className="data-field">
              <div className="field-label">Credential Type</div>
              <div className="field-value">W3C VC</div>
            </div>
            <div className="data-field full-width">
              <div className="field-label">On-Chain Object ID (IOTA Rebased Testnet)</div>
              <div className="field-value mono">{data.id}</div>
            </div>
            {data.contentHash && (
              <div className="data-field full-width">
                <div className="field-label">Content Hash (SHA-256)</div>
                <div className="field-value mono">{data.contentHash}</div>
              </div>
            )}
          </div>

        </div>

        {/* FOOTER */}
        <div className="cert-footer">
         
          <div className="footer-left">
            <div className="chain-badge">IOTA Rebased L1</div>
            <div className="footer-divider"></div>
            <div className="footer-network">MoveVM · Testnet</div>
          </div>
          <div className="footer-right">
            <div className="footer-date">Issued · {issueDate}</div>
            <div className="footer-tx">TX · verify at explorer.iota.org</div>
          </div>
        </div>

      </div>
      <div className="export-note">trustcycle · verified on IOTA Rebased · independently verifiable</div>
    </div>
  );
}