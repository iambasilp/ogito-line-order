import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { triggerReward } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, KeyRound, Loader2 } from 'lucide-react';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, login } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  React.useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username || pin.length !== 6) {
      setError('Please enter username and 6-digit password');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/auth/login', { username, pin });

      triggerReward();

      login(response.data.token, response.data.user);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 min-h-[calc(100dvh-36px)] flex flex-col items-center justify-center bg-[#FAFAFA] p-4 sm:p-8">
      <div className="w-full max-w-[360px] animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center p-3 mb-6">
            <img src="/logo.png" alt="Ogito Logo" width="160" height="80" decoding="async" className="w-full h-auto" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Sign in</h1>
          <p className="text-sm text-gray-500 mt-2">Enter your details to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="username" className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Username</Label>
            <div className="relative">
              <Input
                id="username"
                type="text"
                placeholder="john_doe"
                value={username}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
                disabled={loading}
                className="pl-10 h-12 bg-white border-gray-200 focus:border-primary/50 focus:ring-primary/20 rounded-xl transition-all shadow-sm"
                required
                autoComplete="username"
                aria-required="true"
              />
              <User className="absolute left-3.5 top-3.5 h-5 w-5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pin" className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Password PIN</Label>
            <div className="relative">
              <Input
                id="pin"
                type="password"
                inputMode="numeric"
                placeholder="••••••"
                maxLength={6}
                value={pin}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPin(e.target.value.replace(/\D/g, ''))}
                disabled={loading}
                className="pl-10 h-12 font-mono tracking-widest bg-white border-gray-200 focus:border-primary/50 focus:ring-primary/20 rounded-xl transition-all shadow-sm"
                autoComplete="current-password"
              />
              <KeyRound className="absolute left-3.5 top-3.5 h-5 w-5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {error && (
            <div className="bg-red-50/80 text-red-600 text-sm p-3 rounded-xl flex items-center gap-2 animate-in slide-in-from-top-1 duration-200 border border-red-100">
              <div className="h-1.5 w-1.5 rounded-full bg-red-600 shrink-0" />
              <p className="leading-tight">{error}</p>
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full h-12 text-[15px] font-medium rounded-xl shadow-sm hover:shadow-md active:scale-[0.98] transition-all mt-6" 
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Login;
