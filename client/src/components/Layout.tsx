import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, Users, ShoppingCart, Menu, X, MapPin, BarChart2, Target } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { GlobalChatIcon } from './GlobalChatIcon';
import { PaymentQRIcon } from './PaymentQRIcon';

const Layout: React.FC<{ children: React.ReactNode; fullWidth?: boolean }> = ({ children, fullWidth = false }) => {
  const { user, isAdmin, isCeo, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isNavVisible, setIsNavVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > lastScrollY && currentScrollY > 60) {
        setIsNavVisible(false);
      } else {
        setIsNavVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <nav
        aria-label="Main Navigation"
        className={`sticky top-0 z-50 shadow-lg bg-[linear-gradient(135deg,#1a0a00_0%,#3d1500_30%,#7a2c00_60%,#c45200_85%,#E07012_100%)] border-b border-[#E07012]/30 transition-transform duration-300 ${
          isNavVisible ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-4 sm:space-x-8">
            <div className="flex-shrink-0 flex items-center gap-2 sm:gap-3">
                <a href="https://ogitofoods.com" target="_blank" rel="noopener noreferrer" style={{ outline: 'none' }}>
                  <img src="/logo.png" alt="Ogito Logo" width="96" height="48" decoding="async" className="h-8 sm:h-12 w-auto drop-shadow-md cursor-default" />
                </a>
                <span
                  className="text-xs px-2.5 py-1 rounded-full font-bold tracking-wide shadow-inner max-w-[80px] sm:max-w-[150px] truncate inline-block align-middle"
                  style={{ backgroundColor: 'rgba(255,255,255,0.18)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', backdropFilter: 'blur(4px)' }}
                >
                  {user?.username.toUpperCase()}
                </span>
              </div>

              <div className="hidden xl:flex space-x-1">
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

                {(isAdmin || isCeo) && (
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

                {(isAdmin || isCeo) && (
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

                {isAdmin && (
                  <Link to="/targets">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`font-medium transition-all duration-200 ${
                        isActive('/targets')
                          ? 'bg-white/20 text-white shadow-sm backdrop-blur-sm border border-white/30'
                          : 'text-white/80 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <Target className="h-4 w-4 mr-2" />
                      Targets
                    </Button>
                  </Link>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-4">
              {user && <PaymentQRIcon />}
              {user && <GlobalChatIcon />}
              <ThemeToggle />
              <div className="text-sm hidden xl:block">
                <span className="font-semibold text-white">{user?.username}</span>
                <span className="ml-2 text-white/60 text-xs">({user?.role})</span>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="hidden xl:flex text-white/80 hover:text-white hover:bg-white/10 border border-white/20"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="xl:hidden text-white hover:bg-white/10"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle mobile menu"
                aria-expanded={mobileMenuOpen}
                aria-controls="mobile-menu"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div id="mobile-menu" className="xl:hidden shadow-xl max-h-[calc(100vh-4rem)] overflow-y-auto" style={{ background: 'rgba(26,10,0,0.97)', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
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

              {(isAdmin || isCeo) && (
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

              {(isAdmin || isCeo) && (
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

              {user && (
                <GlobalChatIcon className="w-full justify-start font-medium" />
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
