import React, { useState, useEffect } from 'react';
import { supabase } from '../src/supabaseClient';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Audio context for the "Ding" sound alert
const playDing = () => {
    try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.play().catch(e => console.log('Audio autoplay blocked by browser:', e));
    } catch (err) {
        console.error("Failed to play sound", err);
    }
};

const KINGS_WEAR_DEFAULT_BRANDING = {
    tagline: 'Premium Bespoke Tailoring',
    welcome_text: 'Bespoke tailoring, premium styling, and image transformation for weddings, events, business, and clients who need to arrive looking expensive.',
    hero_title: 'Tailored for',
    hero_highlight: 'Kings',
    hero_subtitle: 'Bespoke tailoring, premium styling, and image transformation for weddings, events, business, and clients who need to arrive looking expensive.',
    about_heading: 'About Kings Wear Clothing',
    about_text: 'Kings Wear Clothing is a premium tailoring brand founded by King Wiz, specializing in bespoke suits crafted for men and women who value precision, elegance, and status. Each piece is designed to elevate your presence and reflect confidence at the highest level.',
    services_heading: 'Our Services',
    services_intro: 'A clear snapshot of the tailoring, styling, and premium looks this studio currently offers.',
    service_cards: [
        { title: 'Bespoke Suits', desc: 'Custom-tailored suits designed to fit your body with absolute precision and elegance.' },
        { title: 'Wedding Styling', desc: 'Stand out on your special day with premium, unforgettable styling.' },
        { title: 'Image Transformation', desc: 'Upgrade your entire look and elevate your personal brand to new heights.' }
    ],
    pricing_intro: 'Let clients qualify themselves before they DM. Final quotes still depend on fabric, finish, complexity, and delivery timelines.',
    pricing_cards: [
        { title: 'Bespoke Suits', price: 'From R3 500', copy: 'Tailored for events, business, weddings, and personal image upgrades.' },
        { title: 'Wedding Styling', price: 'From R5 500', copy: 'Premium looks for grooms, groomsmen, and standout ceremony styling.' },
        { title: 'Fittings & Alterations', price: 'From R450', copy: 'Refinement, adjustments, and finishing to sharpen the final silhouette.' }
    ],
    value_points: [
        { title: 'Precision Craftsmanship', desc: 'Every stitch and finishing detail is handled with care.' },
        { title: 'Premium Fabrics', desc: 'The studio guides clients toward finishes that match the brief and budget.' },
        { title: 'Personalized Experience', desc: "Each fitting and look is shaped around the client's identity, event, and desired impression." }
    ],
    gallery_intro: "A look at the studio's transformations, fittings, and standout finished pieces.",
    booking_heading: 'Book a Fitting / Get Styled',
    booking_intro: 'Share your occasion, preferred garment, and timing so the studio can guide your fitting and next steps.',
    location_label: 'Polokwane, Limpopo',
    contact_email: 'bookings@kingswear.co.za',
    faq_items: [
        { q: 'How do fittings work?', a: 'We start with a consultation, take your measurements, discuss your occasion and style direction, then confirm your fitting and production timeline.' },
        { q: 'Do you style weddings and special events?', a: 'Yes. We handle groom looks, wedding party styling, matric dances, graduations, red-carpet moments, and premium occasion wear.' },
        { q: 'How much do your garments cost?', a: 'Pricing depends on fabric, finish, design complexity, and whether the piece is bespoke or styled from an existing concept. The guide below gives starting prices.' },
        { q: 'How early should I book?', a: 'For weddings and major events, booking at least 2 to 4 weeks ahead is safest. For urgent fittings, message early so availability can be confirmed.' }
    ]
};

const hasValue = (value) => {
    if (Array.isArray(value)) return value.length > 0;
    return value !== null && value !== undefined && String(value).trim() !== '';
};

const withLandingDefaults = (branding = {}) => {
    const next = { ...branding };
    Object.entries(KINGS_WEAR_DEFAULT_BRANDING).forEach(([key, value]) => {
        if (!hasValue(next[key])) {
            next[key] = Array.isArray(value) ? value.map((item) => ({ ...item })) : value;
        }
    });
    if (!hasValue(next.about_story) && hasValue(next.about_text)) {
        next.about_story = next.about_text;
    }
    return next;
};

const toEditableLines = (items, fields) => {
    if (!Array.isArray(items)) return '';
    return items
        .map((item) => fields.map((field) => item?.[field] || '').join(' | '))
        .join('\n');
};

const fromEditableLines = (value, fields) => {
    return String(value || '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
            const parts = line.split('|').map((part) => part.trim());
            return fields.reduce((record, field, index) => {
                record[field] = parts[index] || '';
                return record;
            }, {});
        })
        .filter((item) => Object.values(item).some(Boolean));
};

const fileToDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('Could not read image file.'));
    reader.readAsDataURL(file);
});

