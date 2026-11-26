-- ==============================================================================
-- WAREHOUSE — ADVANCED FEATURES SCHEMA
-- Migration: 004_advanced_features.sql
-- ==============================================================================

-- 1. Tree Snapshots for Time-Travel Historical Replay
CREATE TABLE IF NOT EXISTS public.tree_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES public.warehouse_sessions(id) ON DELETE CASCADE,
    operation_id UUID,
    package_id BIGINT,
    operation_type TEXT NOT NULL,
    intervals JSONB NOT NULL DEFAULT '[]'::jsonb,
    gaps JSONB NOT NULL DEFAULT '[]'::jsonb,
    tree_nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
    node_count INT NOT NULL DEFAULT 0,
    tree_height INT NOT NULL DEFAULT 0,
    total_packages INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Bulk Import Jobs & Records
CREATE TABLE IF NOT EXISTS public.bulk_import_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES public.warehouse_sessions(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    total_records INT NOT NULL DEFAULT 0,
    valid_records INT NOT NULL DEFAULT 0,
    duplicates_skipped INT NOT NULL DEFAULT 0,
    invalid_records INT NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'COMPLETED',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Row Level Security Policies
ALTER TABLE public.tree_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulk_import_jobs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'tree_snapshots' AND policyname = 'Allow public read tree_snapshots'
    ) THEN
        CREATE POLICY "Allow public read tree_snapshots" ON public.tree_snapshots FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'tree_snapshots' AND policyname = 'Allow public insert tree_snapshots'
    ) THEN
        CREATE POLICY "Allow public insert tree_snapshots" ON public.tree_snapshots FOR INSERT WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'bulk_import_jobs' AND policyname = 'Allow public read bulk_import_jobs'
    ) THEN
        CREATE POLICY "Allow public read bulk_import_jobs" ON public.bulk_import_jobs FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'bulk_import_jobs' AND policyname = 'Allow public insert bulk_import_jobs'
    ) THEN
        CREATE POLICY "Allow public insert bulk_import_jobs" ON public.bulk_import_jobs FOR INSERT WITH CHECK (true);
    END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.tree_snapshots;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bulk_import_jobs;
