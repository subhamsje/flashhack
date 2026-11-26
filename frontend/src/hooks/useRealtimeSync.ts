import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../services/supabase';
import { warehouseApi, WAREHOUSE_ID, type Interval, type TreeResponse, type ActivityLog } from '../services/warehouseApi';

export const SHARED_SESSION_ID = WAREHOUSE_ID;

// Stable device fingerprint
const getDeviceId = () => {
  if (typeof window === 'undefined') return 'server';
  let dId = localStorage.getItem('WH_DEVICE_ID');
  if (!dId) {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const platform = isMobile ? 'Mobile' : (navigator.platform.includes('Mac') ? 'MacBook' : 'Desktop');
    const random = Math.floor(1000 + Math.random() * 9000);
    dId = `${platform}-${random}`;
    localStorage.setItem('WH_DEVICE_ID', dId);
  }
  return dId;
};

export type ConnectionState = 'CONNECTED' | 'SYNCING' | 'OFFLINE' | 'RECONNECTING';

export const useRealtimeSync = (onStateSync?: (intervals: Interval[]) => void) => {
  const [connectionState, setConnectionState] = useState<ConnectionState>('CONNECTED');
  const [onlineDevices, setOnlineDevices] = useState<number>(1);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Just now');
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [currentVersion, setCurrentVersion] = useState<number>(1);
  const deviceId = useRef(getDeviceId());

  // Function to log activity to Supabase and broadcast
  const logActivity = useCallback(async (
    action: ActivityLog['action'],
    packageId: number | null,
    metadata: Record<string, any> = {}
  ) => {
    try {
      const { data, error } = await supabase
        .from('warehouse_activity_logs')
        .insert([{
          session_id: SHARED_SESSION_ID,
          action,
          package_id: packageId,
          device_id: deviceId.current,
          user_id: 'operator@warehouse.io',
          metadata
        }])
        .select()
        .single();

      if (!error && data) {
        setActivityLogs((prev) => [data as ActivityLog, ...prev.slice(0, 99)]);
      }
    } catch (e) {
      console.warn('Realtime log note:', e);
    }
  }, []);

  // Authoritative State Reconciliation
  const reconcileAuthoritativeState = useCallback(async () => {
    setConnectionState('SYNCING');
    try {
      const { data } = await supabase
        .from('warehouse_state')
        .select('*')
        .eq('warehouse_id', WAREHOUSE_ID)
        .single();

      if (data && data.received_intervals) {
        setCurrentVersion(data.state_version ?? 1);
        await warehouseApi.reconstructFromCloud();
        if (onStateSync) {
          onStateSync(data.received_intervals as Interval[]);
        }
      }
      setLastSyncTime(new Date().toLocaleTimeString());
      setConnectionState('CONNECTED');
    } catch (e) {
      setConnectionState('OFFLINE');
    }
  }, [onStateSync]);

  // Fetch initial activity logs
  const fetchLogs = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('warehouse_activity_logs')
        .select('*')
        .eq('session_id', SHARED_SESSION_ID)
        .order('created_at', { ascending: false })
        .limit(50);

      if (data) setActivityLogs(data as ActivityLog[]);
    } catch (e) {
      // offline or table creation in progress
    }
  }, []);

  useEffect(() => {
    fetchLogs();
    reconcileAuthoritativeState();

    // Setup Supabase Realtime channel for table changes & presence
    const channel = supabase.channel(`warehouse-${WAREHOUSE_ID}`, {
      config: { presence: { key: deviceId.current } }
    });

    // 1. Listen for Authoritative Warehouse State changes (Instant multi-device sync)
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'warehouse_state',
        filter: `warehouse_id=eq.${WAREHOUSE_ID}`
      },
      async (payload) => {
        const newState = payload.new as any;
        if (newState && newState.received_intervals) {
          // Monotonic state version checking
          if (newState.state_version >= currentVersion) {
            setCurrentVersion(newState.state_version);
            await warehouseApi.reconstructFromCloud();
            if (onStateSync) {
              onStateSync(newState.received_intervals as Interval[]);
            }
            setLastSyncTime(new Date().toLocaleTimeString());
            setConnectionState('CONNECTED');
          }
        }
      }
    );

    // 2. Listen for new activity logs across all devices
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'warehouse_activity_logs',
        filter: `session_id=eq.${SHARED_SESSION_ID}`
      },
      (payload) => {
        const newLog = payload.new as ActivityLog;
        setActivityLogs((prev) => {
          if (prev.some((l) => l.id === newLog.id)) return prev;
          return [newLog, ...prev.slice(0, 99)];
        });
        setLastSyncTime(new Date().toLocaleTimeString());
      }
    );

    // 3. Track Realtime Presence (Device count)
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const count = Object.keys(state).length;
      setOnlineDevices(Math.max(1, count));
    });

    channel.on('presence', { event: 'join' }, () => {
      setConnectionState('CONNECTED');
    });

    channel.on('presence', { event: 'leave' }, () => {
      const state = channel.presenceState();
      setOnlineDevices(Math.max(1, Object.keys(state).length));
    });

    // Subscribe and track presence
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        setConnectionState('CONNECTED');
        await channel.track({
          online_at: new Date().toISOString(),
          device: deviceId.current
        });
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        setConnectionState('RECONNECTING');
      } else if (status === 'CLOSED') {
        setConnectionState('OFFLINE');
      }
    });

    // Online/Offline network event listeners
    const handleOnline = () => {
      reconcileAuthoritativeState();
    };
    const handleOffline = () => {
      setConnectionState('OFFLINE');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      channel.unsubscribe();
    };
  }, [fetchLogs, reconcileAuthoritativeState, currentVersion, onStateSync]);

  return {
    connectionState,
    onlineDevices,
    lastSyncTime,
    currentVersion,
    activityLogs,
    deviceId: deviceId.current,
    logActivity,
    refreshLogs: fetchLogs,
    reconcile: reconcileAuthoritativeState
  };
};
