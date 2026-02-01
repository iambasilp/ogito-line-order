import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import {
  LogOut,
  Users,
  ShoppingCart,
  Menu,
  X,
  ChevronRight,
  UserCircle2
} from 'lucide-react';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileMenuOpen]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  const NavItem = ({ to, icon: Icon, label, onClick }: { to: string, icon: any, label: string, onClick?: () => void }) => {
    const active = isActive(to);
    return (
      <Link to={to} onClick={onClick} className="block w-full">
        <div className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group ${active
          ? 'bg-primary/10 text-primary font-semibold'
          : 'hover:bg-gray-50 text-gray-600'
          }`}>
          <div className="flex items-center gap-3">
            <Icon className={`h-5 w-5 ${active ? 'text-primary' : 'text-gray-400 group-hover:text-gray-600'}`} />
            <span className="text-sm sm:text-base">{label}</span>
          </div>
          {active && <ChevronRight className="h-4 w-4 text-primary/60" />}
        </div>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50/50 flex flex-col overflow-x-hidden w-full">
      {/* Sticky Header */}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b shadow-sm transition-all duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 sm:h-20">

            {/* Logo Area */}
            <div className="flex items-center">
              <Link to="/" className="flex-shrink-0 flex items-center gap-3 group">
                <div className="relative">
                  <div className="absolute -inset-1 rounded-full bg-orange-100 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <img src="/logo.png" alt="Ogito Logo" className="relative h-9 sm:h-11 w-auto transition-transform group-hover:scale-105" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-gray-900 tracking-tight leading-none text-lg">Ogito</span>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Order Manager</span>
                </div>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1">
              <Link to="/">
                <Button variant={isActive('/') ? 'secondary' : 'ghost'} className="gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  Orders
                </Button>
              </Link>

              {isAdmin && (
                <Link to="/customers">
                  <Button variant={isActive('/customers') ? 'secondary' : 'ghost'} className="gap-2">
                    <Users className="h-4 w-4" />
                    Customers
                  </Button>
                </Link>
              )}

              {isAdmin && (
                <Link to="/users">
                  <Button variant={isActive('/users') ? 'secondary' : 'ghost'} className="gap-2">
                    <Users className="h-4 w-4" />
                    Users
                  </Button>
                </Link>
              )}

              <div className="h-6 w-px bg-gray-200 mx-2" />

              <div className="flex items-center gap-3 pl-2">
                <div className="text-right">
                  <div className="text-sm font-medium leading-none">{user?.username}</div>
                  <div className="text-xs text-muted-foreground mt-1 capitalize">{user?.role}</div>
                </div>
                <Button variant="outline" size="icon" onClick={handleLogout} title="Logout">
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Mobile Menu Button */}
            <div className="flex items-center md:hidden gap-3">
              <div className="flex items-center gap-2 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                <div className={`h-2 w-2 rounded-full ${isAdmin ? 'bg-purple-500' : 'bg-blue-500'}`} />
                <span className="text-xs font-medium text-gray-600 max-w-[80px] truncate">
                  {user?.username}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="active:bg-gray-100"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 animate-in fade-in duration-300">
        {children}
      </main>

      {/* Mobile Full Screen Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-30 md:hidden flex flex-col bg-white pt-20 animate-in slide-in-from-top-10 duration-200">
          <div className="flex-1 px-6 py-6 space-y-2 overflow-y-auto">
            <div className="mb-8 p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-4">
              <div className={`h-12 w-12 rounded-full flex items-center justify-center text-lg font-bold text-white shadow-sm ${isAdmin ? 'bg-gradient-to-br from-purple-500 to-purple-600' : 'bg-gradient-to-br from-blue-500 to-blue-600'}`}>
                {user?.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-bold text-lg text-gray-900">{user?.username}</h3>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-white border shadow-sm capitalize">
                  {user?.role} Account
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Menu</p>
              <NavItem to="/" icon={ShoppingCart} label="Orders" />
              {isAdmin && <NavItem to="/customers" icon={Users} label="Customers" />}
              {isAdmin && <NavItem to="/users" icon={UserCircle2} label="System Users" />}
            </div>

            <div className="mt-8 pt-6 border-t">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 p-4 rounded-xl text-red-600 bg-red-50 hover:bg-red-100 transition-colors font-medium active:scale-[0.98]"
              >
                <LogOut className="h-5 w-5" />
                Sign Out
              </button>
            </div>
          </div>

          <div className="p-6 text-center text-xs text-gray-400 bg-gray-50/50 border-t">
            Ogito Order Management v1.0
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
