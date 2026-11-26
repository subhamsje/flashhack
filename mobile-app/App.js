import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Alert
} from 'react-native';
import { LiveArrivalIndex } from './intervalIndex';
import { supabase } from './supabase';

const tracker = new LiveArrivalIndex();

export default function App() {
  const [packageInput, setPackageInput] = useState('');
  const [queryMin, setQueryMin] = useState('1');
  const [queryMax, setQueryMax] = useState('10');
  const [intervals, setIntervals] = useState([]);
  const [gaps, setGaps] = useState([]);
  const [history, setHistory] = useState([]);
  const [statusMessage, setStatusMessage] = useState('Ready to log incoming packages');

  const updateState = (actionMsg) => {
    const currIntervals = tracker.getIntervals();
    setIntervals(currIntervals);
    setGaps(tracker.getMissingRanges(queryMin, queryMax));
    if (actionMsg) setStatusMessage(actionMsg);
  };

  const handleAddPackage = async (idToAdd) => {
    const val = idToAdd !== undefined ? idToAdd : packageInput.trim();
    if (!val) return;

    // Support comma or space-separated multiple packages
    const ids = val.split(/[,\s]+/).filter(Boolean);

    for (const token of ids) {
      const num = parseInt(token, 10);
      if (isNaN(num) || num < 0) {
        Alert.alert('Invalid ID', 'Please enter a positive package number.');
        continue;
      }

      const res = tracker.add(num);
      let logMsg = `Package #${num}: ${res.action}`;

      // Optional: push to Supabase in the background if connected
      try {
        if (supabase) {
          await supabase.from('arrivals').insert([{ package_id: num }]);
        }
      } catch (err) {
        // Silently continue in local demo mode
      }

      setHistory((prev) => [
        { id: Date.now() + Math.random(), text: logMsg, action: res.action },
        ...prev.slice(0, 20)
      ]);
      updateState(logMsg);
    }

    setPackageInput('');
  };

  const handleQueryGaps = () => {
    setGaps(tracker.getMissingRanges(queryMin, queryMax));
    setStatusMessage(`Updated gap query for [${queryMin}, ${queryMax}]`);
  };

  const handleLoadDemo = () => {
    [1, 3, 7, 2, 6].forEach((x) => tracker.add(x));
    setHistory([
      { id: 1, text: 'Demo sequence [1, 3, 7, 2, 6] loaded', action: 'DEMO' }
    ]);
    updateState('Loaded illustrative example [1, 3, 7, 2, 6]');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Warehouse Arrival Tracker</Text>
        <Text style={styles.headerSubtitle}>Live Interval Index & Gap Monitor</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Status Banner */}
        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>STATUS</Text>
          <Text style={styles.statusText}>{statusMessage}</Text>
        </View>

        {/* Input Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Log Incoming Package</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="e.g. 4 or 10, 12, 14"
              placeholderTextColor="#64748b"
              keyboardType="numeric"
              value={packageInput}
              onChangeText={setPackageInput}
            />
            <TouchableOpacity style={styles.primaryBtn} onPress={() => handleAddPackage()}>
              <Text style={styles.btnText}>Add</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Buttons */}
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.outlineBtn} onPress={() => handleAddPackage('4')}>
              <Text style={styles.outlineBtnText}>+ Bridge (4)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.outlineBtn} onPress={() => handleAddPackage('5')}>
              <Text style={styles.outlineBtnText}>+ Bridge (5)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.outlineBtn} onPress={handleLoadDemo}>
              <Text style={styles.outlineBtnText}>Load [1,3,7,2,6]</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Received Intervals */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Received Consecutive Ranges</Text>
          <View style={styles.badgeContainer}>
            {intervals.length === 0 ? (
              <Text style={styles.emptyText}>No packages received yet</Text>
            ) : (
              intervals.map(([s, e], idx) => (
                <View key={idx} style={styles.badgeSuccess}>
                  <Text style={styles.badgeSuccessText}>
                    {s === e ? `[ ${s} ]` : `[ ${s} - ${e} ]`}
                  </Text>
                </View>
              ))
            )}
          </View>
        </View>

        {/* Gap Query Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Check Missing Gaps in Range</Text>
          <View style={styles.rangeRow}>
            <TextInput
              style={[styles.input, styles.halfInput]}
              value={queryMin}
              onChangeText={setQueryMin}
              keyboardType="numeric"
              placeholder="Min"
              placeholderTextColor="#64748b"
            />
            <Text style={styles.toText}>to</Text>
            <TextInput
              style={[styles.input, styles.halfInput]}
              value={queryMax}
              onChangeText={setQueryMax}
              keyboardType="numeric"
              placeholder="Max"
              placeholderTextColor="#64748b"
            />
            <TouchableOpacity style={styles.secondaryBtn} onPress={handleQueryGaps}>
              <Text style={styles.btnText}>Find</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.badgeContainer}>
            {gaps.length === 0 ? (
              <Text style={styles.emptyText}>No missing packages in this range!</Text>
            ) : (
              gaps.map(([s, e], idx) => (
                <View key={idx} style={styles.badgeWarning}>
                  <Text style={styles.badgeWarningText}>
                    {s === e ? `Missing: ${s}` : `Missing: ${s} - ${e}`}
                  </Text>
                </View>
              ))
            )}
          </View>
        </View>

        {/* Live Event Log */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Recent Activity Log</Text>
          {history.length === 0 ? (
            <Text style={styles.emptyText}>Arrival events will appear here</Text>
          ) : (
            history.map((item) => (
              <View key={item.id} style={styles.logRow}>
                <Text style={styles.logBullet}>•</Text>
                <Text style={styles.logText}>{item.text}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a'
  },
  content: {
    padding: 16
  },
  header: {
    padding: 18,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155'
  },
  headerTitle: {
    color: '#38bdf8',
    fontSize: 20,
    fontWeight: 'bold'
  },
  headerSubtitle: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2
  },
  statusCard: {
    backgroundColor: '#1e293b',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#38bdf8'
  },
  statusLabel: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '700'
  },
  statusText: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2
  },
  card: {
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155'
  },
  cardTitle: {
    color: '#f1f5f9',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  input: {
    flex: 1,
    backgroundColor: '#0f172a',
    color: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    fontSize: 16
  },
  primaryBtn: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 8,
    marginLeft: 8
  },
  secondaryBtn: {
    backgroundColor: '#334155',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    marginLeft: 8
  },
  btnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    gap: 8
  },
  outlineBtn: {
    borderWidth: 1,
    borderColor: '#0284c7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6
  },
  outlineBtnText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '600'
  },
  badgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  badgeSuccess: {
    backgroundColor: '#064e3b',
    borderColor: '#059669',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6
  },
  badgeSuccessText: {
    color: '#34d399',
    fontWeight: 'bold',
    fontSize: 14
  },
  badgeWarning: {
    backgroundColor: '#451a03',
    borderColor: '#d97706',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6
  },
  badgeWarningText: {
    color: '#fbbf24',
    fontWeight: 'bold',
    fontSize: 14
  },
  rangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  halfInput: {
    flex: 0.4
  },
  toText: {
    color: '#94a3b8',
    marginHorizontal: 8,
    fontWeight: '600'
  },
  emptyText: {
    color: '#64748b',
    fontStyle: 'italic',
    fontSize: 13
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4
  },
  logBullet: {
    color: '#38bdf8',
    fontSize: 16,
    marginRight: 6
  },
  logText: {
    color: '#cbd5e1',
    fontSize: 13
  }
});
