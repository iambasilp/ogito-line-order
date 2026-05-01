import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { OrdersProvider } from './context/OrdersContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Orders from './pages/Orders';
import Customers from './pages/Customers';
import Users from './pages/Users';
import RoutesPage from './pages/Routes';
import './index.css';

function App() {
  return (
    <AuthProvider>
      <OrdersProvider>
        <div className="min-h-screen flex flex-col">
          {/* Global Development Header */}
          <div className="bg-slate-50 border-b border-t-2 border-t-[#E07012] h-9 flex items-center justify-center sticky top-0 z-[100] w-full shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">
              Under Development
            </span>
          </div>
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Orders />
              </ProtectedRoute>
            }
          />

          <Route
            path="/customers"
            element={
              <ProtectedRoute requireAdmin>
                <Customers />
              </ProtectedRoute>
            }
          />

          <Route
            path="/users"
            element={
              <ProtectedRoute requireAdmin>
                <Users />
              </ProtectedRoute>
            }
          />

          <Route
            path="/routes"
            element={
              <ProtectedRoute requireAdmin>
                <RoutesPage />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
          </BrowserRouter>
        </div>
      </OrdersProvider>
    </AuthProvider>
  );
}

export default App;
