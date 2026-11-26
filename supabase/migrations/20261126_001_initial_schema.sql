-- ==============================================================================
-- FLASHHACK WAREHOUSE OPERATIONS DATABASE SCHEMA
-- Migration: 001_initial_schema.sql
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    avatar_url TEXT,
    role TEXT DEFAULT 'operator',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. WAREHOUSES
CREATE TABLE IF NOT EXISTS public.warehouses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    description TEXT,
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    location TEXT DEFAULT 'Hub Central',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. WAREHOUSE MEMBERS
CREATE TABLE IF NOT EXISTS public.warehouse_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'operator', 'viewer')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(warehouse_id, user_id)
);

-- 4. WAREHOUSE SESSIONS
CREATE TABLE IF NOT EXISTS public.warehouse_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'archived')),
    total_packages BIGINT DEFAULT 0,
    interval_count BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. PACKAGE ARRIVALS
CREATE TABLE IF NOT EXISTS public.package_arrivals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES public.warehouse_sessions(id) ON DELETE CASCADE,
    package_id BIGINT NOT NULL,
    arrival_sequence BIGSERIAL,
    operation_type TEXT NOT NULL CHECK (operation_type IN ('CREATED', 'EXTENDED_LEFT', 'EXTENDED_RIGHT', 'BRIDGED', 'DUPLICATE')),
    execution_time_ns BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. INTERVAL SNAPSHOTS
CREATE TABLE IF NOT EXISTS public.interval_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES public.warehouse_sessions(id) ON DELETE CASCADE,
    snapshot_version INT NOT NULL,
    intervals JSONB NOT NULL,
    tree_metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. OPERATION EVENTS (Audit Trail & Timeline)
CREATE TABLE IF NOT EXISTS public.operation_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES public.warehouse_sessions(id) ON DELETE CASCADE,
    package_id BIGINT NOT NULL,
    operation_type TEXT NOT NULL,
    previous_state JSONB DEFAULT '[]'::jsonb,
    resulting_state JSONB DEFAULT '[]'::jsonb,
    operation_details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. BENCHMARK RESULTS
CREATE TABLE IF NOT EXISTS public.benchmark_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES public.warehouse_sessions(id) ON DELETE SET NULL,
    dataset_size INT NOT NULL,
    dataset_type TEXT NOT NULL,
    execution_time_ms DOUBLE PRECISION NOT NULL,
    avg_insertion_time_ns DOUBLE PRECISION NOT NULL,
    memory_usage_bytes BIGINT NOT NULL,
    tree_height INT NOT NULL,
    interval_count INT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. IMPORT JOBS
CREATE TABLE IF NOT EXISTS public.import_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    total_records INT DEFAULT 0,
    successful_records INT DEFAULT 0,
    rejected_records INT DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. USER PREFERENCES
CREATE TABLE IF NOT EXISTS public.user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    theme TEXT DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'system')),
    animation_settings JSONB DEFAULT '{"reduce_motion": false, "speed": 1.0}'::jsonb,
    dashboard_preferences JSONB DEFAULT '{"density": "comfortable", "default_range": 1000}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- INDEXES FOR HIGH-THROUGHPUT SEARCH & TIMELINE RETRIEVAL
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_arrivals_session ON public.package_arrivals(session_id, arrival_sequence DESC);
CREATE INDEX IF NOT EXISTS idx_arrivals_pkg_id ON public.package_arrivals(session_id, package_id);
CREATE INDEX IF NOT EXISTS idx_events_session ON public.operation_events(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_warehouse ON public.warehouse_sessions(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_members_user ON public.warehouse_members(user_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Multi-tenant isolation per organization / warehouse membership
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_arrivals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interval_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.benchmark_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read all members in their warehouses, and update their own profile
CREATE POLICY "Users can read profiles" ON public.profiles
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Warehouses: Only members or owners can access warehouse data
CREATE POLICY "Warehouse membership read" ON public.warehouses
    FOR SELECT TO authenticated
    USING (
        owner_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.warehouse_members
            WHERE warehouse_id = warehouses.id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Warehouse owner modify" ON public.warehouses
    FOR ALL TO authenticated
    USING (owner_id = auth.uid());

-- Warehouse Members: Only owners/admins can manage members
CREATE POLICY "Members can view membership" ON public.warehouse_members
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.warehouse_members wm
            WHERE wm.warehouse_id = warehouse_members.warehouse_id AND wm.user_id = auth.uid()
        )
    );

-- Sessions: Access scoped to warehouse members
CREATE POLICY "Session access scoped to members" ON public.warehouse_sessions
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.warehouse_members
            WHERE warehouse_id = warehouse_sessions.warehouse_id AND user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM public.warehouses
            WHERE id = warehouse_sessions.warehouse_id AND owner_id = auth.uid()
        )
    );

-- Arrivals & Events: Scoped through warehouse session
CREATE POLICY "Arrivals scoped to warehouse session" ON public.package_arrivals
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.warehouse_sessions s
            JOIN public.warehouses w ON s.warehouse_id = w.id
            LEFT JOIN public.warehouse_members m ON m.warehouse_id = w.id
            WHERE s.id = package_arrivals.session_id AND (w.owner_id = auth.uid() OR m.user_id = auth.uid())
        )
    );

CREATE POLICY "Snapshots scoped to warehouse session" ON public.interval_snapshots
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.warehouse_sessions s
            JOIN public.warehouses w ON s.warehouse_id = w.id
            LEFT JOIN public.warehouse_members m ON m.warehouse_id = w.id
            WHERE s.id = interval_snapshots.session_id AND (w.owner_id = auth.uid() OR m.user_id = auth.uid())
        )
    );

CREATE POLICY "Events scoped to warehouse session" ON public.operation_events
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.warehouse_sessions s
            JOIN public.warehouses w ON s.warehouse_id = w.id
            LEFT JOIN public.warehouse_members m ON m.warehouse_id = w.id
            WHERE s.id = operation_events.session_id AND (w.owner_id = auth.uid() OR m.user_id = auth.uid())
        )
    );

-- User Preferences: Private to the authenticated user
CREATE POLICY "User preferences private" ON public.user_preferences
    FOR ALL TO authenticated
    USING (user_id = auth.uid());

-- Realtime Publications
ALTER PUBLICATION supabase_realtime ADD TABLE public.package_arrivals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.warehouse_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.interval_snapshots;
ALTER PUBLICATION supabase_realtime ADD TABLE public.operation_events;
