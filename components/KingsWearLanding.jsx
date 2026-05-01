import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../src/supabaseClient";

/* ─── Luxury Header ─── */
function LuxuryHeader() {
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
  };

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
    color: scrolled ? "#C9A646" : "#fff",
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
    border: "1px solid #C9A646",
    padding: "10px 26px",
    color: "#C9A646",
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
    background: scrolled ? "#C9A646" : "#fff",
    transition: "all 0.35s ease",
    transformOrigin: "center",
  };

  return (
    <>
      <header style={headerStyle}>
        {/* Logo */}
        <a href="#hero" onClick={(e) => handleNavClick(e, "#hero")} style={logoStyle}>
          Kings Wear
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
              onMouseEnter={(e) => { e.target.style.color = "#C9A646"; e.target.style.borderBottomColor = "#C9A646"; }}
              onMouseLeave={(e) => { e.target.style.color = "#fff"; e.target.style.borderBottomColor = "transparent"; }}
            >
              {link.label}
            </a>
          ))}
          <a
            href="#booking"
            onClick={(e) => handleNavClick(e, "#booking")}
            style={ctaStyle}
            onMouseEnter={(e) => { e.target.style.background = "#C9A646"; e.target.style.color = "#000"; }}
            onMouseLeave={(e) => { e.target.style.background = "transparent"; e.target.style.color = "#C9A646"; }}
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
            onMouseEnter={(e) => { e.target.style.color = "#C9A646"; }}
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
          onMouseEnter={(e) => { e.target.style.background = "#C9A646"; e.target.style.color = "#000"; }}
          onMouseLeave={(e) => { e.target.style.background = "transparent"; e.target.style.color = "#C9A646"; }}
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

