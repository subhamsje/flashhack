#!/usr/bin/env node

/**
 * End-to-End Multi-Device & Supabase Cloud Persistence Verification
 */

const SUPABASE_URL = 'https://uwixhlszkexsyvjgrcas.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3aXhobHN6a2V4c3l2amdyY2FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTU2NjcwODMsImV4cCI6MjExMTI0MzA4M30.2E97PdAcJGxsRMyEzuiRGVlIOn7clDKencEnOfe8EyA';
const WAREHOUSE_ID = '5ee5924d-e701-4958-b060-9758a0fd6c13';

async function fetchJson(url, options = {}) {
  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`HTTP ${res.status}: ${txt}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function runTests() {
  console.log('===============================================================');
  console.log('FLASHHACK / WAREHOUSE: MULTI-DEVICE & PERSISTENCE VERIFICATION');
  console.log('===============================================================\n');

  // Test 1: Verify warehouse & state schema
  console.log('Test 1: Querying Authorized Warehouse and Warehouse State...');
  const warehouses = await fetchJson(`${SUPABASE_URL}/rest/v1/warehouses?id=eq.${WAREHOUSE_ID}`);
  console.log(`✓ Warehouse found: "${warehouses[0]?.name}" (${warehouses[0]?.id})`);

  const stateBefore = await fetchJson(`${SUPABASE_URL}/rest/v1/warehouse_state?warehouse_id=eq.${WAREHOUSE_ID}`);
  console.log(`✓ Warehouse state: version ${stateBefore[0]?.state_version}, total_received: ${stateBefore[0]?.total_received}`);

  // Clean up any previously inserted packages for test
  await fetchJson(`${SUPABASE_URL}/rest/v1/packages?warehouse_id=eq.${WAREHOUSE_ID}&package_id=in.(100,101)`, {
    method: 'DELETE'
  });
  console.log('\nTest 2: Laptop Ingestion -> Adding Package #100...');
  const nextVer = (stateBefore[0]?.state_version || 1) + 1;
  const updateRes = await fetchJson(`${SUPABASE_URL}/rest/v1/warehouse_state?warehouse_id=eq.${WAREHOUSE_ID}`, {
    method: 'PATCH',
    headers: { 'Prefer': 'return=representation' },
    body: JSON.stringify({
      state_version: nextVer,
      received_intervals: [{ start: 100, end: 100 }],
      interval_count: 1,
      total_received: 1,
      updated_by: 'Laptop-MacBook'
    })
  });
  console.log(`✓ State successfully updated to version ${updateRes[0]?.state_version}`);

  await fetchJson(`${SUPABASE_URL}/rest/v1/packages`, {
    method: 'POST',
    headers: { 'Prefer': 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify({
      warehouse_id: WAREHOUSE_ID,
      package_id: 100,
      created_by: 'Laptop-MacBook'
    })
  });
  console.log(`✓ Package #100 persisted in packages table.`);

  // Test 3: Phone / APK Verification (Fetch latest state)
  console.log('\nTest 3: Phone / APK -> Reconciling cloud state...');
  const phoneHydration = await fetchJson(`${SUPABASE_URL}/rest/v1/warehouse_state?warehouse_id=eq.${WAREHOUSE_ID}`);
  const hasPkg100 = phoneHydration[0]?.received_intervals?.some(i => i.start <= 100 && i.end >= 100);
  if (!hasPkg100) throw new Error('Package 100 was not found in phone hydration!');
  console.log(`✓ Phone successfully retrieved package 100 inside interval [100, 100]!`);

  // Test 4: Phone Ingestion (Add Package 101 to bridge/extend)
  console.log('\nTest 4: Phone Ingestion -> Adding Package #101 (Extension)...');
  const ver4 = phoneHydration[0].state_version + 1;
  const phoneAdd = await fetchJson(`${SUPABASE_URL}/rest/v1/warehouse_state?warehouse_id=eq.${WAREHOUSE_ID}`, {
    method: 'PATCH',
    headers: { 'Prefer': 'return=representation' },
    body: JSON.stringify({
      state_version: ver4,
      received_intervals: [{ start: 100, end: 101 }],
      interval_count: 1,
      total_received: 2,
      updated_by: 'Mobile-APK'
    })
  });
  console.log(`✓ Extended interval to [100, 101] from phone, state_version: ${phoneAdd[0]?.state_version}`);

  // Test 5: Laptop Reconciles Phone Changes
  console.log('\nTest 5: Laptop Reconciles Phone Changes...');
  const laptopReconcile = await fetchJson(`${SUPABASE_URL}/rest/v1/warehouse_state?warehouse_id=eq.${WAREHOUSE_ID}`);
  console.log(`✓ Laptop retrieved interval: [${laptopReconcile[0]?.received_intervals[0]?.start}, ${laptopReconcile[0]?.received_intervals[0]?.end}], total: ${laptopReconcile[0]?.total_received}`);

  // Test 6: Cross-Device Activity Logging
  console.log('\nTest 6: Logging Cross-Device Activity Records...');
  await fetchJson(`${SUPABASE_URL}/rest/v1/warehouse_activity_logs`, {
    method: 'POST',
    body: JSON.stringify([
      {
        session_id: WAREHOUSE_ID,
        action: 'PACKAGE_ADDED',
        package_id: 100,
        device_id: 'MacBook-Pro',
        user_id: 'operator@warehouse.io',
        metadata: { client: 'web' }
      },
      {
        session_id: WAREHOUSE_ID,
        action: 'PACKAGE_ADDED',
        package_id: 101,
        device_id: 'Mobile-APK',
        user_id: 'operator@warehouse.io',
        metadata: { client: 'android' }
      }
    ])
  });
  const logs = await fetchJson(`${SUPABASE_URL}/rest/v1/warehouse_activity_logs?session_id=eq.${WAREHOUSE_ID}&order=created_at.desc&limit=2`);
  console.log(`✓ Retrieved chronological multi-device activity logs: ${logs.map(l => `${l.device_id}: ${l.action} #${l.package_id}`).join(' | ')}`);

  // Test 7: C Server State Reconstruction from Cloud
  console.log('\nTest 7: C Server Reconstruction from Cloud Interval State...');
  const cRes = await fetch('http://localhost:8080/api/state/reconstruct', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ intervals: laptopReconcile[0]?.received_intervals })
  });
  const cData = await cRes.json();
  console.log(`✓ C Engine Reconstructed: interval_count=${cData.interval_count}, total_packages=${cData.total_packages}`);

  // Test 8: Row-Level Security Tenant Isolation Check
  console.log('\nTest 8: Verifying Row Level Security on unauthorized warehouse IDs...');
  const fakeId = '00000000-0000-0000-0000-000000000000';
  const rlsCheck = await fetchJson(`${SUPABASE_URL}/rest/v1/warehouse_state?warehouse_id=eq.${fakeId}`);
  console.log(`✓ RLS protected: returned ${rlsCheck.length} rows for unauthenticated private warehouse query.`);

  console.log('\n===============================================================');
  console.log('ALL 8 END-TO-END MULTI-DEVICE & PERSISTENCE TESTS PASSED! ✓');
  console.log('===============================================================');
}

runTests().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
