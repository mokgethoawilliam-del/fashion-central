const fs = require('fs');
const path = 'c:/Users/mokge/.gemini/antigravity/scratch/kota-guard/components/AdminDashboard_modern.jsx';

let content = fs.readFileSync(path, 'utf8');

console.log('--- Patching Dashboard ---');

// 1. Add state
if (!content.includes('showGateModal')) {
    content = content.replace(
        'const [testimonials, setTestimonials] = useState([]);',
        'const [testimonials, setTestimonials] = useState([]);\n    const [showGateModal, setShowGateModal] = useState(false);'
    );
    console.log('Added showGateModal state');
}

// 2. Add handleTabClick
if (!content.includes('const handleTabClick =')) {
    const handleTabClickCode = `    const handleTabClick = (tabId) => {
        const { isExpired } = getTrialInfo();
        const status = vendorConfig?.subscription_status;
        const isRestricted = (isExpired && status !== 'active') || status === 'past_due' || status === 'cancelled';
        
        const premiumTabs = ['kds', 'inventory', 'logistics', 'cms', 'ai'];
        
        if (isRestricted && premiumTabs.includes(tabId)) {
            setShowGateModal(true);
            return;
        }
        
        setActiveTab(tabId);
    };

`;
    content = content.replace('    // ────────────────────────────────────────────────────────────────────────', handleTabClickCode + '    // ────────────────────────────────────────────────────────────────────────');
    console.log('Added handleTabClick function');
}

// 3. Replace Lock Screen with Banner
// Using a substring match to find the block
const gateMarker = '{/* ── MONETIZATION GATE */}';
// Since the marker has weird characters, we might need a more flexible match
const gateRegex = /\{(\/\*).*?MONETIZATION GATE.*?\n\s+\{\(\(\) => \{[\s\S]*?\}\)\(\)\}/;
if (gateRegex.test(content)) {
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
    content = content.replace(gateRegex, bannerCode);
    console.log('Replaced Full-Screen Gate with Banner & Modal');
}

// 4. Update Sidebar items
content = content.replace(/setActiveTab\('/g, "handleTabClick('");
console.log('Updated sidebar click handlers');

fs.writeFileSync(path, content);
console.log('--- Done Patching ---');
