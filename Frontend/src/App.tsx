import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { authAPI } from "./services/authAPI";

import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound";

// Farmer pages
import FarmerDashboard from "./pages/farmer/FarmerDashboard";
import FarmerFarmsPage from "./pages/farmer/FarmerFarmsPage";
import FarmerInsightsPage from "./pages/farmer/FarmerInsightsPage";
import FarmerFeedbackPage from "./pages/farmer/FarmerFeedbackPage";
import FarmerReportsPage from "./pages/farmer/FarmerReportsPage";

// Admin pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminFarmsPage from "./pages/admin/AdminFarmsPage";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import AdminModelsPage from "./pages/admin/AdminModelsPage";
import AdminFeedbackPage from "./pages/admin/AdminFeedbackPage";
import AdminMonitoringPage from "./pages/admin/AdminMonitoringPage";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children, requiredRole }: { children: React.ReactNode; requiredRole?: string }) => {
  const token = authAPI.getStoredToken();
  const user  = authAPI.getStoredUser();
  if (!token || !user) return <Navigate to="/auth" replace />;
  if (requiredRole && user.role !== requiredRole) {
    // Redirect to the right dashboard
    return <Navigate to={user.role === "admin" ? "/admin" : "/farmer"} replace />;
  }
  return <>{children}</>;
};

const RootRedirect = () => {
  const user = authAPI.getStoredUser();
  if (!user) return <Navigate to="/auth" replace />;
  return <Navigate to={user.role === "admin" ? "/admin" : "/farmer"} replace />;
};

const AppContent = () => (
  <Routes>
    <Route path="/auth" element={<AuthPage />} />
    <Route path="/" element={<RootRedirect />} />

    {/* Farmer routes */}
    <Route path="/farmer" element={<ProtectedRoute requiredRole="farmer"><FarmerDashboard /></ProtectedRoute>} />
    <Route path="/farmer/farms" element={<ProtectedRoute requiredRole="farmer"><FarmerFarmsPage /></ProtectedRoute>} />
    <Route path="/farmer/insights" element={<ProtectedRoute requiredRole="farmer"><FarmerInsightsPage /></ProtectedRoute>} />
    <Route path="/farmer/feedback" element={<ProtectedRoute requiredRole="farmer"><FarmerFeedbackPage /></ProtectedRoute>} />
    <Route path="/farmer/reports" element={<ProtectedRoute requiredRole="farmer"><FarmerReportsPage /></ProtectedRoute>} />

    {/* Admin routes */}
    <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
    <Route path="/admin/farms" element={<ProtectedRoute requiredRole="admin"><AdminFarmsPage /></ProtectedRoute>} />
    <Route path="/admin/users" element={<ProtectedRoute requiredRole="admin"><AdminUsersPage /></ProtectedRoute>} />
    <Route path="/admin/models" element={<ProtectedRoute requiredRole="admin"><AdminModelsPage /></ProtectedRoute>} />
    <Route path="/admin/feedback" element={<ProtectedRoute requiredRole="admin"><AdminFeedbackPage /></ProtectedRoute>} />
    <Route path="/admin/monitoring" element={<ProtectedRoute requiredRole="admin"><AdminMonitoringPage /></ProtectedRoute>} />

    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
