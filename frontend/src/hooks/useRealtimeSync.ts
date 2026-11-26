import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../services/supabase';
import { warehouseApi, type Interval, type TreeResponse, type ActivityLog } from '../services/warehouseApi';

export const SHARED_SESSION_ID = '5ee5924d-e701-4958-b060-9758a0fd6c13';

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

export const useRealtimeSync = () => {
  const [connectionState, setConnectionState] = useState<ConnectionState>('CONNECTED');
  const [onlineDevices, setOnlineDevices] = useState<number>(1);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Just now');
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
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

    // Setup Supabase Realtime channel for table changes & presence
    const channel = supabase.channel(`warehouse-${SHARED_SESSION_ID}`, {
      config: { presence: { key: deviceId.current } }
    });

    // 1. Listen for new activity logs across all devices
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

    // 2. Track Realtime Presence (Device count)
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

    return () => {
      channel.unsubscribe();
    };
  }, [fetchLogs]);

  return {
    connectionState,
    onlineDevices,
    lastSyncTime,
    activityLogs,
    deviceId: deviceId.current,
    logActivity,
    refreshLogs: fetchLogs
  };
};
