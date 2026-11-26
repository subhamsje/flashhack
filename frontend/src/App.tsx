import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { AppLayout } from './layouts/AppLayout';
import { LandingPage } from './pages/LandingPage';
import { LiveArrivalPage } from './pages/LiveArrivalPage';
import { RangeAnalysisPage } from './pages/RangeAnalysisPage';
import { AlgorithmPage } from './pages/AlgorithmPage';
import { ActivityLogPage } from './pages/ActivityLogPage';
import { AlgorithmDebuggerPage } from './pages/AlgorithmDebuggerPage';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route element={<AppLayout />}>
            {/* Page 1: Landing Page */}
            <Route path="/" element={<LandingPage />} />

            {/* Page 2: Live Arrival Index */}
            <Route path="/app" element={<LiveArrivalPage />} />

            {/* Page 3: Missing Package Intelligence & Range Analysis */}
            <Route path="/range-analysis" element={<RangeAnalysisPage />} />
            <Route path="/range" element={<Navigate to="/range-analysis" replace />} />

            {/* Page 4: Activity Log & Time Travel Replay */}
            <Route path="/activity-log" element={<ActivityLogPage />} />

            {/* Page 5: Algorithm Step Debugger */}
            <Route path="/debugger" element={<AlgorithmDebuggerPage />} />

            {/* Page 6: About the Algorithm */}
            <Route path="/algorithm" element={<AlgorithmPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
};
