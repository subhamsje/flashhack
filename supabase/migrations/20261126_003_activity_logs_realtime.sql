-- ==============================================================================
-- WAREHOUSE — ACTIVITY LOGS & REALTIME PUBLICATION
-- Migration: 003_activity_logs_realtime.sql
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.warehouse_activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES public.warehouse_sessions(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    package_id BIGINT,
    device_id TEXT,
    user_id TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.warehouse_activity_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'warehouse_activity_logs' AND policyname = 'Allow public read warehouse_activity_logs'
    ) THEN
        CREATE POLICY "Allow public read warehouse_activity_logs" ON public.warehouse_activity_logs FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'warehouse_activity_logs' AND policyname = 'Allow public insert warehouse_activity_logs'
    ) THEN
        CREATE POLICY "Allow public insert warehouse_activity_logs" ON public.warehouse_activity_logs FOR INSERT WITH CHECK (true);
    END IF;
END $$;
