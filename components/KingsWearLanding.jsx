import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../src/supabaseClient";

/* Luxury Header */
function LuxuryHeader({ vendorName, branding, onNavClick }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const navLinks = [
    { label: "Home", href: "#hero" },
    { label: "Services", href: "#services" },
    { label: "Gallery", href: "#gallery" },
    { label: "Booking", href: "#booking" },
    { label: "Contact", href: "#contact" },
  ];

  const handleNavClick = (e, href) => {
    e.preventDefault();
    setMenuOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
    onNavClick?.();
  };

  const primaryColor = branding?.primary_color || "#C9A646";
  const logoUrl = branding?.logo_url || "";

  const headerStyle = {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    zIndex: 1000,
    padding: scrolled ? "14px 40px" : "22px 40px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: scrolled ? "rgba(10,10,10,0.96)" : "transparent",
    backdropFilter: scrolled ? "blur(18px) saturate(1.6)" : "none",
    WebkitBackdropFilter: scrolled ? "blur(18px) saturate(1.6)" : "none",
    boxShadow: scrolled ? "0 2px 30px rgba(0,0,0,0.5)" : "none",
    borderBottom: scrolled ? "1px solid rgba(201,166,70,0.12)" : "1px solid transparent",
    transition: "all 0.4s ease-in-out",
  };

  const logoStyle = {
    fontFamily: "'Outfit', sans-serif",
    fontSize: "1.35rem",
    fontWeight: 800,
    letterSpacing: "0.25em",
    textTransform: "uppercase",
    color: scrolled ? primaryColor : "#fff",
    textDecoration: "none",
    transition: "color 0.4s ease-in-out",
    cursor: "pointer",
  };

  const linkStyle = {
    color: "#fff",
    textDecoration: "none",
    fontSize: "0.8rem",
    fontWeight: 500,
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    fontFamily: "'Inter', sans-serif",
    transition: "color 0.3s ease",
    padding: "4px 0",
    borderBottom: "1px solid transparent",
  };

  const ctaStyle = {
    border: `1px solid ${primaryColor}`,
    padding: "10px 26px",
    color: primaryColor,
    fontSize: "0.75rem",
    fontWeight: 600,
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    textDecoration: "none",
    fontFamily: "'Inter', sans-serif",
    transition: "all 0.3s ease",
    cursor: "pointer",
    background: "transparent",
  };

  /* Hamburger bars */
  const barBase = {
    display: "block",
    width: "24px",
    height: "2px",
    background: scrolled ? primaryColor : "#fff",
    transition: "all 0.35s ease",
    transformOrigin: "center",
  };

  return (
    <>
      <header style={headerStyle}>
        {/* Logo */}
        <a href="#hero" onClick={(e) => handleNavClick(e, "#hero")} style={{ ...logoStyle, display: "flex", alignItems: "center", gap: "12px", letterSpacing: "0.08em" }}>
          {logoUrl ? (
            <span style={{ width: "44px", height: "44px", borderRadius: "14px", background: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "6px", boxShadow: "0 10px 24px rgba(0,0,0,0.18)" }}>
              <img src={logoUrl} alt={`${vendorName || "Studio"} logo`} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            </span>
          ) : null}
          <span>{vendorName || "Kings Wear"}</span>
        </a>

        {/* Desktop Nav */}
        <nav style={{ display: "flex", alignItems: "center", gap: "36px" }}
             className="kw-desktop-nav">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={(e) => handleNavClick(e, link.href)}
              style={linkStyle}
              onMouseEnter={(e) => { e.target.style.color = primaryColor; e.target.style.borderBottomColor = primaryColor; }}
              onMouseLeave={(e) => { e.target.style.color = "#fff"; e.target.style.borderBottomColor = "transparent"; }}
            >
              {link.label}
            </a>
          ))}
          <a
            href="#booking"
            onClick={(e) => handleNavClick(e, "#booking")}
            style={ctaStyle}
            onMouseEnter={(e) => { e.target.style.background = primaryColor; e.target.style.color = "#000"; }}
            onMouseLeave={(e) => { e.target.style.background = "transparent"; e.target.style.color = primaryColor; }}
          >
            Book Fitting
          </a>
        </nav>

        {/* Hamburger Button */}
        <button
          className="kw-hamburger"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
          style={{
            display: "none", /* shown via CSS media query */
            flexDirection: "column",
            gap: "5px",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "6px",
            zIndex: 1100,
          }}
        >
          <span style={{
            ...barBase,
            transform: menuOpen ? "rotate(45deg) translate(5px, 5px)" : "none",
          }} />
          <span style={{
            ...barBase,
            opacity: menuOpen ? 0 : 1,
          }} />
          <span style={{
            ...barBase,
            transform: menuOpen ? "rotate(-45deg) translate(5px, -5px)" : "none",
          }} />
        </button>
      </header>

      {/* Mobile Menu Overlay */}
      <div
        className="kw-mobile-overlay"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1050,
          background: "rgba(0,0,0,0.97)",
          backdropFilter: "blur(20px)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "32px",
          opacity: menuOpen ? 1 : 0,
          pointerEvents: menuOpen ? "auto" : "none",
          transition: "opacity 0.4s ease-in-out",
        }}
      >
        {navLinks.map((link) => (
          <a
            key={link.label}
            href={link.href}
            onClick={(e) => handleNavClick(e, link.href)}
            style={{
              color: "#fff",
              textDecoration: "none",
              fontSize: "1.5rem",
              fontWeight: 500,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              fontFamily: "'Inter', sans-serif",
              transition: "color 0.3s ease",
            }}
            onMouseEnter={(e) => { e.target.style.color = primaryColor; }}
            onMouseLeave={(e) => { e.target.style.color = "#fff"; }}
          >
            {link.label}
          </a>
        ))}
        <a
          href="#booking"
          onClick={(e) => handleNavClick(e, "#booking")}
          style={{
            ...ctaStyle,
            fontSize: "1rem",
            padding: "14px 40px",
            marginTop: "16px",
          }}
            onMouseEnter={(e) => { e.target.style.background = primaryColor; e.target.style.color = "#000"; }}
            onMouseLeave={(e) => { e.target.style.background = "transparent"; e.target.style.color = primaryColor; }}
        >
          Book Fitting
        </a>
      </div>

      {/* Responsive CSS injected once */}
      <style>{`
        @media (max-width: 768px) {
          .kw-desktop-nav { display: none !important; }
          .kw-hamburger { display: flex !important; }
        }
      `}</style>
    </>
  );
}

