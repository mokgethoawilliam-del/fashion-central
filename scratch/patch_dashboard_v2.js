const fs = require('fs');
const path = 'c:/Users/mokge/.gemini/antigravity/scratch/kota-guard/components/AdminDashboard_modern.jsx';

let content = fs.readFileSync(path, 'utf8');

console.log('--- Applying Final UI Patch ---');

// The block to replace starts around "{/* ── MONETIZATION GATE */}"
// or right after "return ("
const startMarker = "return (";
const startIdx = content.indexOf(startMarker, content.indexOf('return (', 1000) + 1); // skip some earlier returns

// Actually, I'll use a more surgical approach. I'll search for the specific lines.
const searchLine = "const isRestricted = vendorConfig && (isExpired && status !== 'active') || status === 'past_due' || status === 'cancelled';";

if (content.includes(searchLine)) {
    // Find the enclosing {(() => { ... })()} block
    const blockStart = content.lastIndexOf('{(() => {', content.indexOf(searchLine));
    const blockEnd = content.indexOf('})()}', content.indexOf(searchLine)) + 5;
    
    if (blockStart !== -1 && blockEnd !== -1) {
        const bannerCode = `            {/* ── MONETIZATION: SOFT GATE BANNER */}
            {(() => {
                const { isExpired, daysLeft } = getTrialInfo();
                const status = vendorConfig?.subscription_status;
                const isPastDue = status === 'past_due';
                const isCancelled = status === 'cancelled';
                const isRestricted = (isExpired && status !== 'active') || isPastDue || isCancelled;
                
                if (!isRestricted && (status === 'trial' || !status)) {
                    return (
                        <div style={{ background: 'linear-gradient(90deg, #00e676, #00c853)', color: '#0f172a', padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', fontWeight: 'bold', fontSize: '0.85rem' }}>
                            <span>🎁 You are on a {daysLeft}-day free trial.</span>
                            <button onClick={handleSubscribe} style={{ background: '#0f172a', color: '#fff', border: 'none', padding: '0.4rem 1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Subscribe Now</button>
                        </div>
                    );
                }

                if (isRestricted) {
                    return (
                        <div style={{ background: 'linear-gradient(90deg, #ef4444, #dc2626)', color: '#fff', padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', fontWeight: 'bold', fontSize: '0.85rem', position: 'sticky', top: 0, zIndex: 1000 }}>
                            <span>⚠️ {isCancelled ? 'Subscription Cancelled' : isPastDue ? 'Payment Overdue' : 'Trial Expired'} — Some features are restricted.</span>
                            <button onClick={handleSubscribe} style={{ background: '#fff', color: '#ef4444', border: 'none', padding: '0.4rem 1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Restore Access</button>
                        </div>
                    );
                }

                return null;
            })()}

            {/* ── FEATURE GATE MODAL */}
            {showGateModal && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 10001, background: 'rgba(2,6,23,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
                    <div className="cms-card" style={{ maxWidth: '420px', width: '100%', textAlign: 'center', border: '1px solid rgba(0,230,118,0.3)', position: 'relative' }}>
                        <button onClick={() => setShowGateModal(false)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: '#64748b', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚀</div>
                        <h2 style={{ color: '#fff', marginBottom: '0.75rem' }}>Premium Feature</h2>
                        <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginBottom: '2rem' }}>
                            Features like KDS, Inventory, and CMS Settings are available on our <b>R 399/month</b> plan. Subscribe to unlock full power.
                        </p>
                        <button onClick={() => { setShowGateModal(false); handleSubscribe(); }} style={{ width: '100%', padding: '1rem', background: 'linear-gradient(135deg, #00e676, #00c853)', color: '#0f172a', border: 'none', borderRadius: '12px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer' }}>
                            Unlock Now
                        </button>
                    </div>
                </div>
            )}`;
        
        content = content.slice(0, blockStart) + bannerCode + content.slice(blockEnd);
        fs.writeFileSync(path, content);
        console.log('Successfully replaced lock screen with banner and modal!');
    } else {
        console.error('Could not find block boundaries');
    }
} else {
    console.error('Could not find search line');
}
