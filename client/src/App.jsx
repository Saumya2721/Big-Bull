import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';

// Import Pages
import Login from './pages/Login';
import KycVerify from './pages/KycVerify';
import Dashboard from './pages/DashBoard';
import StockDetail from './pages/StockDetail';
import Portfolio from './pages/Portfolio';
import Watchlist from './pages/Watchlist';
import Orders from './pages/Orders';

/**
 * Higher-Order Security Boundary Guard Component
 * Enforces strict authentication states and maps access rights using relational database status.
 */
const ProtectedRoute = ({ children, requireKyc = true }) => {
  const { user } = useAuth();

  // Gate 1: Force unauthenticated traffic straight to the credential submission wall
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Gate 2: If a route requires KYC compliance but user profile is unverified, lock them in onboarding
  if (requireKyc && user.KycStatus !== 'Verified') {
    return <Navigate to="/kyc" replace />;
  }

  // Gate 3: Anti-loop protection. If they are already verified, block manual access to the KYC onboarding form
  if (!requireKyc && user.KycStatus === 'Verified') {
    return <Navigate to="/" replace />;
  }

  // Authorizations passed, mount requested layout tree
  return children;
};

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Router>
          <div className="min-h-screen bg-slate-50 text-slate-900 antialiased">
            <Toaster position="bottom-right" toastOptions={{ className: 'font-mono text-sm shadow-xl rounded-xl border border-slate-100' }} />
            <Routes>
              {/* Public Entry Channel */}
              <Route path="/login" element={<Login />} />

              {/* Secure Profile Mapping & Demat Provisioning Form */}
              <Route
                path="/kyc"
                element={
                  <ProtectedRoute requireKyc={false}>
                    <KycVerify />
                  </ProtectedRoute>
                }
              />

              {/* Main Active Equities Portfolio Dashboard */}
              <Route
                path="/"
                element={
                  <ProtectedRoute requireKyc={true}>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route path="/portfolio" element={<ProtectedRoute requireKyc={true}><Portfolio /></ProtectedRoute>} />
              <Route path="/watchlist" element={<ProtectedRoute requireKyc={true}><Watchlist /></ProtectedRoute>} />
              <Route path="/orders" element={<ProtectedRoute requireKyc={true}><Orders /></ProtectedRoute>} />

              {/* Dedicated Multi-Asset Interactive Chart Room Terminal */}
              <Route
                path="/stock/:symbol"
                element={
                  <ProtectedRoute requireKyc={true}>
                    <StockDetail />
                  </ProtectedRoute>
                }
              />

              {/* Global Router Fallback Route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </Router>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;