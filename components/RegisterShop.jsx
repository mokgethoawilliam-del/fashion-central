import React, { useState } from 'react';
import { supabase } from '../src/supabaseClient';
import { useNavigate, Link } from 'react-router-dom';

export default function RegisterShop() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [shopName, setShopName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const generateSlug = (name) =>
        name.toLowerCase().replace(/[^\w ]+/g, '').replace(/ +/g, '-');

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        const slug = generateSlug(shopName);

        try {
            const { data: existingVendor } = await supabase
                .from('public_vendors').select('id').eq('slug', slug).single();

            if (existingVendor) {
                throw new Error('A studio with a similar name already exists. Please try a different name.');
            }

            const { data: newVendor, error: vendorErr } = await supabase
                .from('vendors')
                .insert([{
                    name: shopName,
                    slug: slug,
                    branding: {
                        primary_color: '#8b5cf6',
                        secondary_color: '#0d0d14',
                        hero_text: `Welcome to ${shopName}`
                    }
                }])
                .select().single();

            if (vendorErr) throw vendorErr;

            const { data: authData, error: authErr } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { full_name: 'Studio Owner', vendor_id: newVendor.id },
                    emailRedirectTo: `${window.location.origin}/admin`
                }
            });

            if (authErr) {
                await supabase.from('vendors').delete().eq('id', newVendor.id);
                throw authErr;
            }

            if (authData?.user?.id) {
                await supabase.from('profiles').insert([{
                    id: authData.user.id,
                    vendor_id: newVendor.id,
                    full_name: 'Studio Owner',
                    role: 'admin'
                }]);
            }

            alert('Studio registered! You are now being logged in.');
            navigate('/admin');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const inputStyle = {
        width: '100%', padding: '12px 14px',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '10px', color: '#f1f5f9',
        outline: 'none', fontSize: '0.95rem',
        boxSizing: 'border-box', transition: 'border-color 0.2s'
    };

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center',
            justifyContent: 'center', background: '#0d0d14',
            padding: '2rem', fontFamily: "'Inter', -apple-system, sans-serif", color: '#fff'
        }}>
            {/* Background glow */}
            <div style={{ position: 'fixed', top: '10%', right: '5%', width: '500px', height: '500px', borderRadius: '50%', background: 'rgba(139,92,246,0.06)', filter: 'blur(80px)', pointerEvents: 'none' }} />

            <div style={{ width: '100%', maxWidth: '460px', position: 'relative', zIndex: 1 }}>
                <div style={{ marginBottom: '2.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '2rem' }}>
                        <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, #8b5cf6, #c084fc)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>✂</div>
                        <span style={{ fontWeight: '700', fontSize: '1.1rem' }}>Fashion Central</span>
                    </div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: '0.5rem', color: '#f1f5f9' }}>Launch your studio</h1>
                    <p style={{ color: '#64748b', fontSize: '0.95rem' }}>Join Fashion Central and grow your styling business</p>
                </div>

                {error && (
                    <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5', padding: '12px 16px', borderRadius: '10px', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', fontWeight: '600', color: '#94a3b8' }}>Studio / Shop Name</label>
                        <input
                            type="text" required value={shopName}
                            onChange={e => setShopName(e.target.value)}
                            placeholder="e.g. King Wiz Studio"
                            style={inputStyle}
                            onFocus={e => e.target.style.borderColor = '#8b5cf6'}
                            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', fontWeight: '600', color: '#94a3b8' }}>Owner Email</label>
                        <input
                            type="email" required value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="owner@yourstudio.co.za"
                            style={inputStyle}
                            onFocus={e => e.target.style.borderColor = '#8b5cf6'}
                            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', fontWeight: '600', color: '#94a3b8' }}>Password</label>
                        <input
                            type="password" required value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="••••••••"
                            style={inputStyle}
                            onFocus={e => e.target.style.borderColor = '#8b5cf6'}
                            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                        />
                    </div>

                    <button
                        type="submit" disabled={loading}
                        style={{
                            width: '100%', padding: '13px', marginTop: '0.25rem',
                            background: loading ? '#4c1d95' : 'linear-gradient(135deg, #7c3aed, #8b5cf6)',
                            color: '#fff', border: 'none', borderRadius: '10px',
                            fontWeight: '600', fontSize: '0.95rem',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            boxShadow: '0 4px 15px rgba(139,92,246,0.3)'
                        }}
                    >
                        {loading ? 'Creating your studio...' : 'Launch My Studio'}
                    </button>
                </form>

                <p style={{ textAlign: 'center', marginTop: '1.75rem', color: '#475569', fontSize: '0.875rem' }}>
                    Already registered?{' '}
                    <Link to="/login" style={{ color: '#a78bfa', textDecoration: 'none', fontWeight: '600' }}>Sign In</Link>
                </p>
            </div>
        </div>
    );
}
