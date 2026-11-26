import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { LandingPage } from './pages/LandingPage';
import { DashboardLayout } from './layouts/DashboardLayout';
import { LiveArrivalsWorkspace } from './pages/workspaces/LiveArrivalsWorkspace';
import { SearchAndQueriesWorkspace } from './pages/workspaces/SearchAndQueriesWorkspace';
import { AvlTreeExplorerWorkspace } from './pages/workspaces/AvlTreeExplorerWorkspace';
import { AnalyticsWorkspace } from './pages/workspaces/AnalyticsWorkspace';
import { BenchmarkLabWorkspace } from './pages/workspaces/BenchmarkLabWorkspace';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Landing Page */}
          <Route path="/" element={<LandingPage />} />

          {/* Authenticated Application Workspaces */}
          <Route path="/app" element={<DashboardLayout />}>
            <Route index element={<Navigate to="/app/arrivals" replace />} />
            <Route path="arrivals" element={<LiveArrivalsWorkspace />} />
            <Route path="search" element={<SearchAndQueriesWorkspace />} />
            <Route path="avl-tree" element={<AvlTreeExplorerWorkspace />} />
            <Route path="analytics" element={<AnalyticsWorkspace />} />
            <Route path="benchmarks" element={<BenchmarkLabWorkspace />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};
