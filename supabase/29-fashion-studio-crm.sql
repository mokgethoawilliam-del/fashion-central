-- ============================================================
-- Fashion Central studio CRM foundation
-- Appointments, client profiles, measurements, fitting dates,
-- payment status, and internal client notes.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.stylist_clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    instagram_handle TEXT,
    preferred_contact_method TEXT DEFAULT 'whatsapp',
    payment_status TEXT NOT NULL DEFAULT 'inquiry',
    status TEXT NOT NULL DEFAULT 'lead',
    source TEXT DEFAULT 'direct',
    measurements JSONB NOT NULL DEFAULT '{}'::jsonb,
    notes TEXT,
    last_appointment_at TIMESTAMPTZ,
    last_order_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT stylist_clients_status_check CHECK (status IN ('lead', 'active', 'vip', 'archived')),
    CONSTRAINT stylist_clients_payment_status_check CHECK (payment_status IN ('inquiry', 'quote_sent', 'deposit_pending', 'deposit_paid', 'balance_pending', 'paid', 'overdue', 'cancelled')),
    CONSTRAINT stylist_clients_contact_method_check CHECK (preferred_contact_method IN ('whatsapp', 'call', 'email', 'instagram'))
);

CREATE INDEX IF NOT EXISTS stylist_clients_vendor_idx ON public.stylist_clients(vendor_id);
CREATE INDEX IF NOT EXISTS stylist_clients_vendor_phone_idx ON public.stylist_clients(vendor_id, phone);
CREATE INDEX IF NOT EXISTS stylist_clients_vendor_email_idx ON public.stylist_clients(vendor_id, email);

CREATE TABLE IF NOT EXISTS public.stylist_appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.stylist_clients(id) ON DELETE SET NULL,
    appointment_type TEXT NOT NULL DEFAULT 'consultation',
    status TEXT NOT NULL DEFAULT 'pending',
    appointment_date DATE NOT NULL,
    appointment_time TEXT,
    fitting_date DATE,
    fitting_time TEXT,
    look_type TEXT,
    garment_type TEXT,
    budget_range TEXT,
    payment_status TEXT NOT NULL DEFAULT 'inquiry',
    deposit_amount NUMERIC(10,2) DEFAULT 0,
    balance_amount NUMERIC(10,2) DEFAULT 0,
    contact_name TEXT NOT NULL,
    contact_phone TEXT NOT NULL,
    contact_email TEXT,
    special_requests TEXT,
    internal_notes TEXT,
    source TEXT DEFAULT 'landing_page',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT stylist_appointments_type_check CHECK (appointment_type IN ('consultation', 'measurement', 'fitting', 'pickup', 'delivery', 'style_session')),
    CONSTRAINT stylist_appointments_status_check CHECK (status IN ('pending', 'confirmed', 'in_progress', 'fitted', 'ready', 'completed', 'cancelled')),
    CONSTRAINT stylist_appointments_payment_status_check CHECK (payment_status IN ('inquiry', 'quote_sent', 'deposit_pending', 'deposit_paid', 'balance_pending', 'paid', 'overdue', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS stylist_appointments_vendor_idx ON public.stylist_appointments(vendor_id);
CREATE INDEX IF NOT EXISTS stylist_appointments_vendor_date_idx ON public.stylist_appointments(vendor_id, appointment_date);
CREATE INDEX IF NOT EXISTS stylist_appointments_client_idx ON public.stylist_appointments(client_id);

ALTER TABLE public.stylist_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stylist_appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public insert stylist clients" ON public.stylist_clients;
CREATE POLICY "Public insert stylist clients"
ON public.stylist_clients
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Public insert stylist appointments" ON public.stylist_appointments;
CREATE POLICY "Public insert stylist appointments"
ON public.stylist_appointments
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Vendor admins manage stylist clients" ON public.stylist_clients;
CREATE POLICY "Vendor admins manage stylist clients"
ON public.stylist_clients
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.vendor_id = public.stylist_clients.vendor_id
          AND p.role IN ('owner', 'admin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.vendor_id = public.stylist_clients.vendor_id
          AND p.role IN ('owner', 'admin')
    )
);

DROP POLICY IF EXISTS "Vendor admins manage stylist appointments" ON public.stylist_appointments;
CREATE POLICY "Vendor admins manage stylist appointments"
ON public.stylist_appointments
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.vendor_id = public.stylist_appointments.vendor_id
          AND p.role IN ('owner', 'admin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.vendor_id = public.stylist_appointments.vendor_id
          AND p.role IN ('owner', 'admin')
    )
);

CREATE OR REPLACE FUNCTION public.sync_updated_at_generic()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_stylist_clients_updated_at ON public.stylist_clients;
CREATE TRIGGER set_stylist_clients_updated_at
BEFORE UPDATE ON public.stylist_clients
FOR EACH ROW
EXECUTE FUNCTION public.sync_updated_at_generic();

DROP TRIGGER IF EXISTS set_stylist_appointments_updated_at ON public.stylist_appointments;
CREATE TRIGGER set_stylist_appointments_updated_at
BEFORE UPDATE ON public.stylist_appointments
FOR EACH ROW
EXECUTE FUNCTION public.sync_updated_at_generic();

NOTIFY pgrst, 'reload schema';
