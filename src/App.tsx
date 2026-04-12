import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Home from './pages/Home';
import PublicMap from './pages/PublicMap';
import AdminDashboard from './pages/AdminDashboard';
import DevDashboard from './pages/DevDashboard';
import WorkerDashboard from './pages/WorkerDashboard';
import QuickReport from './pages/QuickReport';
import IssueDetail from './pages/IssueDetail';
import Navbar from './components/Navbar';
import AuthModal from './components/AuthModal';
import ToastContainer from './components/Toast';

function AppContent() {
  const { 
    user, userData, loading, login, logout,
    isAuthModalOpen, setAuthModalOpen, loginWithGoogle, loginWithEmail, signupWithEmail
  } = useAuth();
  const location = useLocation();
  const isHome = location.pathname === '/';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <Navbar user={user} userData={userData} login={login} logout={logout} />
      <main className={`flex-1 flex flex-col ${!isHome ? 'pt-28' : ''}`}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/map" element={<PublicMap />} />
          <Route path="/report" element={user ? <QuickReport /> : <Navigate to="/" />} />
          <Route path="/admin" element={userData?.role === 'admin' || userData?.role === 'dev' ? <AdminDashboard /> : <Navigate to="/" />} />
          <Route path="/dev" element={user?.email === 'joydeepmondal9168j@gmail.com' ? <DevDashboard /> : <Navigate to="/" />} />
          <Route path="/worker" element={userData?.role === 'worker' ? <WorkerDashboard /> : <Navigate to="/" />} />
          <Route path="/issue/:id" element={<IssueDetail />} />
        </Routes>
      </main>
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setAuthModalOpen(false)} 
        loginWithGoogle={(role?: string) => Promise.resolve(loginWithGoogle(role))}
        loginWithEmail={loginWithEmail}
        signupWithEmail={signupWithEmail}
      />
      <ToastContainer />
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
