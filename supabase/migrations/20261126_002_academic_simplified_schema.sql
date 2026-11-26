-- ==============================================================================
-- FLASHHACK — SIMPLIFIED SUPABASE DATABASE SCHEMA
-- Migration: 002_academic_simplified_schema.sql
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. WAREHOUSE SESSIONS
CREATE TABLE IF NOT EXISTS public.warehouse_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    session_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. PACKAGE ARRIVALS
CREATE TABLE IF NOT EXISTS public.package_arrivals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES public.warehouse_sessions(id) ON DELETE CASCADE,
    package_id BIGINT NOT NULL,
    arrival_sequence BIGSERIAL,
    operation_type TEXT NOT NULL CHECK (operation_type IN ('CREATED', 'EXTENDED_LEFT', 'EXTENDED_RIGHT', 'BRIDGED', 'DUPLICATE')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. INTERVAL SNAPSHOTS
CREATE TABLE IF NOT EXISTS public.interval_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES public.warehouse_sessions(id) ON DELETE CASCADE,
    intervals JSONB NOT NULL,
    snapshot_version INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. OPERATION EVENTS
CREATE TABLE IF NOT EXISTS public.operation_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES public.warehouse_sessions(id) ON DELETE CASCADE,
    package_id BIGINT NOT NULL,
    operation_type TEXT NOT NULL,
    previous_intervals JSONB DEFAULT '[]'::jsonb,
    resulting_intervals JSONB DEFAULT '[]'::jsonb,
    explanation TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_simplified_arrivals_session ON public.package_arrivals(session_id, arrival_sequence DESC);
CREATE INDEX IF NOT EXISTS idx_simplified_events_session ON public.operation_events(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_simplified_sessions_user ON public.warehouse_sessions(user_id);

-- Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_arrivals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interval_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operation_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users modify own profile" ON public.profiles FOR ALL USING (auth.uid() = id);

CREATE POLICY "Sessions access policy" ON public.warehouse_sessions FOR ALL
    USING (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "Arrivals access policy" ON public.package_arrivals FOR ALL
    USING (EXISTS (SELECT 1 FROM public.warehouse_sessions s WHERE s.id = package_arrivals.session_id AND (s.user_id IS NULL OR s.user_id = auth.uid())));

CREATE POLICY "Snapshots access policy" ON public.interval_snapshots FOR ALL
    USING (EXISTS (SELECT 1 FROM public.warehouse_sessions s WHERE s.id = interval_snapshots.session_id AND (s.user_id IS NULL OR s.user_id = auth.uid())));

CREATE POLICY "Events access policy" ON public.operation_events FOR ALL
    USING (EXISTS (SELECT 1 FROM public.warehouse_sessions s WHERE s.id = operation_events.session_id AND (s.user_id IS NULL OR s.user_id = auth.uid())));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.package_arrivals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.interval_snapshots;
ALTER PUBLICATION supabase_realtime ADD TABLE public.operation_events;
