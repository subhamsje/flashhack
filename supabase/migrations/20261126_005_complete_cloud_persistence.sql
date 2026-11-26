-- ==============================================================================
-- WAREHOUSE — COMPLETE MULTI-DEVICE PERSISTENCE & RLS SCHEMA
-- Migration: 005_complete_cloud_persistence.sql
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES (Ensure all required columns exist)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    display_name TEXT,
    full_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to automatically create or update profile on auth.users changes
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, display_name, full_name, created_at, updated_at)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        display_name = COALESCE(EXCLUDED.display_name, profiles.display_name),
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 2. WAREHOUSES
CREATE TABLE IF NOT EXISTS public.warehouses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    code TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default warehouse for instant seamless onboarding
INSERT INTO public.warehouses (id, name, code)
VALUES ('5ee5924d-e701-4958-b060-9758a0fd6c13', 'Main Distribution Warehouse', 'WH-MAIN-001')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 3. WAREHOUSE MEMBERS
CREATE TABLE IF NOT EXISTS public.warehouse_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'operator' CHECK (role IN ('owner', 'admin', 'operator', 'viewer')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(warehouse_id, user_id)
);

-- 4. WAREHOUSE STATE (Monotonic revision & authoritative interval snapshot)
CREATE TABLE IF NOT EXISTS public.warehouse_state (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    warehouse_id UUID UNIQUE NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
    state_version BIGINT NOT NULL DEFAULT 1,
    received_intervals JSONB NOT NULL DEFAULT '[]'::jsonb,
    interval_count INT NOT NULL DEFAULT 0,
    total_received INT NOT NULL DEFAULT 0,
    tree_height INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by TEXT
);

-- Initialize warehouse state for default warehouse
INSERT INTO public.warehouse_state (warehouse_id, state_version, received_intervals, interval_count, total_received, tree_height, updated_by)
VALUES ('5ee5924d-e701-4958-b060-9758a0fd6c13', 1, '[]'::jsonb, 0, 0, 0, 'system')
ON CONFLICT (warehouse_id) DO NOTHING;

-- 5. PACKAGES (Durable single item record)
CREATE TABLE IF NOT EXISTS public.packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
    package_id BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    UNIQUE(warehouse_id, package_id)
);

-- 6. OPERATION HISTORY (Authoritative undo/redo, timeline & chronological audit)
CREATE TABLE IF NOT EXISTS public.operation_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
    operation_type TEXT NOT NULL,
    package_id BIGINT,
    operation_status TEXT NOT NULL DEFAULT 'COMMITTED',
    operation_sequence BIGSERIAL,
    state_version BIGINT NOT NULL,
    performed_by TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. OPERATION EVENTS (Granular C engine execution trace steps)
CREATE TABLE IF NOT EXISTS public.operation_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operation_id UUID REFERENCES public.operation_history(id) ON DELETE CASCADE,
    warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    sequence_number INT NOT NULL,
    event_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. WAREHOUSE SETTINGS
CREATE TABLE IF NOT EXISTS public.warehouse_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    warehouse_id UUID UNIQUE NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
    settings JSONB NOT NULL DEFAULT '{"autoRebalance": true, "maxCapacity": 1000000000, "allowDeletions": true}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.warehouse_settings (warehouse_id, settings)
VALUES ('5ee5924d-e701-4958-b060-9758a0fd6c13', '{"autoRebalance": true, "maxCapacity": 1000000000, "allowDeletions": true}'::jsonb)
ON CONFLICT (warehouse_id) DO NOTHING;

-- 9. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_packages_warehouse ON public.packages(warehouse_id, package_id);
CREATE INDEX IF NOT EXISTS idx_op_history_warehouse ON public.operation_history(warehouse_id, state_version DESC);
CREATE INDEX IF NOT EXISTS idx_op_events_op_id ON public.operation_events(operation_id, sequence_number ASC);

-- 10. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_settings ENABLE ROW LEVEL SECURITY;

-- Helper function: check if authenticated user has access to warehouse
CREATE OR REPLACE FUNCTION public.can_access_warehouse(wid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Allow default warehouse for public demonstration & seamless multi-device testing
    IF wid = '5ee5924d-e701-4958-b060-9758a0fd6c13'::uuid THEN
        RETURN TRUE;
    END IF;

    -- If authenticated, check if user is owner or member
    IF auth.uid() IS NOT NULL THEN
        IF EXISTS (SELECT 1 FROM public.warehouses WHERE id = wid AND owner_id = auth.uid()) THEN
            RETURN TRUE;
        END IF;
        IF EXISTS (SELECT 1 FROM public.warehouse_members WHERE warehouse_id = wid AND user_id = auth.uid()) THEN
            RETURN TRUE;
        END IF;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles: Authenticated users can read all profiles; modify own profile
DROP POLICY IF EXISTS "Profiles read policy" ON public.profiles;
CREATE POLICY "Profiles read policy" ON public.profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Profiles update policy" ON public.profiles;
CREATE POLICY "Profiles update policy" ON public.profiles FOR ALL USING (auth.uid() = id);

-- Warehouses: Users can read and update authorized warehouses
DROP POLICY IF EXISTS "Warehouses access policy" ON public.warehouses;
CREATE POLICY "Warehouses access policy" ON public.warehouses FOR ALL
USING (public.can_access_warehouse(id))
WITH CHECK (auth.uid() = owner_id OR id = '5ee5924d-e701-4958-b060-9758a0fd6c13'::uuid);

-- Warehouse Members
DROP POLICY IF EXISTS "Warehouse members policy" ON public.warehouse_members;
CREATE POLICY "Warehouse members policy" ON public.warehouse_members FOR ALL
USING (public.can_access_warehouse(warehouse_id));

-- Warehouse State
DROP POLICY IF EXISTS "Warehouse state policy" ON public.warehouse_state;
CREATE POLICY "Warehouse state policy" ON public.warehouse_state FOR ALL
USING (public.can_access_warehouse(warehouse_id))
WITH CHECK (public.can_access_warehouse(warehouse_id));

-- Packages
DROP POLICY IF EXISTS "Packages policy" ON public.packages;
CREATE POLICY "Packages policy" ON public.packages FOR ALL
USING (public.can_access_warehouse(warehouse_id))
WITH CHECK (public.can_access_warehouse(warehouse_id));

-- Operation History
DROP POLICY IF EXISTS "Operation history policy" ON public.operation_history;
CREATE POLICY "Operation history policy" ON public.operation_history FOR ALL
USING (public.can_access_warehouse(warehouse_id))
WITH CHECK (public.can_access_warehouse(warehouse_id));

-- Operation Events
DROP POLICY IF EXISTS "Operation events policy" ON public.operation_events;
CREATE POLICY "Operation events policy" ON public.operation_events FOR ALL
USING (warehouse_id IS NULL OR public.can_access_warehouse(warehouse_id))
WITH CHECK (warehouse_id IS NULL OR public.can_access_warehouse(warehouse_id));

-- Warehouse Settings
DROP POLICY IF EXISTS "Warehouse settings policy" ON public.warehouse_settings;
CREATE POLICY "Warehouse settings policy" ON public.warehouse_settings FOR ALL
USING (public.can_access_warehouse(warehouse_id))
WITH CHECK (public.can_access_warehouse(warehouse_id));

-- 11. ENABLE REALTIME PUBLICATION FOR REALTIME BROADCASTING
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.warehouses;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.warehouse_state;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.packages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.operation_history;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.warehouse_settings;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
