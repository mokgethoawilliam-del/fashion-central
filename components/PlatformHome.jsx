import React from 'react';
import { Link } from 'react-router-dom';

const FEATURES = [
    {
        icon: '📅',
        title: 'Smart Booking Management',
        desc: 'Track every client consultation, fitting, and appointment in one elegant dashboard.'
    },
    {
        icon: '🤖',
        title: 'AI Studio Manager',
        desc: 'Let your AI assistant handle scheduling suggestions, lead follow-ups, and business insights.'
    },
    {
        icon: '💬',
        title: 'Live Client Chat',
        desc: 'Communicate directly with clients on your branded storefront in real time.'
    },
    {
        icon: '📊',
        title: 'Revenue & Analytics',
        desc: 'Track your income, top services, and client retention with intuitive reporting.'
    },
    {
        icon: '🎨',
        title: 'Custom Brand Identity',
        desc: 'Create a professional portfolio page that reflects your personal aesthetic.'
    },
    {
        icon: '🔐',
        title: 'Secure Vault',
        desc: 'Store your payment credentials and API keys safely with encrypted access.'
    },
];

export default function PlatformHome() {
    return (
        <div style={{ background: '#0d0d14', color: '#fff', minHeight: '100vh', fontFamily: "'Inter', -apple-system, sans-serif", overflowX: 'hidden' }}>

            {/* Ambient glows */}
            <div style={{ position: 'fixed', top: '-200px', left: '50%', transform: 'translateX(-50%)', width: '800px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

            {/* NAV */}
            <nav style={{
                position: 'sticky', top: 0, zIndex: 100,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '1.25rem 2rem',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                background: 'rgba(13,13,20,0.85)', backdropFilter: 'blur(12px)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '28px', height: '28px', background: 'linear-gradient(135deg, #8b5cf6, #c084fc)', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>✂</div>
                    <span style={{ fontWeight: '700', fontSize: '1.1rem', letterSpacing: '0.02em' }}>Fashion Central</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <a href="#features" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.9rem', fontWeight: '500' }}>Features</a>
                    <a href="#pricing" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.9rem', fontWeight: '500' }}>Pricing</a>
                    <Link to="/login" style={{ color: '#94a3b8', textDecoration: 'none', padding: '0.5rem 1rem', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '0.875rem' }}>Login</Link>
                    <Link to="/register" style={{ background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)', color: '#fff', textDecoration: 'none', padding: '0.5rem 1.1rem', borderRadius: '8px', fontSize: '0.875rem', fontWeight: '600', boxShadow: '0 2px 12px rgba(139,92,246,0.35)' }}>Get Started Free</Link>
                </div>
            </nav>

            {/* HERO */}
            <header style={{ padding: '8rem 2rem 6rem', textAlign: 'center', position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)', borderRadius: '20px', padding: '6px 16px', fontSize: '0.8rem', color: '#c084fc', marginBottom: '2rem', fontWeight: '500' }}>
                    ✨ Built exclusively for stylists &amp; fashion professionals
                </div>
                <h1 style={{ fontSize: 'clamp(2.5rem, 6vw, 4rem)', fontWeight: '800', lineHeight: 1.15, marginBottom: '1.5rem', letterSpacing: '-0.02em' }}>
                    The back office your<br />
                    <span style={{ background: 'linear-gradient(135deg, #a78bfa, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>styling business deserves.</span>
                </h1>
                <p style={{ fontSize: '1.1rem', color: '#64748b', maxWidth: '600px', margin: '0 auto 3rem', lineHeight: 1.7 }}>
                    Manage bookings, track client leads, run your AI assistant, and grow your brand — all from one premium dashboard designed for fashion professionals.
                </p>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <Link to="/register" style={{ background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)', color: '#fff', padding: '0.9rem 2.2rem', borderRadius: '10px', fontWeight: '700', fontSize: '1rem', textDecoration: 'none', boxShadow: '0 4px 20px rgba(139,92,246,0.4)' }}>
                        Launch Your Studio Free
                    </Link>
                    <Link to="/login" style={{ color: '#94a3b8', padding: '0.9rem 2.2rem', borderRadius: '10px', fontWeight: '600', fontSize: '1rem', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
                        Sign In →
                    </Link>
                </div>
            </header>

            {/* DASHBOARD PREVIEW STRIP */}
            <div style={{ position: 'relative', zIndex: 1, padding: '0 2rem 6rem', maxWidth: '900px', margin: '0 auto' }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 30px 60px rgba(0,0,0,0.4)' }}>
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '1rem' }}>
                        {['#ef4444','#f59e0b','#22c55e'].map(c => <div key={c} style={{ width: '10px', height: '10px', borderRadius: '50%', background: c }} />)}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
                        {[
                            { label: 'New Leads', value: '12', color: '#8b5cf6' },
                            { label: 'Confirmed', value: '5', color: '#22c55e' },
                            { label: 'Completed', value: '38', color: '#94a3b8' },
                            { label: 'Revenue', value: 'R14,500', color: '#f59e0b' },
                        ].map(stat => (
                            <div key={stat.label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px', padding: '1rem' }}>
                                <p style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{stat.label}</p>
                                <p style={{ fontSize: '1.5rem', fontWeight: '700', color: stat.color }}>{stat.value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* FEATURES */}
            <section id="features" style={{ padding: '6rem 2rem', position: 'relative', zIndex: 1 }}>
                <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
                        <h2 style={{ fontSize: '2.2rem', fontWeight: '800', marginBottom: '1rem', letterSpacing: '-0.02em' }}>Everything a stylist needs.</h2>
                        <p style={{ color: '#64748b', maxWidth: '500px', margin: '0 auto', lineHeight: 1.6 }}>No complexity. Just the tools that matter most for growing your styling business.</p>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                        {FEATURES.map(f => (
                            <div key={f.title} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '2rem', transition: 'border-color 0.2s' }}>
                                <div style={{ fontSize: '1.8rem', marginBottom: '1rem' }}>{f.icon}</div>
                                <h3 style={{ fontSize: '1.05rem', fontWeight: '700', marginBottom: '0.75rem', color: '#e2e8f0' }}>{f.title}</h3>
                                <p style={{ color: '#64748b', lineHeight: 1.65, fontSize: '0.9rem' }}>{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* PRICING */}
            <section id="pricing" style={{ padding: '6rem 2rem', borderTop: '1px solid rgba(255,255,255,0.05)', position: 'relative', zIndex: 1 }}>
                <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
                        <h2 style={{ fontSize: '2.2rem', fontWeight: '800', marginBottom: '1rem', letterSpacing: '-0.02em' }}>Simple pricing.</h2>
                        <p style={{ color: '#64748b' }}>Start free. Scale when you're ready.</p>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
                        {/* Free */}
                        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '2.5rem' }}>
                            <h3 style={{ fontWeight: '700', fontSize: '1.1rem', marginBottom: '0.5rem' }}>Free Forever</h3>
                            <div style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '1.5rem' }}>R0 <span style={{ fontSize: '1rem', color: '#475569', fontWeight: '400' }}>/month</span></div>
                            <ul style={{ listStyle: 'none', padding: 0, marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {['Client Booking Dashboard', 'AI Studio Manager', 'Live Chat', 'Basic Analytics', '5% Platform Fee'].map(item => (
                                    <li key={item} style={{ color: '#94a3b8', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ color: '#8b5cf6' }}>✓</span> {item}
                                    </li>
                                ))}
                            </ul>
                            <Link to="/register" style={{ display: 'block', textAlign: 'center', padding: '0.85rem', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', textDecoration: 'none', fontWeight: '600', fontSize: '0.9rem', background: 'rgba(255,255,255,0.03)' }}>
                                Get Started Free
                            </Link>
                        </div>
                        {/* Growth */}
                        <div style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.15) 0%, rgba(139,92,246,0.08) 100%)', border: '1px solid rgba(139,92,246,0.4)', borderRadius: '16px', padding: '2.5rem', position: 'relative' }}>
                            <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)', color: '#fff', padding: '4px 14px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '700', letterSpacing: '0.08em' }}>MOST POPULAR</div>
                            <h3 style={{ fontWeight: '700', fontSize: '1.1rem', marginBottom: '0.5rem' }}>Growth</h3>
                            <div style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '1.5rem' }}>R399 <span style={{ fontSize: '1rem', color: '#94a3b8', fontWeight: '400' }}>/month</span></div>
                            <ul style={{ listStyle: 'none', padding: 0, marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {['Everything in Free', 'Custom Domain', 'Own AI API Keys', 'Advanced Analytics', '0% Platform Fees'].map(item => (
                                    <li key={item} style={{ color: '#c4b5fd', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ color: '#a78bfa' }}>✓</span> {item}
                                    </li>
                                ))}
                            </ul>
                            <Link to="/register" style={{ display: 'block', textAlign: 'center', padding: '0.85rem', background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)', borderRadius: '10px', color: '#fff', textDecoration: 'none', fontWeight: '700', fontSize: '0.9rem', boxShadow: '0 4px 15px rgba(139,92,246,0.3)' }}>
                                Go Premium
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* FOOTER */}
            <footer style={{ padding: '3rem 2rem', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center', position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '1.5rem' }}>
                    <div style={{ width: '22px', height: '22px', background: 'linear-gradient(135deg, #8b5cf6, #c084fc)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}>✂</div>
                    <span style={{ fontWeight: '700', fontSize: '0.95rem' }}>Fashion Central</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginBottom: '1.5rem' }}>
                    <Link to="/legal" style={{ color: '#475569', textDecoration: 'none', fontSize: '0.85rem' }}>Terms &amp; Disclaimer</Link>
                    <Link to="/login" style={{ color: '#475569', textDecoration: 'none', fontSize: '0.85rem' }}>Stylist Login</Link>
                    <Link to="/register" style={{ color: '#475569', textDecoration: 'none', fontSize: '0.85rem' }}>Register</Link>
                </div>
                <p style={{ color: '#334155', fontSize: '0.85rem' }}>© 2026 Fashion Central. Empowering stylists through digital innovation.</p>
            </footer>
        </div>
    );
}
