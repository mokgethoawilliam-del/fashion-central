const fs = require('fs');
const path = 'c:/Users/mokge/.gemini/antigravity/scratch/kota-guard/components/VendorLandingPage.jsx';

let content = fs.readFileSync(path, 'utf8');

console.log('--- Patching Landing Page Chat ---');

// 1. Add state
if (!content.includes('isChatOpen')) {
    const stateCode = `
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [chats, setChats] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [chatSessionId, setChatSessionId] = useState(null);`;
    
    content = content.replace(
        'const [reviewSubmitted, setReviewSubmitted] = useState(false);',
        'const [reviewSubmitted, setReviewSubmitted] = useState(false);' + stateCode
    );
    console.log('Added Chat state hooks');
}

// 2. Add Logic & Effects
if (!content.includes('useEffect(() => {\n        if (!vendor?.id) return;')) {
    const logicCode = `
    useEffect(() => {
        if (!vendor?.id) return;

        let sessionId = localStorage.getItem('vulahub_chat_session');
        if (!sessionId) {
            sessionId = 'user_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('vulahub_chat_session', sessionId);
        }
        setChatSessionId(sessionId);

        // Fetch initial history
        const fetchHistory = async () => {
            const { data } = await supabase
                .from('support_chats')
                .select('*')
                .eq('vendor_id', vendor.id)
                .eq('session_identifier', sessionId)
                .order('created_at', { ascending: true });
            if (data) setChats(data);
        };
        fetchHistory();

        // Subscribe to real-time chat updates
        const channel = supabase
            .channel(\`chat_\${sessionId}\`)
            .on('postgres_changes', 
                { event: 'INSERT', schema: 'public', table: 'support_chats', filter: \`session_identifier=eq.\${sessionId}\` }, 
                (payload) => {
                    setChats(current => {
                        const exists = current.find(c => c.id === payload.new.id);
                        if (exists) return current;
                        return [...current, payload.new];
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [vendor?.id]);

    const sendMessage = async (e) => {
        if (e) e.preventDefault();
        if (!chatInput.trim() || !vendor?.id || !chatSessionId) return;

        const msg = chatInput;
        setChatInput('');

        const { error } = await supabase.from('support_chats').insert({
            vendor_id: vendor.id,
            session_identifier: chatSessionId,
            message: msg,
            sender_type: 'customer'
        });

        if (error) {
            console.error("Failed to send message:", error);
            setChatInput(msg); 
        }
    };
`;
    
    content = content.replace(
        'const submitReview = async (e) => {',
        logicCode + '\n    const submitReview = async (e) => {'
    );
    console.log('Added Chat logic & real-time effects');
}

// 3. Add Floating UI
if (!content.includes('FLOATING LIVE SUPPORT CHAT')) {
    const uiCode = `
            {/* ── FLOATING LIVE SUPPORT CHAT */}
            <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                {isChatOpen ? (
                   <div className="chat-window-glass" style={{ width: 'clamp(300px, 90vw, 380px)', height: '500px', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', marginBottom: '1rem' }}>
                       <div style={{ padding: '1.25rem 1.5rem', background: 'rgba(15, 23, 42, 0.4)', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ width: '10px', height: '10px', background: '#00e676', borderRadius: '50%', boxShadow: '0 0 10px #00e676' }}></div>
                                <span style={{ fontWeight: 'bold', fontSize: '1rem' }}>Live Support</span>
                            </div>
                            <button onClick={() => setIsChatOpen(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.5rem', padding: '0.5rem' }}>×</button>
                       </div>

                       <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', background: 'transparent' }}>
                            {chats.length === 0 && (
                                <div style={{ textAlign: 'center', padding: '2rem', opacity: 0.5, fontSize: '0.9rem' }}>
                                    👋 Hi! Tell us how we can help you today.
                                </div>
                            )}
                            {chats.map((chat, idx) => (
                                <div key={idx} style={{ 
                                    alignSelf: chat.sender_type === 'customer' ? 'flex-end' : 'flex-start',
                                    background: chat.sender_type === 'customer' ? 'var(--color-primary, #00e676)' : '#1e293b',
                                    color: chat.sender_type === 'customer' ? '#000' : '#fff',
                                    padding: '0.8rem 1.2rem',
                                    borderRadius: chat.sender_type === 'customer' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                                    maxWidth: '85%',
                                    fontSize: '0.95rem',
                                    boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                                    lineHeight: '1.4'
                                }}>
                                    {chat.message}
                                </div>
                            ))}
                       </div>

                       <form onSubmit={sendMessage} style={{ padding: '1.25rem', background: 'rgba(15, 23, 42, 0.4)', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <input 
                                    type="text" 
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    placeholder="Type a message..."
                                    style={{ flex: 1, background: '#0f172a', border: '1px solid #334155', borderRadius: '12px', padding: '0.8rem 1.2rem', color: '#fff', outline: 'none' }}
                                />
                                <button type="submit" style={{ background: 'var(--color-primary, #00e676)', border: 'none', borderRadius: '12px', padding: '0.8rem 1.2rem', cursor: 'pointer', color: '#000', fontWeight: 'bold' }}>
                                    Send
                                </button>
                            </div>
                       </form>
                   </div>
                ) : (
                    <button 
                        onClick={() => setIsChatOpen(true)}
                        style={{ 
                            width: '64px', 
                            height: '64px', 
                            borderRadius: '50%', 
                            background: 'var(--color-primary, #00e676)', 
                            border: 'none', 
                            color: '#000', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            boxShadow: '0 10px 30px rgba(0,230,118,0.4)', 
                            cursor: 'pointer',
                            fontSize: '1.5rem'
                        }}
                    >
                        💬
                    </button>
                )}
            </div>
`;
    // Replace the last </div> with the UI + </div>
    const lastDivIdx = content.lastIndexOf('</div>');
    content = content.slice(0, lastDivIdx) + uiCode + content.slice(lastDivIdx);
    console.log('Injected floating chat UI');
}

fs.writeFileSync(path, content, 'utf8');
console.log('--- Done Patching VendorLandingPage ---');