export default function AdminDashboard({ session }) {
    const [orders, setOrders] = useState([]);
    const [historyOrders, setHistoryOrders] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [ingredients, setIngredients] = useState([]);
    const [menuItems, setMenuItems] = useState([]);
    const [activeTab, setActiveTab] = useState('kds'); 
    
    // Multi-tenant state: Derived from Auth session
    const [currentVendorId, setCurrentVendorId] = useState(null);
    const [vendorConfig, setVendorConfig] = useState(null);
    const [profile, setProfile] = useState(null);

    // CMS State
    const [newStallEvent, setNewStallEvent] = useState({
        name: '',
        banner_text: '',
        stall_date: '',
        preorder_start_date: '',
        preorder_deadline: ''
    });
    const [isSavingStall, setIsSavingStall] = useState(false);
    const [editingMenuItem, setEditingMenuItem] = useState({ id: null, name: '', price: '', image_url: '' });

    const [locations, setLocations] = useState([]);
    const [selectedLocation, setSelectedLocation] = useState('all');
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isVaultUnlocked, setIsVaultUnlocked] = useState(false);
    const [vaultPassword, setVaultPassword] = useState('');
    const [vaultError, setVaultError] = useState('');
    const [unlocking, setUnlocking] = useState(false);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const [vaultTimer, setVaultTimer] = useState(20); // 20-second auto-lock timer
    
    // Delete Account State
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteConfirmationWord, setDeleteConfirmationWord] = useState('');
    const [isDeletingAccount, setIsDeletingAccount] = useState(false);
    
    // Phase 11: CMS Sub-navigation
    const [cmsActiveSubTab, setCmsActiveSubTab] = useState('menu'); // 'menu' | 'gallery' | 'branches' | 'events' | 'branding'
    const [isSavingBranch, setIsSavingBranch] = useState(false);
    const [newBranch, setNewBranch] = useState({ name: '', address: '', google_maps_url: '', office_hours: '', is_active: true });
    const [editingBranch, setEditingBranch] = useState(null);
    const [heroImageFile, setHeroImageFile] = useState(null);
    const [logoFile, setLogoFile] = useState(null);
    const [uploadingHero, setUploadingHero] = useState(false);
    const [brandingActivePanel, setBrandingActivePanel] = useState('overview');
    const [cmsCopilotPrompt, setCmsCopilotPrompt] = useState('');
    const [cmsCopilotLoading, setCmsCopilotLoading] = useState(false);
    const [cmsCopilotDraft, setCmsCopilotDraft] = useState(null);
    
    // Menu Image Upload State
    const [menuImageFile, setMenuImageFile] = useState(null);
    const [uploadingMenuImage, setUploadingMenuImage] = useState(false);
    const [siteGallery, setSiteGallery] = useState([]);
    const [galleryImageFile, setGalleryImageFile] = useState(null);
    const [newGalleryCaption, setNewGalleryCaption] = useState('');
    const [uploadingGalleryImage, setUploadingGalleryImage] = useState(false);

    // Custom Live Chat & KDS Clock State
    const [liveTime, setLiveTime] = useState(new Date().toLocaleTimeString());
    const [chats, setChats] = useState([]);
    const [activeChatSession, setActiveChatSession] = useState(null);
    const [newAdminMessage, setNewAdminMessage] = useState('');
    const [historyFilter, setHistoryFilter] = useState('all');
    
    // Arrival Alert Toast Trigger
    const [arrivalAlert, setArrivalAlert] = useState(null);
    
    // Phase 12: Logistics & Security PIN
    const [chatMode, setChatMode] = useState('active'); // 'active' | 'history'
    const [isVerifyingPin, setIsVerifyingPin] = useState(null); // stores order object when verifying
    const [verificationPin, setVerificationPin] = useState('');
    const [pinError, setPinError] = useState('');
    const [isSavingLogistics, setIsSavingLogistics] = useState(false);

    // Phase 13: Vault Categorization
    const [vaultActiveSection, setVaultActiveSection] = useState(null); // null | 'paystack' | 'netcash' | 'domains' | 'whatsapp'
    const [isSavingVault, setIsSavingVault] = useState(false);
    const vaultSectionLabels = {
        paystack: 'Paystack',
        netcash: 'Netcash',
        domains: 'Custom Domains',
        whatsapp: 'WhatsApp Bot',
        resend: 'Resend Email',
        ai_keys: 'AI Manager Keys'
    };
    const vaultSectionMeta = {
        paystack: { label: 'Paystack', description: 'Payment processing keys', badge: '$', accent: 'rgba(198,161,91,0.38)' },
        netcash: { label: 'Netcash', description: 'Alternative payments', badge: 'N', accent: 'rgba(59,130,246,0.35)' },
        domains: { label: 'Custom Domains', description: 'DNS and branding URLs', badge: 'DNS', accent: 'rgba(245,158,11,0.32)' },
        whatsapp: { label: 'WhatsApp Bot', description: 'Automated notifications', badge: 'WA', accent: 'rgba(34,197,94,0.34)' },
        resend: { label: 'Resend Email', description: 'PIN delivery via email', badge: '@', accent: 'rgba(99,102,241,0.34)' },
        ai_keys: { label: 'AI Manager Keys', description: 'Grok and Gemini API keys', badge: 'AI', accent: 'rgba(139,92,246,0.38)' }
    };

    // Global Search State
    const [kdsSearchQuery, setKdsSearchQuery] = useState('');
    const [historySearchQuery, setHistorySearchQuery] = useState('');

    // Phase 15: Monetization
    const [showBillingModal, setShowBillingModal] = useState(false);
    const [isInitiatingBilling, setIsInitiatingBilling] = useState(false);

    // Phase 16: Customers & Testimonials
    const [testimonials, setTestimonials] = useState([]);
    const [reservations, setReservations] = useState([]);
    const [studioClients, setStudioClients] = useState([]);
    const [studioAppointments, setStudioAppointments] = useState([]);
    const [savingClient, setSavingClient] = useState(false);
    const [savingAppointment, setSavingAppointment] = useState(false);
    const [clientForm, setClientForm] = useState({
        id: null,
        full_name: '',
        phone: '',
        email: '',
        instagram_handle: '',
        preferred_contact_method: 'whatsapp',
        payment_status: 'inquiry',
        status: 'lead',
        notes: '',
        measurements: ''
    });
    const [appointmentForm, setAppointmentForm] = useState({
        id: null,
        client_id: '',
        appointment_type: 'consultation',
        status: 'pending',
        appointment_date: '',
        appointment_time: '',
        fitting_date: '',
        fitting_time: '',
        look_type: '',
        garment_type: '',
        budget_range: '',
        payment_status: 'inquiry',
        deposit_amount: '',
        balance_amount: '',
        contact_name: '',
        contact_phone: '',
        contact_email: '',
        special_requests: '',
        internal_notes: ''
    });
    const [showGateModal, setShowGateModal] = useState(false);

    // Phase 17: AI Manager
    const [aiMessages, setAiMessages] = useState([{
        role: 'assistant',
        content: 'Hello! I am your AI Manager. I can help with stock updates, inventory risks, and day-to-day operations across your shop.'
    }]);
    const [aiInput, setAiInput] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const [aiPendingAction, setAiPendingAction] = useState(null);
    const [aiActionLoading, setAiActionLoading] = useState(false);
    const aiChatEndRef = React.useRef(null);
    const userRole = profile?.role || 'owner';
    const isStaff = userRole === 'staff';
    const allowedTabs = isStaff ? ['inventory', 'ai', 'help'] : null;

    const defaultAiGreeting = isStaff
        ? 'Hello! I am your Studio Copilot. I can help you log inventory, and point out stock risks.'
        : 'Hello! I am your AI Manager. I can help with bookings, orders, and day-to-day operations across your studio.';

    const resolvedVendorLogo = vendorConfig?.logo_url || vendorConfig?.branding?.logo_url || '';
    const brandingValue = (key) => vendorConfig?.branding?.[key] ?? KINGS_WEAR_DEFAULT_BRANDING[key] ?? '';
    const brandingLines = (key, fields) => toEditableLines(
        Array.isArray(vendorConfig?.branding?.[key]) ? vendorConfig.branding[key] : KINGS_WEAR_DEFAULT_BRANDING[key],
        fields
    );
    const uploadBrandingImage = async (file, folder) => {
        if (!file) return '';

        const fileExt = file.name.split('.').pop();
        const fileName = `${folder}_${Date.now()}.${fileExt}`;
        const filePath = `${folder}/${fileName}`;
        const candidateBuckets = ['business-documents', 'brand-assets', 'public-assets', 'images'];

        for (const bucket of candidateBuckets) {
            const { error: uploadError } = await supabase.storage
                .from(bucket)
                .upload(filePath, file);

            if (!uploadError) {
                const { data: { publicUrl } } = supabase.storage
                    .from(bucket)
                    .getPublicUrl(filePath);
                return publicUrl;
            }

            const message = String(uploadError.message || '').toLowerCase();
            if (!message.includes('bucket not found') && !message.includes('not found')) {
                throw uploadError;
            }
        }

        if (file.size > 900000) {
            throw new Error('No public storage bucket exists yet, so full-quality logos cannot be uploaded. Apply supabase/30-create-public-brand-storage.sql to the live Supabase project, then upload this logo again.');
        }

        return await fileToDataUrl(file);
    };
    const vendorInitials = (vendorConfig?.name || 'Studio')
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() || '')
        .join('') || 'S';

    const getOrderItemName = (item) =>
        item?.menu_items?.name ||
        item?.name ||
        item?.service_name ||
        item?.title ||
        'Client Item';

    useEffect(() => {
        aiChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [aiMessages, aiLoading]);

    //  Navigation Icons (Minimal SVGs)
    const Icons = {
        Dashboard: () => (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="9"></rect>
                <rect x="14" y="3" width="7" height="5"></rect>
                <rect x="14" y="11" width="7" height="10"></rect>
                <rect x="3" y="15" width="7" height="6"></rect>
            </svg>
        ),
        Kitchen: () => (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2l9 4.9V17L12 22l-9-4.9V7z"></path>
                <path d="M12 22V12"></path>
                <path d="M21 7l-9 5-9-5"></path>
            </svg>
        ),
        Chat: () => (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
        ),
        History: () => (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
                <path d="M3.3 7a9 9 0 1 1 0 10"></path>
            </svg>
        ),
        Finance: () => (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="5" width="20" height="14" rx="2"></rect>
                <line x1="2" y1="10" x2="22" y2="10"></line>
            </svg>
        ),
        Inventory: () => (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"></path>
                <polyline points="3.29 7 12 12 20.71 7"></polyline>
                <line x1="12" y1="22" x2="12" y2="12"></line>
            </svg>
        ),
        Logistics: () => (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="3" width="15" height="13"></rect>
                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
                <circle cx="5.5" cy="18.5" r="2.5"></circle>
                <circle cx="18.5" cy="18.5" r="2.5"></circle>
            </svg>
        ),
        Settings: () => (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
        ),
        Testimonials: () => (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                <path d="M9 10l2 2 4-4"></path>
            </svg>
        ),
        Users: () => (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
        ),
        Help: () => (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
        ),
        Calendar: () => (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
        ),
        CreditCard: () => (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                <line x1="1" y1="10" x2="23" y2="10"></line>
            </svg>
        ),
        Brain: () => (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-2.14Z"></path>
                <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-2.14Z"></path>
            </svg>
        )
    };

    useEffect(() => {
        const timer = setInterval(() => setLiveTime(new Date().toLocaleTimeString()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const loadProfileAndData = async () => {
            if (!session?.user?.id) return;

            // 1. Fetch Profile to get vendor_id
            const { data: profileData, error: pErr } = await supabase
                .from('profiles')
                .select('vendor_id, full_name, role')
                .eq('id', session.user.id)
                .single();

            if (pErr || !profileData) {
                console.warn("Profile table entry not found, using session metadata fallback...");
                const metadata = session.user.user_metadata;
                if (metadata?.vendor_id) {
                    const fallbackProfile = {
                        vendor_id: metadata.vendor_id,
                        full_name: metadata.full_name || 'Shop Owner',
                        role: metadata.role || 'owner'
                    };
                    setProfile(fallbackProfile);
                    setCurrentVendorId(metadata.vendor_id);
                    return;
                }
                console.error("Critical: No vendor_id found in profile OR metadata.", pErr);
                return;
            }

            setProfile(profileData);
            setCurrentVendorId(profileData.vendor_id);
            setLoading(false); // Make sure dashboard can proceed
        };

        loadProfileAndData().finally(() => setLoading(false));
    }, [session]);

    useEffect(() => {
        if (!currentVendorId) return;
        fetchInitialData();

        if (isStaff) {
            return;
        }

        // 1. Subscribe to Realtime Updates on the 'orders' table
        const channel = supabase
            .channel('public:orders')
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'orders' },
                (payload) => {
                    const updatedOrder = payload.new;

                    setOrders(currentOrders => {
                        const existingOrder = currentOrders.find(o => o.id === updatedOrder.id);
                        
                        let shouldDing = false;
                        if (updatedOrder.status === 'paid' && (!existingOrder || existingOrder.status !== 'paid')) {
                            shouldDing = true;
                        }
                        // Customer notified they arrived
                        if (updatedOrder.customer_arrived && existingOrder && !existingOrder.customer_arrived) {
                            shouldDing = true;
                            // Trigger visible toast notification
                            setArrivalAlert(updatedOrder);
                            setTimeout(() => setArrivalAlert(null), 10000); // Hide after 10s
                        }

                        if (shouldDing) playDing();

                        if (existingOrder) {
                            if (updatedOrder.status === 'completed' || updatedOrder.status === 'refunded') {
                                // Move it out of active queue and into history
                                setHistoryOrders(curr => {
                                    if (!curr.find(o => o.id === updatedOrder.id)) {
                                        return [{ ...existingOrder, ...updatedOrder }, ...curr];
                                    }
                                    return curr;
                                });
                                return currentOrders.filter(o => o.id !== updatedOrder.id);
                            }
                            // Merge payload to preserve nested order_items
                            return currentOrders.map(o => o.id === updatedOrder.id ? { ...o, ...updatedOrder } : o);
                        } else {
                            // Only add to dashboard if not completed
                            if (updatedOrder.status !== 'completed' && updatedOrder.status !== 'refunded') {
                                return [updatedOrder, ...currentOrders];
                            } else {
                                // If we don't have it, but it updated to completed, we should ideally fetch it.
                                // For now it will populate on next refresh.
                            }
                            return currentOrders;
                        }
                    });
                }
            )
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'orders' },
                async (payload) => {
                    const newOrderRow = payload.new;
                    
                    // Fashion Central may not have the restaurant-style menu relation.
                    // Pull a flatter order shape so the dashboard can still render.
                    let { data: fullOrder, error: fullOrderErr } = await supabase
                        .from('orders')
                        .select(`
                            *,
                            order_items (
                                quantity,
                                modifiers_json,
                                menu_item_id,
                                name
                            )
                        `)
                        .eq('id', newOrderRow.id)
                        .single();

                    if (fullOrderErr && String(fullOrderErr.message || '').includes('modifiers_json')) {
                        const retry = await supabase
                            .from('orders')
                            .select(`
                                *,
                                order_items (
                                    quantity,
                                    menu_item_id,
                                    name
                                )
                            `)
                            .eq('id', newOrderRow.id)
                            .single();
                        fullOrder = retry.data;
                    }

                    const newOrder = fullOrder || newOrderRow; // Fallback to shallow if fetch fails

                    if (newOrder.status === 'paid') playDing();
                    if (newOrder.status !== 'completed' && newOrder.status !== 'refunded') {
                        setOrders(current => [newOrder, ...current]);
                    }
                }
            )
            .subscribe();

        // 2. Subscribe to Support Chats
        const chatChannel = supabase
            .channel('public:support_chats')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'support_chats' },
                (payload) => {
                    const newChat = payload.new;
                    if (newChat.vendor_id === currentVendorId) {
                        setChats(current => [...current, newChat]);
                        if (newChat.sender_type === 'customer') playDing();
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
            supabase.removeChannel(chatChannel);
        };
    }, [currentVendorId, isStaff]);

    // Auto-Lock Inactivity Timer for the Vault
    useEffect(() => {
        let countdown;
        let activityListener;

        if (isVaultUnlocked) {
            // Reset timer to 20 when vault is first opened
            setVaultTimer(20);

            // Interval to count down
            countdown = setInterval(() => {
                setVaultTimer(prev => {
                    if (prev <= 1) {
                        setIsVaultUnlocked(false);
                        setVaultPassword('');
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            // Reset timer on any activity
            activityListener = () => {
                setVaultTimer(20);
            };
            
            window.addEventListener('mousemove', activityListener);
            window.addEventListener('keydown', activityListener);
            window.addEventListener('click', activityListener);
            window.addEventListener('touchstart', activityListener);
        }

        return () => {
            clearInterval(countdown);
            window.removeEventListener('mousemove', activityListener);
            window.removeEventListener('keydown', activityListener);
            window.removeEventListener('click', activityListener);
            window.removeEventListener('touchstart', activityListener);
        };
    }, [isVaultUnlocked]);

    async function fetchInitialData() {
        if (!currentVendorId) return;
        setIsRefreshing(true);
        try {
            if (isStaff) {
                const { data: publicVendorData } = await supabase
                    .from('public_vendors')
                    .select('id, name, branding')
                    .eq('id', currentVendorId)
                    .single();

                if (publicVendorData) {
                    setVendorConfig({
                        id: publicVendorData.id,
                        name: publicVendorData.name,
                        branding: publicVendorData.branding || {},
                        logo_url: publicVendorData?.branding?.logo_url || null
                    });
                }

                const { data: locData } = await supabase
                    .from('locations')
                    .select('id, name, is_active')
                    .eq('vendor_id', currentVendorId);
                if (locData) setLocations(locData);

                const { data: ingData, error: ingErr } = await supabase
                    .from('ingredients')
                    .select('*')
                    .eq('vendor_id', currentVendorId)
                    .order('name');

                if (ingErr) throw ingErr;
                setIngredients(ingData || []);

                setOrders([]);
                setHistoryOrders([]);
                setExpenses([]);
                setMenuItems([]);
                setSiteGallery([]);
                setChats([]);
                setTestimonials([]);
                setReservations([]);
                setStudioClients([]);
                setStudioAppointments([]);
                return;
            }

            const { data: vData } = await supabase.from('vendors').select('*').eq('id', currentVendorId).single();
            if (vData) setVendorConfig(vData);

            let locData = [];
            const { data: rawLocData, error: locErr } = await supabase.from('locations').select('*').eq('vendor_id', currentVendorId);
            if (locErr) {
                console.warn('Locations table unavailable for this project yet:', locErr.message);
                setLocations([]);
            } else {
                locData = rawLocData || [];
                setLocations(locData);
            }

            let { data: orderData, error: orderErr } = await supabase
                .from('orders')
                .select(`
                    *,
                    order_items (
                        quantity,
                        modifiers_json,
                        menu_item_id,
                        name
                    )
                `)
                .eq('vendor_id', currentVendorId)
                .neq('status', 'pending') 
                .order('created_at', { ascending: false });

            if (orderErr && String(orderErr.message || '').includes('modifiers_json')) {
                const retry = await supabase
                    .from('orders')
                    .select(`
                        *,
                        order_items (
                            quantity,
                            menu_item_id,
                            name
                        )
                    `)
                    .eq('vendor_id', currentVendorId)
                    .neq('status', 'pending')
                    .order('created_at', { ascending: false });
                orderData = retry.data;
                orderErr = retry.error;
            }

            if (orderErr) throw orderErr;

            const active = orderData?.filter(o => o.status !== 'completed' && o.status !== 'refunded') || [];
            const history = orderData?.filter(o => o.status === 'completed' || o.status === 'refunded') || [];

            setOrders(active);
            setHistoryOrders(history);

            const { data: expData, error: expErr } = await supabase
                .from('expenses')
                .select('*')
                .eq('vendor_id', currentVendorId)
                .order('created_at', { ascending: false });

            if (!expErr && expData) {
                setExpenses(expData);
            }

            const { data: ingData, error: ingErr } = await supabase
                .from('ingredients')
                .select('*')
                .eq('vendor_id', currentVendorId)
                .order('name');

            if (!ingErr && ingData) {
                setIngredients(ingData);
            }

            const { data: menuData, error: menuErr } = await supabase
                .from('menu_items')
                .select('*')
                .eq('vendor_id', currentVendorId)
                .order('price');

            if (!menuErr && menuData) {
                setMenuItems(menuData);
            }

            const { data: galleryData, error: galleryErr } = await supabase
                .from('site_gallery')
                .select('*')
                .eq('vendor_id', currentVendorId)
                .order('created_at', { ascending: false });

            if (!galleryErr && galleryData) {
                setSiteGallery(galleryData);
            }

            const { data: chatData } = await supabase
                .from('support_chats')
                .select('*')
                .eq('vendor_id', currentVendorId)
                .order('created_at', { ascending: true });
            
            if (chatData) {
                setChats(chatData);
            }

            const { data: reservationData, error: reservationErr } = await supabase
                .from('reservations')
                .select('*')
                .eq('vendor_id', currentVendorId)
                .order('reservation_date', { ascending: true })
                .order('reservation_time', { ascending: true });

            if (reservationErr) {
                console.warn('Reservations table unavailable for this project yet:', reservationErr.message);
                setReservations([]);
            } else if (reservationData) {
                setReservations(reservationData);
            }

            const { data: testData } = await supabase
                .from('testimonials')
                .select('*')
                .eq('vendor_id', currentVendorId)
                .order('created_at', { ascending: false });
            
            if (testData) {
                setTestimonials(testData);
            }

            const { data: clientData, error: clientErr } = await supabase
                .from('stylist_clients')
                .select('*')
                .eq('vendor_id', currentVendorId)
                .order('created_at', { ascending: false });

            if (clientErr) {
                console.warn('Stylist clients table unavailable for this project yet:', clientErr.message);
                setStudioClients([]);
            } else if (clientData) {
                setStudioClients(clientData);
            }

            const { data: appointmentData, error: appointmentErr } = await supabase
                .from('stylist_appointments')
                .select('*')
                .eq('vendor_id', currentVendorId)
                .order('appointment_date', { ascending: true })
                .order('appointment_time', { ascending: true });

            if (appointmentErr) {
                console.warn('Stylist appointments table unavailable for this project yet:', appointmentErr.message);
                setStudioAppointments([]);
            } else if (appointmentData) {
                setStudioAppointments(appointmentData);
            }

        } catch (err) {
            console.error('Error fetching dashboard data:', err.message);
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    }

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    const handleAiSend = async (e) => {
        if (e) e.preventDefault();
        if (!aiInput.trim() || !currentVendorId || aiLoading) return;

        const userMessage = { role: 'user', content: aiInput.trim() };
        const nextMessages = [...aiMessages, userMessage];
        setAiMessages(nextMessages);
        setAiInput('');
        setAiLoading(true);

        try {
            const { data, error } = await supabase.functions.invoke('admin-ai-manager', {
                body: {
                    vendorId: currentVendorId,
                    message: userMessage.content,
                    messages: nextMessages.slice(-8)
                }
            });

            if (error) throw error;

            setAiPendingAction(data?.pending_action || null);

            setAiMessages(current => [
                ...current,
                {
                    role: 'assistant',
                    content: data?.reply || 'I could not generate a useful answer just now.'
                }
            ]);
        } catch (err) {
            console.error('AI manager error:', err);
            setAiMessages(current => [
                ...current,
                {
                    role: 'assistant',
                    content: 'I hit a problem while checking your business data. Please confirm your AI keys are saved in the vault and that the admin-ai-manager function is deployed.'
                }
            ]);
        } finally {
            setAiLoading(false);
        }
    };

    const handleAiInventoryConfirm = async () => {
        if (!aiPendingAction || aiActionLoading || !currentVendorId) return;
        setAiActionLoading(true);

        try {
            const { data, error } = await supabase.functions.invoke('apply-inventory-adjustment', {
                body: {
                    vendorId: currentVendorId,
                    ingredientId: aiPendingAction.ingredient_id,
                    operation: aiPendingAction.operation,
                    quantity: aiPendingAction.quantity,
                    note: `AI Manager confirmed update: ${aiPendingAction.ingredient_name}`
                }
            });

            if (error) throw error;

            if (data?.ingredient) {
                setIngredients(current =>
                    current
                        .map(ingredient => ingredient.id === data.ingredient.id ? { ...ingredient, ...data.ingredient } : ingredient)
                        .sort((a, b) => a.name.localeCompare(b.name))
                );
            }

            setAiMessages(current => [
                ...current,
                {
                    role: 'assistant',
                    content: `Done. ${aiPendingAction.ingredient_name} is now ${data?.new_stock} in stock.`
                }
            ]);
            setAiPendingAction(null);
        } catch (err) {
            console.error('AI inventory update error:', err);
            setAiMessages(current => [
                ...current,
                {
                    role: 'assistant',
                    content: 'I could not apply that stock update. Please try again or update the ingredient manually in Inventory.'
                }
            ]);
        } finally {
            setAiActionLoading(false);
        }
    };

    const handleCmsCopilotGenerate = async () => {
        if (!cmsCopilotPrompt.trim() || !currentVendorId || !vendorConfig || cmsCopilotLoading) return;
        setCmsCopilotLoading(true);

        try {
            const { data, error } = await supabase.functions.invoke('website-cms-copilot', {
                body: {
                    vendorId: currentVendorId,
                    prompt: cmsCopilotPrompt.trim(),
                    currentBranding: vendorConfig.branding || {},
                    vendorName: vendorConfig.name
                }
            });

            if (error) throw error;

            setCmsCopilotDraft({
                ...data?.draft,
                reply: data?.reply || ''
            });
        } catch (err) {
            console.error('Website CMS copilot error:', err);
            alert('Website CMS Copilot could not generate a draft. Please confirm your AI keys are saved in the vault and that the website-cms-copilot function is deployed.');
        } finally {
            setCmsCopilotLoading(false);
        }
    };

    const applyCmsCopilotDraft = () => {
        if (!cmsCopilotDraft) return;

        setVendorConfig((current) => {
            if (!current) return current;

            const nextBranding = {
                ...(current.branding || {}),
                ...(cmsCopilotDraft.tagline ? { tagline: cmsCopilotDraft.tagline } : {}),
                ...(cmsCopilotDraft.welcome_text ? { welcome_text: cmsCopilotDraft.welcome_text } : {}),
                ...(cmsCopilotDraft.hero_title ? { hero_title: cmsCopilotDraft.hero_title } : {}),
                ...(cmsCopilotDraft.hero_highlight ? { hero_highlight: cmsCopilotDraft.hero_highlight } : {}),
                ...(cmsCopilotDraft.hero_subtitle ? { hero_subtitle: cmsCopilotDraft.hero_subtitle } : {}),
                ...(cmsCopilotDraft.about_text ? { about_text: cmsCopilotDraft.about_text } : {}),
                ...(/^#[0-9a-f]{6}$/i.test(String(cmsCopilotDraft.primary_color || '').trim()) ? { primary_color: String(cmsCopilotDraft.primary_color).trim() } : {})
            };

            return {
                ...current,
                branding: nextBranding
            };
        });

        alert('AI draft applied to the branding fields. Save Brand Identity when you are happy with it.');
    };

    const generateAiReportPdf = () => {
        if (!aiPendingAction || aiPendingAction.type !== 'pdf_report' || !vendorConfig) return;

        const doc = new jsPDF();
        const brand = vendorConfig.branding || {};
        const vendorName = vendorConfig.name || 'Vendor Report';
        const primaryColor = brand.primary_color || '#0f172a';
        const primaryRgb = primaryColor.startsWith('#') && (primaryColor.length === 7 || primaryColor.length === 4)
            ? primaryColor
                  .replace('#', '')
                  .match(primaryColor.length === 4 ? /.{1}/g : /.{2}/g)
                  ?.map((part) => primaryColor.length === 4 ? parseInt(part + part, 16) : parseInt(part, 16))
            : [15, 23, 42];

        const [r, g, b] = Array.isArray(primaryRgb) && primaryRgb.length === 3 ? primaryRgb : [15, 23, 42];
        doc.setFillColor(r, g, b);
        doc.rect(0, 0, 210, 30, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(20);
        doc.text(vendorName, 14, 16);
        doc.setFontSize(11);
        doc.text(aiPendingAction.title || 'Business Report', 14, 24);

        doc.setTextColor(31, 41, 55);
        doc.setFontSize(10);
        doc.text(aiPendingAction.subtitle || '', 14, 38);
        doc.text(`Generated: ${new Date(aiPendingAction.generated_at || Date.now()).toLocaleString()}`, 14, 44);

        if (brand.tagline) {
            doc.text(String(brand.tagline), 14, 50);
        }

        const formatPdfValue = (value, format) => {
            if (format === 'currency') return `R ${Number(value || 0).toFixed(2)}`;
            if (format === 'date') return value ? new Date(value).toLocaleDateString() : '-';
            return value ?? '-';
        };

        autoTable(doc, {
            startY: brand.tagline ? 58 : 54,
            head: [(aiPendingAction.columns || []).map((column) => column.label)],
            body: (aiPendingAction.rows || []).map((row) =>
                (aiPendingAction.columns || []).map((column) => formatPdfValue(row[column.key], column.format))
            ),
            styles: {
                fontSize: 10,
                cellPadding: 3
            },
            headStyles: {
                fillColor: [r, g, b]
            }
        });

        const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY : 80;
        doc.setFontSize(11);
        doc.setTextColor(31, 41, 55);
        const summaryEntries = Object.entries(aiPendingAction.summary || {});
        summaryEntries.forEach(([key, value], index) => {
            const humanKey = key.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
            const formattedValue = /revenue|spend|value|expense/i.test(key)
                ? `R ${Number(value || 0).toFixed(2)}`
                : value;
            doc.text(`${humanKey}: ${formattedValue}`, 14, finalY + 12 + (index * 8));
        });

        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text('Powered by VulaHub', 14, finalY + 20 + (summaryEntries.length * 8));

        const fileSlug = (vendorConfig.slug || vendorName || 'vendor')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
        const reportSlug = String(aiPendingAction.title || 'report')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');

        doc.save(`${fileSlug}_${reportSlug}_${Date.now()}.pdf`);

        setAiMessages((current) => [
            ...current,
            {
                role: 'assistant',
                content: `Your PDF is ready. I generated ${aiPendingAction.title?.toLowerCase() || 'the report'} with ${vendorName} leading the branding and VulaHub kept secondary.`
            }
        ]);
        setAiPendingAction(null);
    };

    const updateOrderStatus = async (orderId, newStatus) => {
        const order = orders.find(o => o.id === orderId);
        if (!order) return;

        try {
            // Deduct inventory if moving away from 'paid' to a preparation state
            if ((newStatus === 'preparing' || newStatus === 'ready') && order.status === 'paid') {
                console.log(`Inventory: Deducting for order ${orderId} moving to ${newStatus}`);
                if (order && order.order_items) {
                    const inventoryDeductions = {};

                    // Sum up all ingredients needed for this entire order
                    order.order_items.forEach(item => {
                        const recipe = item.menu_items?.recipe_json || {};
                        const qty = Number(item.quantity || 1);

                        Object.keys(recipe).forEach(ingredientName => {
                            const amountPerItem = Number(recipe[ingredientName]);
                            inventoryDeductions[ingredientName] = (inventoryDeductions[ingredientName] || 0) + (amountPerItem * qty);
                        });
                    });

                    // Deduct each ingredient from the database
                    for (const ingredientName of Object.keys(inventoryDeductions)) {
                        const amountToDeduct = inventoryDeductions[ingredientName];

                        // Fetch current stock directly from DB to prevent race conditions
                        const { data: invData, error: fetchErr } = await supabase
                            .from('ingredients')
                            .select('id, current_stock')
                            .eq('name', ingredientName)
                            .eq('vendor_id', currentVendorId)
                            .maybeSingle();

                        if (!fetchErr && invData && invData.current_stock !== null) {
                            const newStock = Math.max(0, Number(invData.current_stock) - amountToDeduct);
                            await supabase
                                .from('ingredients')
                                .update({ current_stock: newStock })
                                .eq('id', invData.id);
                        }
                    }

                    // Refresh inventory state silently to reflect deductions
                    supabase.from('ingredients').select('*').order('name').then(({ data }) => {
                        if (data) setIngredients(data);
                    });
                }
            }

            // Optimistic UI update
            if (newStatus === 'completed' || newStatus === 'refunded') {
                const orderToMove = orders.find(o => o.id === orderId);
                if (orderToMove) {
                    const finishedOrder = { ...orderToMove, status: newStatus };
                    setOrders(current => current.filter(o => o.id !== orderId));
                    setHistoryOrders(curr => [finishedOrder, ...curr]);
                }
            } else {
                setOrders(current => current.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
            }

            const { error } = await supabase
                .from('orders')
                .update({ status: newStatus })
                .eq('id', orderId);

            if (error) {
                // Revert on failure
                fetchInitialData();
                throw error;
            }
        } catch (err) {
            console.error("Failed to update status", err);
            alert("Could not update order status.");
        }
    };

    // Phase 4: Business Intelligence - Basic CSV Export (Active Queue)
    const exportToCSV = () => {
        if (orders.length === 0) {
            alert("No data to export right now.");
            return;
        }

        const headers = ['Order Number', 'Date', 'Status', 'Customer', 'WhatsApp', 'Total (ZAR)'];
        const rows = orders.map(o => [
            o.order_number,
            new Date(o.created_at).toLocaleString(),
            o.status,
            o.customer_name,
            o.customer_phone,
            o.total_price
        ]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `kotaguard_active_queue_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // History Filter Logic
    const displayedHistoryOrders = historyFilter === 'today'
        ? historyOrders.filter(o => {
            const d = new Date(o.created_at);
            const today = new Date();
            return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
        })
        : historyOrders;

    const crmClients = studioClients;
    const upcomingAppointments = [...studioAppointments]
        .sort((a, b) => new Date(`${a.appointment_date}T${a.appointment_time || '00:00'}`) - new Date(`${b.appointment_date}T${b.appointment_time || '00:00'}`));

    // Phase 7: History Vault PDF Export
    const exportPDF = () => {
        if (displayedHistoryOrders.length === 0) return alert("No history to export.");

        const doc = new jsPDF();
        doc.text(`${vendorConfig.name}`, 14, 15);
        doc.setFontSize(10);
        doc.text(`Studio powered by VulaHub`, 14, 20);
        doc.text(`CRM & Sales Report (${historyFilter.toUpperCase()})`, 14, 25);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);

        const tableColumn = ["Order #", "Date", "Customer", "WhatsApp Num", "Items", "Total"];
        const tableRows = [];

        displayedHistoryOrders.forEach(order => {
            const itemsStr = order.order_items?.map(i => `${i.quantity}x ${getOrderItemName(i)}`).join(', ') || '';
            const rowData = [
                order.order_number,
                new Date(order.created_at).toLocaleDateString(),
                order.customer_name,
                order.customer_phone,
                itemsStr,
                `R ${order.total_price}`
            ];
            tableRows.push(rowData);
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 40,
        });

        const totalRev = displayedHistoryOrders.reduce((sum, o) => sum + Number(o.total_price || 0), 0);
        // lastAutoTable might be attached directly to doc
        const finalRevY = doc.lastAutoTable ? doc.lastAutoTable.finalY : 40 + (tableRows.length * 10);
        doc.text(`Total Revenue in report: R ${totalRev}`, 14, finalRevY + 10);
        
        doc.setFontSize(9);
        doc.setTextColor(150);
        doc.text(`FASHION CENTRAL  Studio operations by VulaHub`, 14, finalRevY + 20);

        doc.save(`${vendorConfig.slug}_sales_report_${new Date().getTime()}.pdf`);
    };

    // Phase 16: Testimonial Management
    const addTestimonial = async () => {
        const quote = window.prompt("Enter the testimonial quote:");
        if (!quote) return;
        const author_name = window.prompt("Enter the customer's name:");
        if (!author_name) return;
        const author_role = window.prompt("Enter customer's role/location (optional):") || "Customer";

        try {
            const { data, error } = await supabase
                .from('testimonials')
                .insert({
                    vendor_id: currentVendorId,
                    quote,
                    author_name,
                    author_role
                })
                .select()
                .single();
            
            if (error) throw error;
            setTestimonials([data, ...testimonials]);
            alert("Testimonial added! ");
        } catch (err) {
            alert("Error adding testimonial: " + err.message);
        }
    };

    const toggleTestimonial = async (id, currentStatus) => {
        try {
            const { error } = await supabase
                .from('testimonials')
                .update({ is_active: !currentStatus })
                .eq('id', id);
            
            if (error) throw error;
            setTestimonials(testimonials.map(t => t.id === id ? { ...t, is_active: !currentStatus } : t));
        } catch (err) {
            alert("Error updating testimonial: " + err.message);
        }
    };

    const deleteTestimonial = async (id) => {
        if (!await confirmAction("Are you sure you want to delete this testimonial?")) return;
        try {
            const { error } = await supabase
                .from('testimonials')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            setTestimonials(testimonials.filter(t => t.id !== id));
        } catch (err) {
            alert("Error deleting testimonial: " + err.message);
        }
    };

    // Phase 8: Add Expense with Receipt Upload
    const [newExpense, setNewExpense] = useState({ description: '', amount: '', receiptFile: null });
    const [uploadingReceipt, setUploadingReceipt] = useState(false);

    const handleAddExpense = async (e) => {
        e.preventDefault();
        try {
            setUploadingReceipt(true);
            let receipt_url = null;

            // 1. Upload receipt to Supabase Storage if file exists
            if (newExpense.receiptFile) {
                const fileExt = newExpense.receiptFile.name.split('.').pop();
                const fileName = `${Date.now()}.${fileExt}`;
                const filePath = `receipts/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('business-documents')
                    .upload(filePath, newExpense.receiptFile);

                if (uploadError) {
                    console.error("Upload error (Bucket 'business-documents' might be missing):", uploadError);
                    alert("Could not upload receipt image. Ensure the Storage bucket 'business-documents' exists and is public.");
                } else {
                    const { data: { publicUrl } } = supabase.storage
                        .from('business-documents')
                        .getPublicUrl(filePath);
                    receipt_url = publicUrl;
                }
            }

            // 2. Insert expense record
            const { data, error } = await supabase
                .from('expenses')
                .insert({
                    vendor_id: currentVendorId,
                    description: newExpense.description,
                    amount: parseFloat(newExpense.amount),
                    receipt_url: receipt_url
                })
                .select()
                .single();

            if (error) throw error;

            setExpenses([data, ...expenses]);
            setNewExpense({ description: '', amount: '', receiptFile: null });

            // Clear file input manually
            const fileInput = document.getElementById('receipt-upload');
            if (fileInput) fileInput.value = '';

        } catch (err) {
            console.error(err);
            alert("Could not add expense. Make sure the expenses table exists in Supabase.");
        } finally {
            setUploadingReceipt(false);
        }
    };

    // Phase 9: Add / Delete Ingredients
    const [editingIngredient, setEditingIngredient] = useState({
        id: null,
        name: '',
        current_stock: '',
        low_stock_threshold: '',
        restock_input_label: '',
        restock_input_quantity: '',
        restock_output_quantity: ''
    });
    const [isAddingIngredient, setIsAddingIngredient] = useState(false);

    const handleSaveIngredient = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                name: editingIngredient.name,
                current_stock: parseFloat(editingIngredient.current_stock || 0),
                low_stock_threshold: parseFloat(editingIngredient.low_stock_threshold || 10),
                restock_input_label: (editingIngredient.restock_input_label || '').trim() || null,
                restock_input_quantity: editingIngredient.restock_input_quantity === '' ? null : parseFloat(editingIngredient.restock_input_quantity || 0),
                restock_output_quantity: editingIngredient.restock_output_quantity === '' ? null : parseFloat(editingIngredient.restock_output_quantity || 0)
            };

            let query = supabase.from('ingredients');
            if (editingIngredient.id) {
                query = query.update(payload).eq('id', editingIngredient.id);
            } else {
                query = query.insert([{ ...payload, vendor_id: currentVendorId }]);
            }

            const { data, error } = await query.select();
            if (error) throw error;

            if (editingIngredient.id) {
                setIngredients(ingredients.map(ing => ing.id === editingIngredient.id ? data[0] : ing).sort((a, b) => a.name.localeCompare(b.name)));
            } else {
                setIngredients([...ingredients, data[0]].sort((a, b) => a.name.localeCompare(b.name)));
            }

            setEditingIngredient({ id: null, name: '', current_stock: '', low_stock_threshold: '', restock_input_label: '', restock_input_quantity: '', restock_output_quantity: '' });
            setIsAddingIngredient(false);
        } catch (err) {
            console.error(err);
            alert(`Could not ${editingIngredient.id ? "update" : "add"} ingredient: ` + err.message);
        }
    };

    const handleDeleteIngredient = async (id, name) => {
        if (!await confirmAction(`Are you sure you want to delete ${name}? This might break recipe deductions.`)) return;

        try {
            const { error } = await supabase.from('ingredients').delete().eq('id', id);
            if (error) throw error;
            setIngredients(ingredients.filter(ing => ing.id !== id));
        } catch (err) {
            console.error(err);
            alert("Could not delete ingredient.");
        }
    };

    // Phase 11 & 12: Stall Events Manager
    const handleAddStallEvent = async (e) => {
        e.preventDefault();
        setIsSavingStall(true);
        try {
            const { data, error } = await supabase
                .from('locations')
                .insert([{
                    vendor_id: currentVendorId,
                    name: newStallEvent.name || `Mobile Stall - ${newStallEvent.stall_date || Date.now()}`,
                    banner_text: newStallEvent.banner_text,
                    address: newStallEvent.address,
                    google_maps_url: newStallEvent.google_maps_url,
                    stall_date: newStallEvent.stall_date,
                    preorder_start_date: newStallEvent.preorder_start_date,
                    preorder_deadline: newStallEvent.preorder_deadline,
                    is_mobile: true,
                    is_active: true
                }])
                .select();

            if (error) throw error;
            if (data && data.length > 0) {
                setLocations([...locations, data[0]]);
            }
            alert("New mobile stall event added successfully!");
            setNewStallEvent({ name: '', banner_text: '', address: '', google_maps_url: '', stall_date: '', preorder_start_date: '', preorder_deadline: '' });
        } catch (err) {
            console.error(err);
            alert("Could not add stall event. Name might be duplicate.");
        } finally {
            setIsSavingStall(false);
        }
    };

    const handleDeleteStallEvent = async (id, name) => {
        if (!await confirmAction(`Are you sure you want to delete the event '${name}'?`)) return;
        try {
            const { error } = await supabase.from('locations').delete().eq('id', id);
            if (error) throw error;
            setLocations(locations.filter(l => l.id !== id));
        } catch (err) {
            console.error(err);
            alert("Could not delete the stall event.");
        }
    };

    const [editingRecipeFor, setEditingRecipeFor] = useState(null);
    const [editingRecipeIngredients, setEditingRecipeIngredients] = useState([]);

    const handleSaveRecipe = async () => {
        try {
            const recipeJson = {};
            editingRecipeIngredients.forEach(item => {
                if (item.ingredient && item.quantity > 0) {
                    recipeJson[item.ingredient] = parseFloat(item.quantity);
                }
            });

            const { error } = await supabase.from('menu_items')
                .update({ recipe_json: recipeJson })
                .eq('id', editingRecipeFor.id);

            if (error) throw error;

            setMenuItems(menuItems.map(m => m.id === editingRecipeFor.id ? { ...m, recipe_json: recipeJson } : m));
            alert("Service saved successfully! Material tracking updates when this job moves into production.");
            setEditingRecipeFor(null);
        } catch (err) {
            console.error(err);
            alert("Failed to save recipe: " + err.message);
        }
    };

    const handleAddRecipeIngredientRow = () => setEditingRecipeIngredients([...editingRecipeIngredients, { ingredient: '', quantity: '' }]);
    const handleRemoveRecipeIngredientRow = (index) => setEditingRecipeIngredients(editingRecipeIngredients.filter((_, i) => i !== index));
    const handleRecipeIngredientChange = (index, field, value) => {
        const newArr = [...editingRecipeIngredients];
        newArr[index][field] = value;
        setEditingRecipeIngredients(newArr);
    };

    const openRecipeBuilder = (menuItem) => {
        setEditingRecipeFor(menuItem);
        const existingRecipe = menuItem.recipe_json || {};
        const rows = Object.keys(existingRecipe).map(key => ({ ingredient: key, quantity: existingRecipe[key] }));
        setEditingRecipeIngredients(rows.length > 0 ? rows : [{ ingredient: '', quantity: '' }]);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSaveMenuItem = async (e) => {
        e.preventDefault();
        try {
            setUploadingMenuImage(true);
            let finalImageUrl = editingMenuItem.image_url || null;

            if (menuImageFile) {
                const fileExt = menuImageFile.name.split('.').pop();
                const fileName = `menu_${Date.now()}.${fileExt}`;
                const filePath = `menu-images/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('business-documents')
                    .upload(filePath, menuImageFile);

                if (uploadError) {
                    console.error("Upload error:", uploadError);
                    alert("Could not upload menu image.");
                    setUploadingMenuImage(false);
                    return;
                }
                
                const { data: { publicUrl } } = supabase.storage
                    .from('business-documents')
                    .getPublicUrl(filePath);
                
                finalImageUrl = publicUrl;
            }

            if (editingMenuItem.id) {
                // Update existing item
                const { error } = await supabase.from('menu_items')
                    .update({
                        name: editingMenuItem.name,
                        price: parseFloat(editingMenuItem.price),
                        image_url: finalImageUrl
                    })
                    .eq('id', editingMenuItem.id);

                if (error) throw error;

                setMenuItems(menuItems.map(item => item.id === editingMenuItem.id ? { ...editingMenuItem, image_url: finalImageUrl, price: parseFloat(editingMenuItem.price) } : item).sort((a, b) => a.price - b.price));
                alert("Menu item updated successfully!");
            } else {
                // Insert new item
                const { data, error } = await supabase.from('menu_items')
                    .insert([{
                        vendor_id: currentVendorId,
                        name: editingMenuItem.name,
                        price: parseFloat(editingMenuItem.price),
                        image_url: finalImageUrl
                    }])
                    .select().single();

                if (error) throw error;
                setMenuItems([...menuItems, data].sort((a, b) => a.price - b.price));
                alert("New menu item added successfully!");
            }

            setEditingMenuItem({ id: null, name: '', price: '', image_url: '' });
            setMenuImageFile(null);
        } catch (err) {
            console.error(err);
            alert(`Could not save menu item: ${err.message || 'Unknown error. Name might be a duplicate.'}`);
        } finally {
            setUploadingMenuImage(false);
        }
    };

    const handleDeleteMenuItem = async (id, name) => {
        if (!await confirmAction(`Are you sure you want to delete ${name}? Customers will no longer be able to order it.`)) return;
        try {
            const { error } = await supabase.from('menu_items').delete().eq('id', id);
            if (error) throw error;
            setMenuItems(menuItems.filter(item => item.id !== id));
        } catch (err) {
            console.error(err);
            alert("Could not delete menu item.");
        }
    };

    // Financial Calculations
    // Include all paid, preparing, ready, and completed orders as revenue
    const totalRevenue = [...orders, ...historyOrders].reduce((sum, o) => {
        if (o.status !== 'refunded' && o.status !== 'pending') {
            return sum + Number(o.total_price || 0);
        }
        return sum;
    }, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const netProfit = totalRevenue - totalExpenses;

    const filteredOrders = selectedLocation === 'all'
        ? orders
        : orders.filter(o => o.location_id === selectedLocation);

    // Grouping for the Kanban/KFC display
    const newOrders = filteredOrders.filter(o => o.status === 'paid');
    const prepOrders = filteredOrders.filter(o => o.status === 'preparing');
    const readyOrders = filteredOrders.filter(o => o.status === 'ready');



    // â”€â”€ Monetization: Trial & Subscription Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const getTrialInfo = () => {
        if (!vendorConfig) return { isExpired: false, daysLeft: 7 };
        const status = vendorConfig.subscription_status;
        if (status === 'active') return { isExpired: false, daysLeft: null };
        if (status === 'cancelled') return { isExpired: true, daysLeft: 0 };
        const createdAt = new Date(vendorConfig.created_at);
        const trialEnd = new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000);
        const now = new Date();
        const daysLeft = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));
        return { isExpired: now > trialEnd, daysLeft: Math.max(0, daysLeft) };
    };

    const handleSubscribe = async () => {
        setIsInitiatingBilling(true);
        try {
            const { data, error } = await supabase.functions.invoke('init-vendor-subscription');
            if (error) throw error;
            if (data?.authorization_url) {
                window.location.href = data.authorization_url;
            } else {
                throw new Error('No payment URL returned. Please try again.');
            }
        } catch (err) {
            alert('Could not initiate payment: ' + err.message);
        } finally {
            setIsInitiatingBilling(false);
        }
    };
    const handleTabClick = (tabId) => {
        if (allowedTabs && !allowedTabs.includes(tabId)) {
            alert('This staff workspace only has access to Inventory, AI Manager, and Help Center.');
            setActiveTab(allowedTabs[0]);
            return;
        }

        const { isExpired } = getTrialInfo();
        const status = vendorConfig?.subscription_status;
        const isRestricted = (isExpired && status !== 'active') || status === 'past_due' || status === 'cancelled';
        
        const premiumTabs = ['orders', 'inventory', 'logistics', 'cms', 'ai'];
        
        if (isRestricted && premiumTabs.includes(tabId)) {
            setShowGateModal(true);
            return;
        }
        
        setActiveTab(tabId);
    };

    useEffect(() => {
        setAiMessages([{ role: 'assistant', content: defaultAiGreeting }]);
        setAiPendingAction(null);
    }, [defaultAiGreeting]);

    useEffect(() => {
        if (allowedTabs && !allowedTabs.includes(activeTab)) {
            setActiveTab(allowedTabs[0]);
        }
    }, [activeTab, allowedTabs]);

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    if (loading || !vendorConfig) return (
        <div style={{ background: '#0f172a', color: '#fff', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1.5rem', textAlign: 'center', padding: '2rem' }}>
            <div className="loading-spinner"></div>
            <div>
                <h2 style={{ marginBottom: '0.5rem' }}>Configuring your studio...</h2>
                <p style={{ color: '#94a3b8', maxWidth: '400px', fontSize: '0.9rem' }}>
                    Setting up your stylist dashboard. This usually takes just a few seconds.
                </p>
            </div>
            
            <button 
                onClick={() => window.location.reload()}
                style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', padding: '0.75rem 1.5rem', borderRadius: '12px', cursor: 'pointer' }}
            >
                 Refresh Page
            </button>
        </div>
    );

    const paymentConfig = vendorConfig?.payment_config || {};
    const paystackPublicKey = (paymentConfig.paystack_public_key || '').trim();
    const paystackSecretKey = (paymentConfig.paystack_secret_key || '').trim();
    const hasPaystackPublicKey = paystackPublicKey.length > 0;
    const hasPaystackSecretKey = paystackSecretKey.length > 0;
    const isPaystackFullyConfigured = hasPaystackPublicKey && hasPaystackSecretKey;
    const isPaystackPartiallyConfigured = hasPaystackPublicKey !== hasPaystackSecretKey;
    const isPaystackKeyFormatValid =
        (!hasPaystackPublicKey || /^pk_(test|live)_/i.test(paystackPublicKey)) &&
        (!hasPaystackSecretKey || /^sk_(test|live)_/i.test(paystackSecretKey));

    const handlePaystackConfigChange = (field, value) => {
        setVendorConfig((current) => ({
            ...current,
            payment_config: {
                ...(current?.payment_config || {}),
                [field]: value
            }
        }));
    };

    const savePaystackKeys = async () => {
        if (!vendorConfig) return;

        if (isPaystackPartiallyConfigured) {
            alert('Please save both the Paystack public key and secret key together, or clear both fields to disable checkout.');
            return;
        }

        if (!isPaystackKeyFormatValid) {
            alert('Paystack key format looks invalid. Public keys should start with pk_live_ / pk_test_ and secret keys should start with sk_live_ / sk_test_.');
            return;
        }

        setIsSavingVault(true);
        const nextPaymentConfig = {
            ...(vendorConfig?.payment_config || {}),
            paystack_public_key: paystackPublicKey,
            paystack_secret_key: paystackSecretKey,
            use_platform_keys: false,
        };

        const { error } = await supabase
            .from('vendors')
            .update({ payment_config: nextPaymentConfig })
            .eq('id', currentVendorId);

        setIsSavingVault(false);

        if (error) {
            alert("Save failed: " + error.message);
            return;
        }

        setVendorConfig({
            ...vendorConfig,
            payment_config: nextPaymentConfig
        });

        if (isPaystackFullyConfigured) {
            alert("Paystack keys saved. Customer checkout now pays directly into this vendor's Paystack account.");
        } else {
            alert("Paystack keys cleared. Customer checkout is disabled until both keys are added again.");
        }
    };

    const handleAddGalleryImage = async (e) => {
        e.preventDefault();
        if (!galleryImageFile || !currentVendorId) {
            alert('Please choose an image first.');
            return;
        }

        try {
            setUploadingGalleryImage(true);
            const fileExt = galleryImageFile.name.split('.').pop();
            const fileName = `gallery_${Date.now()}.${fileExt}`;
            const filePath = `site-gallery/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('business-documents')
                .upload(filePath, galleryImageFile);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('business-documents')
                .getPublicUrl(filePath);

            const { data, error } = await supabase
                .from('site_gallery')
                .insert([{
                    vendor_id: currentVendorId,
                    image_url: publicUrl,
                    caption: newGalleryCaption.trim() || null
                }])
                .select()
                .single();

            if (error) throw error;

            setSiteGallery([data, ...siteGallery]);
            setGalleryImageFile(null);
            setNewGalleryCaption('');
            alert('Gallery image added.');
        } catch (err) {
            console.error(err);
            alert(`Could not save gallery image: ${err.message || 'Unknown error'}`);
        } finally {
            setUploadingGalleryImage(false);
        }
    };

    const handleDeleteGalleryImage = async (galleryItem) => {
        if (!await confirmAction(`Remove this gallery image${galleryItem.caption ? `: ${galleryItem.caption}` : ''}?`)) return;

        try {
            const { error } = await supabase
                .from('site_gallery')
                .delete()
                .eq('id', galleryItem.id);

            if (error) throw error;

            setSiteGallery(siteGallery.filter((item) => item.id !== galleryItem.id));
            alert('Gallery image removed.');
        } catch (err) {
            console.error(err);
            alert(`Could not remove gallery image: ${err.message || 'Unknown error'}`);
        }
    };

    const updateReservationStatus = async (reservationId, nextStatus) => {
        try {
            const { error } = await supabase
                .from('reservations')
                .update({ status: nextStatus })
                .eq('id', reservationId);

            if (error) throw error;

            setReservations((current) =>
                current.map((reservation) =>
                    reservation.id === reservationId
                        ? { ...reservation, status: nextStatus, updated_at: new Date().toISOString() }
                        : reservation
                )
            );

            alert(`Reservation marked ${nextStatus}.`);
        } catch (err) {
            alert("Could not update reservation: " + err.message);
        }
    };

    const resetClientForm = () => {
        setClientForm({
            id: null,
            full_name: '',
            phone: '',
            email: '',
            instagram_handle: '',
            preferred_contact_method: 'whatsapp',
            payment_status: 'inquiry',
            status: 'lead',
            notes: '',
            measurements: ''
        });
    };

    const resetAppointmentForm = () => {
        setAppointmentForm({
            id: null,
            client_id: '',
            appointment_type: 'consultation',
            status: 'pending',
            appointment_date: '',
            appointment_time: '',
            fitting_date: '',
            fitting_time: '',
            look_type: '',
            garment_type: '',
            budget_range: '',
            payment_status: 'inquiry',
            deposit_amount: '',
            balance_amount: '',
            contact_name: '',
            contact_phone: '',
            contact_email: '',
            special_requests: '',
            internal_notes: ''
        });
    };

    const parseMeasurementsInput = (input) => {
        const raw = String(input || '').trim();
        if (!raw) return {};
        try {
            const parsed = JSON.parse(raw);
            return typeof parsed === 'object' && parsed !== null ? parsed : {};
        } catch (_err) {
            const pairs = raw
                .split('\n')
                .map((line) => line.trim())
                .filter(Boolean)
                .map((line) => {
                    const [key, ...valueParts] = line.split(':');
                    if (!key || valueParts.length === 0) return null;
                    return [key.trim(), valueParts.join(':').trim()];
                })
                .filter(Boolean);
            return Object.fromEntries(pairs);
        }
    };

    const saveStudioClient = async (e) => {
        e.preventDefault();
        if (!currentVendorId || !clientForm.full_name.trim()) return;
        setSavingClient(true);
        try {
            const payload = {
                vendor_id: currentVendorId,
                full_name: clientForm.full_name.trim(),
                phone: clientForm.phone.trim() || null,
                email: clientForm.email.trim() || null,
                instagram_handle: clientForm.instagram_handle.trim() || null,
                preferred_contact_method: clientForm.preferred_contact_method,
                payment_status: clientForm.payment_status,
                status: clientForm.status,
                notes: clientForm.notes.trim() || null,
                measurements: parseMeasurementsInput(clientForm.measurements)
            };

            let query = supabase.from('stylist_clients');
            if (clientForm.id) {
                query = query.update(payload).eq('id', clientForm.id);
            } else {
                query = query.insert(payload);
            }

            const { data, error } = await query.select().single();
            if (error) throw error;

            setStudioClients((current) => {
                const rest = current.filter((item) => item.id !== data.id);
                return [data, ...rest];
            });

            if (!clientForm.id) {
                setAppointmentForm((current) => ({
                    ...current,
                    client_id: data.id,
                    contact_name: current.contact_name || data.full_name || '',
                    contact_phone: current.contact_phone || data.phone || '',
                    contact_email: current.contact_email || data.email || ''
                }));
            }

            resetClientForm();
        } catch (err) {
            alert('Could not save client: ' + err.message);
        } finally {
            setSavingClient(false);
        }
    };

    const saveStudioAppointment = async (e) => {
        e.preventDefault();
        if (!currentVendorId || !appointmentForm.contact_name.trim() || !appointmentForm.contact_phone.trim() || !appointmentForm.appointment_date) return;
        setSavingAppointment(true);
        try {
            const payload = {
                vendor_id: currentVendorId,
                client_id: appointmentForm.client_id || null,
                appointment_type: appointmentForm.appointment_type,
                status: appointmentForm.status,
                appointment_date: appointmentForm.appointment_date,
                appointment_time: appointmentForm.appointment_time || null,
                fitting_date: appointmentForm.fitting_date || null,
                fitting_time: appointmentForm.fitting_time || null,
                look_type: appointmentForm.look_type.trim() || null,
                garment_type: appointmentForm.garment_type.trim() || null,
                budget_range: appointmentForm.budget_range.trim() || null,
                payment_status: appointmentForm.payment_status,
                deposit_amount: appointmentForm.deposit_amount === '' ? 0 : Number(appointmentForm.deposit_amount || 0),
                balance_amount: appointmentForm.balance_amount === '' ? 0 : Number(appointmentForm.balance_amount || 0),
                contact_name: appointmentForm.contact_name.trim(),
                contact_phone: appointmentForm.contact_phone.trim(),
                contact_email: appointmentForm.contact_email.trim() || null,
                special_requests: appointmentForm.special_requests.trim() || null,
                internal_notes: appointmentForm.internal_notes.trim() || null,
                source: 'admin_dashboard'
            };

            let query = supabase.from('stylist_appointments');
            if (appointmentForm.id) {
                query = query.update(payload).eq('id', appointmentForm.id);
            } else {
                query = query.insert(payload);
            }

            const { data, error } = await query.select().single();
            if (error) throw error;

            setStudioAppointments((current) => {
                const rest = current.filter((item) => item.id !== data.id);
                return [...rest, data].sort((a, b) => new Date(`${a.appointment_date}T${a.appointment_time || '00:00'}`) - new Date(`${b.appointment_date}T${b.appointment_time || '00:00'}`));
            });

            if (data.client_id) {
                setStudioClients((current) => current.map((client) => client.id === data.client_id
                    ? { ...client, last_appointment_at: data.appointment_date }
                    : client
                ));
            }

            resetAppointmentForm();
        } catch (err) {
            alert('Could not save appointment: ' + err.message);
        } finally {
            setSavingAppointment(false);
        }
    };

    const updateStudioAppointmentStatus = async (appointmentId, nextStatus) => {
        try {
            const { error } = await supabase
                .from('stylist_appointments')
                .update({ status: nextStatus })
                .eq('id', appointmentId);

            if (error) throw error;
            setStudioAppointments((current) => current.map((item) => item.id === appointmentId ? { ...item, status: nextStatus } : item));
        } catch (err) {
            alert('Could not update appointment: ' + err.message);
        }
    };

    const startEditClient = (client) => {
        setClientForm({
            id: client.id,
            full_name: client.full_name || '',
            phone: client.phone || '',
            email: client.email || '',
            instagram_handle: client.instagram_handle || '',
            preferred_contact_method: client.preferred_contact_method || 'whatsapp',
            payment_status: client.payment_status || 'inquiry',
            status: client.status || 'lead',
            notes: client.notes || '',
            measurements: JSON.stringify(client.measurements || {}, null, 2)
        });
        handleTabClick('customers');
    };

    const startEditAppointment = (appointment) => {
        setAppointmentForm({
            id: appointment.id,
            client_id: appointment.client_id || '',
            appointment_type: appointment.appointment_type || 'consultation',
            status: appointment.status || 'pending',
            appointment_date: appointment.appointment_date || '',
            appointment_time: appointment.appointment_time || '',
            fitting_date: appointment.fitting_date || '',
            fitting_time: appointment.fitting_time || '',
            look_type: appointment.look_type || '',
            garment_type: appointment.garment_type || '',
            budget_range: appointment.budget_range || '',
            payment_status: appointment.payment_status || 'inquiry',
            deposit_amount: appointment.deposit_amount ?? '',
            balance_amount: appointment.balance_amount ?? '',
            contact_name: appointment.contact_name || '',
            contact_phone: appointment.contact_phone || '',
            contact_email: appointment.contact_email || '',
            special_requests: appointment.special_requests || '',
            internal_notes: appointment.internal_notes || ''
        });
        handleTabClick('reservations');
    };

    const confirmAction = async (message, confirmLabel = 'Delete') => {
        if (window.__vulahubConfirm) {
            return window.__vulahubConfirm({
                title: 'Confirm Action',
                message,
                confirmLabel,
                cancelLabel: 'Cancel',
                tone: 'danger'
            });
        }
        return window.confirm(message);
    };

    const sidebarNavItems = [
        { id: 'overview', label: 'Studio Overview', icon: <Icons.Dashboard /> },
        { id: 'ai', label: 'AI Manager', icon: <Icons.Brain />, accent: 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(59,130,246,0.2))', borderColor: 'rgba(139,92,246,0.5)' },
        { id: 'kds', label: 'Studio Pipeline', icon: <Icons.Kitchen /> },
        { id: 'support', label: 'Client Chat', icon: <Icons.Chat /> },
        { id: 'reservations', label: 'Appointments', icon: <Icons.Calendar /> },
        { id: 'history', label: 'Client History', icon: <Icons.History /> },
        { id: 'finances', label: 'Payments', icon: <Icons.Finance /> },
        { id: 'inventory', label: 'Fabrics & Materials', icon: <Icons.Inventory /> },
        { id: 'customers', label: 'Clients', icon: <Icons.Users /> },
        { id: 'testimonials', label: 'Testimonials', icon: <Icons.Testimonials /> },
        { id: 'logistics', label: 'Operations', icon: <Icons.Logistics /> },
        { id: 'cms', label: 'Brand & Site', icon: <Icons.Settings /> },
        { id: 'help', label: 'Help Center', icon: <Icons.Help /> },
    ];

    const visibleSidebarItems = allowedTabs
        ? sidebarNavItems.filter(item => allowedTabs.includes(item.id))
        : sidebarNavItems;

    const staffAiPrompts = [
        'I have just refilled 54 slices of cheese.',
        'What is my stock risk today?',
        'Which ingredients are nearly finished?',
        'Summarize what needs restocking first.'
    ];

    return (
        <div className="admin-shell">
            {/* â”€â”€ MONETIZATION GATE */}
                        {/* â”€â”€ MONETIZATION: SOFT GATE BANNER */}
            {(() => {
                const { isExpired, daysLeft } = getTrialInfo();
                const status = vendorConfig?.subscription_status;
                const isPastDue = status === 'past_due';
                const isCancelled = status === 'cancelled';
                const isRestricted = (isExpired && status !== 'active') || isPastDue || isCancelled;
                
                if (!isRestricted && (status === 'trial' || !status)) return null;

                if (isRestricted) {
                    return (
                        <div style={{ background: 'linear-gradient(90deg, #ef4444, #dc2626)', color: '#fff', padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', fontWeight: 'bold', fontSize: '0.85rem', position: 'sticky', top: 0, zIndex: 1000 }}>
                            <span>âš ï¸ {isCancelled ? 'Subscription Cancelled' : isPastDue ? 'Payment Overdue' : 'Trial Expired'} â€” Some features are restricted.</span>
                            <button onClick={handleSubscribe} style={{ background: '#fff', color: '#ef4444', border: 'none', padding: '0.4rem 1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Restore Access</button>
                        </div>
                    );
                }

                return null;
            })()}

            {/* â”€â”€ FEATURE GATE MODAL */}
            {showGateModal && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 10001, background: 'rgba(2,6,23,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
                    <div className="cms-card" style={{ maxWidth: '420px', width: '100%', textAlign: 'center', border: '1px solid rgba(198,161,91,0.3)', position: 'relative' }}>
                        <button onClick={() => setShowGateModal(false)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: '#64748b', fontSize: '1.5rem', cursor: 'pointer' }}>Ã—</button>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>ðŸš€</div>
                        <h2 style={{ color: '#fff', marginBottom: '0.75rem' }}>Premium Feature</h2>
                        <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginBottom: '2rem' }}>
                            Features like the studio pipeline, materials workspace, and brand site tools are available on our <b>R 399/month</b> plan. Subscribe to unlock full power.
                        </p>
                        <button onClick={() => { setShowGateModal(false); handleSubscribe(); }} style={{ width: '100%', padding: '1rem', background: 'linear-gradient(135deg, #c6a15b, #a8833d)', color: '#0f172a', border: 'none', borderRadius: '12px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer' }}>
                            Unlock Now
                        </button>
                    </div>
                </div>
            )}

            {/*  Sidebar Navigation */}
            <nav className="kds-sidebar">
                <div className="sidebar-branding">
                    <div className="vendor-logo-container">
                        {resolvedVendorLogo ? (
                            <img src={resolvedVendorLogo} alt="Logo" className="vendor-logo" />
                        ) : (
                            <div className="vendor-logo" style={{ background: 'linear-gradient(135deg, #2a2126, #17131a)', border: '1px solid rgba(198, 161, 91, 0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: '800', color: '#f7f1e8', letterSpacing: '0.08em' }}>{vendorInitials}</div>
                        )}
                        <span className="vendor-name">{vendorConfig?.name || 'My Shop'}</span>
                    </div>
                    <div className="powered-by">Studio powered by VulaHub</div>
                </div>

                <div className="sidebar-nav">
                    {visibleSidebarItems.map(item => (
                        <button
                            key={item.id}
                            className={`sidebar-item ${activeTab === item.id ? 'active' : ''}`}
                            onClick={() => handleTabClick(item.id)}
                            style={item.id === 'ai'
                                ? {
                                    background: activeTab === item.id ? item.accent : '',
                                    borderColor: activeTab === item.id ? item.borderColor : ''
                                }
                                : undefined}
                        >
                            {item.icon}
                            <span>{item.label}</span>
                        </button>
                    ))}
                </div>

                <div className="sidebar-footer">
                    <div>FASHION CENTRAL</div>
                    <div style={{ fontSize: '0.6rem', marginTop: '0.25rem' }}>Studio operations by VulaHub</div>
                </div>
            </nav>

            <main className="main-content">
            {/* GLOBAL: Security PIN Verification Modal - renders from any tab */}
            {isVerifyingPin && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(15, 23, 42, 0.95)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 10000, backdropFilter: 'blur(10px)'
                }}>
                    <div className="cms-card" style={{ width: '420px', textAlign: 'center', border: '1px solid rgba(198, 161, 91, 0.3)', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>ðŸ”’</div>
                                <h2 style={{ color: '#c6a15b', marginBottom: '0.5rem' }}>Verify Handover PIN</h2>
                        <p style={{ color: '#94a3b8', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                            Order <strong style={{ color: '#fff' }}>#{isVerifyingPin.order_number}</strong> for <strong style={{ color: '#fff' }}>{isVerifyingPin.customer_name}</strong>
                        </p>
                        <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.82rem' }}>
                            The buyer was emailed a secret 4-digit PIN at checkout. Ask them to read it aloud.
                        </p>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <input
                                type="text" maxLength="4" autoFocus
                                value={verificationPin}
                                onChange={(e) => setVerificationPin(e.target.value.replace(/\D/g, ''))}
                                placeholder="0000"
                                style={{
                                    width: '100%', background: '#0f172a',
                                    border: `2px solid ${pinError ? '#ef4444' : '#334155'}`,
                                    borderRadius: '12px', padding: '1rem', color: '#fff',
                                    fontSize: '2.5rem', textAlign: 'center',
                                    letterSpacing: '1.2rem', fontWeight: 'bold', outline: 'none'
                                }}
                            />
                            {pinError && <p style={{ color: '#ef4444', marginTop: '0.75rem', fontSize: '0.85rem', fontWeight: '600' }}>âŒ {pinError}</p>}
                        </div>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button className="btn-secondary" style={{ flex: 1 }} onClick={() => { setIsVerifyingPin(null); setPinError(''); setVerificationPin(''); }}>Cancel</button>
                            <button
                                className="btn-primary"
                                style={{ flex: 2, background: '#c6a15b', color: '#000', fontWeight: 'bold' }}
                                onClick={() => {
                                    if (!verificationPin || verificationPin.length < 4) {
                                        setPinError('Please enter the full 4-digit PIN.');
                                        return;
                                    }
                                    if (verificationPin === isVerifyingPin.collection_pin) {
                                        updateOrderStatus(isVerifyingPin.id, 'completed');
                                        setIsVerifyingPin(null);
                                        setPinError('');
                                        setVerificationPin('');
                                    } else {
                                        setPinError('Wrong PIN. Ask the customer to check their order confirmation.');
                                    }
                                }}
                            >âœ“ Verify & Complete</button>
                        </div>
                    </div>
                </div>
            )}
            {/* ARRIVAL ALERT TOAST */}
            {arrivalAlert && (
                <div style={{
                    position: 'fixed',
                    top: '20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: '#ef4444',
                    color: '#fff',
                    padding: '1.5rem 3rem',
                    borderRadius: '16px',
                    boxShadow: '0 10px 30px rgba(239, 68, 68, 0.4)',
                    zIndex: 9999,
                    textAlign: 'center',
                    border: '2px solid #fca5a5',
                    animation: 'pulse 1s infinite'
                }}>
                    <h2 style={{ margin: 0, fontSize: '2rem' }}> ARRIVAL ALERT</h2>
                    <p style={{ margin: '0.5rem 0 0', fontSize: '1.2rem', fontWeight: 'bold' }}>
                        Customer for {arrivalAlert.order_number} is waiting outside!
                    </p>
                </div>
            )}
            
            {/* EDIT BRANCH MODAL */}
            {editingBranch && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.85)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10000,
                    padding: '1rem'
                }}>
                    <div style={{
                        background: '#0f172a',
                        border: '1px solid #334155',
                        borderRadius: '16px',
                        padding: '2rem',
                        maxWidth: '600px',
                        width: '100%',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                    }}>
                        <h2 style={{ color: '#f8fafc', fontSize: '1.5rem', marginBottom: '1.5rem' }}>Edit Branch</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Branch Name</label>
                                <input type="text" className="kds-input" value={editingBranch.name} onChange={e => setEditingBranch({...editingBranch, name: e.target.value})} style={{ width: '100%' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Physical Address</label>
                                <input type="text" className="kds-input" value={editingBranch.address} onChange={e => setEditingBranch({...editingBranch, address: e.target.value})} style={{ width: '100%' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Google Maps URL</label>
                                <input type="url" className="kds-input" value={editingBranch.google_maps_url} onChange={e => setEditingBranch({...editingBranch, google_maps_url: e.target.value})} style={{ width: '100%' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Office Hours</label>
                                <input type="text" className="kds-input" value={editingBranch.office_hours} onChange={e => setEditingBranch({...editingBranch, office_hours: e.target.value})} style={{ width: '100%' }} />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                            <button 
                                className="btn-primary" 
                                disabled={isSavingBranch}
                                onClick={async () => {
                                    setIsSavingBranch(true);
                                    try {
                                        const { error } = await supabase.from('locations').update({
                                            name: editingBranch.name,
                                            address: editingBranch.address,
                                            google_maps_url: editingBranch.google_maps_url,
                                            office_hours: editingBranch.office_hours,
                                        }).eq('id', editingBranch.id);
                                        if (error) throw error;
                                        alert("Branch updated successfully!");
                                        setEditingBranch(null);
                                        fetchInitialData();
                                    } catch (err) {
                                        alert("Error updating branch: " + err.message);
                                    } finally {
                                        setIsSavingBranch(false);
                                    }
                                }} 
                                style={{ flex: 1, padding: '0.75rem' }}
                            >
                                {isSavingBranch ? 'Saving...' : 'Save Changes'}
                            </button>
                            <button 
                                className="btn-secondary" 
                                onClick={() => setEditingBranch(null)} 
                                style={{ flex: 1, padding: '0.75rem' }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* DELETE ACCOUNT MODAL */}
            {showDeleteModal && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.85)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10000,
                    padding: '1rem'
                }}>
                    <div style={{
                        background: '#0f172a',
                        border: '2px solid #ef4444',
                        borderRadius: '16px',
                        padding: '3rem',
                        maxWidth: '500px',
                        width: '100%',
                        textAlign: 'center',
                        boxShadow: '0 25px 50px -12px rgba(239, 68, 68, 0.25)'
                    }}>
                        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}></div>
                        <h2 style={{ color: '#ef4444', fontSize: '2rem', marginBottom: '1rem' }}>DANGER ZONE</h2>
                        <p style={{ color: '#f8fafc', fontSize: '1.1rem', marginBottom: '1rem', lineHeight: '1.6' }}>
                            You are about to permanently delete your entire shop.
                        </p>
                        <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '2rem', lineHeight: '1.6' }}>
                            This action is <strong>irreversible</strong>. All your menu items, customer orders, finance history, and account settings will be erased forever. 
                        </p>
                        
                        <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem' }}>
                            <p style={{ color: '#fca5a5', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                                To confirm deletion, type <strong>DELETE</strong> below:
                            </p>
                            <input 
                                type="text"
                                style={{ width: '100%', padding: '1rem', background: '#000', border: '1px solid #ef4444', color: '#ef4444', fontSize: '1.2rem', textAlign: 'center', letterSpacing: '4px', outline: 'none' }}
                                value={deleteConfirmationWord}
                                onChange={(e) => setDeleteConfirmationWord(e.target.value)}
                                placeholder="DELETE"
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button 
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setDeleteConfirmationWord('');
                                }}
                                className="btn-secondary"
                                style={{ flex: 1 }}
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={async () => {
                                    if (deleteConfirmationWord !== 'DELETE') return;
                                    try {
                                        setIsDeletingAccount(true);
                                        // 1. Delete Vendor mapping (cascade drops data if FK set up, else rely on Auth trigger)
                                        // But the most robust way in a client is to call an Edge Function or just delete the auth user.
                                        // To delete the current user securely, Supabase provides admin API or they need to execute custom RPC.
                                        // Using standard client, a user can't easily self-delete from auth.users unless we have an RPC.
                                        // A simple workaround for this platform is deleting the vendor profile to ghost the account.
                                        await supabase.from('vendors').delete().eq('id', currentVendorId);
                                        await supabase.from('profiles').delete().eq('id', session.user.id);
                                        // We log them out
                                        await supabase.auth.signOut();
                                        window.location.reload();
                                    } catch (err) {
                                        alert("Failed to delete account. Please contact support.");
                                        setIsDeletingAccount(false);
                                    }
                                }}
                                disabled={deleteConfirmationWord !== 'DELETE' || isDeletingAccount}
                                style={{ 
                                    flex: 1, 
                                    background: deleteConfirmationWord === 'DELETE' ? '#ef4444' : '#475569', 
                                    color: '#fff', 
                                    border: 'none', 
                                    padding: '1rem', 
                                    borderRadius: '8px', 
                                    fontWeight: 'bold', 
                                    cursor: deleteConfirmationWord === 'DELETE' ? 'pointer' : 'not-allowed' 
                                }}
                            >
                                {isDeletingAccount ? 'Deleting...' : 'Permanently Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* BILLING & SUBSCRIPTION MODAL */}
            {showBillingModal && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.85)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10000,
                    padding: '1rem',
                    backdropFilter: 'blur(8px)'
                }}>
                    <div style={{
                        background: '#0f172a',
                        border: '1px solid #1e293b',
                        borderRadius: '24px',
                        padding: '2.5rem',
                        maxWidth: '700px',
                        width: '100%',
                        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <h2 style={{ margin: 0, fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <Icons.CreditCard /> Billing & Subscriptions
                            </h2>
                            <button onClick={() => setShowBillingModal(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.5rem', cursor: 'pointer' }}></button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '2rem' }}>
                            <div style={{ background: 'rgba(51, 65, 85, 0.3)', padding: '2rem', borderRadius: '20px', border: `1px solid ${vendorConfig?.subscription_status === 'active' ? 'rgba(198,161,91,0.3)' : '#334155'}` }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <h3 style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem', textTransform: 'uppercase' }}>Current Plan</h3>
                                    <span style={{ background: vendorConfig?.subscription_status === 'active' ? '#c6a15b' : vendorConfig?.subscription_status === 'trial' ? '#fbbf24' : '#ef4444', color: '#0f172a', padding: '0.25rem 0.75rem', borderRadius: '99px', fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase' }}>{vendorConfig?.subscription_status || 'trial'}</span>
                                </div>
                                <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#fff', marginBottom: '0.5rem' }}>R 399 <span style={{ fontSize: '1rem', color: '#64748b' }}>/ month</span></div>
                                <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: '1.5' }}>Unlimited orders, real-time KDS, AI Manager, multi-branch management, and WhatsApp notifications.</p>
                                {vendorConfig?.next_billing_date && vendorConfig?.subscription_status === 'active' && (
                                    <p style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '1rem' }}>Next billing: <strong style={{ color: '#94a3b8' }}>{new Date(vendorConfig.next_billing_date).toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' })}</strong></p>
                                )}
                                {vendorConfig?.subscription_status !== 'active' && (
                                    <div style={{ marginTop: '1.5rem', padding: '0.75rem', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: '8px', fontSize: '0.8rem', color: '#fcd34d' }}>
                                        {(() => { const { daysLeft } = getTrialInfo(); return daysLeft > 0 ? `â³ ${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining in your free trial.` : 'âš ï¸ Trial expired. Subscribe to restore access.'; })()}
                                    </div>
                                )}
                                <button onClick={handleSubscribe} disabled={isInitiatingBilling} style={{ width: '100%', marginTop: '1.5rem', padding: '1rem', background: isInitiatingBilling ? '#334155' : 'linear-gradient(135deg, #c6a15b, #a8833d)', border: 'none', borderRadius: '12px', color: '#0f172a', fontWeight: '900', cursor: isInitiatingBilling ? 'not-allowed' : 'pointer', fontSize: '0.95rem' }}>
                                    {isInitiatingBilling ? 'Redirecting...' : vendorConfig?.subscription_status === 'active' ? 'ðŸ”„ Renew / Manage Plan' : 'ðŸš€ Subscribe â€” R 399/month'}
                                </button>
                            </div>
                            <div>
                                <h3 style={{ margin: '0 0 1.5rem', fontSize: '1rem', color: '#fff' }}>Payment History</h3>
                                <div style={{ display: 'grid', gap: '1rem' }}>
                                    {vendorConfig?.last_billing_date ? (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(30, 41, 59, 0.5)', borderRadius: '12px' }}>
                                            <div>
                                                <div style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{new Date(vendorConfig.last_billing_date).toLocaleDateString('en-ZA', { year: 'numeric', month: 'long' })}</div>
                                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Monthly Subscription</div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '0.85rem' }}>R 399</div>
                                                <div style={{ fontSize: '0.7rem', color: '#c6a15b' }}>Paid</div>
                                            </div>
                                        </div>
                                    ) : (
                                        <p style={{ color: '#475569', fontSize: '0.85rem', padding: '1rem' }}>No payment history yet.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

                {/* Trial Banner */}
                {(() => {
                    const { isExpired, daysLeft } = getTrialInfo();
                    if (isExpired || vendorConfig?.subscription_status === 'active' || !vendorConfig) return null;
                    const urgent = daysLeft <= 2;
                    return (
                        <div style={{ background: urgent ? 'rgba(239,68,68,0.12)' : 'rgba(251,191,36,0.08)', borderBottom: `1px solid ${urgent ? '#ef4444' : '#fbbf24'}`, padding: '0.45rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', fontSize: '0.8rem' }}>
                            <span style={{ color: urgent ? '#fca5a5' : '#fcd34d' }}>
                                {urgent ? 'âš ï¸' : 'â³'} <strong>{daysLeft} day{daysLeft !== 1 ? 's' : ''} left on your free trial.</strong> Subscribe to avoid interruption.
                            </span>
                            <button onClick={handleSubscribe} disabled={isInitiatingBilling} style={{ background: '#c6a15b', color: '#000', border: 'none', padding: '0.35rem 1rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer' }}>
                                {isInitiatingBilling ? '...' : 'Subscribe Now'}
                            </button>
                        </div>
                    );
                })()}
                <header className="content-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <h1 style={{ fontSize: '1.25rem', margin: 0, fontWeight: '700' }}>
                            {activeTab === 'overview' && ' Studio Overview'}
                            {activeTab === 'kds' && ' Studio Pipeline'}
                            {activeTab === 'support' && ' Client Support'}
                            {activeTab === 'history' && ' Client History'}
                            {activeTab === 'finances' && ' Payments & Revenue'}
                            {activeTab === 'inventory' && ' Materials & Stock'}
                            {activeTab === 'logistics' && ' Operations'}
                            {activeTab === 'cms' && ' Studio Identity & Website'}
                            {activeTab === 'help' && ' Support Center'}
                        </h1>
                        {activeTab === 'kds' && <span style={{ color: '#c6a15b', fontWeight: 'bold' }}>{liveTime}</span>}
                        {vendorConfig && (
                            <a 
                                href={`/v/${vendorConfig.slug}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                style={{ 
                                    padding: '0.25rem 0.75rem', 
                                    background: 'rgba(59, 130, 246, 0.1)', 
                                    color: '#60a5fa', 
                                    borderRadius: '20px', 
                                    fontSize: '0.8rem', 
                                    fontWeight: 'bold', 
                                    textDecoration: 'none',
                                    border: '1px solid rgba(59, 130, 246, 0.2)',
                                    marginLeft: '1rem'
                                }}
                            >
                                 View Shop
                            </a>
                        )}
                    </div>

                    <div className="kds-controls">
                        {/*  Global Search Bar */}
                        <div style={{ position: 'relative', flex: 1, minWidth: '350px' }}>
                            <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}></span>
                            <input 
                                type="text"
                                placeholder="Search Order # or Name..."
                                className="kds-input"
                                value={kdsSearchQuery}
                                onChange={(e) => setKdsSearchQuery(e.target.value)}
                                style={{ 
                                    paddingLeft: '2.5rem', 
                                    width: '100%', 
                                    borderRadius: '24px', 
                                    background: 'rgba(255,255,255,0.08)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    color: '#fff'
                                }}
                            />
                            {kdsSearchQuery && (
                                <button 
                                    onClick={() => setKdsSearchQuery('')}
                                    style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.2rem' }}
                                ></button>
                            )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <select
                                className="kds-select"
                                value={selectedLocation}
                                onChange={(e) => setSelectedLocation(e.target.value)}
                            >
                                <option value="all">Global (All Studio Locations)</option>
                                {locations.map(loc => (
                                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                                ))}
                            </select>
                        </div>
                        
                        {/* User Profile Dropdown */}
                        <div style={{ position: 'relative' }}>
                            <button 
                                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                                style={{ 
                                    background: '#1e293b', 
                                    color: '#fff', 
                                    border: '1px solid #334155', 
                                    padding: '0.5rem', 
                                    borderRadius: '50%', 
                                    cursor: 'pointer', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center',
                                    width: '40px',
                                    height: '40px',
                                    fontSize: '1.2rem',
                                    overflow: 'hidden'
                                }}
                            >
                                {resolvedVendorLogo ? (
                                    <img src={resolvedVendorLogo} alt="Studio Logo" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                                ) : (
                                    <span style={{ fontSize: '0.8rem', fontWeight: '800', letterSpacing: '0.08em', color: '#f7f1e8' }}>{vendorInitials}</span>
                                )}
                            </button>
                            
                            {isProfileMenuOpen && (
                                <div style={{
                                    position: 'absolute',
                                    top: '100%',
                                    right: '0',
                                    marginTop: '0.5rem',
                                    background: '#1e293b',
                                    border: '1px solid #334155',
                                    borderRadius: '12px',
                                    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                                    overflow: 'hidden',
                                    zIndex: 1000,
                                    minWidth: '220px'
                                }}>
                                    <div style={{ padding: '1rem', borderBottom: '1px solid #334155', background: '#0f172a' }}>
                                        <p style={{ margin: 0, fontWeight: 'bold', fontSize: '0.9rem' }}>{profile?.full_name || 'Admin User'}</p>
                                        <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.8rem' }}>{session?.user?.email}</p>
                                    </div>
                                    <div style={{ padding: '0.5rem' }}>
                                        {!isStaff && (
                                            <>
                                                <button 
                                                    onClick={() => {
                                                        handleTabClick('integrations');
                                                        setIsProfileMenuOpen(false);
                                                    }}
                                                    style={{ width: '100%', textAlign: 'left', padding: '0.75rem 1rem', background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                                >
                                                    <span style={{ fontSize: '1rem' }}></span> Security Vault
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        setShowBillingModal(true);
                                                        setIsProfileMenuOpen(false);
                                                    }}
                                                    style={{ width: '100%', textAlign: 'left', padding: '0.75rem 1rem', background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                                >
                                                    <Icons.CreditCard /> Billing & Subscription
                                                </button>
                                            </>
                                        )}
                                        <button 
                                            onClick={() => {
                                                supabase.auth.signOut();
                                                window.location.href = '/';
                                            }}
                                            style={{ width: '100%', textAlign: 'left', padding: '0.75rem 1rem', background: 'transparent', border: 'none', color: '#ff4444', cursor: 'pointer', borderRadius: '8px' }}
                                        >
                                            Logout
                                        </button>
                                        {!isStaff && (
                                            <button 
                                                onClick={() => setShowDeleteModal(true)}
                                                style={{ width: '100%', textAlign: 'left', padding: '0.75rem 1rem', background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', borderRadius: '8px', fontSize: '0.8rem' }}
                                            >
                                                Delete Account
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/*  Tab Content Area */}
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {activeTab === 'overview' && (
                        <div style={{ padding: '2rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>
                                <div className="finances-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <span style={{ fontSize: '0.85rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Daily Revenue</span>
                                    <h2 style={{ fontSize: '2.5rem', margin: 0, color: '#c6a15b' }}>
                                        R {orders.filter(o => o.status !== 'pending' && new Date(o.created_at).toDateString() === new Date().toDateString()).reduce((acc, curr) => acc + (parseFloat(curr.total_price) || 0), 0).toFixed(2)}
                                    </h2>
                                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Includes paid orders and completed styling jobs logged today</span>
                                </div>
                                <div className="finances-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <span style={{ fontSize: '0.85rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Upcoming Appointments</span>
                                    <h2 style={{ fontSize: '2.5rem', margin: 0, color: '#f59e0b' }}>
                                        {upcomingAppointments.filter((item) => ['pending', 'confirmed', 'in_progress'].includes(item.status)).length}
                                    </h2>
                                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Consultations, fittings, and active client sessions</span>
                                </div>
                                <div className="finances-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <span style={{ fontSize: '0.85rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Active Clients</span>
                                    <h2 style={{ fontSize: '2.5rem', margin: 0, color: '#10b981' }}>
                                        {crmClients.filter((client) => client.status !== 'archived').length}
                                    </h2>
                                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Leads, active clients, and VIPs currently on your book</span>
                                </div>
                                <div className="finances-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <span style={{ fontSize: '0.85rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Payments Requiring Follow-up</span>
                                    <h2 style={{ fontSize: '2.5rem', margin: 0, color: ingredients.filter(i => (parseFloat(i.current_stock) || 0) <= (parseFloat(i.low_stock_threshold) || 10)).length > 0 ? '#ef4444' : '#c6a15b' }}>
                                        {crmClients.filter((client) => ['deposit_pending', 'balance_pending', 'overdue'].includes(client.payment_status)).length}
                                    </h2>
                                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Deposits, balances, or overdue client accounts</span>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
                                <div className="finances-card">
                                    <h3 style={{ marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem' }}>Upcoming Fittings & Consultations</h3>
                                    {upcomingAppointments.slice(0, 8).map(o => (
                                        <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                            <div>
                                                <span style={{ color: '#94a3b8', fontWeight: 'bold', textTransform: 'capitalize' }}>{o.appointment_type}</span>
                                                <span style={{ marginLeft: '1rem' }}>{o.contact_name}</span>
                                            </div>
                                            <div className={`status-badge status-${o.status === 'completed' ? 'completed' : o.status === 'confirmed' ? 'ready' : o.status === 'cancelled' ? 'paid' : o.status}`}>{o.status}</div>
                                        </div>
                                    ))}
                                    {upcomingAppointments.length === 0 && <p className="empty-state">No appointments scheduled yet.</p>}
                                </div>
                                <div className="finances-card">
                                    <h3 style={{ marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem' }}>Quick Actions</h3>
                                    <div style={{ display: 'grid', gap: '1rem' }}>
                                        <button className="sidebar-item" onClick={() => handleTabClick('reservations')} style={{ background: 'rgba(198, 161, 91, 0.1)', color: '#c6a15b', padding: '1rem', justifyContent: 'center' }}> Manage Appointments</button>
                                        <button className="sidebar-item" onClick={() => handleTabClick('customers')} style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', padding: '1rem', justifyContent: 'center' }}> Update Client CRM</button>
                                        <button className="sidebar-item" onClick={() => handleTabClick('cms')} style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', padding: '1rem', justifyContent: 'center' }}> Refresh Brand & Site</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

            {/* SECURITY VAULT OVERLAY */}
            {activeTab === 'integrations' && (
                <div className="security-vault-overlay">
                    <div className="vault-container-inner">
                        {/* Progressive Timer Bar */}
                        {isVaultUnlocked && (
                            <div className="vault-timer-container">
                                <div 
                                    className={`vault-timer-bar ${vaultTimer < 5 ? 'critical vault-timer-pulse' : ''}`} 
                                    style={{ width: `${(vaultTimer / 20) * 100}%` }}
                                ></div>
                            </div>
                        )}

                        <div className="vault-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <span style={{ fontSize: '1.5rem' }}></span>
                                <div>
                                    <div className="vault-breadcrumb">
                                        <span className="vault-breadcrumb-root">Security Vault</span>
                                        {vaultActiveSection && (
                                            <>
                                                <span className="vault-breadcrumb-separator">/</span>
                                                <span className="vault-breadcrumb-current">{vaultSectionLabels[vaultActiveSection] || vaultActiveSection}</span>
                                            </>
                                        )}
                                    </div>
                                    <h2 style={{ margin: '0.2rem 0 0', color: '#fff', fontSize: '1.2rem' }}>
                                        {vaultActiveSection ? (vaultSectionLabels[vaultActiveSection] || vaultActiveSection) : 'High-Security Vault'}
                                    </h2>
                                    {isVaultUnlocked && (
                                        <div className="vault-status-row">
                                            <small className={`vault-status-pill ${vaultTimer < 5 ? 'critical' : ''}`}>Auto-locking in {vaultTimer}s</small>
                                            {vaultActiveSection ? (
                                                <small style={{ color: '#94a3b8' }}>Editing secure settings for this section</small>
                                            ) : (
                                                <small style={{ color: '#94a3b8' }}>Choose a category to manage sensitive integrations</small>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <button 
                                onClick={() => {
                                    setIsVaultUnlocked(false);
                                    setVaultPassword('');
                                    setVaultError('');
                                    setVaultActiveSection(null);
                                    handleTabClick('kds');
                                }}
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #334155', color: '#cbd5e1', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', padding: '0.6rem 0.85rem', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '0.45rem' }}
                                aria-label="Back to dashboard"
                            >
                                <span aria-hidden="true">â†</span>
                                <span>Back</span>
                            </button>
                        </div>

                        {!isVaultUnlocked ? (
                            <div style={{ padding: '3rem', textAlign: 'center' }}>
                                <div style={{ fontSize: '3rem', marginBottom: '1.5rem' }}></div>
                                <h2 style={{ color: '#fff', marginBottom: '1rem' }}>Vault Access Required</h2>
                                <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '2rem', maxWidth: '400px', margin: '0 auto 2rem' }}>
                                    Please enter your password to view and edit sensitive API keys. This session will auto-lock after 20 seconds of inactivity.
                                </p>
                                
                                {vaultError && (
                                    <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                                         {vaultError}
                                    </div>
                                )}

                                <form onSubmit={async (e) => {
                                    e.preventDefault();
                                    setUnlocking(true);
                                    setVaultError('');
                                    try {
                                        const { error } = await supabase.auth.signInWithPassword({
                                            email: session.user.email,
                                            password: vaultPassword
                                        });
                                        if (error) throw error;
                                        setIsVaultUnlocked(true);
                                        setVaultPassword('');
                                        setVaultTimer(20); // Reset timer on successful unlock
                                    } catch (err) {
                                        setVaultError('Invalid password. Access denied.');
                                    } finally {
                                        setUnlocking(false);
                                    }
                                }} style={{ maxWidth: '300px', margin: '0 auto' }}>
                                    <input 
                                        type="password" 
                                        className="kds-input" 
                                        placeholder="" 
                                        required
                                        autoFocus
                                        value={vaultPassword}
                                        onChange={(e) => setVaultPassword(e.target.value)}
                                        style={{ marginBottom: '1.5rem', textAlign: 'center', fontSize: '1.2rem', letterSpacing: '4px' }}
                                    />
                                    <button 
                                        type="submit" 
                                        disabled={unlocking}
                                        className="btn-primary" 
                                        style={{ width: '100%', padding: '1rem' }}
                                    >
                                        {unlocking ? 'Unlocking...' : ' Open Vault'}
                                    </button>
                                </form>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setVaultPassword('');
                                        setVaultError('');
                                        setVaultActiveSection(null);
                                        handleTabClick('kds');
                                    }}
                                    style={{ marginTop: '1rem', background: 'transparent', border: '1px solid #334155', color: '#94a3b8', padding: '0.8rem 1rem', borderRadius: '10px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
                                >
                                    <span aria-hidden="true">â†</span>
                                    <span>Back to Dashboard</span>
                                </button>
                            </div>
                        ) : (
                            <div style={{ padding: '2rem', maxHeight: '75vh', overflowY: 'auto' }}>
                                {/* Vault Content Switcher */}
                                {!vaultActiveSection ? (
                                    <>
                                        <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '2rem' }}>
                                            Select a category to view or update your secure integration settings.
                                        </p>
                                        <div className="vault-card-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                                            <div className="vault-card vault-card-paystack" onClick={() => setVaultActiveSection('paystack')}>
                                                <div className="vault-card-badge">$</div>
                                                <div className="vault-card-kicker">Secure settings</div>
                                                <h3 style={{ margin: 0, color: '#fff', fontSize: '1rem' }}>Paystack</h3>
                                                <p style={{ margin: '0.5rem 0 0', color: '#94a3b8', fontSize: '0.8rem' }}>Payment processing keys</p>
                                            </div>
                                            <div className="vault-card vault-card-netcash" onClick={() => setVaultActiveSection('netcash')}>
                                                <div className="vault-card-badge">N</div>
                                                <div className="vault-card-kicker">Secure settings</div>
                                                <h3 style={{ margin: 0, color: '#fff', fontSize: '1rem' }}>Netcash</h3>
                                                <p style={{ margin: '0.5rem 0 0', color: '#94a3b8', fontSize: '0.8rem' }}>Alternative payments</p>
                                            </div>
                                            <div className="vault-card vault-card-domains" onClick={() => setVaultActiveSection('domains')}>
                                                <div className="vault-card-badge">DNS</div>
                                                <div className="vault-card-kicker">Secure settings</div>
                                                <h3 style={{ margin: 0, color: '#fff', fontSize: '1rem' }}>Custom Domains</h3>
                                                <p style={{ margin: '0.5rem 0 0', color: '#94a3b8', fontSize: '0.8rem' }}>DNS & Branding URLs</p>
                                            </div>
                                            <div className="vault-card vault-card-whatsapp" onClick={() => setVaultActiveSection('whatsapp')}>
                                                <div className="vault-card-badge">WA</div>
                                                <div className="vault-card-kicker">Secure settings</div>
                                                <h3 style={{ margin: 0, color: '#fff', fontSize: '1rem' }}>WhatsApp Bot</h3>
                                                <p style={{ margin: '0.5rem 0 0', color: '#94a3b8', fontSize: '0.8rem' }}>Automated notifications</p>
                                            </div>
                                            <div className="vault-card" onClick={() => setVaultActiveSection('resend')} style={{ borderColor: 'rgba(99,102,241,0.4)' }}>
                                                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>ðŸ“§</div>
                                                <h3 style={{ margin: 0, color: '#fff', fontSize: '1rem' }}>Resend Email</h3>
                                                <p style={{ margin: '0.5rem 0 0', color: '#94a3b8', fontSize: '0.8rem' }}>PIN delivery via email</p>
                                            </div>
                                            <div className="vault-card" onClick={() => setVaultActiveSection('ai_keys')} style={{ borderColor: 'rgba(139,92,246,0.5)', background: 'rgba(139,92,246,0.05)' }}>
                                                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>ðŸ¤–</div>
                                                <h3 style={{ margin: 0, color: '#a78bfa', fontSize: '1rem' }}>AI Manager Keys</h3>
                                                <p style={{ margin: '0.5rem 0 0', color: '#94a3b8', fontSize: '0.8rem' }}>Grok + Gemini API keys</p>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
                                        <button 
                                            onClick={() => setVaultActiveSection(null)}
                                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #334155', color: '#94a3b8', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                        >
                                             Back to All Categories
                                        </button>

                                        {/* Paystack View */}
                                        {vaultActiveSection === 'paystack' && (
                                            <div style={{ maxWidth: '500px' }}>
                                                <h3 style={{ color: '#fff', fontSize: '1.2rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    ðŸ’³ Your Paystack Keys
                                                </h3>
                                                <div style={{ background: 'rgba(198,161,91,0.06)', border: '1px solid rgba(198,161,91,0.2)', borderRadius: '10px', padding: '1rem', marginBottom: '1.5rem', fontSize: '0.85rem', color: '#94a3b8', lineHeight: '1.7' }}>
                                                    <strong style={{ color: '#c6a15b' }}>These are YOUR own Paystack keys.</strong> When customers place orders on your menu page, payments go directly into your Paystack account. Get your keys from <a href="https://dashboard.paystack.com/#/settings/developer" target="_blank" rel="noopener noreferrer" style={{ color: '#c6a15b' }}>dashboard.paystack.com</a>.
                                                </div>
                                                <div style={{
                                                    background: isPaystackFullyConfigured ? 'rgba(16,185,129,0.08)' : isPaystackPartiallyConfigured ? 'rgba(245,158,11,0.10)' : 'rgba(51,65,85,0.35)',
                                                    border: `1px solid ${isPaystackFullyConfigured ? 'rgba(16,185,129,0.35)' : isPaystackPartiallyConfigured ? 'rgba(245,158,11,0.35)' : '#334155'}`,
                                                    borderRadius: '10px',
                                                    padding: '1rem',
                                                    marginBottom: '1.5rem'
                                                }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '0.4rem' }}>
                                                        <strong style={{ color: isPaystackFullyConfigured ? '#10b981' : isPaystackPartiallyConfigured ? '#f59e0b' : '#cbd5e1' }}>
                                                            {isPaystackFullyConfigured ? 'Checkout Enabled' : isPaystackPartiallyConfigured ? 'Setup Incomplete' : 'Checkout Disabled'}
                                                        </strong>
                                                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                                            {hasPaystackPublicKey ? 'Public key saved' : 'Public key missing'} Â· {hasPaystackSecretKey ? 'Secret key saved' : 'Secret key missing'}
                                                        </span>
                                                    </div>
                                                    <div style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: '1.6' }}>
                                                        {isPaystackFullyConfigured
                                                            ? "Buyers can pay this vendor directly through Paystack."
                                                            : isPaystackPartiallyConfigured
                                                                ? "Both keys must be saved together. We block half-configured payment setups so checkout cannot drift into an unsafe state."
                                                                : "Checkout stays off until both vendor Paystack keys are added."}
                                                    </div>
                                                    {!isPaystackKeyFormatValid && (
                                                        <div style={{ fontSize: '0.8rem', color: '#fca5a5', marginTop: '0.75rem' }}>
                                                            Key format looks wrong. Public keys should start with <code>pk_live_</code> or <code>pk_test_</code>, and secret keys should start with <code>sk_live_</code> or <code>sk_test_</code>.
                                                        </div>
                                                    )}
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                                    <div>
                                                        <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
                                                            <span>Public Key (Live)</span>
                                                            {hasPaystackPublicKey && <span style={{ color: '#10b981', fontSize: '0.75rem' }}>âœ“ Saved</span>}
                                                        </label>
                                                        <input 
                                                            type="text" 
                                                            className="kds-input" 
                                                            value={paymentConfig?.paystack_public_key || ''}
                                                            onChange={(e) => handlePaystackConfigChange('paystack_public_key', e.target.value)}
                                                            placeholder="pk_live_..."
                                                        />
                                                    </div>
                                                    <div>
                                                        <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
                                                            <span>Secret Key (Live)</span>
                                                            {hasPaystackSecretKey && <span style={{ color: '#10b981', fontSize: '0.75rem' }}>âœ“ Saved</span>}
                                                        </label>
                                                        <input 
                                                            type="password" 
                                                            className="kds-input" 
                                                            value={paymentConfig?.paystack_secret_key || ''}
                                                            onChange={(e) => handlePaystackConfigChange('paystack_secret_key', e.target.value)}
                                                            placeholder="sk_live_..."
                                                        />
                                                    </div>
                                                    <button 
                                                        disabled={isSavingVault || isPaystackPartiallyConfigured || !isPaystackKeyFormatValid}
                                                        className="btn-primary" 
                                                        style={{ marginTop: '1rem', background: (isPaystackPartiallyConfigured || !isPaystackKeyFormatValid) ? '#334155' : '#c6a15b', color: (isPaystackPartiallyConfigured || !isPaystackKeyFormatValid) ? '#94a3b8' : '#000' }}
                                                        onClick={savePaystackKeys}
                                                    >
                                                        {isSavingVault ? 'Saving...' : isPaystackFullyConfigured ? 'ðŸ’¾ Save Paystack Keys' : 'ðŸ”’ Save & Enable Checkout'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={isSavingVault || (!hasPaystackPublicKey && !hasPaystackSecretKey)}
                                                        className="btn-secondary"
                                                        style={{ background: 'transparent', border: '1px solid #334155', color: '#94a3b8', padding: '0.85rem 1rem', borderRadius: '10px', cursor: (isSavingVault || (!hasPaystackPublicKey && !hasPaystackSecretKey)) ? 'not-allowed' : 'pointer' }}
                                                        onClick={() => {
                                                            handlePaystackConfigChange('paystack_public_key', '');
                                                            handlePaystackConfigChange('paystack_secret_key', '');
                                                        }}
                                                    >
                                                        Clear Keys & Disable Checkout
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Netcash View */}
                                        {vaultActiveSection === 'netcash' && (
                                            <div style={{ maxWidth: '500px' }}>
                                                <h3 style={{ color: '#fff', fontSize: '1.2rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                     Netcash Settings
                                                </h3>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                                    <div>
                                                        <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.5rem' }}>Account Service Key</label>
                                                        <input 
                                                            type="text" 
                                                            className="kds-input" 
                                                            value={vendorConfig?.netcash_config?.account_service_key || ''}
                                                            onChange={(e) => setVendorConfig({...vendorConfig, netcash_config: {...vendorConfig.netcash_config, account_service_key: e.target.value}})}
                                                            placeholder="Enter Netcash key"
                                                        />
                                                    </div>
                                                    <button 
                                                        disabled={isSavingVault}
                                                        className="btn-primary" 
                                                        style={{ marginTop: '1rem', background: '#c6a15b', color: '#000' }}
                                                        onClick={async () => {
                                                            setIsSavingVault(true);
                                                            const { error } = await supabase.from('vendors').update({
                                                                netcash_config: vendorConfig.netcash_config
                                                            }).eq('id', currentVendorId);
                                                            setIsSavingVault(false);
                                                            if (error) alert("Save failed: " + error.message);
                                                            else alert("Netcash settings updated! ");
                                                        }}
                                                    >
                                                        {isSavingVault ? 'Saving...' : ' Save Netcash Settings'}
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* WhatsApp View */}
                                        {vaultActiveSection === 'whatsapp' && (
                                            <div style={{ maxWidth: '500px' }}>
                                                <h3 style={{ color: '#fff', fontSize: '1.2rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                     WhatsApp Settings
                                                </h3>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                                    <div>
                                                        <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.5rem' }}>Meta Access Token</label>
                                                        <input 
                                                            type="password" 
                                                            className="kds-input" 
                                                            value={vendorConfig?.whatsapp_config?.access_token || ''}
                                                            onChange={(e) => setVendorConfig({...vendorConfig, whatsapp_config: {...vendorConfig.whatsapp_config, access_token: e.target.value}})}
                                                            placeholder="EAAB..."
                                                        />
                                                    </div>
                                                    <div>
                                                        <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.5rem' }}>Phone Number ID</label>
                                                        <input 
                                                            type="text" 
                                                            className="kds-input" 
                                                            value={vendorConfig?.whatsapp_config?.phone_number_id || ''}
                                                            onChange={(e) => setVendorConfig({...vendorConfig, whatsapp_config: {...vendorConfig.whatsapp_config, phone_number_id: e.target.value}})}
                                                            placeholder="1029..."
                                                        />
                                                    </div>
                                                    <button 
                                                        disabled={isSavingVault}
                                                        className="btn-primary" 
                                                        style={{ marginTop: '1rem', background: '#c6a15b', color: '#000' }}
                                                        onClick={async () => {
                                                            setIsSavingVault(true);
                                                            const { error } = await supabase.from('vendors').update({
                                                                whatsapp_config: vendorConfig.whatsapp_config
                                                            }).eq('id', currentVendorId);
                                                            setIsSavingVault(false);
                                                            if (error) alert("Save failed: " + error.message);
                                                            else alert("WhatsApp settings updated! ");
                                                        }}
                                                    >
                                                        {isSavingVault ? 'Saving...' : ' Save WhatsApp Settings'}
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Domains View */}
                                        {vaultActiveSection === 'domains' && (
                                            <div style={{ maxWidth: '600px' }}>
                                                <h3 style={{ color: '#fff', fontSize: '1.2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                     Domain Configuration
                                                </h3>
                                                <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.85rem', color: '#94a3b8', lineHeight: '1.5' }}>
                                                    <strong> Required DNS Records</strong>
                                                    Connect domain via registrar:
                                                    <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                        <div style={{ background: '#0f172a', padding: '0.75rem', borderRadius: '6px', border: '1px solid #334155' }}>
                                                            <div style={{ fontSize: '0.8rem' }}>Type: <strong>A</strong> | Host: <code>@</code> | Value: <code>76.76.21.21</code></div>
                                                        </div>
                                                        <div style={{ background: '#0f172a', padding: '0.75rem', borderRadius: '6px', border: '1px solid #334155' }}>
                                                            <div style={{ fontSize: '0.8rem' }}>Type: <strong>CNAME</strong> | Host: <code>www</code> | Value: <code>cname.vercel-dns.com</code></div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.85rem', color: '#fff', marginBottom: '0.5rem' }}>Your Custom Domain</label>
                                                    <input 
                                                        type="text" 
                                                        className="kds-input" 
                                                        value={vendorConfig?.custom_domain || ''}
                                                        onChange={(e) => setVendorConfig({...vendorConfig, custom_domain: e.target.value})}
                                                        placeholder="www.yourname.co.za"
                                                    />
                                                    <button 
                                                        disabled={isSavingVault}
                                                        className="btn-primary" 
                                                        style={{ marginTop: '1rem', background: '#c6a15b', color: '#000' }}
                                                        onClick={async () => {
                                                            setIsSavingVault(true);
                                                            const { error } = await supabase.from('vendors').update({
                                                                custom_domain: vendorConfig.custom_domain
                                                            }).eq('id', currentVendorId);
                                                            setIsSavingVault(false);
                                                            if (error) alert("Save failed: " + error.message);
                                                            else alert("Custom domain updated! ");
                                                        }}
                                                    >
                                                        {isSavingVault ? 'Saving...' : ' Verify & Link Domain'}
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Resend View */}
                                        {vaultActiveSection === 'resend' && (
                                            <div style={{ maxWidth: '500px' }}>
                                                <h3 style={{ color: '#fff', fontSize: '1.2rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>ðŸ“§ Resend Email Settings</h3>
                                                <p style={{ color: '#94a3b8', fontSize: '0.82rem', marginBottom: '1.5rem' }}>When a customer pays, their secret collection PIN is automatically emailed to them. Get your free key at <a href="https://resend.com" target="_blank" style={{ color: '#60a5fa' }}>resend.com</a> â€” 3,000 emails/month free.</p>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                                    <div>
                                                        <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.5rem' }}>Resend API Key</label>
                                                        <input
                                                            type="password"
                                                            className="kds-input"
                                                            value={vendorConfig?.payment_config?.resend_api_key || ''}
                                                            onChange={(e) => setVendorConfig({...vendorConfig, payment_config: {...vendorConfig.payment_config, resend_api_key: e.target.value}})}
                                                            placeholder="re_..."
                                                        />
                                                    </div>
                                                    <div>
                                                        <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.5rem' }}>From Email Address</label>
                                                        <input
                                                            type="email"
                                                            className="kds-input"
                                                            value={vendorConfig?.payment_config?.resend_from_email || ''}
                                                            onChange={(e) => setVendorConfig({...vendorConfig, payment_config: {...vendorConfig.payment_config, resend_from_email: e.target.value}})}
                                                            placeholder="orders@yourdomain.co.za"
                                                        />
                                                    </div>
                                                    <button
                                                        disabled={isSavingVault}
                                                        className="btn-primary"
                                                        style={{ background: '#6366f1', color: '#fff' }}
                                                        onClick={async () => {
                                                            setIsSavingVault(true);
                                                            const { error } = await supabase.from('vendors').update({ payment_config: vendorConfig.payment_config }).eq('id', currentVendorId);
                                                            setIsSavingVault(false);
                                                            if (error) alert('Save failed: ' + error.message);
                                                            else alert('Resend settings saved! Customers will now receive their PIN via email.');
                                                        }}
                                                    >{isSavingVault ? 'Saving...' : 'ðŸ“§ Save Resend Settings'}</button>
                                                </div>
                                            </div>
                                        )}

                                        {/* AI Keys View */}
                                        {vaultActiveSection === 'ai_keys' && (
                                            <div style={{ maxWidth: '540px' }}>
                                                <h3 style={{ color: '#a78bfa', fontSize: '1.2rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>ðŸ¤– AI Manager API Keys</h3>
                                                <p style={{ color: '#94a3b8', fontSize: '0.82rem', marginBottom: '1.5rem', lineHeight: '1.6' }}>The AI Manager uses your own API key â€” the platform charges nothing extra. Add one or both keys. The system automatically uses whichever is available, with <strong style={{ color: '#fff' }}>Grok as the primary</strong> and <strong style={{ color: '#fff' }}>Gemini as the fallback</strong>.</p>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                                    <div style={{ padding: '1.25rem', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '10px', background: 'rgba(139,92,246,0.05)' }}>
                                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: '#c4b5fd', marginBottom: '0.75rem', fontWeight: '600' }}>GroqCloud / xAI Grok Key <span style={{ fontSize: '0.7rem', background: 'rgba(139,92,246,0.3)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>Primary</span></label>
                                                        <input
                                                            type="password"
                                                            className="kds-input"
                                                            value={vendorConfig?.payment_config?.grok_api_key || ''}
                                                            onChange={(e) => setVendorConfig({...vendorConfig, payment_config: {...vendorConfig.payment_config, grok_api_key: e.target.value}})}
                                                            placeholder="gsk_... or xai-..."
                                                        />
                                                        <small style={{ color: '#64748b', marginTop: '0.4rem', display: 'block' }}>GroqCloud keys come from <a href="https://console.groq.com/keys" target="_blank" style={{ color: '#7c3aed' }}>console.groq.com</a>. xAI Grok keys come from <a href="https://console.x.ai" target="_blank" style={{ color: '#7c3aed' }}>console.x.ai</a>.</small>
                                                    </div>
                                                    <div style={{ padding: '1.25rem', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '10px', background: 'rgba(59,130,246,0.05)' }}>
                                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: '#93c5fd', marginBottom: '0.75rem', fontWeight: '600' }}>Gemini API Key <span style={{ fontSize: '0.7rem', background: 'rgba(59,130,246,0.2)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>Fallback</span></label>
                                                        <input
                                                            type="password"
                                                            className="kds-input"
                                                            value={vendorConfig?.payment_config?.gemini_api_key || ''}
                                                            onChange={(e) => setVendorConfig({...vendorConfig, payment_config: {...vendorConfig.payment_config, gemini_api_key: e.target.value}})}
                                                            placeholder="AIza..."
                                                        />
                                                        <small style={{ color: '#64748b', marginTop: '0.4rem', display: 'block' }}>Get your free key at <a href="https://aistudio.google.com/apikey" target="_blank" style={{ color: '#3b82f6' }}>aistudio.google.com</a></small>
                                                    </div>
                                                    <button
                                                        disabled={isSavingVault}
                                                        className="btn-primary"
                                                        style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)', color: '#fff' }}
                                                        onClick={async () => {
                                                            setIsSavingVault(true);
                                                            const { error } = await supabase.from('vendors').update({ payment_config: vendorConfig.payment_config }).eq('id', currentVendorId);
                                                            setIsSavingVault(false);
                                                            if (error) alert('Save failed: ' + error.message);
                                                            else alert('AI Manager keys saved! Go to the AI Manager tab to start chatting.');
                                                        }}
                                                    >{isSavingVault ? 'Saving...' : 'ðŸ¤– Save AI Keys'}</button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {kdsSearchQuery.trim() ? (
                        <div style={{ padding: '0 2rem 2rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
                                <h2 style={{ margin: 0, color: '#60a5fa' }}> Global Search Results for "{kdsSearchQuery}"</h2>
                                <button className="btn-secondary" onClick={() => setKdsSearchQuery('')}>Clear Search</button>
                            </div>
                            
                            {(() => {
                                const q = kdsSearchQuery.toLowerCase().trim();
                                const allMatches = [...orders, ...historyOrders].filter(o => 
                                    o.order_number?.toLowerCase().includes(q) || 
                                    o.customer_name?.toLowerCase().includes(q) ||
                                    o.customer_phone?.includes(q)
                                );

                                if (allMatches.length === 0) {
                                    return <p className="empty-state" style={{ textAlign: 'center', padding: '5rem' }}>No orders found matching your search. Try order number or customer name.</p>;
                                }

                                return (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                                        {allMatches.map(o => (
                                            <div key={o.id} style={{ position: 'relative' }}>
                                                {(o.status === 'completed' || o.status === 'collected') && (
                                                    <div style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 5, background: 'rgba(0,0,0,0.8)', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid #10b981', color: '#10b981', fontSize: '0.7rem', fontWeight: 'bold' }}>
                                                         ARCHIVED
                                                    </div>
                                                )}
                                                <OrderCard 
                                                    order={o} 
                                                    updateOrderStatus={updateOrderStatus} 
                                                    showLocation={true} 
                                                    setIsVerifyingPin={setIsVerifyingPin} 
                                                    setVerificationPin={setVerificationPin} 
                                                    setPinError={setPinError} 
                                                />
                                            </div>
                                        ))}
                                    </div>
                                );
                            })()}
                        </div>
                    ) : activeTab === 'kds' ? (
                        <div className="kds-columns">
                            {/* Column 1: New / Paid */}
                            <div className="kds-col kds-col-new">
                                <h2> NEW CLIENT REQUESTS ({newOrders.length})</h2>
                                <div className="kds-list">
                                    {newOrders.map(o => <OrderCard key={o.id} order={o} updateOrderStatus={updateOrderStatus} showLocation={selectedLocation === 'all'} setIsVerifyingPin={setIsVerifyingPin} setVerificationPin={setVerificationPin} setPinError={setPinError} />)}
                                    {newOrders.length === 0 && <p className="empty-state">No new client requests.</p>}
                                </div>
                            </div>

                            {/* Column 2: Preparing */}
                            <div className="kds-col kds-col-prep">
                                <h2> IN PRODUCTION ({prepOrders.length})</h2>
                                <div className="kds-list">
                                    {prepOrders.map(o => <OrderCard key={o.id} order={o} updateOrderStatus={updateOrderStatus} showLocation={selectedLocation === 'all'} setIsVerifyingPin={setIsVerifyingPin} setVerificationPin={setVerificationPin} setPinError={setPinError} />)}
                                    {prepOrders.length === 0 && <p className="empty-state">No active tailoring work right now.</p>}
                                </div>
                            </div>

                            {/* Column 3: Ready */}
                            <div className="kds-col kds-col-ready">
                                <h2> READY FOR HANDOVER ({readyOrders.length})</h2>
                                <div className="kds-list">
                                    {readyOrders.map(o => <OrderCard key={o.id} order={o} updateOrderStatus={updateOrderStatus} showLocation={selectedLocation === 'all'} setIsVerifyingPin={setIsVerifyingPin} setVerificationPin={setVerificationPin} setPinError={setPinError} />)}
                                    {readyOrders.length === 0 && <p className="empty-state">No finished pieces awaiting collection.</p>}
                                </div>
                            </div>
                        </div>
                    ) : null}

            {activeTab === 'customers' && (
                <div className="vault-container">
                    <div className="vault-header">
                        <div>
                            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Client CRM & Measurements</h2>
                            <p style={{ color: '#94a3b8' }}>Track client profiles, measurements, payment progress, and relationship notes in one studio workspace.</p>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                            <div className="status-badge status-ready">Active: {crmClients.filter((client) => client.status === 'active').length}</div>
                            <div className="status-badge status-pending">Leads: {crmClients.filter((client) => client.status === 'lead').length}</div>
                            <div className="status-badge status-completed">VIP: {crmClients.filter((client) => client.status === 'vip').length}</div>
                            <div className="status-badge status-paid">Payment Follow-up: {crmClients.filter((client) => ['deposit_pending', 'balance_pending', 'overdue'].includes(client.payment_status)).length}</div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 420px) 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
                        <form onSubmit={saveStudioClient} className="finances-card" style={{ display: 'grid', gap: '0.85rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ margin: 0 }}>{clientForm.id ? 'Edit Client' : 'Add Client'}</h3>
                                {clientForm.id && <button type="button" className="btn-secondary" onClick={resetClientForm}>Clear</button>}
                            </div>

                            <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: '1fr 1fr' }}>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label style={{ display: 'block', color: '#94a3b8', marginBottom: '0.4rem' }}>Full Name</label>
                                    <input className="kds-input" value={clientForm.full_name} onChange={(e) => setClientForm({ ...clientForm, full_name: e.target.value })} placeholder="Client name" />
                                </div>
                                <div>
                                    <label style={{ display: 'block', color: '#94a3b8', marginBottom: '0.4rem' }}>Phone / WhatsApp</label>
                                    <input className="kds-input" value={clientForm.phone} onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })} placeholder="0812345678" />
                                </div>
                                <div>
                                    <label style={{ display: 'block', color: '#94a3b8', marginBottom: '0.4rem' }}>Email</label>
                                    <input className="kds-input" value={clientForm.email} onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })} placeholder="client@email.com" />
                                </div>
                                <div>
                                    <label style={{ display: 'block', color: '#94a3b8', marginBottom: '0.4rem' }}>Instagram</label>
                                    <input className="kds-input" value={clientForm.instagram_handle} onChange={(e) => setClientForm({ ...clientForm, instagram_handle: e.target.value })} placeholder="@clienthandle" />
                                </div>
                                <div>
                                    <label style={{ display: 'block', color: '#94a3b8', marginBottom: '0.4rem' }}>Preferred Contact</label>
                                    <select className="kds-select" value={clientForm.preferred_contact_method} onChange={(e) => setClientForm({ ...clientForm, preferred_contact_method: e.target.value })}>
                                        <option value="whatsapp">WhatsApp</option>
                                        <option value="call">Call</option>
                                        <option value="email">Email</option>
                                        <option value="instagram">Instagram</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', color: '#94a3b8', marginBottom: '0.4rem' }}>Client Status</label>
                                    <select className="kds-select" value={clientForm.status} onChange={(e) => setClientForm({ ...clientForm, status: e.target.value })}>
                                        <option value="lead">Lead</option>
                                        <option value="active">Active</option>
                                        <option value="vip">VIP</option>
                                        <option value="archived">Archived</option>
                                    </select>
                                </div>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label style={{ display: 'block', color: '#94a3b8', marginBottom: '0.4rem' }}>Payment Status</label>
                                    <select className="kds-select" value={clientForm.payment_status} onChange={(e) => setClientForm({ ...clientForm, payment_status: e.target.value })}>
                                        <option value="inquiry">Inquiry</option>
                                        <option value="quote_sent">Quote Sent</option>
                                        <option value="deposit_pending">Deposit Pending</option>
                                        <option value="deposit_paid">Deposit Paid</option>
                                        <option value="balance_pending">Balance Pending</option>
                                        <option value="paid">Paid</option>
                                        <option value="overdue">Overdue</option>
                                        <option value="cancelled">Cancelled</option>
                                    </select>
                                </div>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label style={{ display: 'block', color: '#94a3b8', marginBottom: '0.4rem' }}>Measurements</label>
                                    <textarea className="kds-input" rows="5" value={clientForm.measurements} onChange={(e) => setClientForm({ ...clientForm, measurements: e.target.value })} placeholder={`chest: 102 cm\nwaist: 88 cm\ninseam: 78 cm`} />
                                </div>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label style={{ display: 'block', color: '#94a3b8', marginBottom: '0.4rem' }}>Client Notes</label>
                                    <textarea className="kds-input" rows="4" value={clientForm.notes} onChange={(e) => setClientForm({ ...clientForm, notes: e.target.value })} placeholder="Fabric preferences, deadlines, style notes, sizing reminders..." />
                                </div>
                            </div>

                            <button type="submit" className="btn-primary" disabled={savingClient}>
                                {savingClient ? 'Saving...' : clientForm.id ? 'Save Client' : 'Add Client'}
                            </button>
                        </form>

                        <div className="finances-card">
                            <h3 style={{ marginTop: 0 }}>Relationship Snapshot</h3>
                            <div style={{ display: 'grid', gap: '0.85rem' }}>
                                {crmClients.slice(0, 6).map((client) => (
                                    <div key={client.id} style={{ padding: '0.95rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.03)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.35rem' }}>
                                            <strong>{client.full_name}</strong>
                                            <span className={`status-badge status-${client.status === 'vip' ? 'completed' : client.status === 'active' ? 'ready' : client.status === 'archived' ? 'paid' : 'pending'}`}>{client.status}</span>
                                        </div>
                                        <div style={{ color: '#94a3b8', fontSize: '0.88rem' }}>{client.phone || client.email || 'No contact details yet'}</div>
                                        <div style={{ color: '#cbd5e1', fontSize: '0.9rem', marginTop: '0.35rem' }}>{client.payment_status?.replace(/_/g, ' ')}</div>
                                        {client.notes && <div style={{ color: '#94a3b8', fontSize: '0.82rem', marginTop: '0.45rem' }}>{client.notes}</div>}
                                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
                                            <button className="btn-secondary" style={{ fontSize: '0.78rem' }} onClick={() => startEditClient(client)}>Edit</button>
                                            {client.phone && (
                                                <button
                                                    className="btn-secondary"
                                                    style={{ fontSize: '0.78rem' }}
                                                    onClick={() => window.open(`https://wa.me/${String(client.phone).replace(/\D/g, '')}`, '_blank')}
                                                >
                                                    WhatsApp
                                                </button>
                                            )}
                                            <button
                                                className="btn-primary"
                                                style={{ fontSize: '0.78rem', background: '#8b5cf6', color: '#f5f3ff' }}
                                                onClick={() => {
                                                    resetAppointmentForm();
                                                    setAppointmentForm((current) => ({
                                                        ...current,
                                                        client_id: client.id,
                                                        contact_name: client.full_name || '',
                                                        contact_phone: client.phone || '',
                                                        contact_email: client.email || ''
                                                    }));
                                                    setActiveTab('reservations');
                                                }}
                                            >
                                                New Appointment
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {crmClients.length === 0 && <div className="empty-state">No stylist clients yet. The first booking request will start populating this studio CRM once the new CRM tables are live.</div>}
                            </div>
                        </div>
                    </div>

                    <div className="table-responsive">
                        <table className="vault-table">
                            <thead>
                                <tr>
                                    <th>Client</th>
                                    <th>Contact</th>
                                    <th>Status</th>
                                    <th>Payment</th>
                                    <th>Last Appointment</th>
                                    <th>Measurements</th>
                                    <th>Notes</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {crmClients.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" className="empty-state">No client profiles yet.</td>
                                    </tr>
                                ) : (
                                    crmClients.map((client) => (
                                        <tr key={client.id}>
                                            <td>
                                                <strong>{client.full_name}</strong>
                                                {client.instagram_handle && <div style={{ color: '#94a3b8', fontSize: '0.82rem', marginTop: '0.25rem' }}>{client.instagram_handle}</div>}
                                            </td>
                                            <td>
                                                <div>{client.phone || 'No phone added'}</div>
                                                {client.email && <div style={{ color: '#94a3b8', fontSize: '0.82rem', marginTop: '0.25rem' }}>{client.email}</div>}
                                                <div style={{ color: '#64748b', fontSize: '0.78rem', marginTop: '0.25rem' }}>{client.preferred_contact_method?.replace(/_/g, ' ')}</div>
                                            </td>
                                            <td>
                                                <span className={`status-badge status-${client.status === 'vip' ? 'completed' : client.status === 'active' ? 'ready' : client.status === 'archived' ? 'paid' : 'pending'}`}>
                                                    {client.status}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`status-badge status-${client.payment_status === 'paid' ? 'completed' : client.payment_status === 'deposit_paid' ? 'ready' : client.payment_status === 'overdue' ? 'paid' : 'pending'}`}>
                                                    {client.payment_status?.replace(/_/g, ' ')}
                                                </span>
                                            </td>
                                            <td>
                                                {client.last_appointment_at ? new Date(client.last_appointment_at).toLocaleDateString() : <span style={{ color: '#64748b' }}>Not booked yet</span>}
                                            </td>
                                            <td style={{ maxWidth: '220px', color: '#cbd5e1' }}>
                                                {client.measurements && Object.keys(client.measurements).length > 0 ? (
                                                    <div style={{ display: 'grid', gap: '0.2rem' }}>
                                                        {Object.entries(client.measurements).slice(0, 4).map(([key, value]) => (
                                                            <span key={key}><strong style={{ color: '#f8fafc' }}>{key}:</strong> {String(value)}</span>
                                                        ))}
                                                        {Object.keys(client.measurements).length > 4 && <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>+ more</span>}
                                                    </div>
                                                ) : (
                                                    <span style={{ color: '#64748b' }}>No measurements saved</span>
                                                )}
                                            </td>
                                            <td style={{ maxWidth: '220px', color: '#cbd5e1' }}>
                                                {client.notes ? client.notes : <span style={{ color: '#64748b' }}>No notes yet</span>}
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                                                    <button className="btn-secondary" style={{ padding: '0.45rem 0.65rem', fontSize: '0.8rem' }} onClick={() => startEditClient(client)}>
                                                        Edit
                                                    </button>
                                                    {client.phone && (
                                                        <button className="btn-secondary" style={{ padding: '0.45rem 0.65rem', fontSize: '0.8rem' }} onClick={() => window.open(`https://wa.me/${String(client.phone).replace(/\D/g, '')}`, '_blank')}>
                                                            WhatsApp
                                                        </button>
                                                    )}
                                                    <button
                                                        className="btn-primary"
                                                        style={{ padding: '0.45rem 0.65rem', fontSize: '0.8rem', background: '#8b5cf6', color: '#f5f3ff' }}
                                                        onClick={() => {
                                                            resetAppointmentForm();
                                                            setAppointmentForm((current) => ({
                                                                ...current,
                                                                client_id: client.id,
                                                                contact_name: client.full_name || '',
                                                                contact_phone: client.phone || '',
                                                                contact_email: client.email || ''
                                                            }));
                                                            setActiveTab('reservations');
                                                        }}
                                                    >
                                                        Book Fitting
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'testimonials' && (
                <div style={{ padding: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                        <div>
                            <h2 style={{ color: '#fff', margin: 0 }}> Testimonial Manager</h2>
                            <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Moderate customer reviews submitted from your landing page. Toggle visibility or add manually.</p>
                        </div>
                        <button className="btn-primary" onClick={addTestimonial}>+ Add Testimonial</button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                        {testimonials.map(t => (
                            <div key={t.id} style={{ background: '#1e293b', border: `1px solid ${t.is_active ? '#334155' : 'rgba(251,191,36,0.4)'}`, borderRadius: '12px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', gap: '0.15rem' }}>
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <span key={star} style={{ color: star <= (t.rating || 5) ? '#fbbf24' : '#475569', fontSize: '1.1rem' }}>â˜…</span>
                                        ))}
                                    </div>
                                    {!t.is_active && <span style={{ fontSize: '0.7rem', background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.4)', borderRadius: '6px', padding: '0.2rem 0.6rem' }}>Pending</span>}
                                </div>
                                {t.quote ? (
                                    <p style={{ color: '#f8fafc', fontStyle: 'italic', margin: 0 }}>"{t.quote}"</p>
                                ) : (
                                    <p style={{ color: '#475569', fontStyle: 'italic', margin: 0, fontSize: '0.85rem' }}>â€” star rating only â€”</p>
                                )}
                                <div>
                                    <div style={{ color: '#fff', fontWeight: 'bold' }}>{t.author_name}</div>
                                    <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{t.author_role}</div>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                    <button 
                                        className="btn-secondary" 
                                        style={{ flex: 1, fontSize: '0.75rem' }}
                                        onClick={() => toggleTestimonial(t.id, t.is_active)}
                                    >
                                        {t.is_active ? 'Hide' : 'Show'}
                                    </button>
                                    <button 
                                        className="btn-secondary" 
                                        style={{ flex: 1, fontSize: '0.75rem', color: '#ef4444' }}
                                        onClick={() => deleteTestimonial(t.id)}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                    {testimonials.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '5rem', background: '#1e293b', borderRadius: '12px', border: '1px dashed #334155' }}>
                            <p style={{ color: '#94a3b8' }}>No testimonials yet. Click "+ Add Testimonial" to start building your social proof! </p>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'logistics' && (
                <div className="cms-editor" style={{ maxWidth: '900px', margin: '2rem auto' }}>
                    <div className="cms-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
                            <div>
                                <h2 style={{ color: '#c6a15b', margin: 0 }}> Logistics & Delivery Manager</h2>
                                <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '0.5rem' }}>Configure delivery availability and fees for each of your branches.</p>
                            </div>
                            <button 
                                className="btn-primary" 
                                disabled={isSavingLogistics}
                                onClick={async () => {
                                    setIsSavingLogistics(true);
                                    try {
                                        for (const loc of locations) {
                                            const { error } = await supabase
                                                .from('locations')
                                                .update({
                                                    delivery_enabled: loc.delivery_enabled,
                                                    delivery_fee: loc.delivery_fee
                                                })
                                                .eq('id', loc.id);
                                            if (error) throw error;
                                        }
                                        alert("Logistics updated successfully! ");
                                    } catch (err) {
                                        alert("Error saving logistics: " + err.message);
                                    } finally {
                                        setIsSavingLogistics(false);
                                    }
                                }}
                            >
                                {isSavingLogistics ? 'Saving...' : ' Save Logistics Config'}
                            </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
                            {locations.map(loc => (
                                <div key={loc.id} style={{ background: 'rgba(30, 41, 59, 0.5)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1.5rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                                        <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#fff' }}> {loc.name}</h3>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <span style={{ fontSize: '0.8rem', color: loc.delivery_enabled ? '#c6a15b' : '#64748b' }}>
                                                {loc.delivery_enabled ? 'Delivery ON' : 'Delivery OFF'}
                                            </span>
                                            <label className="switch" style={{ width: '40px', height: '20px' }}>
                                                <input 
                                                    type="checkbox" 
                                                    checked={loc.delivery_enabled || false}
                                                    onChange={(e) => {
                                                        const updated = locations.map(l => l.id === loc.id ? { ...l, delivery_enabled: e.target.checked } : l);
                                                        setLocations(updated);
                                                    }}
                                                />
                                                <span className="slider round"></span>
                                            </label>
                                        </div>
                                    </div>

                                    {loc.delivery_enabled && (
                                        <div className="form-group" style={{ animation: 'slideDown 0.3s ease-out' }}>
                                            <label style={{ fontSize: '0.85rem' }}>Delivery Fee (ZAR)</label>
                                            <div style={{ position: 'relative', marginTop: '0.5rem' }}>
                                                <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>R</span>
                                                <input 
                                                    type="number" 
                                                    className="kds-input" 
                                                    style={{ paddingLeft: '2.5rem' }}
                                                    value={loc.delivery_fee || 0}
                                                    onChange={(e) => {
                                                        const updated = locations.map(l => l.id === loc.id ? { ...l, delivery_fee: parseFloat(e.target.value) || 0 } : l);
                                                        setLocations(updated);
                                                    }}
                                                />
                                            </div>
                                            <small style={{ color: '#64748b', marginTop: '0.5rem', display: 'block' }}>This fee will be added to the customer's total at checkout.</small>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'support' && (
                <div className="vault-container" style={{ display: 'flex', height: 'calc(100vh - 150px)', overflow: 'hidden', padding: 0 }}>

                    {/* Left Pane: Sessions */}
                    <div style={{ width: '350px', background: '#1e293b', borderRight: '1px solid #334155', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ padding: '1rem', borderBottom: '1px solid #334155', background: '#0f172a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ fontSize: '1.2rem', margin: 0 }}> Active Chats</h2>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button 
                                    onClick={() => setChatMode('active')}
                                    style={{ padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', background: chatMode === 'active' ? '#c6a15b' : 'transparent', color: chatMode === 'active' ? '#000' : '#94a3b8', border: '1px solid #334155', cursor: 'pointer' }}
                                >Active</button>
                                <button 
                                    onClick={() => setChatMode('history')}
                                    style={{ padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', background: chatMode === 'history' ? '#c6a15b' : 'transparent', color: chatMode === 'history' ? '#000' : '#94a3b8', border: '1px solid #334155', cursor: 'pointer' }}
                                >History</button>
                            </div>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            {/* Group chats by session_identifier and filter by order status */}
                            {Array.from(new Set(chats.map(c => c.session_identifier))).filter(sessionId => {
                                const order = [...orders, ...historyOrders].find(o => o.order_number === sessionId);
                                if (chatMode === 'active') {
                                    return !order || (order.status !== 'completed' && order.status !== 'refunded');
                                } else {
                                    return order && (order.status === 'completed' || order.status === 'refunded');
                                }
                            }).map(sessionId => {
                                const sessionChats = chats.filter(c => c.session_identifier === sessionId);
                                const lastChat = sessionChats[sessionChats.length - 1];
                                const unread = sessionChats.filter(c => c.sender_type === 'customer' && !c.is_read).length;
                                return (
                                    <div 
                                        key={sessionId} 
                                        onClick={() => {
                                            setActiveChatSession(sessionId);
                                            // Optional: Mark as read logic
                                        }}
                                        style={{ 
                                            padding: '1rem', 
                                            borderBottom: '1px solid #334155', 
                                            cursor: 'pointer',
                                            background: activeChatSession === sessionId ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                                            borderLeft: activeChatSession === sessionId ? '4px solid #3b82f6' : '4px solid transparent'
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                            <strong style={{ color: '#f8fafc' }}>Order: {sessionId}</strong>
                                            {unread > 0 && <span style={{ background: '#ef4444', color: '#fff', padding: '0.1rem 0.4rem', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 'bold' }}>{unread}</span>}
                                        </div>
                                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {lastChat.message}
                                        </p>
                                    </div>
                                );
                            })}
                            {chats.length === 0 && <p style={{ padding: '1rem', color: '#64748b', textAlign: 'center' }}>No messages yet.</p>}
                        </div>
                    </div>

                    {/* Right Pane: Chat Thread */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#0f172a' }}>
                        {activeChatSession ? (
                            <>
                                <div style={{ padding: '1rem', borderBottom: '1px solid #334155', background: '#1e293b' }}>
                                    <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Chatting with Order: {activeChatSession}</h2>
                                </div>
                                <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {chats.filter(c => c.session_identifier === activeChatSession).map(chat => {
                                        const isVendor = chat.sender_type === 'admin';
                                        return (
                                            <div key={chat.id} style={{ 
                                                alignSelf: isVendor ? 'flex-end' : 'flex-start',
                                                background: isVendor ? '#3b82f6' : '#334155',
                                                color: '#fff',
                                                padding: '0.75rem 1rem',
                                                borderRadius: '12px',
                                                borderBottomRightRadius: isVendor ? '0' : '12px',
                                                borderBottomLeftRadius: !isVendor ? '0' : '12px',
                                                maxWidth: '70%',
                                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                            }}>
                                                <div style={{ fontSize: '0.9rem', wordBreak: 'break-word' }}>{chat.message}</div>
                                                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', marginTop: '0.25rem', textAlign: isVendor ? 'right' : 'left' }}>
                                                    {new Date(chat.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div style={{ padding: '1rem', borderTop: '1px solid #334155', background: '#1e293b' }}>
                                    <form onSubmit={async (e) => {
                                        e.preventDefault();
                                        if (!newAdminMessage.trim()) return;
                                        const { error } = await supabase.from('support_chats').insert({
                                            vendor_id: currentVendorId,
                                            session_identifier: activeChatSession,
                                            sender_type: 'admin',
                                            message: newAdminMessage.trim()
                                        });
                                        if (error) alert("Send failed: " + error.message);
                                        else setNewAdminMessage('');
                                    }} style={{ display: 'flex', gap: '0.5rem' }}>
                                        <input 
                                            type="text" 
                                            value={newAdminMessage}
                                            onChange={(e) => setNewAdminMessage(e.target.value)}
                                            placeholder="Type a reply..." 
                                            style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid #475569', background: '#0f172a', color: '#fff', outline: 'none' }}
                                        />
                                        <button type="submit" className="btn-primary" style={{ padding: '0 1.5rem', fontWeight: 'bold' }}>Send</button>
                                    </form>
                                </div>
                            </>
                        ) : (
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                                Select a session from the left to start chatting.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'ai' && (
                <div className="finances-card" style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 320px) minmax(0, 1fr)', gap: '1.5rem', alignItems: 'stretch' }}>
                    <div style={{ background: '#0f172a', border: '1px solid rgba(139,92,246,0.24)', borderRadius: '16px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                            <div style={{ color: '#a78bfa', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>AI Manager</div>
                            <h2 style={{ margin: 0, fontSize: '1.4rem' }}>{isStaff ? 'Stock Copilot' : 'Business Copilot'}</h2>
                            <p style={{ color: '#94a3b8', fontSize: '0.92rem', lineHeight: '1.6', marginTop: '0.75rem' }}>
                                {isStaff
                                    ? 'Use plain language to update materials, log received stock, track shortages, and spot what needs restocking next.'
                                    : 'Ask about bookings, appointments, client activity, payments, studio performance, or what needs attention next.'}
                            </p>
                        </div>

                        <div style={{ display: 'grid', gap: '0.75rem' }}>
                            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '0.9rem 1rem' }}>
                                <div style={{ color: '#64748b', fontSize: '0.78rem', marginBottom: '0.25rem' }}>{isStaff ? 'Tracked Materials' : 'Active Orders'}</div>
                                <div style={{ fontSize: '1.4rem', fontWeight: '800' }}>{isStaff ? ingredients.length : orders.length}</div>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '0.9rem 1rem' }}>
                                <div style={{ color: '#64748b', fontSize: '0.78rem', marginBottom: '0.25rem' }}>{isStaff ? 'Out of Stock' : 'Ready for Handover'}</div>
                                <div style={{ fontSize: '1.4rem', fontWeight: '800' }}>
                                    {isStaff ? ingredients.filter(ing => Number(ing.current_stock ?? 0) <= 0).length : orders.filter(o => o.status === 'ready').length}
                                </div>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '0.9rem 1rem' }}>
                                <div style={{ color: '#64748b', fontSize: '0.78rem', marginBottom: '0.25rem' }}>Low Stock Signals</div>
                                <div style={{ fontSize: '1.4rem', fontWeight: '800' }}>
                                    {ingredients.filter(ing => Number(ing.current_stock ?? 0) <= Number(ing.low_stock_threshold ?? 5)).length}
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                            {(isStaff ? staffAiPrompts : [
                                'What should I focus on right now?',
                                'Which orders are stuck?',
                                'How many bookings do I have this week?',
                                'Generate a reservations report for this month.',
                                "Summarize today's business performance."
                            ]).map(prompt => (
                                <button
                                    key={prompt}
                                    type="button"
                                    className="btn-secondary"
                                    onClick={() => setAiInput(prompt)}
                                    style={{ justifyContent: 'flex-start', textAlign: 'left', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.18)', color: '#ddd6fe' }}
                                >
                                    {prompt}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', display: 'flex', flexDirection: 'column', minHeight: '70vh', overflow: 'hidden' }}>
                        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                            <div>
                                <div style={{ fontWeight: '700', fontSize: '1rem' }}>{isStaff ? 'Materials Chat' : 'Studio Operations Chat'}</div>
                                <div style={{ color: '#64748b', fontSize: '0.84rem' }}>
                                    {isStaff ? 'Grounded in your own ingredient and stock data only' : 'Grounded in your own bookings, orders, stock, menu, and expense data'}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setAiMessages([{
                                    role: 'assistant',
                                    content: isStaff
                                        ? 'Hello! I am your Stock Copilot. I can help you log refills, deduct wastage, and point out stock risks without touching billing or private owner settings.'
                                        : 'Hello! I am your AI Manager. I can help with bookings, orders, inventory, revenue, reports, and what needs attention in your business right now.'
                                }])}
                                style={{ background: 'transparent', border: '1px solid #334155', color: '#94a3b8', borderRadius: '10px', padding: '0.55rem 0.85rem', cursor: 'pointer' }}
                            >
                                Reset chat
                            </button>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {aiMessages.map((message, idx) => (
                                <div
                                    key={`${message.role}-${idx}`}
                                    style={{
                                        alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
                                        maxWidth: '82%',
                                        background: message.role === 'user' ? 'rgba(139,92,246,0.22)' : 'rgba(255,255,255,0.04)',
                                        color: '#f8fafc',
                                        border: `1px solid ${message.role === 'user' ? 'rgba(139,92,246,0.28)' : 'rgba(255,255,255,0.06)'}`,
                                        borderRadius: message.role === 'user' ? '18px 18px 6px 18px' : '18px 18px 18px 6px',
                                        padding: '0.95rem 1rem',
                                        lineHeight: '1.6',
                                        whiteSpace: 'pre-wrap'
                                    }}
                                >
                                    {message.content}
                                </div>
                            ))}
                            {aiLoading && (
                                <div style={{ alignSelf: 'flex-start', maxWidth: '82%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '18px 18px 18px 6px', padding: '0.95rem 1rem', color: '#cbd5e1' }}>
                                    Thinking...
                                </div>
                            )}
                            {aiPendingAction?.type === 'inventory_adjustment' && (
                                <div style={{ alignSelf: 'stretch', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.24)', borderRadius: '14px', padding: '1rem' }}>
                                    <div style={{ color: '#86efac', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.45rem' }}>Pending Stock Update</div>
                                    <div style={{ fontWeight: '700', marginBottom: '0.35rem' }}>{aiPendingAction.ingredient_name}</div>
                                    <div style={{ color: '#cbd5e1', fontSize: '0.92rem', lineHeight: '1.6' }}>
                                        {aiPendingAction.operation === 'set_stock_exactly'
                                            ? `Set stock to ${aiPendingAction.quantity}.`
                                            : aiPendingAction.operation === 'decrease_stock'
                                                ? `Remove ${aiPendingAction.quantity} from current stock.`
                                                : `Add ${aiPendingAction.quantity} to current stock.`}
                                    </div>
                                    {aiPendingAction.restock_note && (
                                        <div style={{ color: '#94a3b8', fontSize: '0.84rem', marginTop: '0.45rem' }}>
                                            {aiPendingAction.restock_note}
                                        </div>
                                    )}
                                    <div style={{ color: '#94a3b8', fontSize: '0.84rem', marginTop: '0.5rem' }}>
                                        Current: {aiPendingAction.current_stock} | Projected: {aiPendingAction.projected_stock}
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.9rem', flexWrap: 'wrap' }}>
                                        <button type="button" className="btn-primary" onClick={handleAiInventoryConfirm} disabled={aiActionLoading} style={{ background: '#10b981', color: '#04130b' }}>
                                            {aiActionLoading ? 'Applying...' : 'Confirm Update'}
                                        </button>
                                        <button type="button" className="btn-secondary" onClick={() => setAiPendingAction(null)} disabled={aiActionLoading}>
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}
                            {aiPendingAction?.type === 'pdf_report' && (
                                <div style={{ alignSelf: 'stretch', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.24)', borderRadius: '14px', padding: '1rem' }}>
                                    <div style={{ color: '#93c5fd', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.45rem' }}>Pending PDF Report</div>
                                    <div style={{ fontWeight: '700', marginBottom: '0.35rem' }}>{aiPendingAction.title}</div>
                                    <div style={{ color: '#cbd5e1', fontSize: '0.92rem', lineHeight: '1.6' }}>
                                        {aiPendingAction.subtitle}
                                    </div>
                                    <div style={{ color: '#94a3b8', fontSize: '0.84rem', marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                                        {Object.entries(aiPendingAction.summary || {}).map(([key, value]) => {
                                            const label = key.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
                                            const formatted = /revenue|spend|value|expense/i.test(key)
                                                ? `R ${Number(value || 0).toFixed(2)}`
                                                : value;
                                            return <span key={key}>{label}: {formatted}</span>;
                                        })}
                                    </div>
                                    <div style={{ marginTop: '0.8rem', maxHeight: '180px', overflowY: 'auto', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.75rem' }}>
                                        {(aiPendingAction.rows || []).slice(0, 5).map((row) => (
                                            <div key={`${aiPendingAction.report_kind}-${row.rank || row.item_name || row.branch_name || row.status || row.customer_phone || row.description || 'row'}`} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem', padding: '0.45rem 0', color: '#e2e8f0' }}>
                                                <div>
                                                    {(aiPendingAction.columns || []).slice(0, 3).map((column, idx) => (
                                                        <div key={column.key} style={{ color: idx === 0 ? '#f8fafc' : '#94a3b8', fontWeight: idx === 0 ? '600' : '400', fontSize: idx === 0 ? '0.94rem' : '0.82rem' }}>
                                                            {column.label}: {column.format === 'currency'
                                                                ? `R ${Number(row[column.key] || 0).toFixed(2)}`
                                                                : column.format === 'date'
                                                                    ? (row[column.key] ? new Date(row[column.key]).toLocaleDateString() : '-')
                                                                    : row[column.key]}
                                                        </div>
                                                    ))}
                                                </div>
                                                <div style={{ textAlign: 'right', color: '#cbd5e1', fontSize: '0.82rem' }}>
                                                    {(aiPendingAction.columns || []).slice(3).map((column) => (
                                                        <div key={column.key}>
                                                            {column.label}: {column.format === 'currency'
                                                                ? `R ${Number(row[column.key] || 0).toFixed(2)}`
                                                                : column.format === 'date'
                                                                    ? (row[column.key] ? new Date(row[column.key]).toLocaleDateString() : '-')
                                                                    : row[column.key]}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.9rem', flexWrap: 'wrap' }}>
                                        <button type="button" className="btn-primary" onClick={generateAiReportPdf} style={{ background: '#3b82f6', color: '#eff6ff' }}>
                                            Generate PDF
                                        </button>
                                        <button type="button" className="btn-secondary" onClick={() => setAiPendingAction(null)}>
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}
                            <div ref={aiChatEndRef}></div>
                        </div>

                        <form onSubmit={handleAiSend} style={{ padding: '1rem 1.25rem', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: '0.75rem' }}>
                            <input
                                type="text"
                                className="kds-input"
                                value={aiInput}
                                onChange={(e) => setAiInput(e.target.value)}
                                placeholder={isStaff ? 'Try: I have just refilled 54 slices of cheese...' : 'Ask about bookings, revenue, orders, stock, reports, or support pressure...'}
                                style={{ flex: 1 }}
                            />
                            <button type="submit" className="btn-primary" disabled={aiLoading || !aiInput.trim()} style={{ background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)', color: '#fff', minWidth: '120px' }}>
                                {aiLoading ? 'Thinking...' : 'Ask AI'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {activeTab === 'help' && (
                <div className="vault-container" style={{ maxWidth: '800px', margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                        <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem', color: '#60a5fa' }}> Welcome to the Help Center!</h2>
                        <p style={{ color: '#94a3b8', fontSize: '1.1rem' }}>
                            Here is the latest on how your studio works now, including AI support, appointments, client CRM, payments, and staff access.
                        </p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.22)', borderRadius: '12px', padding: '2rem' }}>
                            <h3 style={{ fontSize: '1.5rem', color: '#60a5fa', marginBottom: '1rem' }}> Recent Developments</h3>
                            <ul style={{ color: '#cbd5e1', paddingLeft: '1.25rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem', lineHeight: '1.6' }}>
                                <li><strong>AI Manager</strong> can now answer studio questions, highlight upcoming work, help with materials updates, and prepare branded PDF reports.</li>
                                <li><strong>Materials updates are safer</strong>. AI suggestions now ask for confirmation before anything changes in stock.</li>
                                <li><strong>Handover flow is cleaner</strong>. Jobs can still use the PIN flow when a handover code exists, but the admin no longer collapses when older data is inconsistent.</li>
                                <li><strong>Vendor payments are separated</strong>. Client payments and your own platform billing are no longer mixed together.</li>
                                <li><strong>Staff access is tighter</strong>. Team members can be limited to the tools they actually need instead of seeing full owner-level controls.</li>
                                <li><strong>Appointments and client CRM are now supported</strong> with public booking requests flowing into studio records.</li>
                                <li><strong>AI PDF reports are now supported</strong> for clients, services, studio performance, payments, materials, and upcoming work.</li>
                                <li><strong>Website CMS Copilot is now available</strong> inside branding settings to draft landing-page copy before you save it.</li>
                            </ul>
                        </div>

                        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '2rem' }}>
                            <h3 style={{ fontSize: '1.5rem', color: '#8b5cf6', marginBottom: '1rem' }}> AI Manager</h3>
                            <p style={{ color: '#cbd5e1', lineHeight: '1.6' }}>
                                The <strong>AI Manager</strong> is your studio copilot. You can ask it about bookings, fitting schedules, payment follow-ups, materials pressure, active jobs, and day summaries.
                            </p>
                            <ul style={{ color: '#cbd5e1', marginTop: '1rem', paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <li>Use it for questions like <strong>"What should I focus on right now?"</strong>, <strong>"Which fittings are coming up?"</strong>, or <strong>"How many bookings do I have this week?"</strong></li>
                                <li>You can also tell it stock actions like <strong>"Add 6 lining rolls"</strong> and then confirm the update.</li>
                                <li>If you buy materials in bulk, the AI can convert them into usable stock when you set up a restock conversion rule.</li>
                                <li>You can ask for branded PDFs such as <strong>"generate my top clients report from April to May"</strong>, <strong>"make a payment follow-up PDF for this month"</strong>, or <strong>"generate an appointments report for this month"</strong>.</li>
                                <li>The branding section now includes a <strong>Website CMS Copilot</strong> that can draft hero copy and about text before you apply it to the form.</li>
                            </ul>
                        </div>

                        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '2rem' }}>
                            <h3 style={{ fontSize: '1.5rem', color: '#c6a15b', marginBottom: '1rem' }}> Studio Pipeline</h3>
                            <p style={{ color: '#cbd5e1', lineHeight: '1.6' }}>
                                Think of the <strong>Studio Pipeline</strong> as the production control room. New client requests appear there first, then move through in progress, ready for handover, and completed.
                            </p>
                            <ul style={{ color: '#cbd5e1', marginTop: '1rem', paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <li>Use it to track new requests, work in progress, ready collections, and completed client handovers.</li>
                                <li>Appointments and fittings live in their own dedicated tab, but the pipeline still gives you a quick operational view.</li>
                                <li>When a job is ready, the system can still use a handover PIN flow if one exists.</li>
                            </ul>
                        </div>

                        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '2rem' }}>
                            <h3 style={{ fontSize: '1.5rem', color: '#f59e0b', marginBottom: '1rem' }}> Fabrics & Materials</h3>
                            <p style={{ color: '#cbd5e1', lineHeight: '1.6' }}>
                                Materials now work mainly with <strong>usable stock count</strong>. That means you track what the studio can actually use, like suiting lengths, lining rolls, zip counts, or trim packs, instead of relying on confusing measurement fields in the main flow.
                            </p>
                            <ul style={{ color: '#cbd5e1', marginTop: '1rem', paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <li>If you buy in bulk, add a restock conversion rule such as <strong>1 roll becomes 8 suit lengths</strong>.</li>
                                <li>Service material logic can deduct from usable stock automatically when work is fulfilled.</li>
                                <li>AI-assisted stock adjustments are logged for accountability.</li>
                            </ul>
                        </div>

                        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '2rem' }}>
                            <h3 style={{ fontSize: '1.5rem', color: '#38bdf8', marginBottom: '1rem' }}> Studio Registration & Website</h3>
                            <p style={{ color: '#cbd5e1', lineHeight: '1.6' }}>
                                When a stylist or studio registers, the system creates a vendor record, gives it a unique slug, and automatically makes a live landing page for that business.
                            </p>
                            <ul style={{ color: '#cbd5e1', marginTop: '1rem', paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <li>The landing page lives on a vendor route like <strong>/v/studio-slug</strong>.</li>
                                <li>Branding, services, testimonials, gallery, and support chat all feed into that vendor page.</li>
                                <li>Custom domains can also point to the same vendor storefront when configured.</li>
                            </ul>
                        </div>

                        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '2rem' }}>
                            <h3 style={{ fontSize: '1.5rem', color: '#f97316', marginBottom: '1rem' }}> Appointments & Client Bookings</h3>
                            <p style={{ color: '#cbd5e1', lineHeight: '1.6' }}>
                                Fitting requests and styling bookings are now part of this admin. Studios can collect booking requests from their landing page and manage them inside the <strong>Appointments</strong> tab.
                            </p>
                            <p style={{ color: '#cbd5e1', lineHeight: '1.6', marginTop: '0.85rem' }}>
                                The current workflow supports consultation dates, measurement sessions, fitting dates, payment status, garment notes, and internal studio notes from inquiry through completion.
                            </p>
                        </div>

                        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '2rem' }}>
                            <h3 style={{ fontSize: '1.5rem', color: '#3b82f6', marginBottom: '1rem' }}> Live Chat & Support</h3>
                            <p style={{ color: '#cbd5e1', lineHeight: '1.6' }}>
                                <strong>Live Chat</strong> is still your direct support line to clients. Use it when someone is confused, delayed, or needs help with a booking or garment order.
                            </p>
                            <p style={{ color: '#cbd5e1', lineHeight: '1.6', marginTop: '0.85rem' }}>
                                The storefront assistant and WhatsApp flow can also hand sensitive cases back to human support when needed.
                            </p>
                        </div>

                        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '2rem' }}>
                            <h3 style={{ fontSize: '1.5rem', color: '#22c55e', marginBottom: '1rem' }}> Payments & Security</h3>
                            <p style={{ color: '#cbd5e1', lineHeight: '1.6' }}>
                                Your payment setup is more protected now. Public storefront pages no longer read secret vendor configuration directly, and payment verification happens on the server side.
                            </p>
                            <ul style={{ color: '#cbd5e1', marginTop: '1rem', paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <li>Your own platform billing keys stay separate from vendor buyer-payment keys.</li>
                                <li>The <strong>Security Vault</strong> stores sensitive API keys and should remain owner/admin only.</li>
                                <li>Inventory staff should use their restricted workspace instead of the owner dashboard.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'reservations' && (
                <div className="vault-container">
                    <div className="vault-header">
                        <div>
                            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Appointments, Fittings & Studio Calendar</h2>
                            <p style={{ color: '#94a3b8' }}>Capture consultations, fitting dates, payment follow-ups, and client requests in one place.</p>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                            <div className="status-badge status-paid">Pending: {upcomingAppointments.filter((r) => r.status === 'pending').length}</div>
                            <div className="status-badge status-ready">Confirmed: {upcomingAppointments.filter((r) => r.status === 'confirmed').length}</div>
                            <div className="status-badge status-completed">Completed: {upcomingAppointments.filter((r) => r.status === 'completed').length}</div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 420px) 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
                        <form onSubmit={saveStudioAppointment} className="finances-card" style={{ display: 'grid', gap: '0.85rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ margin: 0 }}>{appointmentForm.id ? 'Edit Appointment' : 'Add Appointment'}</h3>
                                {appointmentForm.id && <button type="button" className="btn-secondary" onClick={resetAppointmentForm}>Clear</button>}
                            </div>

                            <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: '1fr 1fr' }}>
                                <div>
                                    <label style={{ display: 'block', color: '#94a3b8', marginBottom: '0.4rem' }}>Client</label>
                                    <select className="kds-select" value={appointmentForm.client_id} onChange={(e) => {
                                        const nextId = e.target.value;
                                        const linkedClient = studioClients.find((client) => client.id === nextId);
                                        setAppointmentForm((current) => ({
                                            ...current,
                                            client_id: nextId,
                                            contact_name: linkedClient?.full_name || current.contact_name,
                                            contact_phone: linkedClient?.phone || current.contact_phone,
                                            contact_email: linkedClient?.email || current.contact_email
                                        }));
                                    }}>
                                        <option value="">Walk-in / new client</option>
                                        {studioClients.map((client) => <option key={client.id} value={client.id}>{client.full_name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', color: '#94a3b8', marginBottom: '0.4rem' }}>Appointment Type</label>
                                    <select className="kds-select" value={appointmentForm.appointment_type} onChange={(e) => setAppointmentForm({ ...appointmentForm, appointment_type: e.target.value })}>
                                        <option value="consultation">Consultation</option>
                                        <option value="measurement">Measurement</option>
                                        <option value="fitting">Fitting</option>
                                        <option value="pickup">Pickup</option>
                                        <option value="delivery">Delivery</option>
                                        <option value="style_session">Style Session</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', color: '#94a3b8', marginBottom: '0.4rem' }}>Appointment Date</label>
                                    <input type="date" className="kds-input" value={appointmentForm.appointment_date} onChange={(e) => setAppointmentForm({ ...appointmentForm, appointment_date: e.target.value })} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', color: '#94a3b8', marginBottom: '0.4rem' }}>Time</label>
                                    <input type="time" className="kds-input" value={appointmentForm.appointment_time} onChange={(e) => setAppointmentForm({ ...appointmentForm, appointment_time: e.target.value })} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', color: '#94a3b8', marginBottom: '0.4rem' }}>Fitting Date</label>
                                    <input type="date" className="kds-input" value={appointmentForm.fitting_date} onChange={(e) => setAppointmentForm({ ...appointmentForm, fitting_date: e.target.value })} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', color: '#94a3b8', marginBottom: '0.4rem' }}>Fitting Time</label>
                                    <input type="time" className="kds-input" value={appointmentForm.fitting_time} onChange={(e) => setAppointmentForm({ ...appointmentForm, fitting_time: e.target.value })} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', color: '#94a3b8', marginBottom: '0.4rem' }}>Client Name</label>
                                    <input className="kds-input" value={appointmentForm.contact_name} onChange={(e) => setAppointmentForm({ ...appointmentForm, contact_name: e.target.value })} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', color: '#94a3b8', marginBottom: '0.4rem' }}>Phone</label>
                                    <input className="kds-input" value={appointmentForm.contact_phone} onChange={(e) => setAppointmentForm({ ...appointmentForm, contact_phone: e.target.value })} />
                                </div>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label style={{ display: 'block', color: '#94a3b8', marginBottom: '0.4rem' }}>Email</label>
                                    <input className="kds-input" value={appointmentForm.contact_email} onChange={(e) => setAppointmentForm({ ...appointmentForm, contact_email: e.target.value })} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', color: '#94a3b8', marginBottom: '0.4rem' }}>Garment Type</label>
                                    <input className="kds-input" value={appointmentForm.garment_type} onChange={(e) => setAppointmentForm({ ...appointmentForm, garment_type: e.target.value })} placeholder="Suit, dress, wedding fit..." />
                                </div>
                                <div>
                                    <label style={{ display: 'block', color: '#94a3b8', marginBottom: '0.4rem' }}>Look Type</label>
                                    <input className="kds-input" value={appointmentForm.look_type} onChange={(e) => setAppointmentForm({ ...appointmentForm, look_type: e.target.value })} placeholder="Formal, wedding, matric..." />
                                </div>
                                <div>
                                    <label style={{ display: 'block', color: '#94a3b8', marginBottom: '0.4rem' }}>Payment Status</label>
                                    <select className="kds-select" value={appointmentForm.payment_status} onChange={(e) => setAppointmentForm({ ...appointmentForm, payment_status: e.target.value })}>
                                        <option value="inquiry">Inquiry</option>
                                        <option value="quote_sent">Quote Sent</option>
                                        <option value="deposit_pending">Deposit Pending</option>
                                        <option value="deposit_paid">Deposit Paid</option>
                                        <option value="balance_pending">Balance Pending</option>
                                        <option value="paid">Paid</option>
                                        <option value="overdue">Overdue</option>
                                        <option value="cancelled">Cancelled</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', color: '#94a3b8', marginBottom: '0.4rem' }}>Budget Range</label>
                                    <input className="kds-input" value={appointmentForm.budget_range} onChange={(e) => setAppointmentForm({ ...appointmentForm, budget_range: e.target.value })} placeholder="R3 500 - R5 000" />
                                </div>
                                <div>
                                    <label style={{ display: 'block', color: '#94a3b8', marginBottom: '0.4rem' }}>Deposit</label>
                                    <input type="number" step="0.01" className="kds-input" value={appointmentForm.deposit_amount} onChange={(e) => setAppointmentForm({ ...appointmentForm, deposit_amount: e.target.value })} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', color: '#94a3b8', marginBottom: '0.4rem' }}>Balance</label>
                                    <input type="number" step="0.01" className="kds-input" value={appointmentForm.balance_amount} onChange={(e) => setAppointmentForm({ ...appointmentForm, balance_amount: e.target.value })} />
                                </div>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label style={{ display: 'block', color: '#94a3b8', marginBottom: '0.4rem' }}>Client Request</label>
                                    <textarea className="kds-input" rows="3" value={appointmentForm.special_requests} onChange={(e) => setAppointmentForm({ ...appointmentForm, special_requests: e.target.value })} placeholder="Occasion, measurements needed, fabric direction, deadlines..." />
                                </div>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label style={{ display: 'block', color: '#94a3b8', marginBottom: '0.4rem' }}>Internal Notes</label>
                                    <textarea className="kds-input" rows="3" value={appointmentForm.internal_notes} onChange={(e) => setAppointmentForm({ ...appointmentForm, internal_notes: e.target.value })} placeholder="Reminders for staff, fitting prep, payment notes..." />
                                </div>
                            </div>

                            <button type="submit" className="btn-primary" disabled={savingAppointment}>
                                {savingAppointment ? 'Saving...' : appointmentForm.id ? 'Save Appointment' : 'Create Appointment'}
                            </button>
                        </form>

                        <div className="finances-card">
                            <h3 style={{ marginTop: 0 }}>Today & Next</h3>
                            <div style={{ display: 'grid', gap: '0.85rem' }}>
                                {upcomingAppointments.slice(0, 6).map((appointment) => (
                                    <div key={appointment.id} style={{ padding: '0.95rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.03)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.35rem' }}>
                                            <strong>{appointment.contact_name}</strong>
                                            <span className={`status-badge status-${appointment.status === 'confirmed' ? 'ready' : appointment.status === 'completed' ? 'completed' : appointment.status === 'cancelled' ? 'paid' : appointment.status}`}>{appointment.status}</span>
                                        </div>
                                        <div style={{ color: '#94a3b8', fontSize: '0.88rem' }}>{appointment.appointment_date}{appointment.appointment_time ? ` at ${appointment.appointment_time}` : ''}</div>
                                        <div style={{ color: '#cbd5e1', fontSize: '0.9rem', marginTop: '0.35rem' }}>{appointment.garment_type || appointment.look_type || 'No garment details yet'}</div>
                                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
                                            <button className="btn-secondary" style={{ fontSize: '0.78rem' }} onClick={() => startEditAppointment(appointment)}>Edit</button>
                                            {appointment.status === 'pending' && <button className="btn-primary" style={{ fontSize: '0.78rem', background: '#10b981', color: '#052e16' }} onClick={() => updateStudioAppointmentStatus(appointment.id, 'confirmed')}>Confirm</button>}
                                            {appointment.status === 'confirmed' && <button className="btn-primary" style={{ fontSize: '0.78rem', background: '#3b82f6', color: '#eff6ff' }} onClick={() => updateStudioAppointmentStatus(appointment.id, 'in_progress')}>Start</button>}
                                            {['confirmed', 'in_progress'].includes(appointment.status) && <button className="btn-secondary" style={{ fontSize: '0.78rem' }} onClick={() => updateStudioAppointmentStatus(appointment.id, 'fitted')}>Mark Fitted</button>}
                                            {['fitted', 'ready'].includes(appointment.status) && <button className="btn-primary" style={{ fontSize: '0.78rem', background: '#8b5cf6', color: '#f5f3ff' }} onClick={() => updateStudioAppointmentStatus(appointment.id, 'completed')}>Complete</button>}
                                        </div>
                                    </div>
                                ))}
                                {upcomingAppointments.length === 0 && <div className="empty-state">No appointments yet. The next fitting request from the landing page will show up here once the new CRM tables are live.</div>}
                            </div>
                        </div>
                    </div>

                    <div className="table-responsive">
                        <table className="vault-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Client</th>
                                    <th>Appointment</th>
                                    <th>Payment</th>
                                    <th>Fitting</th>
                                    <th>Status</th>
                                    <th>Notes</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {upcomingAppointments.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" className="empty-state">No appointment records yet.</td>
                                    </tr>
                                ) : (
                                    upcomingAppointments.map((reservation) => (
                                        <tr key={reservation.id}>
                                            <td>
                                                <strong>{new Date(reservation.appointment_date).toLocaleDateString()}</strong>
                                                <br />
                                                <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{reservation.appointment_time || 'Time not set'}</span>
                                            </td>
                                            <td>
                                                {reservation.contact_name}
                                                <br />
                                                <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{reservation.contact_phone}</span>
                                                {reservation.contact_email && (
                                                    <>
                                                        <br />
                                                        <span style={{ color: '#64748b', fontSize: '0.8rem' }}>{reservation.contact_email}</span>
                                                    </>
                                                )}
                                            </td>
                                            <td style={{ textTransform: 'capitalize' }}>
                                                {reservation.appointment_type}
                                                {(reservation.garment_type || reservation.look_type) && <div style={{ color: '#94a3b8', fontSize: '0.82rem', marginTop: '0.25rem' }}>{reservation.garment_type || reservation.look_type}</div>}
                                            </td>
                                            <td>
                                                <span className={`status-badge status-${reservation.payment_status === 'paid' ? 'completed' : reservation.payment_status === 'deposit_paid' ? 'ready' : reservation.payment_status === 'overdue' ? 'paid' : 'pending'}`}>
                                                    {reservation.payment_status?.replace(/_/g, ' ')}
                                                </span>
                                                {(Number(reservation.deposit_amount || 0) > 0 || Number(reservation.balance_amount || 0) > 0) && (
                                                    <div style={{ color: '#94a3b8', fontSize: '0.78rem', marginTop: '0.35rem' }}>
                                                        Deposit: R {Number(reservation.deposit_amount || 0).toFixed(2)}<br />
                                                        Balance: R {Number(reservation.balance_amount || 0).toFixed(2)}
                                                    </div>
                                                )}
                                            </td>
                                            <td>
                                                {reservation.fitting_date ? (
                                                    <>
                                                        <strong>{new Date(reservation.fitting_date).toLocaleDateString()}</strong>
                                                        <br />
                                                        <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{reservation.fitting_time || 'Time not set'}</span>
                                                    </>
                                                ) : (
                                                    <span style={{ color: '#64748b' }}>Not set</span>
                                                )}
                                            </td>
                                            <td>
                                                <span className={`status-badge status-${reservation.status === 'cancelled' ? 'paid' : reservation.status === 'completed' ? 'completed' : reservation.status === 'confirmed' ? 'ready' : reservation.status}`}>
                                                    {reservation.status}
                                                </span>
                                            </td>
                                            <td style={{ maxWidth: '220px', color: '#cbd5e1' }}>
                                                {reservation.special_requests && <div>{reservation.special_requests}</div>}
                                                {reservation.internal_notes && <div style={{ marginTop: '0.35rem', color: '#94a3b8' }}><strong>Studio:</strong> {reservation.internal_notes}</div>}
                                                {!reservation.special_requests && !reservation.internal_notes && <span style={{ color: '#64748b' }}>No notes yet</span>}
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                                                    <button type="button" className="btn-secondary" style={{ padding: '0.45rem 0.65rem', fontSize: '0.8rem' }} onClick={() => startEditAppointment(reservation)}>
                                                        Edit
                                                    </button>
                                                    {reservation.status === 'pending' && (
                                                        <>
                                                            <button type="button" className="btn-primary" style={{ padding: '0.45rem 0.65rem', fontSize: '0.8rem', background: '#10b981', color: '#052e16' }} onClick={() => updateStudioAppointmentStatus(reservation.id, 'confirmed')}>
                                                                Confirm
                                                            </button>
                                                            <button type="button" className="btn-secondary" style={{ padding: '0.45rem 0.65rem', fontSize: '0.8rem' }} onClick={() => updateStudioAppointmentStatus(reservation.id, 'cancelled')}>
                                                                Decline
                                                            </button>
                                                        </>
                                                    )}
                                                    {reservation.status === 'confirmed' && (
                                                        <>
                                                            <button className="btn-primary" style={{ padding: '0.45rem 0.65rem', fontSize: '0.8rem', background: '#3b82f6', color: '#eff6ff' }} onClick={() => updateStudioAppointmentStatus(reservation.id, 'in_progress')}>
                                                                Start Session
                                                            </button>
                                                            <button className="btn-secondary" style={{ padding: '0.45rem 0.65rem', fontSize: '0.8rem' }} onClick={() => updateStudioAppointmentStatus(reservation.id, 'cancelled')}>
                                                                Cancel
                                                            </button>
                                                        </>
                                                    )}
                                                    {['in_progress', 'confirmed'].includes(reservation.status) && (
                                                        <button className="btn-secondary" style={{ padding: '0.45rem 0.65rem', fontSize: '0.8rem' }} onClick={() => updateStudioAppointmentStatus(reservation.id, 'fitted')}>
                                                            Mark Fitted
                                                        </button>
                                                    )}
                                                    {['fitted', 'ready'].includes(reservation.status) && (
                                                        <button className="btn-primary" style={{ padding: '0.45rem 0.65rem', fontSize: '0.8rem', background: '#8b5cf6', color: '#f5f3ff' }} onClick={() => updateStudioAppointmentStatus(reservation.id, 'completed')}>
                                                            Complete
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'history' && (
                <div className="vault-container">
                    <div className="vault-header">
                        <div>
                            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Completed Order History</h2>
                            <p style={{ color: '#94a3b8' }}>All collected and closed orders appear here.</p>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                            <div style={{ position: 'relative' }}>
                                <input 
                                    type="text"
                                    placeholder="Search History..."
                                    className="kds-input"
                                    value={historySearchQuery}
                                    onChange={(e) => setHistorySearchQuery(e.target.value)}
                                    style={{ 
                                        paddingLeft: '2.5rem', 
                                        width: '250px', 
                                        background: 'rgba(255,255,255,0.08)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        color: '#fff'
                                    }}
                                />
                                <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}></span>
                            </div>

                            <select 
                                className="kds-select" 
                                value={historyFilter} 
                                onChange={e => setHistoryFilter(e.target.value)}
                                style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.1)' }}
                            >
                                <option value="all">All Time</option>
                                <option value="today">Today's Orders</option>
                            </select>
                            <button className="btn-secondary" onClick={exportToCSV}> Active Queue CSV</button>
                            <button className="btn-primary" onClick={exportPDF}> Download PDF Report</button>
                        </div>
                    </div>

                    <div className="table-responsive">
                        <table className="vault-table">
                            <thead>
                                <tr>
                                    <th>Order Number</th>
                                    <th>Date Completed</th>
                                    <th>Customer Log (CRM)</th>
                                    <th>Items</th>
                                    <th>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(() => {
                                    const q = historySearchQuery.toLowerCase().trim();
                                    const matches = displayedHistoryOrders.filter(o => 
                                        o.order_number?.toLowerCase().includes(q) || 
                                        o.customer_name?.toLowerCase().includes(q) ||
                                        o.customer_phone?.includes(q)
                                    );

                                    if (matches.length === 0) {
                                        return <tr><td colSpan="5" className="empty-state">No historical orders found matching your search.</td></tr>;
                                    }

                                    return matches.map(o => (
                                        <tr key={o.id}>
                                            <td><strong>{o.order_number}</strong></td>
                                            <td>{new Date(o.updated_at || o.created_at).toLocaleString()}</td>
                                            <td>
                                                {o.customer_name} ({o.customer_phone})<br />
                                                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}> {o.locations?.name || 'Studio'}</span>
                                            </td>
                                            <td>
                                                {o.order_items?.map(i => `${i.quantity}x ${getOrderItemName(i)}`).join(', ')}
                                            </td>
                                            <td style={{ fontWeight: 'bold', color: '#c6a15b' }}>R {o.total_price}</td>
                                        </tr>
                                    ));
                                })()}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'finances' && (
                <div className="vault-container">
                    <div className="vault-header" style={{ marginBottom: '1rem', paddingBottom: '1rem' }}>
                        <div>
                            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Financial Ledger & Net Profit</h2>
                            <p style={{ color: '#94a3b8' }}>Real-time revenue tracking versus logged expenses.</p>
                        </div>
                    </div>

                    {/* Financial Summary Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                        <div className="kds-card" style={{ borderLeftColor: '#34d399', textAlign: 'center', padding: '1.5rem' }}>
                            <h3 style={{ color: '#94a3b8', fontSize: '1rem', marginBottom: '0.5rem' }}>Total Gross Revenue</h3>
                            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#10b981' }}>R {totalRevenue.toFixed(2)}</div>
                        </div>
                        <div className="kds-card" style={{ borderLeftColor: '#f43f5e', textAlign: 'center', padding: '1.5rem' }}>
                            <h3 style={{ color: '#94a3b8', fontSize: '1rem', marginBottom: '0.5rem' }}>Total Expenses</h3>
                            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#fb7185' }}>R {totalExpenses.toFixed(2)}</div>
                        </div>
                        <div className="kds-card" style={{ borderLeftColor: netProfit >= 0 ? '#3b82f6' : '#f43f5e', textAlign: 'center', padding: '1.5rem' }}>
                            <h3 style={{ color: '#94a3b8', fontSize: '1rem', marginBottom: '0.5rem' }}>Net Profit</h3>
                            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: netProfit >= 0 ? '#60a5fa' : '#fb7185' }}>
                                R {netProfit.toFixed(2)}
                            </div>
                        </div>
                    </div>

                    {/* Expense Form & List */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
                        <div className="kds-card" style={{ padding: '1.5rem', height: 'max-content' }}>
                            <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid #334155', paddingBottom: '0.5rem' }}> Quick Add Expense</h3>
                            <form className="checkout-form" onSubmit={handleAddExpense}>
                                <div className="form-group">
                                    <label>Expense Description</label>
                                    <input
                                        type="text"
                                        required
                                        className="form-input"
                                        placeholder="e.g. Bought 2L Oil"
                                        value={newExpense.description}
                                        onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Amount (ZAR)</label>
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        step="0.01"
                                        className="form-input"
                                        placeholder="e.g. 150"
                                        value={newExpense.amount}
                                        onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Receipt Photo (Optional)</label>
                                    <input
                                        type="file"
                                        id="receipt-upload"
                                        accept="image/*,application/pdf"
                                        className="form-input"
                                        onChange={(e) => setNewExpense({ ...newExpense, receiptFile: e.target.files[0] })}
                                    />
                                </div>
                                <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem' }} disabled={uploadingReceipt}>
                                    {uploadingReceipt ? 'Uploading...' : 'Log Expense'}
                                </button>
                            </form>
                        </div>

                        <div className="table-responsive">
                            <table className="vault-table">
                                <thead>
                                    <tr>
                                        <th>Date Logged</th>
                                        <th>Description</th>
                                        <th>Receipt</th>
                                        <th>Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {expenses.map(e => (
                                        <tr key={e.id}>
                                            <td>{new Date(e.created_at).toLocaleDateString()}</td>
                                            <td>{e.description}</td>
                                            <td>
                                                {e.receipt_url
                                                    ? <a href={e.receipt_url} target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa' }}>View Receipt</a>
                                                    : <span style={{ color: '#64748b' }}>-</span>
                                                }
                                            </td>
                                            <td style={{ color: '#fca5a5', fontWeight: 'bold' }}>- R {e.amount}</td>
                                        </tr>
                                    ))}
                                    {expenses.length === 0 && (
                                        <tr><td colSpan="4" className="empty-state">No expenses logged yet.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'inventory' && (
                <div className="vault-container">
                    <div className="vault-header">
                        <div>
                            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Fabric & Materials Library</h2>
                            <p style={{ color: '#94a3b8' }}>Manage fabrics, trims, and production materials that the studio needs to keep jobs moving.</p>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button className="btn-secondary" onClick={fetchInitialData} disabled={isRefreshing} style={isRefreshing ? { opacity: 0.7, cursor: 'not-allowed' } : {}}>
                                {isRefreshing ? 'â†» Refreshing...' : 'â†» Refresh'}
                            </button>
                            {!isStaff && (
                                <button className="btn-primary" onClick={() => setIsAddingIngredient(true)}>
                                    + Add Material
                                </button>
                            )}
                        </div>
                    </div>

                    {isStaff && (
                        <div style={{ marginBottom: '1.25rem', padding: '0.9rem 1rem', borderRadius: '12px', border: '1px solid rgba(59,130,246,0.25)', background: 'rgba(59,130,246,0.08)', color: '#bfdbfe' }}>
                            Staff stock mode is locked to viewing materials here. Use <strong>AI Manager</strong> to log refills, wastage, and stock adjustments.
                        </div>
                    )}

                    {isAddingIngredient && (
                        <div style={{
                            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                            backgroundColor: 'rgba(15, 23, 42, 0.85)',
                            backdropFilter: 'blur(8px)',
                            zIndex: 1000,
                            display: 'flex', justifyContent: 'center', alignItems: 'center',
                            padding: '1rem'
                        }}>
                            <div className="kds-card" style={{ padding: '2rem', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #334155', paddingBottom: '1rem' }}>
                                    <h3 style={{ fontSize: '1.5rem' }}>{editingIngredient.id ? "Edit Material" : "Add New Material"}</h3>
                                    <button className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem' }} onClick={() => {
                                        setEditingIngredient({ id: null, name: '', current_stock: '', low_stock_threshold: '', restock_input_label: '', restock_input_quantity: '', restock_output_quantity: '' });
                                        setIsAddingIngredient(false);
                                    }}>âœ• Close</button>
                                </div>
                                <form className="checkout-form" onSubmit={(e) => {
                                    handleSaveIngredient(e);
                                    // Normally handleSaveIngredient handles state, but we ensure modal closes
                                    setTimeout(() => setIsAddingIngredient(false), 300);
                                }} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                    <div className="form-group">
                                        <label>Material Name</label>
                                        <input type="text" required className="form-input" placeholder="e.g. Navy suiting, lining, buttons" value={editingIngredient.name} onChange={(e) => setEditingIngredient({ ...editingIngredient, name: e.target.value })} />
                                        <small style={{ color: '#94a3b8', marginTop: '0.25rem', display: 'block' }}>Use this for fabrics, trims, buttons, lining, and any studio production essentials.</small>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div className="form-group">
                                            <label>Usable Stock Count</label>
                                            <input type="number" required className="form-input" placeholder="0" value={editingIngredient.current_stock} onChange={(e) => setEditingIngredient({ ...editingIngredient, current_stock: e.target.value })} />
                                        </div>
                                        <div className="form-group">
                                            <label>Low Stock Alert At</label>
                                            <input type="number" required className="form-input" placeholder="10" value={editingIngredient.low_stock_threshold} onChange={(e) => setEditingIngredient({ ...editingIngredient, low_stock_threshold: e.target.value })} />
                                        </div>
                                    </div>
                                    <div style={{ padding: '1rem', borderRadius: '12px', border: '1px solid rgba(59,130,246,0.18)', background: 'rgba(59,130,246,0.05)' }}>
                                        <div style={{ fontWeight: '700', marginBottom: '0.35rem', color: '#bfdbfe' }}>Optional Bulk Restock Rule</div>
                                        <p style={{ color: '#94a3b8', margin: '0 0 1rem 0', fontSize: '0.85rem', lineHeight: '1.5' }}>
                                            If a material is bought in bulk, tell the system how that purchase turns into usable studio stock. Example: 1 roll becomes 8 suit lengths.
                                        </p>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                            <div className="form-group">
                                                <label>When I Buy</label>
                                                <input type="number" className="form-input" placeholder="2" value={editingIngredient.restock_input_quantity} onChange={(e) => setEditingIngredient({ ...editingIngredient, restock_input_quantity: e.target.value })} />
                                            </div>
                                            <div className="form-group">
                                                <label>Bulk Label</label>
                                                <input type="text" className="form-input" placeholder="kg" value={editingIngredient.restock_input_label} onChange={(e) => setEditingIngredient({ ...editingIngredient, restock_input_label: e.target.value })} />
                                            </div>
                                            <div className="form-group">
                                                <label>It Becomes</label>
                                                <input type="number" className="form-input" placeholder="20" value={editingIngredient.restock_output_quantity} onChange={(e) => setEditingIngredient({ ...editingIngredient, restock_output_quantity: e.target.value })} />
                                            </div>
                                        </div>
                                        <div style={{ color: '#cbd5e1', marginTop: '0.85rem', fontSize: '0.88rem' }}>
                                            {editingIngredient.restock_input_quantity && editingIngredient.restock_input_label && editingIngredient.restock_output_quantity
                                                ? `${editingIngredient.restock_input_quantity} ${editingIngredient.restock_input_label} becomes ${editingIngredient.restock_output_quantity} usable stock.`
                                                : 'Leave this blank if you count stock directly instead of buying it in bulk.'}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                                        <button type="submit" className="btn-primary" style={{ padding: '0.75rem 2rem', fontSize: '1.1rem' }}>{editingIngredient.id ? "Save Changes" : "Save Material"}</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    <div className="table-responsive">
                        <table className="vault-table">
                            <thead>
                                <tr>
                                    <th>Material</th>
                                    <th>Stock Count</th>
                                    <th>Restock Conversion</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ingredients.map(ing => {
                                    const isLow = Number(ing.current_stock) <= Number(ing.low_stock_threshold);
                                    return (
                                        <tr key={ing.id} style={{ borderLeft: isLow ? '4px solid #ef4444' : '4px solid transparent' }}>
                                            <td><strong>{ing.name}</strong></td>
                                            <td style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{ing.current_stock}</td>
                                            <td style={{ color: '#94a3b8' }}>
                                                {ing.restock_input_quantity && ing.restock_input_label && ing.restock_output_quantity
                                                    ? `${ing.restock_input_quantity} ${ing.restock_input_label} becomes ${ing.restock_output_quantity}`
                                                    : <span style={{ color: '#64748b' }}>Direct count</span>}
                                            </td>
                                            <td>
                                                {isLow
                                                    ? <span className="status-badge status-paid">Low Stock</span>
                                                    : <span className="status-badge status-ready">Optimal</span>
                                                }
                                            </td>
                                            <td>
                                                {isStaff ? (
                                                    <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Use AI Manager</span>
                                                ) : (
                                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                        <button
                                                            className="btn-primary"
                                                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', background: '#3b82f6', color: '#fff' }}
                                                            onClick={() => {
                                                                setEditingIngredient({
                                                                    id: ing.id,
                                                                    name: ing.name,
                                                                    current_stock: ing.current_stock.toString(),
                                                                    low_stock_threshold: ing.low_stock_threshold.toString(),
                                                                    restock_input_label: ing.restock_input_label || '',
                                                                    restock_input_quantity: ing.restock_input_quantity?.toString?.() || '',
                                                                    restock_output_quantity: ing.restock_output_quantity?.toString?.() || ''
                                                                });
                                                                setIsAddingIngredient(true);
                                                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                                            }}
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            className="btn-danger"
                                                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', background: '#ef4444', color: '#fff' }}
                                                            onClick={() => handleDeleteIngredient(ing.id, ing.name)}
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {ingredients.length === 0 && (
                                    <tr><td colSpan="5" className="empty-state">No materials added yet. Start with fabrics, lining, trims, and other production stock.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            {/* --- PHASE 11: CMS & SETTINGS TAB --- */}
            {activeTab === 'cms' && (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                    {/* CMS Sub-Navigation */}
                    <div style={{ 
                        display: 'flex', 
                        gap: '1rem', 
                        padding: '1rem 2rem', 
                        background: 'rgba(30, 41, 59, 0.5)', 
                        borderBottom: '1px solid rgba(255,255,255,0.05)' 
                    }}>
                        {[
                            { id: 'menu', label: ' Service & Pricing Manager', icon: '' },
                            { id: 'gallery', label: ' Gallery Manager', icon: '' },
                            { id: 'branches', label: ' Studio Location Manager', icon: '' },
                            { id: 'events', label: ' Pop-ups & Trunk Shows', icon: '' },
                            { id: 'branding', label: ' Brand & Website Identity', icon: '' }
                        ].map(sub => (
                            <button
                                key={sub.id}
                                onClick={() => setCmsActiveSubTab(sub.id)}
                                style={{
                                    padding: '0.75rem 1.25rem',
                                    borderRadius: '12px',
                                    border: '1px solid',
                                    borderColor: cmsActiveSubTab === sub.id ? '#c6a15b' : 'rgba(255,255,255,0.1)',
                                    background: cmsActiveSubTab === sub.id ? 'rgba(198, 161, 91, 0.1)' : 'transparent',
                                    color: cmsActiveSubTab === sub.id ? '#c6a15b' : '#94a3b8',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}
                            >
                                {sub.label}
                            </button>
                        ))}
                    </div>

                    <div style={{ padding: '2rem', overflowY: 'auto', flex: 1 }}>
                        
                        {/* 1. Service & Pricing Manager */}
                        {cmsActiveSubTab === 'menu' && (
                            <div className="finances-card">
                                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                     Service & Pricing Manager
                                </h2>

                                {/* Service Materials Builder Modal UI */}
                                {editingRecipeFor && (
                                    <div style={{ background: '#0f172a', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem', border: '1px solid #3b82f6', boxShadow: '0 0 20px rgba(59, 130, 246, 0.2)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #334155', paddingBottom: '1rem' }}>
                                            <div>
                                                <h3 style={{ margin: 0, color: '#3b82f6', fontSize: '1.25rem' }}>Build Materials Logic: {editingRecipeFor.name}</h3>
                                                <p style={{ margin: '0.25rem 0 0 0', color: '#94a3b8', fontSize: '0.9rem' }}>Define how many units of fabric or materials are normally needed for this service or package.</p>
                                            </div>
                                            <button className="btn-secondary" onClick={() => setEditingRecipeFor(null)}>Cancel</button>
                                        </div>

                                        <div style={{ marginBottom: '1.5rem' }}>
                                            {editingRecipeIngredients.map((row, idx) => (
                                                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '1rem', marginBottom: '0.75rem', alignItems: 'center' }}>
                                                    <select
                                                        className="kds-select"
                                                        value={row.ingredient}
                                                        onChange={(e) => handleRecipeIngredientChange(idx, 'ingredient', e.target.value)}
                                                    >
                                                        <option value="">-- Select Material --</option>
                                                        {ingredients.map(ing => (
                                                            <option key={ing.id} value={ing.name}>{ing.name}</option>
                                                        ))}
                                                    </select>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        className="kds-input"
                                                        placeholder="Count per Item"
                                                        value={row.quantity}
                                                        onChange={(e) => handleRecipeIngredientChange(idx, 'quantity', e.target.value)}
                                                    />
                                                    <button
                                                        className="btn-danger"
                                                        type="button"
                                                        style={{ padding: '0.5rem' }}
                                                        onClick={() => handleRemoveRecipeIngredientRow(idx)}
                                                    >
                                                        
                                                    </button>
                                                </div>
                                            ))}
                                            <button className="btn-secondary" type="button" style={{ marginTop: '0.5rem' }} onClick={handleAddRecipeIngredientRow}>
                                                 Add Another Material
                                            </button>
                                        </div>

                                        <button className="btn-primary" type="button" style={{ width: '100%', background: '#10b981' }} onClick={handleSaveRecipe}>
                                            Save Materials Logic
                                        </button>
                                    </div>
                                )}

                                {/* Add / Edit Service Form */}
                                <div style={{ background: '#0f172a', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem', border: '1px solid #334155' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                        <h3 style={{ margin: 0, color: '#c6a15b', fontSize: '1.1rem' }}>
                                            {editingMenuItem.id ? 'Edit Service / Package' : 'Add New Service / Package'}
                                        </h3>
                                        {editingMenuItem.id && (
                                            <button
                                                type="button"
                                                onClick={() => setEditingMenuItem({ id: null, name: '', price: '', image_url: '' })}
                                                style={{ background: 'transparent', border: '1px solid #94a3b8', color: '#94a3b8', borderRadius: '4px', padding: '0.25rem 0.75rem', cursor: 'pointer' }}
                                            >
                                                Cancel Edit
                                            </button>
                                        )}
                                    </div>

                                    <form onSubmit={handleSaveMenuItem} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 1fr auto', gap: '1rem', alignItems: 'end' }}>
                                        <div>
                                            <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Name</label>
                                            <input required type="text" className="kds-input" value={editingMenuItem.name} onChange={e => setEditingMenuItem({ ...editingMenuItem, name: e.target.value })} placeholder="e.g. Bespoke Suit Package" style={{ width: '100%' }} />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Price (R)</label>
                                            <input required type="number" min="0" step="0.01" className="kds-input" value={editingMenuItem.price} onChange={e => setEditingMenuItem({ ...editingMenuItem, price: e.target.value })} style={{ width: '100%' }} />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Service Image Upload</label>
                                            {editingMenuItem.image_url && !menuImageFile && (
                                                <div style={{ marginBottom: '0.25rem' }}>
                                                    <img src={editingMenuItem.image_url} alt="Current" style={{ height: '30px', borderRadius: '4px', verticalAlign: 'middle', marginRight: '0.5rem' }} />
                                                    <small style={{ color: '#c6a15b' }}>Active</small>
                                                </div>
                                            )}
                                            <input 
                                                type="file" 
                                                accept="image/*" 
                                                className="kds-input" 
                                                onChange={e => setMenuImageFile(e.target.files[0])} 
                                                style={{ width: '100%', padding: '0.25rem' }} 
                                            />
                                        </div>
                                        <button type="submit" disabled={uploadingMenuImage} className="btn-primary" style={{ padding: '0.5rem 1rem' }}>
                                            {uploadingMenuImage ? 'Saving...' : (editingMenuItem.id ? 'Save Changes' : 'Add Service')}
                                        </button>
                                    </form>
                                </div>

                                {/* Existing Services Table */}
                                <div className="table-wrapper">
                                    <table style={{ width: '100%', borderCollapse: 'collapse', color: '#f8fafc', background: '#1e293b', borderRadius: '8px', overflow: 'hidden' }}>
                                        <thead style={{ background: '#0f172a', textAlign: 'left' }}>
                                            <tr>
                                                <th style={{ padding: '1rem', borderBottom: '1px solid #334155' }}>Service / Package</th>
                                                <th style={{ padding: '1rem', borderBottom: '1px solid #334155' }}>Price</th>
                                                <th style={{ padding: '1rem', borderBottom: '1px solid #334155' }}>Assigned Image</th>
                                                <th style={{ padding: '1rem', borderBottom: '1px solid #334155', textAlign: 'right' }}>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {menuItems.map(item => (
                                                <tr key={item.id} style={{ borderBottom: '1px solid #334155' }}>
                                                    <td style={{ padding: '1rem' }}><strong>{item.name}</strong></td>
                                                    <td style={{ padding: '1rem', color: '#c6a15b' }}>R {item.price}</td>
                                                    <td style={{ padding: '1rem', color: '#94a3b8' }}>{item.image_url || 'None'}</td>
                                                    <td style={{ padding: '1rem', textAlign: 'right', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                        <button
                                                            onClick={() => openRecipeBuilder(item)}
                                                            style={{ background: '#10b981', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
                                                        >
                                                            Materials Logic
                                                        </button>
                                                        <button
                                                            onClick={() => setEditingMenuItem({ id: item.id, name: item.name, price: item.price, image_url: item.image_url || '' })}
                                                            style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteMenuItem(item.id, item.name)}
                                                            style={{ background: '#ef4444', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                                                        >
                                                            Delete
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {menuItems.length === 0 && (
                                                <tr><td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No services or packages added yet.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {cmsActiveSubTab === 'gallery' && (
                            <div className="finances-card">
                                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Gallery Manager</h2>
                                <p style={{ color: '#94a3b8', marginBottom: '2rem' }}>
                                    Use this for atmosphere, studio, staff, fittings, events, and other brand photos. Service visuals stay in <strong>Service & Pricing Manager</strong>.
                                </p>

                                <div style={{ background: '#0f172a', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem', border: '1px solid #334155' }}>
                                    <form onSubmit={handleAddGalleryImage} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr auto', gap: '1rem', alignItems: 'end' }}>
                                        <div>
                                            <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Gallery Image Upload</label>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="kds-input"
                                                onChange={(e) => setGalleryImageFile(e.target.files[0])}
                                                style={{ width: '100%', padding: '0.25rem' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Caption (Optional)</label>
                                            <input
                                                type="text"
                                                className="kds-input"
                                                placeholder="e.g. Friday night ambience"
                                                value={newGalleryCaption}
                                                onChange={(e) => setNewGalleryCaption(e.target.value)}
                                                style={{ width: '100%' }}
                                            />
                                        </div>
                                        <button type="submit" disabled={uploadingGalleryImage} className="btn-primary" style={{ padding: '0.5rem 1rem' }}>
                                            {uploadingGalleryImage ? 'Saving...' : 'Add Photo'}
                                        </button>
                                    </form>
                                </div>

                                <div className="table-wrapper">
                                    <table style={{ width: '100%', borderCollapse: 'collapse', color: '#f8fafc', background: '#1e293b', borderRadius: '8px', overflow: 'hidden' }}>
                                        <thead style={{ background: '#0f172a', textAlign: 'left' }}>
                                            <tr>
                                                <th style={{ padding: '1rem', borderBottom: '1px solid #334155' }}>Preview</th>
                                                <th style={{ padding: '1rem', borderBottom: '1px solid #334155' }}>Caption</th>
                                                <th style={{ padding: '1rem', borderBottom: '1px solid #334155' }}>Added</th>
                                                <th style={{ padding: '1rem', borderBottom: '1px solid #334155', textAlign: 'right' }}>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {siteGallery.map((item) => (
                                                <tr key={item.id} style={{ borderBottom: '1px solid #334155' }}>
                                                    <td style={{ padding: '1rem' }}>
                                                        <img src={item.image_url} alt={item.caption || 'Gallery'} style={{ width: '86px', height: '62px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #334155' }} />
                                                    </td>
                                                    <td style={{ padding: '1rem', color: '#cbd5e1' }}>{item.caption || <span style={{ color: '#64748b' }}>No caption</span>}</td>
                                                    <td style={{ padding: '1rem', color: '#94a3b8' }}>{item.created_at ? new Date(item.created_at).toLocaleDateString() : '-'}</td>
                                                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                                                        <button
                                                            onClick={() => handleDeleteGalleryImage(item)}
                                                            style={{ background: '#ef4444', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                                                        >
                                                            Delete
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {siteGallery.length === 0 && (
                                                <tr><td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No gallery photos yet. Upload photos of the business, space, events, or atmosphere here.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* 2. Studio Location Manager */}
                        {cmsActiveSubTab === 'branches' && (
                            <div className="finances-card">
                                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                     Studio Location Manager
                                </h2>
                                <p style={{ color: '#94a3b8', marginBottom: '2rem' }}>Manage your studio, showroom, or fitting locations. Clients will see these when booking or collecting.</p>

                                {/* Add New Studio Location Form */}
                                <div style={{ background: '#0f172a', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem', border: '1px solid #334155' }}>
                                    <form onSubmit={async (e) => {
                                        e.preventDefault();
                                        setIsSavingBranch(true);
                                        try {
                                            const { error } = await supabase.from('locations').insert({
                                                name: newBranch.name,
                                                vendor_id: currentVendorId,
                                                address: newBranch.address,
                                                google_maps_url: newBranch.google_maps_url,
                                                office_hours: newBranch.office_hours,
                                                is_mobile: false,
                                                is_active: true
                                            });
                                            if (error) throw error;
                                            alert("Studio location added successfully!");
                                            setNewBranch({ name: '', address: '', google_maps_url: '', office_hours: '', is_active: true });
                                            fetchInitialData(); // Refresh list
                                        } catch (err) {
                                            alert("Error saving studio location: " + err.message);
                                        } finally {
                                            setIsSavingBranch(false);
                                        }
                                    }} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'flex-start' }}>
                                        <div style={{ gridColumn: '1 / -1' }}>
                                            <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Studio Location Name (e.g. Kings Wear Studio)</label>
                                            <input 
                                                required 
                                                type="text" 
                                                className="kds-input" 
                                                value={newBranch.name} 
                                                onChange={e => setNewBranch({ ...newBranch, name: e.target.value })} 
                                                placeholder="Enter studio location name"
                                                style={{ width: '100%' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Physical Address</label>
                                            <input 
                                                type="text" 
                                                className="kds-input" 
                                                value={newBranch.address} 
                                                onChange={e => setNewBranch({ ...newBranch, address: e.target.value })} 
                                                placeholder="e.g. 123 Madiba St, Polokwane"
                                                style={{ width: '100%' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Google Maps URL</label>
                                            <input 
                                                type="url" 
                                                className="kds-input" 
                                                value={newBranch.google_maps_url} 
                                                onChange={e => setNewBranch({ ...newBranch, google_maps_url: e.target.value })} 
                                                placeholder="https://maps.google.com/..."
                                                style={{ width: '100%' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Office Hours</label>
                                            <input 
                                                type="text" 
                                                className="kds-input" 
                                                value={newBranch.office_hours} 
                                                onChange={e => setNewBranch({ ...newBranch, office_hours: e.target.value })} 
                                                placeholder="e.g. Mon-Fri: 9AM - 6PM"
                                                style={{ width: '100%' }}
                                            />
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'flex-end', height: '100%', paddingTop: '1.4rem', gap: '0.5rem' }}>
                                            <button type="submit" className="btn-primary" disabled={isSavingBranch} style={{ padding: '0.75rem 2rem', flex: 1 }}>
                                                {isSavingBranch ? 'Saving...' : ' Add Location'}
                                            </button>
                                        </div>
                                    </form>
                                </div>

                                <div className="table-wrapper">
                                    <table style={{ width: '100%', borderCollapse: 'collapse', color: '#f8fafc', background: '#1e293b', borderRadius: '8px', overflow: 'hidden' }}>
                                        <thead style={{ background: '#0f172a', textAlign: 'left' }}>
                                            <tr>
                                                <th style={{ padding: '1rem', borderBottom: '1px solid #334155' }}>Studio Location</th>
                                                <th style={{ padding: '1rem', borderBottom: '1px solid #334155' }}>Type</th>
                                                <th style={{ padding: '1rem', borderBottom: '1px solid #334155' }}>Status</th>
                                                <th style={{ padding: '1rem', borderBottom: '1px solid #334155', textAlign: 'right' }}>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {locations.filter(l => !l.is_mobile).map(branch => (
                                                <tr key={branch.id} style={{ borderBottom: '1px solid #334155' }}>
                                                    <td style={{ padding: '1rem' }}><strong>{branch.name}</strong></td>
                                                    <td style={{ padding: '1rem' }}><span className="status-badge" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa' }}> Permanent</span></td>
                                                    <td style={{ padding: '1rem' }}>
                                                        <span className={`status-badge ${branch.is_active ? 'status-ready' : 'status-paid'}`}>
                                                            {branch.is_active ? 'Active' : 'Hidden'}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                                                        <button
                                                            onClick={async () => {
                                                                const { error } = await supabase.from('locations').update({ is_active: !branch.is_active }).eq('id', branch.id);
                                                                if (error) alert("Error: " + error.message);
                                                                else fetchInitialData();
                                                            }}
                                                            style={{ 
                                                                background: branch.is_active ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', 
                                                                color: branch.is_active ? '#ef4444' : '#10b981', 
                                                                border: '1px solid currentColor',
                                                                padding: '0.5rem 1rem', 
                                                                borderRadius: '8px', 
                                                                cursor: 'pointer', 
                                                                fontSize: '0.8rem',
                                                                marginRight: '0.5rem'
                                                            }}
                                                        >
                                                            {branch.is_active ? 'Deactivate' : 'Activate'}
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setEditingBranch({
                                                                    id: branch.id,
                                                                    name: branch.name || '',
                                                                    address: branch.address || '',
                                                                    google_maps_url: branch.google_maps_url || '',
                                                                    office_hours: branch.office_hours || '',
                                                                    is_active: branch.is_active
                                                                });
                                                            }}
                                                            style={{ 
                                                                background: 'rgba(59, 130, 246, 0.1)', 
                                                                color: '#60a5fa', 
                                                                border: '1px solid currentColor',
                                                                padding: '0.5rem 1rem', 
                                                                borderRadius: '8px', 
                                                                cursor: 'pointer', 
                                                                fontSize: '0.8rem' 
                                                            }}
                                                        >
                                                            Edit
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {locations.filter(l => !l.is_mobile).length === 0 && (
                                                <tr><td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No studio locations added yet. Add your first fitting location above.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* 3. Pop-ups & Trunk Shows */}
                        {cmsActiveSubTab === 'events' && (
                            <div className="finances-card">
                                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}> Pop-ups & Trunk Shows</h2>

                                {/* List Existing Events */}
                                <div style={{ marginBottom: '2rem' }}>
                                    <h3 style={{ fontSize: '1.2rem', color: '#94a3b8', marginBottom: '1rem' }}>Active Events</h3>
                                    {locations.filter(l => l.is_mobile).length === 0 ? (
                                        <p style={{ color: '#64748b', fontStyle: 'italic' }}>No pop-ups or trunk shows scheduled.</p>
                                    ) : (
                                        <div style={{ display: 'grid', gap: '1rem' }}>
                                            {locations.filter(l => l.is_mobile).map(stall => (
                                                <div key={stall.id} style={{ background: '#1e293b', padding: '1rem', borderRadius: '8px', border: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div>
                                                        <strong style={{ color: '#f8fafc', fontSize: '1.1rem', display: 'block' }}>{stall.name}</strong>
                                                        <span style={{ color: '#c6a15b', fontSize: '0.9rem' }}>{stall.stall_date || 'No Date Set'}</span>
                                                        <p style={{ color: '#94a3b8', margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>{stall.banner_text}</p>
                                                    </div>
                                                    <button
                                                        className="btn-kds btn-paid"
                                                        style={{ background: '#ef4444', color: '#fff' }}
                                                        onClick={() => handleDeleteStallEvent(stall.id, stall.name)}
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <hr style={{ borderColor: '#334155', margin: '2rem 0' }} />

                                <h3 style={{ fontSize: '1.2rem', color: '#94a3b8', marginBottom: '1rem' }}>Add New Event</h3>
                                <form onSubmit={handleAddStallEvent}>
                                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', marginBottom: '1rem' }}>
                                            <div>
                                                <label style={{ display: 'block', color: '#94a3b8', marginBottom: '0.5rem' }}>Event Name (e.g. Sandton Style Popup)</label>
                                                <input
                                                    type="text"
                                                    className="kds-input"
                                                    placeholder="Sandton Style Popup"
                                                    value={newStallEvent.name}
                                                    onChange={(e) => setNewStallEvent({ ...newStallEvent, name: e.target.value })}
                                                    style={{ width: '100%', padding: '0.75rem', background: '#334155', border: '1px solid #475569', color: '#f8fafc', borderRadius: '4px' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', color: '#94a3b8', marginBottom: '0.5rem' }}>"Now Booking At" Announcement Banner</label>
                                                <input
                                                    type="text"
                                                    className="kds-input"
                                                    placeholder="e.g. Visit our Sandton fitting popup this Saturday"
                                                    value={newStallEvent.banner_text}
                                                    onChange={(e) => setNewStallEvent({ ...newStallEvent, banner_text: e.target.value })}
                                                    style={{ width: '100%', padding: '0.75rem', background: '#334155', border: '1px solid #475569', color: '#f8fafc', borderRadius: '4px' }}
                                                />
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                            <div>
                                                <label style={{ display: 'block', color: '#94a3b8', marginBottom: '0.5rem' }}>Event Date</label>
                                                <input
                                                    type="text"
                                                    className="kds-input"
                                                    placeholder="e.g. Sat 14 March"
                                                    value={newStallEvent.stall_date}
                                                    onChange={(e) => setNewStallEvent({ ...newStallEvent, stall_date: e.target.value })}
                                                    style={{ width: '100%', padding: '0.75rem', background: '#334155', border: '1px solid #475569', color: '#f8fafc', borderRadius: '4px' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', color: '#94a3b8', marginBottom: '0.5rem' }}>Pre-order Start</label>
                                                <input
                                                    type="text"
                                                    className="kds-input"
                                                    placeholder="e.g. Wed 11 March, 9 AM"
                                                    value={newStallEvent.preorder_start_date}
                                                    onChange={(e) => setNewStallEvent({ ...newStallEvent, preorder_start_date: e.target.value })}
                                                    style={{ width: '100%', padding: '0.75rem', background: '#334155', border: '1px solid #475569', color: '#f8fafc', borderRadius: '4px' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', color: '#94a3b8', marginBottom: '0.5rem' }}>Pre-order Deadline</label>
                                                <input
                                                    type="text"
                                                    className="kds-input"
                                                    placeholder="e.g. Fri 13 March, 8 PM"
                                                    value={newStallEvent.preorder_deadline}
                                                    onChange={(e) => setNewStallEvent({ ...newStallEvent, preorder_deadline: e.target.value })}
                                                    style={{ width: '100%', padding: '0.75rem', background: '#334155', border: '1px solid #475569', color: '#f8fafc', borderRadius: '4px' }}
                                                />
                                            </div>
                                        </div>
                                        <small style={{ color: '#64748b', display: 'block', marginTop: '1rem' }}>These details can appear on the public page to help clients find your next pop-up or fashion event.</small>
                                    </div>
                                    <button type="submit" className="btn-primary" disabled={isSavingStall}>
                                        {isSavingStall ? 'Saving...' : 'Add Event'}
                                    </button>
                                </form>
                            </div>
                        )}

                        {/* 4. Brand & Website Identity */}
                        {cmsActiveSubTab === 'branding' && (
                            <div className="finances-card" style={{ border: '1px solid #c6a15b' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                                    <h2 style={{ fontSize: '1.5rem', margin: 0, display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                         Brand & Website Identity
                                    </h2>
                                    {brandingActivePanel !== 'overview' && (
                                        <button
                                            type="button"
                                            className="btn-secondary"
                                            onClick={() => setBrandingActivePanel('overview')}
                                        >
                                            Back to Brand Settings
                                        </button>
                                    )}
                                </div>

                                {brandingActivePanel === 'overview' && (
                                    <div style={{ display: 'grid', gap: '1rem', marginBottom: '1.5rem' }}>
                                        <button
                                            type="button"
                                            className="btn-secondary"
                                            onClick={() => setBrandingActivePanel('identity')}
                                            style={{ justifyContent: 'space-between', textAlign: 'left', padding: '1.1rem 1.25rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: '#f8fafc' }}
                                        >
                                            <span>
                                                <strong style={{ display: 'block', marginBottom: '0.25rem' }}>1. Core Brand Settings</strong>
                                                <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Logo, hero copy, reservations toggle, colors, domain, and website identity.</span>
                                            </span>
                                            <span style={{ color: '#c6a15b' }}>Open</span>
                                        </button>

                                        <button
                                            type="button"
                                            className="btn-secondary"
                                            onClick={() => setBrandingActivePanel('copilot')}
                                            style={{ justifyContent: 'space-between', textAlign: 'left', padding: '1.1rem 1.25rem', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.22)', color: '#f8fafc' }}
                                        >
                                            <span>
                                                <strong style={{ display: 'block', marginBottom: '0.25rem' }}>2. Website CMS Copilot</strong>
                                                <span style={{ color: '#c4b5fd', fontSize: '0.9rem' }}>Draft landing-page copy, tone, and visual direction before applying it to the CMS fields.</span>
                                            </span>
                                            <span style={{ color: '#c4b5fd' }}>Open</span>
                                        </button>
                                    </div>
                                )}

                                {brandingActivePanel === 'copilot' && (
                                <div style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.22)', borderRadius: '16px', padding: '1.25rem', marginBottom: '1.5rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                                        <div>
                                            <div style={{ color: '#c4b5fd', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem' }}>Website CMS Copilot</div>
                                            <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Draft landing-page copy from the admin side</h3>
                                            <p style={{ color: '#94a3b8', marginTop: '0.65rem', lineHeight: '1.6', maxWidth: '760px' }}>
                                                Tell the copilot what kind of business this is, the tone you want, and whether bookings matter. It will draft website copy that you can review and apply into the CMS fields below.
                                            </p>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                            {[
                                                'Make this feel like a modern family restaurant with table bookings.',
                                                'Write warmer homepage copy for a date-night grill and lounge.',
                                                'Create polished landing page copy for a venue that hosts private events.'
                                            ].map((prompt) => (
                                                <button
                                                    key={prompt}
                                                    type="button"
                                                    className="btn-secondary"
                                                    onClick={() => setCmsCopilotPrompt(prompt)}
                                                    style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.18)', color: '#ddd6fe' }}
                                                >
                                                    Use Prompt
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div style={{ marginTop: '1rem', display: 'grid', gap: '0.85rem' }}>
                                        <textarea
                                            className="kds-input"
                                            rows="4"
                                            value={cmsCopilotPrompt}
                                            onChange={(e) => setCmsCopilotPrompt(e.target.value)}
                                            placeholder="Example: Design a polished restaurant landing page for bookings and family dining. Keep it warm, premium, and welcoming. Make the copy work for a South African audience without sounding generic."
                                            style={{ minHeight: '110px', resize: 'vertical' }}
                                        />
                                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                            <button type="button" className="btn-primary" onClick={handleCmsCopilotGenerate} disabled={cmsCopilotLoading || !cmsCopilotPrompt.trim()} style={{ background: '#8b5cf6', color: '#fff' }}>
                                                {cmsCopilotLoading ? 'Drafting...' : 'Generate Website Draft'}
                                            </button>
                                            <button type="button" className="btn-secondary" onClick={() => setCmsCopilotDraft(null)} disabled={cmsCopilotLoading || !cmsCopilotDraft}>
                                                Clear Draft
                                            </button>
                                        </div>
                                    </div>

                                    {cmsCopilotDraft && (
                                        <div style={{ marginTop: '1rem', background: 'rgba(15,23,42,0.68)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '1rem', display: 'grid', gap: '0.9rem' }}>
                                            <div>
                                                <div style={{ color: '#93c5fd', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem' }}>Suggested Draft</div>
                                                <div style={{ color: '#e2e8f0', lineHeight: '1.6' }}>{cmsCopilotDraft.reply || 'Review the draft below and apply it into the branding fields when you are happy.'}</div>
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
                                                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '0.85rem' }}>
                                                    <div style={{ color: '#94a3b8', fontSize: '0.78rem', marginBottom: '0.25rem' }}>Tagline</div>
                                                    <div>{cmsCopilotDraft.tagline || '-'}</div>
                                                </div>
                                                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '0.85rem' }}>
                                                    <div style={{ color: '#94a3b8', fontSize: '0.78rem', marginBottom: '0.25rem' }}>Welcome Text</div>
                                                    <div>{cmsCopilotDraft.welcome_text || '-'}</div>
                                                </div>
                                                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '0.85rem' }}>
                                                    <div style={{ color: '#94a3b8', fontSize: '0.78rem', marginBottom: '0.25rem' }}>Hero Title</div>
                                                    <div>{cmsCopilotDraft.hero_title || '-'}</div>
                                                </div>
                                                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '0.85rem' }}>
                                                    <div style={{ color: '#94a3b8', fontSize: '0.78rem', marginBottom: '0.25rem' }}>Hero Highlight</div>
                                                    <div>{cmsCopilotDraft.hero_highlight || '-'}</div>
                                                </div>
                                                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '0.85rem' }}>
                                                    <div style={{ color: '#94a3b8', fontSize: '0.78rem', marginBottom: '0.25rem' }}>Hero Subtitle</div>
                                                    <div>{cmsCopilotDraft.hero_subtitle || '-'}</div>
                                                </div>
                                                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '0.85rem' }}>
                                                    <div style={{ color: '#94a3b8', fontSize: '0.78rem', marginBottom: '0.25rem' }}>Suggested Primary Color</div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                                        <span style={{ width: '16px', height: '16px', borderRadius: '999px', background: /^#[0-9a-f]{6}$/i.test(String(cmsCopilotDraft.primary_color || '').trim()) ? cmsCopilotDraft.primary_color : '#475569', border: '1px solid rgba(255,255,255,0.14)', display: 'inline-block' }}></span>
                                                        <span>{cmsCopilotDraft.primary_color || '-'}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '0.9rem' }}>
                                                <div style={{ color: '#94a3b8', fontSize: '0.78rem', marginBottom: '0.4rem' }}>About Section</div>
                                                <div style={{ lineHeight: '1.7', color: '#e2e8f0' }}>{cmsCopilotDraft.about_text || '-'}</div>
                                            </div>

                                            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '0.9rem' }}>
                                                <div style={{ color: '#94a3b8', fontSize: '0.78rem', marginBottom: '0.4rem' }}>Design Direction</div>
                                                <div style={{ lineHeight: '1.7', color: '#cbd5e1' }}>{cmsCopilotDraft.design_direction || 'No extra design notes returned.'}</div>
                                            </div>

                                            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                                <button type="button" className="btn-primary" onClick={applyCmsCopilotDraft} style={{ background: '#10b981', color: '#04130b' }}>
                                                    Apply Draft To Fields
                                                </button>
                                                <span style={{ color: '#94a3b8', fontSize: '0.88rem', alignSelf: 'center' }}>
                                                    This updates the form only. Use <strong>Save Brand Identity</strong> when you are happy with it.
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                )}
                                {brandingActivePanel === 'identity' && vendorConfig ? (
                                    <form onSubmit={async (e) => {
                                        e.preventDefault();
                                        try {
                                            setUploadingHero(true);
                                            let finalBranding = withLandingDefaults({ ...vendorConfig.branding });
                                            let finalLogoUrl = vendorConfig.logo_url || vendorConfig.branding?.logo_url || '';

                                            const normalizedAboutStory = (finalBranding.about_text || finalBranding.about_story || '').trim();
                                            if (normalizedAboutStory) {
                                                finalBranding.about_text = normalizedAboutStory;
                                                finalBranding.about_story = normalizedAboutStory;
                                            }

                                            const normalizedWhatsapp = (finalBranding.contact_whatsapp || finalBranding.whatsapp_number || finalBranding.whatsapp || '').trim();
                                            if (normalizedWhatsapp) {
                                                finalBranding.contact_whatsapp = normalizedWhatsapp;
                                                finalBranding.whatsapp_number = normalizedWhatsapp;
                                            }

                                            // 1. Upload Hero Image if provided
                                            if (heroImageFile) {
                                                finalBranding.hero_image = await uploadBrandingImage(heroImageFile, 'hero-images');
                                            }

                                            // 2. Upload Logo if provided
                                            if (logoFile) {
                                                finalLogoUrl = await uploadBrandingImage(logoFile, 'store-logos');
                                                finalBranding.logo_url = finalLogoUrl;
                                            }

                                            if (finalLogoUrl && !finalBranding.logo_url) {
                                                finalBranding.logo_url = finalLogoUrl;
                                            }

                                            const vendorUpdate = {
                                                name: vendorConfig.name,
                                                branding: finalBranding,
                                            };

                                            const { data: updatedVendor, error } = await supabase
                                                .from('vendors')
                                                .update(vendorUpdate)
                                                .eq('id', currentVendorId)
                                                .select('id, name, branding')
                                                .maybeSingle();
                                            
                                            if (error) throw error;
                                            if (!updatedVendor) {
                                                throw new Error('Supabase accepted the request but updated 0 vendor rows. Your login is not linked to this vendor in live RLS policies.');
                                            }
                                            alert("Branding settings updated! ");
                                            setVendorConfig({ ...vendorConfig, ...updatedVendor, logo_url: finalLogoUrl });
                                            setHeroImageFile(null);
                                            setLogoFile(null);
                                        } catch (err) {
                                            alert("Failed to save branding: " + err.message);
                                        } finally {
                                            setUploadingHero(false);
                                        }
                                    }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                                            <div className="form-group">
                                                <label>Shop Name</label>
                                                <input type="text" className="kds-input" value={vendorConfig.name} onChange={(e) => setVendorConfig({...vendorConfig, name: e.target.value})} />
                                            </div>
                                            <div className="form-group">
                                                <label>Tagline</label>
                                                <input type="text" className="kds-input" value={brandingValue('tagline')} onChange={(e) => setVendorConfig({...vendorConfig, branding: {...vendorConfig.branding, tagline: e.target.value}})} />
                                            </div>
                                            <div className="form-group">
                                                <label>Primary Brand Color</label>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <input type="color" value={vendorConfig.branding?.primary_color || '#c6a15b'} onChange={(e) => setVendorConfig({...vendorConfig, branding: {...vendorConfig.branding, primary_color: e.target.value}})} style={{ height: '48px', width: '60px', padding: '0', background: 'transparent', border: 'none' }} />
                                                    <input type="text" className="kds-input" value={vendorConfig.branding?.primary_color || '#c6a15b'} onChange={(e) => setVendorConfig({...vendorConfig, branding: {...vendorConfig.branding, primary_color: e.target.value}})} />
                                                </div>
                                            </div>
                                            <div className="form-group">
                                                <label>Welcome Text</label>
                                                <input type="text" className="kds-input" value={brandingValue('welcome_text')} onChange={(e) => setVendorConfig({...vendorConfig, branding: {...vendorConfig.branding, welcome_text: e.target.value}})} />
                                            </div>
                                            <div className="form-group">
                                                <label>Contact Email</label>
                                                <input
                                                    type="email"
                                                    className="kds-input"
                                                    placeholder="e.g. bookings@yourbusiness.com"
                                                    value={brandingValue('contact_email')}
                                                    onChange={(e) => setVendorConfig({...vendorConfig, branding: {...vendorConfig.branding, contact_email: e.target.value}})}
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label>WhatsApp Number</label>
                                                <input
                                                    type="text"
                                                    className="kds-input"
                                                    placeholder="e.g. 0812345678"
                                                    value={vendorConfig.branding?.contact_whatsapp || ''}
                                                    onChange={(e) => setVendorConfig({...vendorConfig, branding: {...vendorConfig.branding, contact_whatsapp: e.target.value}})}
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={Boolean(vendorConfig.branding?.enable_reservations)}
                                                        onChange={(e) => setVendorConfig({
                                                            ...vendorConfig,
                                                            branding: {
                                                                ...vendorConfig.branding,
                                                                enable_reservations: e.target.checked
                                                            }
                                                        })}
                                                        style={{ width: '16px', height: '16px' }}
                                                    />
                                                    Enable Reservations & Venue Bookings
                                                </label>
                                                <small style={{ color: '#64748b', display: 'block', marginTop: '0.5rem' }}>
                                                    Turn this on only for restaurants, lounges, and venues that want booking requests on the landing page.
                                                </small>
                                            </div>
                                            <div className="form-group">
                                                <label>Hero Title</label>
                                                <input type="text" className="kds-input" value={brandingValue('hero_title')} onChange={(e) => setVendorConfig({...vendorConfig, branding: {...vendorConfig.branding, hero_title: e.target.value}})} placeholder="e.g. Good food for" />
                                            </div>
                                            <div className="form-group">
                                                <label>Store Logo</label>
                                                {resolvedVendorLogo && (
                                                    <div style={{ marginBottom: '0.5rem' }}>
                                                        <img src={resolvedVendorLogo} alt="Logo" style={{ height: '40px', borderRadius: '4px', border: '1px solid #334155' }} />
                                                    </div>
                                                )}
                                                <input 
                                                    type="file" 
                                                    accept="image/*"
                                                    className="kds-input" 
                                                    onChange={(e) => setLogoFile(e.target.files[0])} 
                                                    style={{ padding: '0.5rem' }}
                                                />
                                                <small style={{ color: '#64748b' }}>Appears in the admin sidebar and at the top-left of your landing page.</small>
                                            </div>
                                            <div className="form-group">
                                                <label>Custom Domain (e.g. www.chef-dips.co.za)</label>
                                                <input type="text" className="kds-input" value={vendorConfig.custom_domain || ''} onChange={(e) => setVendorConfig({...vendorConfig, custom_domain: e.target.value})} placeholder="Leave blank to use platform slug" />
                                            </div>
                                        </div>

                                        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                            <label>Hero Title Highlight</label>
                                            <input type="text" placeholder="e.g. every occasion." className="kds-input" value={brandingValue('hero_highlight')} onChange={(e) => setVendorConfig({...vendorConfig, branding: {...vendorConfig.branding, hero_highlight: e.target.value}})} />
                                        </div>

                                        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                            <label>Hero Subtitle</label>
                                            <input type="text" placeholder="e.g. Premium dining with bold local flavour." className="kds-input" value={brandingValue('hero_subtitle')} onChange={(e) => setVendorConfig({...vendorConfig, branding: {...vendorConfig.branding, hero_subtitle: e.target.value}})} />
                                        </div>

                                        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                            <label>Hero Background Image Upload</label>
                                            {vendorConfig.branding?.hero_image && (
                                                <div style={{ marginBottom: '0.5rem' }}>
                                                    <img src={vendorConfig.branding.hero_image} alt="Hero" style={{ height: '60px', borderRadius: '4px', border: '1px solid #334155' }} />
                                                    <br/>
                                                    <small style={{ color: '#c6a15b' }}>Current image active</small>
                                                </div>
                                            )}
                                            <input 
                                                type="file" 
                                                accept="image/*"
                                                className="kds-input" 
                                                onChange={(e) => setHeroImageFile(e.target.files[0])} 
                                                style={{ padding: '0.5rem' }}
                                            />
                                            <small style={{ color: '#64748b', display: 'block', marginTop: '0.5rem' }}>Upload a high-quality landscape image for your landing page background.</small>
                                        </div>

                                        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                            <label>About Us Story</label>
                                            <textarea className="kds-input" rows="3" value={vendorConfig.branding?.about_text ?? vendorConfig.branding?.about_story ?? KINGS_WEAR_DEFAULT_BRANDING.about_text} onChange={(e) => setVendorConfig({...vendorConfig, branding: {...vendorConfig.branding, about_text: e.target.value, about_story: e.target.value}})} style={{ minHeight: '100px', resize: 'vertical' }}></textarea>
                                        </div>

                                        <div style={{ background: 'rgba(15,23,42,0.55)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '1rem', marginBottom: '1.5rem' }}>
                                            <h3 style={{ marginTop: 0, marginBottom: '0.35rem' }}>Landing Page Sections</h3>
                                            <p style={{ color: '#94a3b8', marginTop: 0, marginBottom: '1rem', lineHeight: '1.6' }}>
                                                These are the same sections the public Kings Wear page reads from Supabase.
                                            </p>

                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                                                <div className="form-group">
                                                    <label>About Heading</label>
                                                    <input type="text" className="kds-input" value={brandingValue('about_heading')} onChange={(e) => setVendorConfig({...vendorConfig, branding: {...vendorConfig.branding, about_heading: e.target.value}})} placeholder={KINGS_WEAR_DEFAULT_BRANDING.about_heading} />
                                                </div>
                                                <div className="form-group">
                                                    <label>Location Label</label>
                                                    <input type="text" className="kds-input" value={brandingValue('location_label')} onChange={(e) => setVendorConfig({...vendorConfig, branding: {...vendorConfig.branding, location_label: e.target.value}})} placeholder={KINGS_WEAR_DEFAULT_BRANDING.location_label} />
                                                </div>
                                                <div className="form-group">
                                                    <label>Services Heading</label>
                                                    <input type="text" className="kds-input" value={brandingValue('services_heading')} onChange={(e) => setVendorConfig({...vendorConfig, branding: {...vendorConfig.branding, services_heading: e.target.value}})} placeholder={KINGS_WEAR_DEFAULT_BRANDING.services_heading} />
                                                </div>
                                                <div className="form-group">
                                                    <label>Booking Heading</label>
                                                    <input type="text" className="kds-input" value={brandingValue('booking_heading')} onChange={(e) => setVendorConfig({...vendorConfig, branding: {...vendorConfig.branding, booking_heading: e.target.value}})} placeholder={KINGS_WEAR_DEFAULT_BRANDING.booking_heading} />
                                                </div>
                                            </div>

                                            <div className="form-group" style={{ marginBottom: '1rem' }}>
                                                <label>Services Intro</label>
                                                <textarea className="kds-input" rows="2" value={brandingValue('services_intro')} onChange={(e) => setVendorConfig({...vendorConfig, branding: {...vendorConfig.branding, services_intro: e.target.value}})} placeholder={KINGS_WEAR_DEFAULT_BRANDING.services_intro} style={{ resize: 'vertical' }} />
                                            </div>
                                            <div className="form-group" style={{ marginBottom: '1rem' }}>
                                                <label>Service Cards</label>
                                                <textarea
                                                    className="kds-input"
                                                    rows="4"
                                                    value={brandingLines('service_cards', ['title', 'desc'])}
                                                    onChange={(e) => setVendorConfig({...vendorConfig, branding: {...vendorConfig.branding, service_cards: fromEditableLines(e.target.value, ['title', 'desc'])}})}
                                                    placeholder="Bespoke Suits | Custom-tailored suits designed to fit your body."
                                                    style={{ resize: 'vertical' }}
                                                />
                                                <small style={{ color: '#64748b' }}>One card per line: title | description</small>
                                            </div>

                                            <div className="form-group" style={{ marginBottom: '1rem' }}>
                                                <label>Pricing Intro</label>
                                                <textarea className="kds-input" rows="2" value={brandingValue('pricing_intro')} onChange={(e) => setVendorConfig({...vendorConfig, branding: {...vendorConfig.branding, pricing_intro: e.target.value}})} placeholder={KINGS_WEAR_DEFAULT_BRANDING.pricing_intro} style={{ resize: 'vertical' }} />
                                            </div>
                                            <div className="form-group" style={{ marginBottom: '1rem' }}>
                                                <label>Pricing Cards</label>
                                                <textarea
                                                    className="kds-input"
                                                    rows="4"
                                                    value={brandingLines('pricing_cards', ['title', 'price', 'copy'])}
                                                    onChange={(e) => setVendorConfig({...vendorConfig, branding: {...vendorConfig.branding, pricing_cards: fromEditableLines(e.target.value, ['title', 'price', 'copy'])}})}
                                                    placeholder="Bespoke Suits | From R3 500 | Tailored for events and business."
                                                    style={{ resize: 'vertical' }}
                                                />
                                                <small style={{ color: '#64748b' }}>One card per line: title | price | copy</small>
                                            </div>

                                            <div className="form-group" style={{ marginBottom: '1rem' }}>
                                                <label>Value Points</label>
                                                <textarea
                                                    className="kds-input"
                                                    rows="4"
                                                    value={brandingLines('value_points', ['title', 'desc'])}
                                                    onChange={(e) => setVendorConfig({...vendorConfig, branding: {...vendorConfig.branding, value_points: fromEditableLines(e.target.value, ['title', 'desc'])}})}
                                                    placeholder="Precision Craftsmanship | Every stitch and finishing detail is handled with care."
                                                    style={{ resize: 'vertical' }}
                                                />
                                                <small style={{ color: '#64748b' }}>One point per line: title | description</small>
                                            </div>

                                            <div className="form-group" style={{ marginBottom: '1rem' }}>
                                                <label>Gallery Intro</label>
                                                <textarea className="kds-input" rows="2" value={brandingValue('gallery_intro')} onChange={(e) => setVendorConfig({...vendorConfig, branding: {...vendorConfig.branding, gallery_intro: e.target.value}})} placeholder={KINGS_WEAR_DEFAULT_BRANDING.gallery_intro} style={{ resize: 'vertical' }} />
                                            </div>
                                            <div className="form-group" style={{ marginBottom: '1rem' }}>
                                                <label>Booking Intro</label>
                                                <textarea className="kds-input" rows="2" value={brandingValue('booking_intro')} onChange={(e) => setVendorConfig({...vendorConfig, branding: {...vendorConfig.branding, booking_intro: e.target.value}})} placeholder={KINGS_WEAR_DEFAULT_BRANDING.booking_intro} style={{ resize: 'vertical' }} />
                                            </div>
                                            <div className="form-group">
                                                <label>FAQ Items</label>
                                                <textarea
                                                    className="kds-input"
                                                    rows="5"
                                                    value={brandingLines('faq_items', ['q', 'a'])}
                                                    onChange={(e) => setVendorConfig({...vendorConfig, branding: {...vendorConfig.branding, faq_items: fromEditableLines(e.target.value, ['q', 'a'])}})}
                                                    placeholder="How do fittings work? | We start with a consultation and measurements."
                                                    style={{ resize: 'vertical' }}
                                                />
                                                <small style={{ color: '#64748b' }}>One FAQ per line: question | answer</small>
                                            </div>
                                        </div>

                                        <button type="submit" className="btn-primary" disabled={uploadingHero} style={{ background: '#c6a15b', color: '#000', fontWeight: 'bold' }}>
                                            {uploadingHero ? 'Uploading & Saving...' : 'Save Brand Identity'}
                                        </button>

                                        </form>
                                        ) : brandingActivePanel === 'identity' ? (
                                            <p>Loading vendor settings...</p>
                                        ) : null}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

// Helper Components defined outside to prevent re-renders on clock ticks
const OrderCard = ({ order, updateOrderStatus, showLocation, setIsVerifyingPin, setVerificationPin, setPinError }) => {
    const isDelivery = order.fulfillment_method === 'delivery';
    const handleReadyCompletion = async () => {
        if (order.collection_pin) {
            setVerificationPin('');
            setPinError('');
            setIsVerifyingPin(order);
            return;
        }

        const message = 'This order has no stored collection PIN. Complete it now?';
        const ok = window.__vulahubConfirm
            ? await window.__vulahubConfirm({
                title: 'Complete Order',
                message,
                confirmLabel: isDelivery ? 'Mark Delivered' : 'Mark Collected',
                cancelLabel: 'Cancel',
                tone: 'warning'
            })
            : window.confirm(message);

        if (ok) {
            updateOrderStatus(order.id, 'completed');
        }
    };

    return (
        <div className="kds-card" style={order.customer_arrived ? { border: '3px solid #ef4444', animation: order.status !== 'completed' ? 'pulse 2s infinite' : 'none', position: 'relative' } : { position: 'relative' }}>
            {isDelivery && (
                <div style={{ 
                    position: 'absolute', 
                    top: '-10px', 
                    right: '-10px', 
                    background: '#3b82f6', 
                    color: '#fff', 
                    padding: '0.25rem 0.75rem', 
                    borderRadius: '20px', 
                    fontSize: '0.7rem', 
                    fontWeight: 'bold', 
                    boxShadow: '0 4px 10px rgba(59, 130, 246, 0.4)',
                    zIndex: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    border: '2px solid #0f172a'
                }}>
                     DELIVERY
                </div>
            )}
            
            {order.customer_arrived && (
                <div style={{ background: '#ef4444', color: '#fff', padding: '0.5rem', textAlign: 'center', fontWeight: 'bold', fontSize: '1rem', borderTopLeftRadius: '10px', borderTopRightRadius: '10px', marginBottom: '-1px' }}>
                     CUSTOMER IS WAITING OUTSIDE
                </div>
            )}
            <div className="kds-card-header" style={{ paddingTop: order.customer_arrived ? '0.5rem' : '' }}>
                <h3>{order.order_number}</h3>
                <span className={`status-badge status-${order.status}`}>{order.status}</span>
            </div>
            <div className="kds-customer-info">
                <p><strong>{order.customer_name}</strong></p>
                <p>Contact: {order.customer_phone} {order.customer_email && `| ${order.customer_email}`}</p>
                {order.source && (
                    <span style={{ display: 'inline-block', marginTop: '0.5rem', padding: '0.15rem 0.5rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#cbd5e1' }}>
                        Source: {order.source}
                    </span>
                )}
                {showLocation && <p className="kds-loc"> {order.locations?.name}</p>}

                {isDelivery && order.delivery_address && (
                    <div style={{ 
                        marginTop: '0.75rem', 
                        padding: '0.75rem', 
                        background: 'rgba(59, 130, 246, 0.1)', 
                        border: '1px solid rgba(59, 130, 246, 0.2)', 
                        borderRadius: '8px',
                        fontSize: '0.8rem',
                        color: '#60a5fa',
                        lineHeight: '1.4'
                    }}>
                        <strong> Delivery Address:</strong><br/>
                        {order.delivery_address}
                    </div>
                )}

                {/* PRE-ORDER TIME */}
                {order.estimated_collection_time && (
                    <p style={{ color: '#fbbf24', fontWeight: 'bold', marginTop: '0.25rem' }}>
                         Collect time: {order.estimated_collection_time.substring(0, 5)}
                    </p>
                )}
            </div>

            <div className="kds-items">
                {order.order_items && order.order_items.map((item, idx) => (
                    <div key={idx} className="kds-item-row">
                        <span className="qty">{item.quantity}x</span>
                        <div className="item-details">
                            <span className="name">{getOrderItemName(item)}</span>
                            {item.modifiers_json?.custom_notes && (
                                <span className="modifier">Note: {item.modifiers_json.custom_notes}</span>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <div className="kds-actions">
                <select 
                     value={order.status}
                     onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                     style={{ padding: '0.6rem', background: '#0f172a', color: '#fff', border: '1px solid #334155', borderRadius: '6px', width: '100%', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer', outline: 'none' }}
                >
                    <option value="paid">NEW</option>
                    <option value="contacted">CONTACTED</option>
                    <option value="confirmed">CONFIRMED</option>
                    <option value="completed">COMPLETED</option>
                    <option value="cancelled">CANCELLED</option>
                </select>
            </div>
        </div>
    );
};





