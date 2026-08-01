import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { triggerReward } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Instagram, ArrowRight } from 'lucide-react';

const VIDEOS = [
  "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
  "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
  "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4"
];

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [videoSrc, setVideoSrc] = useState('');
  const { user, login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    const randomVideo = VIDEOS[Math.floor(Math.random() * VIDEOS.length)];
    setVideoSrc(randomVideo);
  }, []);

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
    <div className="min-h-screen w-full relative flex items-center bg-gray-900 font-sans overflow-hidden">
      
      {/* Full Screen Live Background Video */}
      <div className="absolute inset-0 w-full h-full z-0">
        {videoSrc && (
          <video 
            key={videoSrc}
            autoPlay 
            loop 
            muted 
            playsInline 
            className="w-full h-full object-cover opacity-80 animate-in fade-in duration-1000"
          >
            <source src={videoSrc} type="video/mp4" />
          </video>
        )}
        {/* Modern dark gradient overlay to ensure text/form readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent" />
        <div className="absolute inset-0 bg-black/20 md:hidden" /> {/* Extra dark on mobile for readability */}
      </div>
      
      {/* Container for content */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 lg:px-12 flex flex-col md:flex-row justify-between items-center h-full">
        
        {/* Left Panel: Glassmorphism Login Card */}
        <div className="w-full max-w-[420px] bg-white/95 backdrop-blur-2xl rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.15)] border border-white/20 p-8 sm:p-10 my-8 md:my-0 animate-in fade-in slide-in-from-left-8 duration-700">
          
          <div className="mb-10 text-center md:text-left">
            <div className="bg-white rounded-2xl p-2 inline-block shadow-sm border border-gray-100 mb-6">
               <img src="/logo.png" alt="Ogito Logo" className="h-10 w-auto object-contain px-2" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Sign in</h1>
            <p className="text-gray-500 mt-2 text-[15px] font-medium">Enter your credentials to access the dashboard.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-[13px] font-bold text-gray-700 uppercase tracking-wider">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
                disabled={loading}
                className="h-14 bg-gray-50/80 border-gray-200 focus:bg-white focus:border-black focus:ring-black rounded-xl transition-all shadow-sm text-[16px] px-4 font-medium"
                required
                autoComplete="username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pin" className="text-[13px] font-bold text-gray-700 uppercase tracking-wider">PIN Code</Label>
              <Input
                id="pin"
                type="password"
                inputMode="numeric"
                placeholder="••••••"
                maxLength={6}
                value={pin}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPin(e.target.value.replace(/\D/g, ''))}
                disabled={loading}
                className="h-14 font-mono tracking-[0.3em] bg-gray-50/80 border-gray-200 focus:bg-white focus:border-black focus:ring-black rounded-xl transition-all shadow-sm text-xl px-4 font-bold"
                required
                autoComplete="current-password"
              />
            </div>

            <div className={`overflow-hidden transition-all duration-300 ${error ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'}`}>
              {error && (
                <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-[14px] font-medium rounded-xl flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-red-600 shrink-0 animate-pulse" />
                  <p>{error}</p>
                </div>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full h-14 bg-black hover:bg-gray-900 text-white text-[16px] font-semibold rounded-xl transition-all mt-4 flex items-center justify-center group shadow-[0_8px_20px_rgba(0,0,0,0.15)] hover:shadow-[0_12px_25px_rgba(0,0,0,0.2)] active:scale-[0.98] overflow-hidden relative" 
              disabled={loading}
            >
              <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin text-white/80" />
              ) : (
                <>
                  Sign In to Continue
                  <ArrowRight className="ml-2 h-5 w-5 opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-transform duration-300" />
                </>
              )}
            </Button>
          </form>
          
          <div className="mt-8 pt-6 border-t border-gray-100 text-center md:text-left hidden md:block">
            <a 
              href="https://www.instagram.com/ogitofoods/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center text-[14px] font-medium text-gray-500 hover:text-black transition-colors group"
            >
              <Instagram className="h-5 w-5 mr-2 text-gray-400 group-hover:text-pink-600 transition-colors" />
              Follow @ogitofoods for updates
            </a>
          </div>
        </div>

        {/* Right Panel: Call to Action (Hidden on smaller screens to keep focus on form) */}
        <div className="hidden md:flex flex-col items-end text-right text-white max-w-lg mb-[10vh] animate-in fade-in slide-in-from-right-8 duration-1000 delay-300">
          <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-3xl flex items-center justify-center mb-8 border border-white/20 hover:bg-white/20 transition-all cursor-pointer hover:scale-105 shadow-2xl" onClick={() => window.open('https://www.instagram.com/ogitofoods/', '_blank')}>
            <Instagram className="h-10 w-10 text-white" />
          </div>
          
          <h2 className="text-5xl lg:text-6xl font-bold mb-6 tracking-tight leading-tight drop-shadow-xl">
            Freshness<br/>Delivered.
          </h2>
          
          <p className="text-xl text-white/90 mb-10 font-medium leading-relaxed drop-shadow-md">
            Manage your supply chain and line orders with absolute precision.
          </p>
          
          <a 
            href="https://www.instagram.com/ogitofoods/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="group px-8 py-4 bg-white/10 hover:bg-white text-white hover:text-black backdrop-blur-md rounded-full font-semibold transition-all duration-300 flex items-center border border-white/30 hover:border-white shadow-[0_8px_30px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_40px_rgba(255,255,255,0.2)]"
          >
            <Instagram className="h-5 w-5 mr-2" />
            Explore @ogitofoods
            <ArrowRight className="ml-2 h-5 w-5 opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
          </a>
        </div>
      </div>
      
      <style>{`
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

export default Login;
