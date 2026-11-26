# Warehouse Live Arrival Mobile App

React Native / Expo mobile application designed for warehouse workers to log out-of-order package arrivals, view consolidated intervals in real-time, and query missing number gaps.

Designed to sync with Supabase for real-time integration with the web dashboard.

---

## Features
- **Live Package Logger**: Log single packages (e.g., `42`) or batches of arrivals (`10, 11, 14`).
- **Real-Time Visual Intervals**: Shows received packages grouped into green badges (e.g., `[ 1 - 3 ]`, `[ 6 - 7 ]`).
- **Bridge Merge Feedback**: Watch intervals fuse automatically when a connecting ID arrives.
- **Gap Inspector**: Select any query window (`[min, max]`) to highlight missing packages in amber badges.
- **Live Event Log**: Tracks duplicate detections, extensions, and creations.
- **Supabase Integration**: Ready-to-go `supabase.js` client that pushes arrivals into your friend's PostgreSQL database table in real-time.

---

## Quick Start (Run on your Phone via Expo Go)

### 1. Install Dependencies
Navigate to the `mobile-app` directory:
```bash
cd mobile-app
npm install
```

### 2. Start the App
```bash
npx expo start
```

### 3. Open on your Phone
1. Download **Expo Go** from Google Play Store (Android) or App Store (iOS).
2. Scan the QR code displayed in your terminal with Expo Go (Android) or your Camera app (iOS).
3. The app loads instantly on your device!

---

## Supabase Connection

Open `supabase.js` and paste your Supabase Project URL and Anon Key:
```javascript
export const SUPABASE_URL = 'https://xyzcompany.supabase.co';
export const SUPABASE_ANON_KEY = 'your-anon-key-here';
```

When arrivals are logged on the phone, they automatically push to the `arrivals` table in Supabase so your friend's website updates live!
