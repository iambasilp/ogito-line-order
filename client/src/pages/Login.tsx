import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { triggerReward } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username || pin.length !== 6) {
      setError('Please enter username and 6-digit PIN');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/auth/login', { username, pin });
      triggerReward();
      login(response.data.token, response.data.user);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#FAFAFA] font-sans selection:bg-black selection:text-white">
      <div className="w-full max-w-[360px] px-6 py-12 bg-white sm:border sm:border-gray-100 sm:shadow-sm">
        
        <div className="mb-12 text-center">
          <div className="flex justify-center mb-8">
            <img src="/logo.png" alt="Ogito" className="h-10 w-auto object-contain" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Sign in</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-3">
            <Label htmlFor="username" className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">Username</Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              className="h-12 bg-white border border-gray-300 rounded-none px-4 focus-visible:ring-0 focus-visible:border-black text-base shadow-sm transition-colors"
              required
              autoComplete="username"
              placeholder="Enter username"
            />
          </div>

          <div className="space-y-3">
            <Label htmlFor="pin" className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">PIN</Label>
            <Input
              id="pin"
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              disabled={loading}
              className="h-12 font-mono tracking-[0.5em] bg-white border border-gray-300 rounded-none px-4 focus-visible:ring-0 focus-visible:border-black text-lg shadow-sm transition-colors placeholder:tracking-normal placeholder:font-sans"
              required
              autoComplete="current-password"
              placeholder="••••••"
            />
          </div>

          {error && (
            <div className="text-red-500 text-sm font-medium">
              {error}
            </div>
          )}

          <div className="pt-4">
            <Button
              type="submit"
              className="w-full h-12 bg-black hover:bg-gray-800 text-white text-sm font-medium rounded-none transition-colors"
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Continue'}
            </Button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default Login;
