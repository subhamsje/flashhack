import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { AppLayout } from './layouts/AppLayout';
import { LandingPage } from './pages/LandingPage';
import { LiveArrivalPage } from './pages/LiveArrivalPage';
import { RangeAnalysisPage } from './pages/RangeAnalysisPage';
import { AlgorithmPage } from './pages/AlgorithmPage';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            {/* Page 1: Landing Page */}
            <Route path="/" element={<LandingPage />} />

            {/* Page 2: Live Arrival Index */}
            <Route path="/app" element={<LiveArrivalPage />} />

            {/* Page 3: Range Analysis */}
            <Route path="/range-analysis" element={<RangeAnalysisPage />} />

            {/* Page 4: About the Algorithm */}
            <Route path="/algorithm" element={<AlgorithmPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};
