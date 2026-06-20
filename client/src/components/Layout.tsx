import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, Users, ShoppingCart, Menu, X, MapPin, BarChart2 } from 'lucide-react';


const Layout: React.FC<{ children: React.ReactNode; fullWidth?: boolean }> = ({ children, fullWidth = false }) => {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);



  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gray-50/30">
      {/* Premium gradient header perfectly matching the #E07012 orange brand */}
      <nav
        className="sticky top-9 z-50 shadow-lg"
        style={{
          background: 'linear-gradient(135deg, #1a0a00 0%, #3d1500 30%, #7a2c00 60%, #c45200 85%, #E07012 100%)',
          borderBottom: '1px solid rgba(224, 112, 18, 0.3)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-4 sm:space-x-8">
            <div className="flex-shrink-0 flex items-center gap-2 sm:gap-3">
                <img src="/logo.png" alt="Ogito Logo" className="h-8 sm:h-12 w-auto drop-shadow-md" />
                <span
                  className="text-xs px-2.5 py-1 rounded-full font-bold tracking-wide shadow-inner"
                  style={{ backgroundColor: 'rgba(255,255,255,0.18)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', backdropFilter: 'blur(4px)' }}
                >
                  {user?.username.toUpperCase()}
                </span>
              </div>

              <div className="hidden md:flex space-x-1">
                <Link to="/">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`font-medium transition-all duration-200 ${
                      isActive('/')
                        ? 'bg-white/20 text-white shadow-sm backdrop-blur-sm border border-white/30'
                        : 'text-white/80 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Orders
                  </Button>
                </Link>

                {user?.role !== 'driver' && (
                  <Link to="/dashboard">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`font-medium transition-all duration-200 ${
                        isActive('/dashboard')
                          ? 'bg-white/20 text-white shadow-sm backdrop-blur-sm border border-white/30'
                          : 'text-white/80 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <BarChart2 className="h-4 w-4 mr-2" />
                      Dashboard
                    </Button>
                  </Link>
                )}

                {isAdmin && (
                  <Link to="/customers">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`font-medium transition-all duration-200 ${
                        isActive('/customers')
                          ? 'bg-white/20 text-white shadow-sm backdrop-blur-sm border border-white/30'
                          : 'text-white/80 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Customers
                    </Button>
                  </Link>
                )}

                {isAdmin && (
                  <Link to="/routes">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`font-medium transition-all duration-200 ${
                        isActive('/routes')
                          ? 'bg-white/20 text-white shadow-sm backdrop-blur-sm border border-white/30'
                          : 'text-white/80 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <MapPin className="h-4 w-4 mr-2" />
                      Routes
                    </Button>
                  </Link>
                )}

                {isAdmin && (
                  <Link to="/users">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`font-medium transition-all duration-200 ${
                        isActive('/users')
                          ? 'bg-white/20 text-white shadow-sm backdrop-blur-sm border border-white/30'
                          : 'text-white/80 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Users
                    </Button>
                  </Link>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="text-sm hidden sm:block">
                <span className="font-semibold text-white">{user?.username}</span>
                <span className="ml-2 text-white/60 text-xs">({user?.role})</span>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="hidden sm:flex text-white/80 hover:text-white hover:bg-white/10 border border-white/20"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden text-white hover:bg-white/10"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden" style={{ background: 'rgba(26,10,0,0.97)', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="px-4 pt-2 pb-3 space-y-1">
              <div className="text-sm py-2 border-b mb-2" style={{ borderColor: 'rgba(255,255,255,0.15)' }}>
                <span className="font-semibold text-white">{user?.username}</span>
                <span className="ml-2 text-white/50 text-xs">({user?.role})</span>
              </div>

              <Link to="/" onClick={() => setMobileMenuOpen(false)}>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`w-full justify-start font-medium ${
                    isActive('/') ? 'bg-white/20 text-white' : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Orders
                </Button>
              </Link>

              {user?.role !== 'driver' && (
                <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`w-full justify-start font-medium ${
                      isActive('/dashboard') ? 'bg-white/20 text-white' : 'text-white/80 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <BarChart2 className="h-4 w-4 mr-2" />
                    Dashboard
                  </Button>
                </Link>
              )}

              {isAdmin && (
                <Link to="/customers" onClick={() => setMobileMenuOpen(false)}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`w-full justify-start font-medium ${
                      isActive('/customers') ? 'bg-white/20 text-white' : 'text-white/80 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Customers
                  </Button>
                </Link>
              )}

              {isAdmin && (
                <Link to="/routes" onClick={() => setMobileMenuOpen(false)}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`w-full justify-start font-medium ${
                      isActive('/routes') ? 'bg-white/20 text-white' : 'text-white/80 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <MapPin className="h-4 w-4 mr-2" />
                    Routes
                  </Button>
                </Link>
              )}

              {isAdmin && (
                <Link to="/users" onClick={() => setMobileMenuOpen(false)}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`w-full justify-start font-medium ${
                      isActive('/users') ? 'bg-white/20 text-white' : 'text-white/80 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Users
                  </Button>
                </Link>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="w-full justify-start text-white/80 hover:text-white hover:bg-white/10"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        )}
      </nav>

      <main className={`${fullWidth ? 'w-full px-4' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'} py-4 sm:py-8`}>
        {children}
      </main>
    </div>
  );
};

export default Layout;
