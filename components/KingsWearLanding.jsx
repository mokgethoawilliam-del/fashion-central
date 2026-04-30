import React, { useState, useEffect } from "react";
import { supabase } from "../src/supabaseClient";

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

  return (
    <div style={{ backgroundColor: "#000", color: "#fff", fontFamily: "'Inter', sans-serif", minHeight: "100vh" }}>

      {/* HERO */}
      <section
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          backgroundImage: "url('https://images.unsplash.com/photo-1593030761757-71fae45fa0e7')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div style={{ backgroundColor: "rgba(0,0,0,0.7)", padding: "40px", borderRadius: "8px" }}>
          <h1 style={{ fontSize: "clamp(2.5rem, 8vw, 4.5rem)", fontWeight: "bold", marginBottom: "24px", color: "#C9A646" }}>
            Tailored for Kings
          </h1>
          <p style={{ fontSize: "clamp(1rem, 3vw, 1.25rem)", marginBottom: "32px" }}>
            Premium Bespoke Suits &amp; Styling by King Wiz
          </p>
          <a
            href="#booking"
            style={{
              border: "1px solid #C9A646",
              padding: "12px 32px",
              textDecoration: "none",
              color: "#fff",
              display: "inline-block",
              transition: "background 0.2s, color 0.2s",
            }}
            onMouseEnter={e => { e.target.style.backgroundColor = "#C9A646"; e.target.style.color = "#000"; }}
            onMouseLeave={e => { e.target.style.backgroundColor = "transparent"; e.target.style.color = "#fff"; }}
          >
            Book Your Fitting
          </a>
        </div>
      </section>

      {/* ABOUT */}
      <section style={{ padding: "80px 24px", maxWidth: "1200px", margin: "0 auto", textAlign: "center" }}>
        <h2 style={{ fontSize: "1.875rem", marginBottom: "24px", color: "#C9A646" }}>About Kings Wear</h2>
        <p style={{ color: "#d1d5db", lineHeight: "1.75", maxWidth: "768px", margin: "0 auto" }}>
          Kings Wear Clothing is a premium tailoring brand founded by King Wiz,
          specializing in bespoke suits crafted for men and women who value
          precision, elegance, and status. Each piece is designed to elevate your
          presence and reflect confidence at the highest level.
        </p>
      </section>

      {/* SERVICES */}
      <section style={{ padding: "80px 24px", backgroundColor: "#0a0a0a" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: "1.875rem", marginBottom: "48px", color: "#C9A646" }}>Our Services</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "40px" }}>
            {[
              { title: "Bespoke Suits", desc: "Custom-tailored suits designed to fit your body perfectly." },
              { title: "Wedding Styling", desc: "Stand out on your special day with premium styling." },
              { title: "Image Transformation", desc: "Upgrade your entire look and personal brand." },
            ].map((s) => (
              <div key={s.title}>
                <h3 style={{ fontSize: "1.25rem", marginBottom: "12px" }}>{s.title}</h3>
                <p style={{ color: "#9ca3af" }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* GALLERY */}
      <section style={{ padding: "80px 24px", maxWidth: "1200px", margin: "0 auto" }}>
        <h2 style={{ fontSize: "1.875rem", textAlign: "center", marginBottom: "48px", color: "#C9A646" }}>Gallery</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "24px" }}>
          {[
            "https://images.unsplash.com/photo-1592878904946-b3cd8ae243d0",
            "https://images.unsplash.com/photo-1520975922324-93f8b39d19d6",
            "https://images.unsplash.com/photo-1542060748-10c28b62716b",
          ].map((src, i) => (
            <img
              key={i}
              src={src}
              alt={`Gallery ${i + 1}`}
              style={{ borderRadius: "8px", width: "100%", height: "280px", objectFit: "cover" }}
            />
          ))}
        </div>
      </section>

      {/* WHY CHOOSE US */}
      <section style={{ padding: "80px 24px", backgroundColor: "#0a0a0a", textAlign: "center" }}>
        <h2 style={{ fontSize: "1.875rem", marginBottom: "40px", color: "#C9A646" }}>Why Choose Us</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "40px", maxWidth: "1000px", margin: "0 auto" }}>
          {[
            { title: "Precision Craftsmanship", desc: "Every detail matters." },
            { title: "Premium Fabrics", desc: "Only high-quality materials." },
            { title: "Personalized Experience", desc: "Tailored to your identity." },
          ].map((item) => (
            <div key={item.title}>
              <h3 style={{ fontSize: "1.25rem", marginBottom: "12px" }}>{item.title}</h3>
              <p style={{ color: "#9ca3af" }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* BOOKING */}
      <section id="booking" style={{ padding: "80px 24px", maxWidth: "560px", margin: "0 auto", textAlign: "center" }}>
        <h2 style={{ fontSize: "1.875rem", marginBottom: "24px", color: "#C9A646" }}>Book Your Fitting</h2>

        {submitStatus === "success" ? (
          <div style={{ border: "1px solid #C9A646", padding: "40px", borderRadius: "4px" }}>
            <p style={{ color: "#C9A646", fontSize: "1.25rem", marginBottom: "12px" }}>✓ Booking Submitted!</p>
            <p style={{ color: "#9ca3af" }}>King Wiz will be in touch shortly to confirm your fitting.</p>
            <button
              onClick={() => setSubmitStatus("idle")}
              style={{ marginTop: "24px", border: "1px solid #C9A646", padding: "10px 24px", background: "transparent", color: "#C9A646", cursor: "pointer" }}
            >
              Book Another
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <input
              required
              type="text"
              placeholder="Full Name"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              style={{ width: "100%", padding: "12px", backgroundColor: "#000", border: "1px solid #374151", color: "#fff", outline: "none", boxSizing: "border-box" }}
            />
            <input
              required
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              style={{ width: "100%", padding: "12px", backgroundColor: "#000", border: "1px solid #374151", color: "#fff", outline: "none", boxSizing: "border-box" }}
            />
            <input
              required
              type="tel"
              placeholder="Phone Number"
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
              style={{ width: "100%", padding: "12px", backgroundColor: "#000", border: "1px solid #374151", color: "#fff", outline: "none", boxSizing: "border-box" }}
            />
            <textarea
              rows={4}
              placeholder="What do you need?"
              value={formData.message}
              onChange={e => setFormData({ ...formData, message: e.target.value })}
              style={{ width: "100%", padding: "12px", backgroundColor: "#000", border: "1px solid #374151", color: "#fff", outline: "none", resize: "vertical", boxSizing: "border-box" }}
            />

            {submitStatus === "error" && (
              <p style={{ color: "#ef4444", fontSize: "0.875rem" }}>Something went wrong. Please try again.</p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              style={{ width: "100%", backgroundColor: "#C9A646", color: "#000", padding: "12px", border: "none", cursor: "pointer", fontSize: "1rem", fontWeight: "bold", opacity: isSubmitting ? 0.6 : 1 }}
            >
              {isSubmitting ? "Submitting..." : "Submit Booking"}
            </button>
          </form>
        )}

        <p style={{ color: "#9ca3af", marginTop: "24px" }}>
          Or message directly on WhatsApp
        </p>
      </section>

      {/* FOOTER */}
      <footer style={{ padding: "40px 24px", textAlign: "center", color: "#6b7280" }}>
        <p>Kings Wear Clothing © 2026</p>
        <p>Follow on Instagram | Contact via WhatsApp</p>
      </footer>

    </div>
  );
}
