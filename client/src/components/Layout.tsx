import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, Users, ShoppingCart, Menu, X } from 'lucide-react';
import { GreetingPopup } from '@/components/GreetingPopup';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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
      <GreetingPopup />
      <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="w-full max-w-[95%] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-4 sm:space-x-8">
              <div className="flex-shrink-0 flex items-center gap-2 sm:gap-3">
                <img src="/logo.png" alt="Ogito Logo" className="h-8 sm:h-12 w-auto" />
                <span className="text-xs px-2 py-1 rounded font-semibold" style={{ backgroundColor: '#E07012', color: 'white' }}>{user?.username.toUpperCase()}</span>
              </div>

              <div className="hidden md:flex space-x-4">
                <Link to="/">
                  <Button
                    variant={isActive('/') ? 'default' : 'ghost'}
                    size="sm"
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Orders
                  </Button>
                </Link>

                {isAdmin && (
                  <Link to="/customers">
                    <Button
                      variant={isActive('/customers') ? 'default' : 'ghost'}
                      size="sm"
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Customers
                    </Button>
                  </Link>
                )}

                {isAdmin && (
                  <Link to="/users">
                    <Button
                      variant={isActive('/users') ? 'default' : 'ghost'}
                      size="sm"
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
                <span className="font-medium">{user?.username}</span>
                <span className="ml-2 text-gray-500">({user?.role})</span>
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout} className="hidden sm:flex">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t">
            <div className="px-4 pt-2 pb-3 space-y-1">
              <div className="text-sm py-2 border-b mb-2">
                <span className="font-medium">{user?.username}</span>
                <span className="ml-2 text-gray-500">({user?.role})</span>
              </div>

              <Link to="/" onClick={() => setMobileMenuOpen(false)}>
                <Button
                  variant={isActive('/') ? 'default' : 'ghost'}
                  size="sm"
                  className="w-full justify-start"
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Orders
                </Button>
              </Link>

              {isAdmin && (
                <Link to="/customers" onClick={() => setMobileMenuOpen(false)}>
                  <Button
                    variant={isActive('/customers') ? 'default' : 'ghost'}
                    size="sm"
                    className="w-full justify-start"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Customers
                  </Button>
                </Link>
              )}

              {isAdmin && (
                <Link to="/users" onClick={() => setMobileMenuOpen(false)}>
                  <Button
                    variant={isActive('/users') ? 'default' : 'ghost'}
                    size="sm"
                    className="w-full justify-start"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Users
                  </Button>
                </Link>
              )}

              <Button variant="outline" size="sm" onClick={handleLogout} className="w-full justify-start">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        )}
      </nav>

      <main className="w-full max-w-[95%] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;