/* ─── Main Landing Page ─── */
export default function KingsWearLanding() {
  const [vendorId, setVendorId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState("idle"); // idle | success | error

  useEffect(() => {
    async function init() {
      const { data } = await supabase
        .from("vendors")
        .select("id")
        .or("subdomain_slug.eq.kingswear,subdomain_slug.eq.kings-wear,name.ilike.%kings%wear%")
        .limit(1)
        .single();
      if (data) {
        setVendorId(data.id);
      } else {
        const { data: anyVendor } = await supabase.from("vendors").select("id").limit(1).single();
        if (anyVendor) setVendorId(anyVendor.id);
      }
    }
    init();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!vendorId) { setSubmitStatus("error"); return; }
    setIsSubmitting(true);
    setSubmitStatus("idle");

    try {
      const orderNumber = "KW-" + Math.floor(100000 + Math.random() * 900000);
      const { data: order, error } = await supabase
        .from("orders")
        .insert([{
          vendor_id: vendorId,
          order_number: orderNumber,
          customer_name: formData.name,
          customer_phone: formData.phone,
          customer_email: formData.email,
          status: "paid",
          total_price: 0,
          fulfillment_method: "collection",
          source: "Kings Wear Landing Page",
        }])
        .select()
        .single();

      if (error) throw error;

      await supabase.from("order_items").insert([{
        order_id: order.id,
        quantity: 1,
        unit_price: 0,
        modifiers_json: { custom_notes: formData.message },
      }]);

      setSubmitStatus("success");
      setFormData({ name: "", email: "", phone: "", message: "" });
    } catch (err) {
      console.error("Booking Error:", err);
      setSubmitStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  /* Shared section heading style */
  const sectionHeading = {
    fontSize: "0.75rem",
    fontWeight: 600,
    letterSpacing: "0.3em",
    textTransform: "uppercase",
    color: "#C9A646",
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

  return (
    <div style={{ backgroundColor: "#000", color: "#fff", fontFamily: "'Inter', sans-serif", minHeight: "100vh" }}>

      <LuxuryHeader />

      {/* HERO */}
      <section
        id="hero"
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          backgroundImage: "linear-gradient(to bottom, rgba(0,0,0,0.15), rgba(0,0,0,0.7)), url('https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?w=1920&q=80')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          position: "relative",
        }}
      >
        <div style={{ maxWidth: "700px", padding: "0 24px" }}>
          <p style={{
            fontSize: "0.75rem",
            letterSpacing: "0.4em",
            textTransform: "uppercase",
            color: "#C9A646",
            marginBottom: "24px",
            fontWeight: 500,
          }}>
            Premium Bespoke Tailoring
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
            Tailored for{" "}
            <span style={{ color: "#C9A646", fontWeight: 600 }}>Kings</span>
          </h1>
          <p style={{
            fontSize: "clamp(0.95rem, 2.5vw, 1.15rem)",
            marginBottom: "40px",
            color: "rgba(255,255,255,0.7)",
            lineHeight: 1.7,
            fontWeight: 300,
          }}>
            Bespoke suits &amp; styling crafted with precision by King Wiz
          </p>
          <a
            href="#booking"
            onClick={(e) => {
              e.preventDefault();
              document.querySelector("#booking")?.scrollIntoView({ behavior: "smooth" });
            }}
            style={{
              border: "1px solid #C9A646",
              padding: "16px 48px",
              textDecoration: "none",
              color: "#C9A646",
              display: "inline-block",
              fontSize: "0.8rem",
              fontWeight: 600,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              transition: "all 0.3s ease",
            }}
            onMouseEnter={e => { e.target.style.backgroundColor = "#C9A646"; e.target.style.color = "#000"; }}
            onMouseLeave={e => { e.target.style.backgroundColor = "transparent"; e.target.style.color = "#C9A646"; }}
          >
            Book Your Fitting
          </a>
        </div>
      </section>

      {/* ABOUT */}
      <section style={{ padding: "100px 24px", maxWidth: "900px", margin: "0 auto", textAlign: "center" }}>
        <p style={sectionHeading}>Our Story</p>
        <h2 style={sectionTitle}>About Kings Wear</h2>
        <p style={{ color: "rgba(255,255,255,0.6)", lineHeight: 1.9, maxWidth: "680px", margin: "0 auto", fontSize: "1rem", fontWeight: 300 }}>
          Kings Wear Clothing is a premium tailoring brand founded by King Wiz,
          specializing in bespoke suits crafted for men and women who value
          precision, elegance, and status. Each piece is designed to elevate your
          presence and reflect confidence at the highest level.
        </p>
      </section>

      {/* Divider */}
      <div style={{ maxWidth: "120px", height: "1px", background: "rgba(201,166,70,0.3)", margin: "0 auto" }} />

      {/* SERVICES */}
      <section id="services" style={{ padding: "100px 24px" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", textAlign: "center" }}>
          <p style={sectionHeading}>What We Offer</p>
          <h2 style={sectionTitle}>Our Services</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "48px", marginTop: "56px" }}>
            {[
              { title: "Bespoke Suits", desc: "Custom-tailored suits designed to fit your body with absolute precision and elegance." },
              { title: "Wedding Styling", desc: "Stand out on your special day with premium, unforgettable styling." },
              { title: "Image Transformation", desc: "Upgrade your entire look and elevate your personal brand to new heights." },
            ].map((s) => (
              <div key={s.title} style={{ padding: "40px 28px", border: "1px solid rgba(255,255,255,0.06)", transition: "border-color 0.3s ease" }}>
                <h3 style={{ fontSize: "1.1rem", marginBottom: "16px", fontWeight: 400, letterSpacing: "0.08em", fontFamily: "'Outfit', sans-serif" }}>{s.title}</h3>
                <p style={{ color: "rgba(255,255,255,0.5)", lineHeight: 1.7, fontSize: "0.9rem", fontWeight: 300 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* GALLERY */}
      <section id="gallery" style={{ padding: "100px 24px", maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "56px" }}>
          <p style={sectionHeading}>Portfolio</p>
          <h2 style={sectionTitle}>Gallery</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
          {[
            "https://images.unsplash.com/photo-1592878904946-b3cd8ae243d0?w=600&q=80",
            "https://images.unsplash.com/photo-1520975922324-93f8b39d19d6?w=600&q=80",
            "https://images.unsplash.com/photo-1542060748-10c28b62716b?w=600&q=80",
          ].map((src, i) => (
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
          {[
            { title: "Precision Craftsmanship", desc: "Every stitch, every detail — perfected." },
            { title: "Premium Fabrics", desc: "Only the finest materials sourced worldwide." },
            { title: "Personalized Experience", desc: "Tailored to your identity and vision." },
          ].map((item) => (
            <div key={item.title}>
              <h3 style={{ fontSize: "1.05rem", marginBottom: "12px", fontWeight: 400, letterSpacing: "0.06em", fontFamily: "'Outfit', sans-serif" }}>{item.title}</h3>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.9rem", fontWeight: 300, lineHeight: 1.7 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Divider */}
      <div style={{ maxWidth: "120px", height: "1px", background: "rgba(201,166,70,0.3)", margin: "0 auto" }} />

      {/* BOOKING */}
      <section id="booking" style={{ padding: "100px 24px", maxWidth: "520px", margin: "0 auto", textAlign: "center" }}>
        <p style={sectionHeading}>Appointments</p>
        <h2 style={sectionTitle}>Book Your Fitting</h2>

        {submitStatus === "success" ? (
          <div style={{ border: "1px solid rgba(201,166,70,0.3)", padding: "48px 32px" }}>
            <p style={{ color: "#C9A646", fontSize: "1.1rem", marginBottom: "12px", letterSpacing: "0.1em" }}>✓ Booking Submitted</p>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.9rem", fontWeight: 300 }}>King Wiz will be in touch shortly to confirm your fitting.</p>
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
              required type="email" placeholder="Email"
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
            <textarea
              rows={4} placeholder="What do you need?"
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
              {isSubmitting ? "Submitting..." : "Submit Booking"}
            </button>
          </form>
        )}

        <p style={{ color: "rgba(255,255,255,0.4)", marginTop: "28px", fontSize: "0.85rem", fontWeight: 300 }}>
          Or message directly on WhatsApp
        </p>
      </section>

      {/* FOOTER */}
      <footer id="contact" style={{
        padding: "60px 24px 40px",
        textAlign: "center",
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}>
        <p style={{ color: "#C9A646", fontSize: "0.75rem", letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: "16px", fontWeight: 500 }}>
          Kings Wear Clothing
        </p>
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
