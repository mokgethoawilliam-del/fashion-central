import React, { useState } from 'react';
import { supabase } from '../src/supabaseClient';
import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const { error: authErr } = await supabase.auth.signInWithPassword({ email, password });
            if (authErr) throw authErr;
            navigate('/admin');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            background: '#0d0d14',
            fontFamily: "'Inter', -apple-system, sans-serif",
            color: '#fff'
        }}>
            {/* Left decorative panel */}
            <div style={{
                display: 'none',
                flex: 1,
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
                padding: '3rem',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                overflow: 'hidden'
            }} className="login-panel">
                <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: '400px', height: '400px', borderRadius: '50%', background: 'rgba(139,92,246,0.15)', filter: 'blur(60px)' }} />
                <div style={{ position: 'absolute', bottom: '10%', left: '-60px', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(196,130,252,0.1)', filter: 'blur(40px)' }} />

                <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ fontSize: '1.4rem', fontWeight: '700', letterSpacing: '0.05em' }}>Fashion Central</div>
                </div>

                <div style={{ position: 'relative', zIndex: 1 }}>
                    <h2 style={{ fontSize: '2.2rem', fontWeight: '700', lineHeight: 1.3, marginBottom: '1rem', color: '#e2e8f0' }}>
                        Your studio.<br />Your clients.<br />Your brand.
                    </h2>
                    <p style={{ color: '#94a3b8', lineHeight: 1.6 }}>
                        Manage bookings, track leads, and grow your styling business — all in one place.
                    </p>
                </div>

                <div style={{ position: 'relative', zIndex: 1, fontSize: '0.8rem', color: '#475569' }}>
                    © 2026 Fashion Central
                </div>
            </div>

            {/* Right login form */}
            <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2rem',
                maxWidth: '520px',
                margin: '0 auto',
                width: '100%'
            }}>
                <div style={{ width: '100%', maxWidth: '400px' }}>
                    <div style={{ marginBottom: '2.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '2rem' }}>
                            <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, #8b5cf6, #c084fc)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>✂</div>
                            <span style={{ fontWeight: '700', fontSize: '1.1rem', letterSpacing: '0.02em' }}>Fashion Central</span>
                        </div>
                        <h1 style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: '0.5rem', color: '#f1f5f9' }}>Welcome back</h1>
                        <p style={{ color: '#64748b', fontSize: '0.95rem' }}>Sign in to your stylist dashboard</p>
                    </div>

                    {error && (
                        <div style={{
                            background: 'rgba(239,68,68,0.08)',
                            border: '1px solid rgba(239,68,68,0.2)',
                            color: '#fca5a5',
                            padding: '12px 16px',
                            borderRadius: '10px',
                            marginBottom: '1.5rem',
                            fontSize: '0.875rem'
                        }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', fontWeight: '600', color: '#94a3b8' }}>Email address</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="you@studio.co.za"
                                style={{
                                    width: '100%', padding: '12px 14px',
                                    background: 'rgba(255,255,255,0.04)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '10px', color: '#f1f5f9',
                                    outline: 'none', fontSize: '0.95rem',
                                    boxSizing: 'border-box',
                                    transition: 'border-color 0.2s'
                                }}
                                onFocus={e => e.target.style.borderColor = '#8b5cf6'}
                                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', fontWeight: '600', color: '#94a3b8' }}>Password</label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="••••••••"
                                style={{
                                    width: '100%', padding: '12px 14px',
                                    background: 'rgba(255,255,255,0.04)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '10px', color: '#f1f5f9',
                                    outline: 'none', fontSize: '0.95rem',
                                    boxSizing: 'border-box',
                                    transition: 'border-color 0.2s'
                                }}
                                onFocus={e => e.target.style.borderColor = '#8b5cf6'}
                                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                width: '100%', padding: '13px',
                                background: loading ? '#4c1d95' : 'linear-gradient(135deg, #7c3aed, #8b5cf6)',
                                color: '#fff', border: 'none',
                                borderRadius: '10px', fontWeight: '600',
                                fontSize: '0.95rem', cursor: loading ? 'not-allowed' : 'pointer',
                                marginTop: '0.25rem',
                                boxShadow: '0 4px 15px rgba(139,92,246,0.3)',
                                transition: 'opacity 0.2s'
                            }}
                        >
                            {loading ? 'Signing in...' : 'Sign In to Dashboard'}
                        </button>
                    </form>

                    <p style={{ textAlign: 'center', marginTop: '1.75rem', color: '#475569', fontSize: '0.875rem' }}>
                        New stylist?{' '}
                        <Link to="/register" style={{ color: '#a78bfa', textDecoration: 'none', fontWeight: '600' }}>
                            Register your studio
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
