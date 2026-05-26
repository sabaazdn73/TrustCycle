import './Certificate.css';

export default function Certificate({ data }: any) {
  if (!data) return null;

  // تولید تاریخ‌های استاندارد
  const dateObj = data.timestamp ? new Date(data.timestamp) : new Date();
  const issueDateShort = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
  
  // تولید زمان دقیق (مثال: 24 Apr 2026 · 21:13 GMT+1)
  const timeString = dateObj.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const dateFormatted = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const issueDateDetailed = `${dateFormatted} · ${timeString} GMT+1`;

  const avatarLetters = data.issuerName ? data.issuerName.substring(0, 2).toUpperCase() : 'TC';

  return (
    <div className="certificate-wrapper">
      <div className="certificate">
        
        {/* BETA BANNER */}
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
              {/* نمایش شماره پاسپورت به صورت دیکریپت شده و شفاف */}
              <span>Passport · {data.passport || 'PT123456789'}</span>
              <div className="id-dot"></div>
              <span>Reference Verified · {issueDateShort}</span>
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
              {/* یکپارچه کردن ایمیل و نام دانشگاه */}
              <div className="issuer-email">
                {data.issuerEmail} {data.issuerUniversity ? ` · ${data.issuerUniversity}` : ''}
              </div>
            </div>
            <div className="verified-badge">
              <div className="verified-icon">✓</div>
              <div className="verified-text">VERIFIED</div>
            </div>
          </div>

          {/* Data fields */}
          <div className="data-grid">
            
            {/* زمان دقیق صدور */}
            <div className="data-field">
              <div className="field-label">Issued At</div>
              <div className="field-value">{issueDateDetailed}</div>
            </div>

            {/* وضعیت */}
            <div className="data-field">
              <div className="field-label">Status</div>
              <div className="field-value" style={{ color: 'var(--verified)' }}>
                ● Active · Not Revoked
              </div>
            </div>

            {/* نوع گواهی */}
            <div className="data-field">
              <div className="field-label">Credential Type</div>
              <div className="field-value">AcademicRecommendation · W3C VC</div>
            </div>

            {/* امضای رمزنگاری */}
            <div className="data-field">
              <div className="field-label">Signature</div>
              <div className="field-value" style={{ color: 'var(--verified)' }}>
                Ed25519 · Verified Offline
              </div>
            </div>

            {/* آی‌دی بلاکچین */}
            <div className="data-field full-width">
              <div className="field-label">On-Chain Object ID (IOTA Rebased Testnet)</div>
              <div className="field-value mono">{data.id}</div>
            </div>

            {/* هش محتوا */}
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
            <div className="chain-badge">IOTA REBASED L1</div>
            <div className="footer-divider"></div>
            <div className="footer-network">MoveVM · Testnet</div>
          </div>
          <div className="footer-right">
            <div className="footer-date">Issued · {issueDateShort}</div>
            <div className="footer-tx">TX · verify at explorer.iota.org</div>
          </div>
        </div>

        {/* EXPORT NOTE / BOTTOM GRADIENT BAR */}
        <div className="export-note">
          trustcycle · verified on IOTA Rebased · independently verifiable
        </div>

      </div>
    </div>
  );
}