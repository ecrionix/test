-- ==============================================================================
-- SUPABASE POSTGRESQL SCHEMA WITH ROW LEVEL SECURITY (RLS)
-- Sri Murugan Daily Fresh Grocery Store - Tiruppur, Tamil Nadu
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    tamil_name TEXT,
    icon TEXT,
    image_url TEXT,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Products Table
CREATE TABLE IF NOT EXISTS public.products (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    tamil_name TEXT,
    category_id BIGINT REFERENCES public.categories(id) ON DELETE SET NULL,
    price NUMERIC(10, 2) NOT NULL,
    offer_price NUMERIC(10, 2),
    unit TEXT DEFAULT '1 kg',
    image_url TEXT,
    description TEXT,
    is_available BOOLEAN DEFAULT TRUE,
    is_published BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    badge_text TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Offers & Promotions Table
CREATE TABLE IF NOT EXISTS public.offers (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    banner_url TEXT,
    discount_tag TEXT,
    code TEXT,
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Shop Settings Table
CREATE TABLE IF NOT EXISTS public.shop_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Homepage Content Settings Table
CREATE TABLE IF NOT EXISTS public.homepage_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
    id BIGSERIAL PRIMARY KEY,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    delivery_address TEXT,
    items_json JSONB NOT NULL,
    total_amount NUMERIC(10, 2) NOT NULL,
    payment_method TEXT DEFAULT 'Cash on Delivery',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'out_for_delivery', 'delivered', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- 1. Public Read Policies (Allow unauthenticated visitors to view active content)
CREATE POLICY "Public can view active categories"
    ON public.categories FOR SELECT
    USING (is_active = TRUE);

CREATE POLICY "Public can view published products"
    ON public.products FOR SELECT
    USING (is_published = TRUE);

CREATE POLICY "Public can view active offers"
    ON public.offers FOR SELECT
    USING (is_active = TRUE);

CREATE POLICY "Public can view shop settings"
    ON public.shop_settings FOR SELECT
    USING (TRUE);

CREATE POLICY "Public can view homepage settings"
    ON public.homepage_settings FOR SELECT
    USING (TRUE);

CREATE POLICY "Public can submit orders"
    ON public.orders FOR INSERT
    WITH CHECK (TRUE);

-- 2. Authenticated Admin Full Management Policies
-- Only authenticated users (shop owners logged in via Supabase Auth) have full permissions
CREATE POLICY "Admins have full access to categories"
    ON public.categories FOR ALL
    TO authenticated
    USING (TRUE)
    WITH CHECK (TRUE);

CREATE POLICY "Admins have full access to products"
    ON public.products FOR ALL
    TO authenticated
    USING (TRUE)
    WITH CHECK (TRUE);

CREATE POLICY "Admins have full access to offers"
    ON public.offers FOR ALL
    TO authenticated
    USING (TRUE)
    WITH CHECK (TRUE);

CREATE POLICY "Admins have full access to shop settings"
    ON public.shop_settings FOR ALL
    TO authenticated
    USING (TRUE)
    WITH CHECK (TRUE);

CREATE POLICY "Admins have full access to homepage settings"
    ON public.homepage_settings FOR ALL
    TO authenticated
    USING (TRUE)
    WITH CHECK (TRUE);

CREATE POLICY "Admins have full access to orders"
    ON public.orders FOR ALL
    TO authenticated
    USING (TRUE)
    WITH CHECK (TRUE);

-- ==============================================================================
-- STORAGE BUCKETS (Product and Promo Images)
-- ==============================================================================
-- INSERT INTO storage.buckets (id, name, public) VALUES ('grocery-images', 'grocery-images', TRUE);
-- CREATE POLICY "Public can view grocery images" ON storage.objects FOR SELECT USING (bucket_id = 'grocery-images');
-- CREATE POLICY "Admins can upload grocery images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'grocery-images');
-- CREATE POLICY "Admins can update grocery images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'grocery-images');
-- CREATE POLICY "Admins can delete grocery images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'grocery-images');
