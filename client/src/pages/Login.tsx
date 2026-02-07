import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { triggerReward } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogIn, User, KeyRound, Loader2 } from 'lucide-react';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

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
    <div className="min-h-screen flex items-center justify-center bg-gray-50/50 p-4 sm:p-8">
      <Card className="w-full max-w-md shadow-xl border-t-4 border-t-primary animate-in fade-in zoom-in duration-300">
        <CardHeader className="space-y-4 text-center pb-2">
          <div className="mx-auto w-fit bg-primary/5 p-4 rounded-full mb-2">
            <img src="/logo.png" alt="Ogito Logo" className="h-20 w-auto" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl sm:text-3xl font-bold tracking-tight">Welcome Back</CardTitle>
            <CardDescription className="text-base">Sign in to your account</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium">Username</Label>
              <div className="relative">
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
                  disabled={loading}
                  className="pl-10 h-11 bg-white"
                  autoComplete="username"
                />
                <User className="absolute left-3 top-3 h-5 w-5 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pin" className="text-sm font-medium">Password (PIN)</Label>
              <div className="relative">
                <Input
                  id="pin"
                  type="password"
                  inputMode="numeric"
                  placeholder="Enter 6-digit PIN"
                  maxLength={6}
                  value={pin}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPin(e.target.value.replace(/\D/g, ''))}
                  disabled={loading}
                  className="pl-10 h-11 font-mono tracking-widest bg-white"
                  autoComplete="current-password"
                />
                <KeyRound className="absolute left-3 top-3 h-5 w-5 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-sm p-3 rounded-lg flex items-center gap-2 animate-in slide-in-from-top-2 duration-200">
                <div className="h-1.5 w-1.5 rounded-full bg-red-600" />
                {error}
              </div>
            )}

            <Button type="submit" className="w-full h-11 text-base font-semibold shadow-md active:scale-[0.98] transition-all" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  Sign In
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-muted-foreground">
            Protected business area. Unauthorized access is prohibited.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
