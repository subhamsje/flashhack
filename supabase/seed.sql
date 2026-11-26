-- ==============================================================================
-- FLASHHACK DEMO & SAMPLE WAREHOUSE SEED DATA
-- ==============================================================================

-- Create demo warehouse profile if not exists
DO $$
DECLARE
    demo_user_id UUID := '00000000-0000-0000-0000-000000000001';
    wh_id UUID := '10000000-0000-0000-0000-000000000001';
    sess_id UUID := '20000000-0000-0000-0000-000000000001';
BEGIN
    -- Seed warehouse
    INSERT INTO public.warehouses (id, name, code, description, owner_id, location)
    VALUES (wh_id, 'Primary Logistics Terminal Alpha', 'WH-ALPHA-01', 'High-throughput automated parcel sorting hub', demo_user_id, 'Bay 4, Terminal West')
    ON CONFLICT (id) DO NOTHING;

    -- Seed default active session
    INSERT INTO public.warehouse_sessions (id, warehouse_id, name, status, total_packages, interval_count)
    VALUES (sess_id, wh_id, 'Live Shift: Freight Sorting Batch #409', 'active', 5, 2)
    ON CONFLICT (id) DO NOTHING;

    -- Seed illustrative package arrival sequence: [1, 3, 7, 2, 6]
    INSERT INTO public.package_arrivals (session_id, warehouse_id, package_id, operation_type, execution_time_ns)
    VALUES
        (sess_id, wh_id, 1, 'CREATED', 120),
        (sess_id, wh_id, 3, 'CREATED', 110),
        (sess_id, wh_id, 7, 'CREATED', 115),
        (sess_id, wh_id, 2, 'BRIDGED', 240),
        (sess_id, wh_id, 6, 'EXTENDED_LEFT', 180)
    ON CONFLICT DO NOTHING;

    -- Seed initial interval snapshot [[1, 3], [6, 7]]
    INSERT INTO public.interval_snapshots (session_id, snapshot_version, intervals, tree_metadata)
    VALUES (
        sess_id,
        1,
        '[{"start": 1, "end": 3}, {"start": 6, "end": 7}]'::jsonb,
        '{"node_count": 2, "max_depth": 1, "root_range": [1, 3]}'::jsonb
    )
    ON CONFLICT DO NOTHING;
END $$;
