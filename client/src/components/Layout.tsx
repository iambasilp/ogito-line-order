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
            <div className="flex items-center gap-2 sm:gap-4">
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/10 px-2"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
              
              <a href="https://ogitofoods.com" target="_blank" rel="noopener noreferrer" className="flex-shrink-0 flex items-center outline-none">
                <img src="/logo.png" alt="Ogito Logo" width="96" height="48" decoding="async" className="h-8 sm:h-12 w-auto drop-shadow-md cursor-default" />
              </a>
              
              <span
                className="text-xs px-2.5 py-1 rounded-full font-bold tracking-wide shadow-inner max-w-[80px] sm:max-w-[150px] truncate inline-block align-middle"
                style={{ backgroundColor: 'rgba(255,255,255,0.18)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', backdropFilter: 'blur(4px)' }}
              >
                {user?.username.toUpperCase()}
              </span>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-4">
              {user && <PaymentQRIcon />}
              {user && <GlobalChatIcon />}
              <ThemeToggle />
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
            </div>
          </div>
        </div>
      </nav>

      {/* Sidebar Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm transition-opacity" 
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Left Sidebar Drawer */}
      <div 
        className={`fixed inset-y-0 left-0 z-[70] w-72 bg-[linear-gradient(135deg,#1a0a00_0%,#3d1500_100%)] border-r border-[#E07012]/30 shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <a href="https://ogitofoods.com" target="_blank" rel="noopener noreferrer" className="outline-none">
            <img src="/logo.png" alt="Ogito Logo" width="96" height="48" className="h-8 w-auto drop-shadow-md" />
          </a>
          <Button variant="ghost" size="sm" onClick={() => setMobileMenuOpen(false)} className="text-white hover:bg-white/10">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <div className="px-3 py-2 mb-4 border-b border-white/10 sm:hidden">
            <span className="font-semibold text-white">{user?.username}</span>
            <span className="ml-2 text-white/50 text-xs">({user?.role})</span>
          </div>

          <Link to="/" onClick={() => setMobileMenuOpen(false)}>
            <Button
              variant="ghost"
              size="sm"
              className={`w-full justify-start font-medium mb-1 ${
                isActive('/') ? 'bg-white/20 text-white' : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <ShoppingCart className="h-5 w-5 mr-3" />
              Orders
            </Button>
          </Link>

          {user?.role !== 'driver' && (
            <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)}>
              <Button
                variant="ghost"
                size="sm"
                className={`w-full justify-start font-medium mb-1 ${
                  isActive('/dashboard') ? 'bg-white/20 text-white' : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                <BarChart2 className="h-5 w-5 mr-3" />
                Dashboard
              </Button>
            </Link>
          )}

          {(isAdmin || isCeo) && (
            <Link to="/customers" onClick={() => setMobileMenuOpen(false)}>
              <Button
                variant="ghost"
                size="sm"
                className={`w-full justify-start font-medium mb-1 ${
                  isActive('/customers') ? 'bg-white/20 text-white' : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                <Users className="h-5 w-5 mr-3" />
                Customers
              </Button>
            </Link>
          )}

          {(isAdmin || isCeo) && (
            <Link to="/routes" onClick={() => setMobileMenuOpen(false)}>
              <Button
                variant="ghost"
                size="sm"
                className={`w-full justify-start font-medium mb-1 ${
                  isActive('/routes') ? 'bg-white/20 text-white' : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                <MapPin className="h-5 w-5 mr-3" />
                Routes
              </Button>
            </Link>
          )}

          {isAdmin && (
            <Link to="/users" onClick={() => setMobileMenuOpen(false)}>
              <Button
                variant="ghost"
                size="sm"
                className={`w-full justify-start font-medium mb-1 ${
                  isActive('/users') ? 'bg-white/20 text-white' : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                <Users className="h-5 w-5 mr-3" />
                Users
              </Button>
            </Link>
          )}

          {isAdmin && (
            <Link to="/targets" onClick={() => setMobileMenuOpen(false)}>
              <Button
                variant="ghost"
                size="sm"
                className={`w-full justify-start font-medium mb-1 ${
                  isActive('/targets') ? 'bg-white/20 text-white' : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                <Target className="h-5 w-5 mr-3" />
                Targets
              </Button>
            </Link>
          )}
          
          <div className="sm:hidden mt-2">
            {user && (
              <GlobalChatIcon className="w-full justify-start font-medium mb-1" />
            )}
          </div>
        </div>

        <div className="p-4 border-t border-white/10 sm:hidden">
          <Button
            variant="ghost"
            className="w-full justify-start text-white/80 hover:text-white hover:bg-white/10"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5 mr-3" />
            Logout
          </Button>
        </div>
      </div>

      <main className={`${fullWidth ? 'w-full px-4' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'} py-4 sm:py-8`}>
        {children}
      </main>
    </div>
  );
};

export default Layout;