/* Main Landing Page */
export default function KingsWearLanding() {
  const { vendorSlug } = useParams();
  const [vendorId, setVendorId] = useState(null);
  const [vendorProfile, setVendorProfile] = useState(null);
  const [testimonials, setTestimonials] = useState([]);
  const [gallery, setGallery] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    appointmentType: "consultation",
    preferredDate: "",
    garmentType: "",
    budgetRange: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState("idle"); // idle | success | error

  useEffect(() => {
    async function init() {
      const pathSlug = vendorSlug || window.location.pathname.replace(/^\/+/, "").split("/").filter(Boolean).pop() || "kings-wear-clothing";
      const candidateSlugs = Array.from(new Set([
        pathSlug,
        "kings-wear-clothing",
        "kings-wear",
        "kingswear",
      ].filter(Boolean)));
      const candidateSources = ["vendors", "public_vendors", "kg_vendors"];

      const tryLoadVendor = async (source, slug) => {
        try {
          const { data, error } = await supabase.from(source).select("*").eq("slug", slug).maybeSingle();
          if (error) {
            if (["PGRST205", "42P01", "42703"].includes(error.code)) {
              return null;
            }
            throw error;
          }
          return data || null;
        } catch (err) {
          if (["PGRST205", "42P01", "42703"].includes(err?.code)) {
            return null;
          }
          console.warn(`Vendor lookup failed on ${source}:`, err?.message || err);
          return null;
        }
      };

      let data = null;
      for (const source of candidateSources) {
        for (const slug of candidateSlugs) {
          data = await tryLoadVendor(source, slug);
          if (data) break;
        }
        if (data) break;
      }

      if (!data) {
        for (const source of candidateSources) {
          try {
            const { data: anyVendor, error } = await supabase.from(source).select("*").limit(1).maybeSingle();
            if (!error && anyVendor) {
              data = anyVendor;
              break;
            }
          } catch (err) {
            if (!["PGRST205", "42P01", "42703"].includes(err?.code)) {
              console.warn(`Fallback vendor lookup failed on ${source}:`, err?.message || err);
            }
          }
        }
      }

      if (data) {
        setVendorId(data.id);
        setVendorProfile(data);
      }
    }
    init();
  }, [vendorSlug]);

  useEffect(() => {
    async function loadSupportingData() {
      if (!vendorId) return;
      const { data } = await supabase
        .from("testimonials")
        .select("*")
        .eq("vendor_id", vendorId)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(6);
      if (data) setTestimonials(data);

      const { data: galleryData } = await supabase
        .from("site_gallery")
        .select("*")
        .eq("vendor_id", vendorId)
        .order("created_at", { ascending: false })
        .limit(6);
      if (galleryData) setGallery(galleryData);

      const { data: menuData } = await supabase
        .from("menu_items")
        .select("id, name, description, price, image_url")
        .eq("vendor_id", vendorId)
        .order("price", { ascending: true });
      if (menuData) setMenuItems(menuData);
    }
    loadSupportingData();
  }, [vendorId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!vendorId) { setSubmitStatus("error"); return; }
    setIsSubmitting(true);
    setSubmitStatus("idle");

    try {
      const { data: clientRecord, error: clientError } = await supabase
        .from("stylist_clients")
        .insert([{
          vendor_id: vendorId,
          full_name: formData.name,
          phone: formData.phone,
          email: formData.email || null,
          preferred_contact_method: "whatsapp",
          payment_status: "inquiry",
          status: "lead",
          source: "landing_page",
          notes: formData.message || null,
        }])
        .select()
        .single();

      if (clientError) throw clientError;

      const { error: appointmentError } = await supabase
        .from("stylist_appointments")
        .insert([{
          vendor_id: vendorId,
          client_id: clientRecord?.id || null,
          appointment_type: formData.appointmentType,
          status: "pending",
          appointment_date: formData.preferredDate || new Date().toISOString().split("T")[0],
          garment_type: formData.garmentType || null,
          budget_range: formData.budgetRange || null,
          payment_status: "inquiry",
          contact_name: formData.name,
          contact_phone: formData.phone,
          contact_email: formData.email || null,
          special_requests: formData.message || null,
          source: "landing_page",
        }]);

      if (appointmentError) throw appointmentError;

      setSubmitStatus("success");
      setFormData({
        name: "",
        email: "",
        phone: "",
        appointmentType: "consultation",
        preferredDate: "",
        garmentType: "",
        budgetRange: "",
        message: "",
      });
    } catch (err) {
      console.error("Booking Error:", err);
      setSubmitStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const branding = vendorProfile?.branding || {};
  const firstFilledText = (...values) => {
    for (const value of values) {
      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    }
    return "";
  };
  const effectiveBranding = {
    ...branding,
    logo_url: branding.logo_url || vendorProfile?.logo_url || "",
  };
  const parseList = (value) => {
    if (Array.isArray(value)) return value;
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };
  const primaryColor = firstFilledText(branding.primary_color, vendorProfile?.primary_color) || "#C9A646";
  const secondaryColor = firstFilledText(branding.secondary_color) || "#0d0d14";
  const contactEmail = firstFilledText(branding.contact_email, vendorProfile?.contact_email) || "bookings@kingswear.co.za";
  const whatsappNumber = firstFilledText(
    branding.contact_whatsapp,
    branding.whatsapp_number,
    branding.whatsapp,
    vendorProfile?.whatsapp_number,
    vendorProfile?.whatsapp
  );
  const whatsappHref = whatsappNumber
    ? `https://wa.me/${String(whatsappNumber).replace(/\D/g, "")}?text=${encodeURIComponent(`Hi, I'd like to book a fitting with ${vendorProfile?.name || "Kings Wear"}.`)}`
    : null;
  const locationLabel = firstFilledText(branding.location_label, branding.city, vendorProfile?.city) || "Polokwane, Limpopo";
  const heroTitle = firstFilledText(branding.hero_title, branding.headline) || "Tailored for";
  const heroHighlight = firstFilledText(branding.hero_highlight, branding.hero_emphasis) || "Kings";
  const heroSubtitle = firstFilledText(
    branding.hero_subtitle,
    branding.hero_description,
    branding.welcome_text
  ) || "Bespoke tailoring, premium styling, and image transformation for weddings, events, business, and clients who need to arrive looking expensive.";
  const aboutText = firstFilledText(
    branding.about_text,
    branding.about_story,
    branding.about_us_story,
    vendorProfile?.about_text,
    vendorProfile?.about_story
  ) || "Kings Wear Clothing is a premium tailoring brand founded by King Wiz, specializing in bespoke suits crafted for men and women who value precision, elegance, and status. Each piece is designed to elevate your presence and reflect confidence at the highest level.";
  const tagline = firstFilledText(branding.tagline, branding.site_title, vendorProfile?.tagline) || "Premium Bespoke Tailoring";
  const aboutHeading = firstFilledText(branding.about_heading) || `About ${vendorProfile?.name || "Kings Wear"}`;
  const servicesHeading = firstFilledText(branding.services_heading) || "Our Services";
  const servicesIntro = firstFilledText(branding.services_intro) || "A clear snapshot of the tailoring, styling, and premium looks this studio currently offers.";
  const pricingIntro = firstFilledText(branding.pricing_intro) || "Let clients qualify themselves before they DM. Final quotes still depend on fabric, finish, complexity, and delivery timelines.";
  const galleryIntro = firstFilledText(branding.gallery_intro) || "A look at the studio's transformations, fittings, and standout finished pieces.";
  const bookingHeading = firstFilledText(branding.booking_heading) || "Book a Fitting / Get Styled";
  const bookingIntro = firstFilledText(branding.booking_intro) || "Share your occasion, preferred garment, and timing so the studio can guide your fitting and next steps.";
  const instagramHandle = firstFilledText(branding.instagram_handle, vendorProfile?.instagram_handle);
  const galleryImages = gallery.length > 0
    ? gallery.map((item) => item.image_url).filter(Boolean)
    : [
        "https://images.unsplash.com/photo-1592878904946-b3cd8ae243d0?w=600&q=80",
        "https://images.unsplash.com/photo-1520975922324-93f8b39d19d6?w=600&q=80",
        "https://images.unsplash.com/photo-1542060748-10c28b62716b?w=600&q=80",
      ];
  const fallbackServices = [
    { title: "Bespoke Suits", desc: "Custom-tailored suits designed to fit your body with absolute precision and elegance." },
    { title: "Wedding Styling", desc: "Stand out on your special day with premium, unforgettable styling." },
    { title: "Image Transformation", desc: "Upgrade your entire look and elevate your personal brand to new heights." },
  ];
  const serviceItems = menuItems.length > 0
    ? menuItems.slice(0, 6).map((item) => ({
        title: item.name,
        desc: firstFilledText(item.description) || `${item.name} tailored for clients who want a sharper, more intentional finish.`,
        image: item.image_url || "",
        price: item.price,
      }))
    : fallbackServices;
  const brandingPricingCards = parseList(branding.pricing_cards);
  const pricingCards = brandingPricingCards.length > 0
    ? brandingPricingCards
    : menuItems.length > 0
      ? menuItems
          .filter((item) => item.price !== null && item.price !== undefined)
          .slice(0, 6)
          .map((item) => ({
            title: item.name,
            price: `From R${Number(item.price).toFixed(2)}`,
            copy: firstFilledText(item.description) || `Starting guide for ${item.name.toLowerCase()} bookings, fittings, and studio planning.`,
          }))
      : [
          { title: "Bespoke Suits", price: "From R3 500", copy: "Tailored for events, business, weddings, and personal image upgrades." },
          { title: "Wedding Styling", price: "From R5 500", copy: "Premium looks for grooms, groomsmen, and standout ceremony styling." },
          { title: "Fittings & Alterations", price: "From R450", copy: "Refinement, adjustments, and finishing to sharpen the final silhouette." },
        ];
  const brandingValuePoints = parseList(branding.value_points);
  const valuePoints = brandingValuePoints.length > 0
    ? brandingValuePoints
    : [
        { title: "Precision Craftsmanship", desc: "Every stitch and finishing detail is handled with care." },
        { title: "Premium Fabrics", desc: "The studio guides clients toward finishes that match the brief and budget." },
        { title: "Personalized Experience", desc: "Each fitting and look is shaped around the client's identity, event, and desired impression." },
      ];

  /* Shared section heading style */
  const sectionHeading = {
    fontSize: "0.75rem",
    fontWeight: 600,
    letterSpacing: "0.3em",
    textTransform: "uppercase",
    color: primaryColor,
    marginBottom: "16px",
    fontFamily: "'Inter', sans-serif",
  };

  const sectionTitle = {
    fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
    fontWeight: 300,
    marginBottom: "24px",
    color: "#fff",
    fontFamily: "'Outfit', sans-serif",
    letterSpacing: "0.04em",
  };

  const inputStyle = {
    width: "100%",
    padding: "14px 16px",
    backgroundColor: "transparent",
    border: "1px solid rgba(255,255,255,0.15)",
    color: "#fff",
    outline: "none",
    boxSizing: "border-box",
    fontSize: "0.95rem",
    fontFamily: "'Inter', sans-serif",
    letterSpacing: "0.02em",
    transition: "border-color 0.3s ease",
  };
  const brandingFaqItems = parseList(branding.faq_items);
  const faqItems = brandingFaqItems.length > 0
    ? brandingFaqItems
    : [
        {
          q: "How do fittings work?",
          a: "We start with a consultation, take your measurements, discuss your occasion and style direction, then confirm your fitting and production timeline.",
        },
        {
          q: "Do you style weddings and special events?",
          a: "Yes. We handle groom looks, wedding party styling, matric dances, graduations, red-carpet moments, and premium occasion wear.",
        },
        {
          q: "How much do your garments cost?",
          a: "Pricing depends on fabric, finish, design complexity, and whether the piece is bespoke or styled from an existing concept. The guide below gives starting prices.",
        },
        {
          q: "How early should I book?",
          a: "For weddings and major events, booking at least 2 to 4 weeks ahead is safest. For urgent fittings, message early so availability can be confirmed.",
        },
      ];
  const scrollToSection = (event, selector) => {
    event.preventDefault();
    const el = document.querySelector(selector);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div style={{ backgroundColor: secondaryColor, color: "#fff", fontFamily: "'Inter', sans-serif", minHeight: "100vh" }}>

      <LuxuryHeader vendorName={vendorProfile?.name} branding={effectiveBranding} />

      {/* HERO */}
      <section
        id="hero"
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.15), rgba(0,0,0,0.7)), url('${branding.hero_image || "https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?w=1920&q=80"}')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          position: "relative",
        }}
      >
        <div style={{
          maxWidth: "700px",
          padding: "48px 40px",
          backgroundColor: "rgba(0,0,0,0.65)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          borderRadius: "8px",
        }}>
          <p style={{
            fontSize: "0.75rem",
            letterSpacing: "0.4em",
            textTransform: "uppercase",
            color: primaryColor,
            marginBottom: "24px",
            fontWeight: 500,
          }}>
            {tagline}
          </p>
          <h1 style={{
            fontSize: "clamp(2.5rem, 8vw, 5rem)",
            fontWeight: 300,
            marginBottom: "24px",
            color: "#fff",
            fontFamily: "'Outfit', sans-serif",
            letterSpacing: "0.06em",
            lineHeight: 1.1,
          }}>
            {heroTitle}{" "}
            <span style={{ color: primaryColor, fontWeight: 600 }}>{heroHighlight}</span>
          </h1>
          <p style={{
            fontSize: "clamp(0.95rem, 2.5vw, 1.15rem)",
            marginBottom: "40px",
            color: "rgba(255,255,255,0.7)",
            lineHeight: 1.7,
            fontWeight: 300,
          }}>
            {heroSubtitle}
          </p>
          <a
            href="#booking"
            onClick={(e) => scrollToSection(e, "#booking")}
            style={{
              border: `1px solid ${primaryColor}`,
              padding: "16px 48px",
              textDecoration: "none",
              color: primaryColor,
              display: "inline-block",
              fontSize: "0.8rem",
              fontWeight: 600,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              transition: "all 0.3s ease",
            }}
            onMouseEnter={e => { e.target.style.backgroundColor = primaryColor; e.target.style.color = "#000"; }}
            onMouseLeave={e => { e.target.style.backgroundColor = "transparent"; e.target.style.color = primaryColor; }}
          >
            Book a Fitting
          </a>
          <div style={{ marginTop: "18px" }}>
            <a
              href={whatsappHref || "#contact"}
              onClick={whatsappHref ? undefined : (e) => scrollToSection(e, "#contact")}
              target={whatsappHref ? "_blank" : undefined}
              rel={whatsappHref ? "noreferrer" : undefined}
              style={{
                color: "rgba(255,255,255,0.7)",
                textDecoration: "none",
                fontSize: "0.9rem",
                letterSpacing: "0.04em",
              }}
            >
          {whatsappHref ? "Prefer WhatsApp? Start the conversation now." : "Get styled for weddings, events, and elevated everyday looks."}
            </a>
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section style={{ padding: "100px 24px", maxWidth: "900px", margin: "0 auto", textAlign: "center" }}>
        <p style={sectionHeading}>Our Story</p>
        <h2 style={sectionTitle}>{aboutHeading}</h2>
        <p style={{ color: "rgba(255,255,255,0.6)", lineHeight: 1.9, maxWidth: "680px", margin: "0 auto", fontSize: "1rem", fontWeight: 300 }}>
          {aboutText}
        </p>
      </section>

      {/* Divider */}
      <div style={{ maxWidth: "120px", height: "1px", background: `${primaryColor}55`, margin: "0 auto" }} />

      {/* SERVICES */}
      <section id="services" style={{ padding: "100px 24px" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", textAlign: "center" }}>
          <p style={sectionHeading}>What We Offer</p>
          <h2 style={sectionTitle}>{servicesHeading}</h2>
          <p style={{ color: "rgba(255,255,255,0.58)", maxWidth: "720px", margin: "0 auto 48px", lineHeight: 1.8 }}>
            {servicesIntro}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "48px", marginTop: "56px" }}>
            {serviceItems.map((s) => (
              <div key={s.title} style={{ padding: "40px 28px", border: "1px solid rgba(255,255,255,0.06)", transition: "border-color 0.3s ease", background: "rgba(255,255,255,0.02)" }}>
                {s.image ? (
                  <img
                    src={s.image}
                    alt={s.title}
                    style={{ width: "100%", height: "220px", objectFit: "cover", marginBottom: "18px", borderRadius: "4px" }}
                  />
                ) : null}
                <h3 style={{ fontSize: "1.1rem", marginBottom: "16px", fontWeight: 400, letterSpacing: "0.08em", fontFamily: "'Outfit', sans-serif" }}>{s.title}</h3>
                <p style={{ color: "rgba(255,255,255,0.5)", lineHeight: 1.7, fontSize: "0.9rem", fontWeight: 300 }}>{s.desc}</p>
                {s.price ? (
                  <div style={{ marginTop: "16px", color: primaryColor, fontSize: "0.82rem", letterSpacing: "0.16em", textTransform: "uppercase" }}>
                    From R{Number(s.price).toFixed(2)}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: "100px 24px", borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", textAlign: "center" }}>
          <p style={sectionHeading}>Pricing Guide</p>
          <h2 style={sectionTitle}>Starting From</h2>
          <p style={{ color: "rgba(255,255,255,0.58)", maxWidth: "720px", margin: "0 auto 48px", lineHeight: 1.8 }}>
            {pricingIntro}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "28px" }}>
            {pricingCards.map((card) => (
              <div key={card.title} style={{ border: `1px solid ${primaryColor}33`, background: "rgba(255,255,255,0.02)", padding: "36px 28px", textAlign: "left" }}>
                <div style={{ color: primaryColor, fontSize: "0.8rem", letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: "16px" }}>{card.price}</div>
                <h3 style={{ fontSize: "1.15rem", marginBottom: "12px", fontWeight: 500, fontFamily: "'Outfit', sans-serif" }}>{card.title}</h3>
                <p style={{ color: "rgba(255,255,255,0.58)", lineHeight: 1.7, fontSize: "0.94rem" }}>{card.copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* GALLERY */}
      <section id="gallery" style={{ padding: "100px 24px", maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "56px" }}>
          <p style={sectionHeading}>Portfolio</p>
          <h2 style={sectionTitle}>Transformations & Looks</h2>
          <p style={{ color: "rgba(255,255,255,0.58)", maxWidth: "720px", margin: "20px auto 0", lineHeight: 1.8 }}>
            {galleryIntro}
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
          {galleryImages.slice(0, 3).map((src, i) => (
            <div key={i} style={{ overflow: "hidden" }}>
              <img
                src={src}
                alt={`Gallery ${i + 1}`}
                style={{
                  width: "100%",
                  height: "380px",
                  objectFit: "cover",
                  display: "block",
                  filter: "grayscale(20%)",
                  transition: "transform 0.6s ease, filter 0.6s ease",
                }}
                onMouseEnter={e => { e.target.style.transform = "scale(1.05)"; e.target.style.filter = "grayscale(0%)"; }}
                onMouseLeave={e => { e.target.style.transform = "scale(1)"; e.target.style.filter = "grayscale(20%)"; }}
              />
            </div>
          ))}
        </div>
      </section>

      {/* WHY CHOOSE US */}
      <section style={{ padding: "100px 24px", textAlign: "center" }}>
        <p style={sectionHeading}>The Difference</p>
        <h2 style={sectionTitle}>Why Choose Us</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "48px", maxWidth: "1000px", margin: "48px auto 0" }}>
          {valuePoints.map((item) => (
            <div key={item.title}>
              <h3 style={{ fontSize: "1.05rem", marginBottom: "12px", fontWeight: 400, letterSpacing: "0.06em", fontFamily: "'Outfit', sans-serif" }}>{item.title}</h3>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.9rem", fontWeight: 300, lineHeight: 1.7 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ padding: "100px 24px", background: "linear-gradient(180deg, rgba(201,166,70,0.05), rgba(0,0,0,0))" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", textAlign: "center" }}>
          <p style={sectionHeading}>Client Love</p>
          <h2 style={sectionTitle}>Testimonials</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "28px", marginTop: "48px" }}>
            {(testimonials.length > 0 ? testimonials : [
              { id: "fallback-1", quote: "The fit was clean, the finish was sharp, and the confidence boost was immediate.", customer_name: "Private Client" },
              { id: "fallback-2", quote: "Professional service, strong communication, and styling that actually made me stand out.", customer_name: "Occasion Wear Client" },
              { id: "fallback-3", quote: "From fitting to final handover, everything felt premium and well handled.", customer_name: "Wedding Client" },
            ]).map((item) => (
              <div key={item.id} style={{ textAlign: "left", border: "1px solid rgba(255,255,255,0.08)", padding: "32px 28px", background: "rgba(255,255,255,0.02)" }}>
                <p style={{ color: "rgba(255,255,255,0.78)", lineHeight: 1.85, fontSize: "0.96rem", marginBottom: "20px" }}>
                  "{item.quote}"
                </p>
                <div style={{ color: primaryColor, fontSize: "0.82rem", letterSpacing: "0.16em", textTransform: "uppercase" }}>
                  {item.customer_name || "Client"}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Divider */}
      <div style={{ maxWidth: "120px", height: "1px", background: "rgba(201,166,70,0.3)", margin: "0 auto" }} />

      {/* BOOKING */}
      <section id="booking" style={{ padding: "100px 24px", maxWidth: "520px", margin: "0 auto", textAlign: "center" }}>
        <p style={sectionHeading}>Appointments</p>
        <h2 style={sectionTitle}>{bookingHeading}</h2>
        <p style={{ color: "rgba(255,255,255,0.58)", maxWidth: "520px", margin: "0 auto 32px", lineHeight: 1.8 }}>
          {bookingIntro}
        </p>

        {submitStatus === "success" ? (
          <div style={{ border: "1px solid rgba(201,166,70,0.3)", padding: "48px 32px" }}>
            <p style={{ color: "#C9A646", fontSize: "1.1rem", marginBottom: "12px", letterSpacing: "0.1em" }}>✓ Booking Submitted</p>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.9rem", fontWeight: 300 }}>The studio will be in touch shortly to confirm your fitting, measurements, and next steps.</p>
            <button
              onClick={() => setSubmitStatus("idle")}
              style={{ marginTop: "28px", border: "1px solid #C9A646", padding: "12px 32px", background: "transparent", color: "#C9A646", cursor: "pointer", fontSize: "0.8rem", letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 500, transition: "all 0.3s ease" }}
              onMouseEnter={e => { e.target.style.background = "#C9A646"; e.target.style.color = "#000"; }}
              onMouseLeave={e => { e.target.style.background = "transparent"; e.target.style.color = "#C9A646"; }}
            >
              Book Another
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <input
              required type="text" placeholder="Full Name"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = "rgba(201,166,70,0.5)"}
              onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.15)"}
            />
            <input
              type="email" placeholder="Email"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = "rgba(201,166,70,0.5)"}
              onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.15)"}
            />
            <input
              required type="tel" placeholder="Phone Number"
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = "rgba(201,166,70,0.5)"}
              onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.15)"}
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px" }}>
              <select
                value={formData.appointmentType}
                onChange={e => setFormData({ ...formData, appointmentType: e.target.value })}
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = "rgba(201,166,70,0.5)"}
                onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.15)"}
              >
                <option value="consultation">Consultation</option>
                <option value="measurement">Measurement Session</option>
                <option value="fitting">Fitting</option>
                <option value="style_session">Style Session</option>
                <option value="pickup">Pickup</option>
              </select>
              <input
                type="date"
                value={formData.preferredDate}
                onChange={e => setFormData({ ...formData, preferredDate: e.target.value })}
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = "rgba(201,166,70,0.5)"}
                onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.15)"}
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px" }}>
              <input
                type="text"
                placeholder="Garment Type"
                value={formData.garmentType}
                onChange={e => setFormData({ ...formData, garmentType: e.target.value })}
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = "rgba(201,166,70,0.5)"}
                onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.15)"}
              />
              <input
                type="text"
                placeholder="Budget Range"
                value={formData.budgetRange}
                onChange={e => setFormData({ ...formData, budgetRange: e.target.value })}
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = "rgba(201,166,70,0.5)"}
                onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.15)"}
              />
            </div>
            <textarea
              rows={4} placeholder="Tell us about the occasion, garment type, preferred fitting date, measurements, or styling direction."
              value={formData.message}
              onChange={e => setFormData({ ...formData, message: e.target.value })}
              style={{ ...inputStyle, resize: "vertical" }}
              onFocus={e => e.target.style.borderColor = "rgba(201,166,70,0.5)"}
              onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.15)"}
            />

            {submitStatus === "error" && (
              <p style={{ color: "#ef4444", fontSize: "0.85rem" }}>Something went wrong. Please try again.</p>
            )}

            <button
              type="submit" disabled={isSubmitting}
              style={{
                width: "100%",
                backgroundColor: "#C9A646",
                color: "#000",
                padding: "14px",
                border: "none",
                cursor: "pointer",
                fontSize: "0.8rem",
                fontWeight: 700,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                opacity: isSubmitting ? 0.6 : 1,
                transition: "opacity 0.3s ease",
              }}
            >
              {isSubmitting ? "Submitting..." : "Submit Booking Request"}
            </button>
          </form>
        )}

        <div style={{ color: "rgba(255,255,255,0.4)", marginTop: "28px", fontSize: "0.85rem", fontWeight: 300 }}>
          {whatsappHref ? (
            <a href={whatsappHref} target="_blank" rel="noreferrer" style={{ color: primaryColor, textDecoration: "none" }}>
              Or message directly on WhatsApp
            </a>
          ) : (
            "Or message directly on WhatsApp"
          )}
        </div>
      </section>

      <section style={{ padding: "100px 24px", maxWidth: "980px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <p style={sectionHeading}>Before You DM</p>
          <h2 style={sectionTitle}>Frequently Asked Questions</h2>
        </div>
        <div style={{ display: "grid", gap: "18px" }}>
          {faqItems.map((item) => (
            <div key={item.q} style={{ border: "1px solid rgba(255,255,255,0.08)", padding: "24px 24px 20px", background: "rgba(255,255,255,0.02)" }}>
              <h3 style={{ marginBottom: "10px", fontFamily: "'Outfit', sans-serif", fontSize: "1.05rem", fontWeight: 500 }}>{item.q}</h3>
              <p style={{ color: "rgba(255,255,255,0.58)", lineHeight: 1.8, margin: 0 }}>{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer id="contact" style={{
        padding: "60px 24px 40px",
        textAlign: "center",
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}>
        <p style={{ color: primaryColor, fontSize: "0.75rem", letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: "16px", fontWeight: 500 }}>
          {vendorProfile?.name || "Kings Wear Clothing"}
        </p>
        <div style={{ display: "grid", gap: "8px", color: "rgba(255,255,255,0.46)", fontSize: "0.92rem", marginBottom: "24px" }}>
          <div>{locationLabel}</div>
          <div>{contactEmail}</div>
          {whatsappNumber && <div>WhatsApp: {whatsappNumber}</div>}
        </div>
        <div style={{ display: "flex", gap: "14px", justifyContent: "center", flexWrap: "wrap", marginBottom: "18px" }}>
          <a
            href="#booking"
            onClick={(e) => scrollToSection(e, "#booking")}
            style={{ border: `1px solid ${primaryColor}`, padding: "12px 24px", color: primaryColor, textDecoration: "none", textTransform: "uppercase", fontSize: "0.8rem", letterSpacing: "0.16em" }}
          >
            Book a Fitting
          </a>
          {whatsappHref && (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noreferrer"
              style={{ border: "1px solid rgba(255,255,255,0.16)", padding: "12px 24px", color: "#fff", textDecoration: "none", textTransform: "uppercase", fontSize: "0.8rem", letterSpacing: "0.16em" }}
            >
              WhatsApp
            </a>
          )}
        </div>
        <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.85rem", fontWeight: 300 }}>
          Follow on Instagram &nbsp;·&nbsp; Contact via WhatsApp
        </p>
        <p style={{ color: "rgba(255,255,255,0.2)", fontSize: "0.75rem", marginTop: "24px", fontWeight: 300 }}>
          © 2026 Kings Wear Clothing. All rights reserved.
        </p>
      </footer>

    </div>
  );
}



