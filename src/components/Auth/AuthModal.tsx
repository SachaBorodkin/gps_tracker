import React, { useState, useEffect } from 'react';
import { getSupabaseClient, isSupabaseConfigured, updateSupabaseCredentials, clearSupabaseCredentials } from '../../lib/supabase';
import { UserProfile } from '../../types';
import { 
  User, 
  Key, 
  LogIn, 
  UserPlus, 
  LogOut, 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  ExternalLink,
  ShieldAlert
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile | null;
  onAuthChange: (profile: UserProfile | null) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  profile,
  onAuthChange,
}) => {
  const [activeTab, setActiveTab] = useState<'auth' | 'supabase_config'>('auth');
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Custom Supabase Credentials inputs
  const [customUrl, setCustomUrl] = useState('');
  const [customKey, setCustomKey] = useState('');
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    setIsConfigured(isSupabaseConfigured());
    setCustomUrl(localStorage.getItem('fog_supabase_url') || import.meta.env.VITE_SUPABASE_URL || '');
    setCustomKey(localStorage.getItem('fog_supabase_anon_key') || import.meta.env.VITE_SUPABASE_ANON_KEY || '');
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    const supabase = getSupabaseClient();
    if (!supabase) {
      setMessage({
        type: 'error',
        text: 'Supabase credentials missing! Please configure your Supabase URL and Anon Key in the "Supabase Setup" tab.',
      });
      setActiveTab('supabase_config');
      return;
    }

    setLoading(true);
    try {
      if (isLoginMode) {
        // Sign In
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        if (data.user) {
          setMessage({ type: 'success', text: 'Welcome back! Signed in successfully.' });
          onAuthChange({
            id: data.user.id,
            email: data.user.email || '',
            displayName: data.user.user_metadata?.display_name || data.user.email?.split('@')[0] || 'Explorer',
            totalDistanceMeters: 0,
            totalDurationSeconds: 0,
            totalTripsCount: 0,
            exploredAreaSqm: 0,
            explorationLevel: 1,
            settings: {
              fogRadiusMeters: 35,
              fogOpacity: 0.8,
              fogColor: '#0a0e17',
              pathColor: '#00f2fe',
              highAccuracyGPS: true,
              minDistanceFilterMeters: 3,
              theme: 'dark',
              defaultMapLayer: 'carto-dark',
              units: 'metric',
              autoCenterMap: true,
            },
          });
          setTimeout(onClose, 800);
        }
      } else {
        // Sign Up
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: displayName || email.split('@')[0],
            },
          },
        });
        if (error) throw error;

        if (data.user) {
          setMessage({ type: 'success', text: 'Account created! Signed in successfully.' });
          onAuthChange({
            id: data.user.id,
            email: data.user.email || '',
            displayName: displayName || email.split('@')[0],
            totalDistanceMeters: 0,
            totalDurationSeconds: 0,
            totalTripsCount: 0,
            exploredAreaSqm: 0,
            explorationLevel: 1,
            settings: {
              fogRadiusMeters: 35,
              fogOpacity: 0.8,
              fogColor: '#0a0e17',
              pathColor: '#00f2fe',
              highAccuracyGPS: true,
              minDistanceFilterMeters: 3,
              theme: 'dark',
              defaultMapLayer: 'carto-dark',
              units: 'metric',
              autoCenterMap: true,
            },
          });
          setTimeout(onClose, 800);
        }
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Authentication error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    onAuthChange(null);
    setMessage({ type: 'success', text: 'Signed out. Offline mode active.' });
  };

  const handleSaveCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrl || !customKey) {
      setMessage({ type: 'error', text: 'Please fill in both Supabase URL and Anon Key.' });
      return;
    }

    try {
      updateSupabaseCredentials(customUrl, customKey);
      setIsConfigured(true);
      setMessage({ type: 'success', text: 'Supabase credentials connected successfully!' });
      setActiveTab('auth');
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Invalid credentials format.' });
    }
  };

  const handleResetCredentials = () => {
    clearSupabaseCredentials();
    setCustomUrl('');
    setCustomKey('');
    setIsConfigured(false);
    setMessage({ type: 'success', text: 'Supabase configuration cleared.' });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-cyber-card border border-cyber-border rounded-3xl p-6 max-w-md w-full shadow-2xl flex flex-col gap-4 animate-fadeIn relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Explorer Account</h2>
            <p className="text-xs text-slate-400">Supabase Cloud Sync & Profile</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-900/70 p-1 rounded-2xl border border-slate-800">
          <button
            onClick={() => { setActiveTab('auth'); setMessage(null); }}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'auth'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {profile ? 'Profile' : isLoginMode ? 'Sign In' : 'Sign Up'}
          </button>
          <button
            onClick={() => { setActiveTab('supabase_config'); setMessage(null); }}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'supabase_config'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Supabase Setup</span>
          </button>
        </div>

        {/* Feedback Message */}
        {message && (
          <div
            className={`p-3 rounded-2xl text-xs flex items-center gap-2 ${
              message.type === 'success'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
            }`}
          >
            {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
            <span>{message.text}</span>
          </div>
        )}

        {/* TAB 1: User Auth / Profile */}
        {activeTab === 'auth' && (
          <div>
            {profile ? (
              <div className="flex flex-col gap-4 py-2">
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-slate-950 text-lg">
                    {profile.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="text-sm font-bold text-white truncate">{profile.displayName}</div>
                    <div className="text-xs text-slate-400 truncate">{profile.email}</div>
                    <div className="text-[10px] text-cyan-400 mt-0.5">Cloud Sync Active</div>
                  </div>
                </div>

                <button
                  onClick={handleSignOut}
                  className="w-full py-2.5 px-4 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleAuthSubmit} className="flex flex-col gap-3">
                {!isConfigured && (
                  <div className="p-3 bg-amber-500/15 border border-amber-500/40 rounded-2xl text-xs text-amber-200 flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div>
                      <span>No Supabase keys detected. The app works 100% offline! To sync to cloud, click </span>
                      <button
                        type="button"
                        onClick={() => setActiveTab('supabase_config')}
                        className="underline font-bold text-cyan-300"
                      >
                        Supabase Setup
                      </button>
                    </div>
                  </div>
                )}

                {!isLoginMode && (
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-300">Explorer Name</label>
                    <input
                      type="text"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Alex Mercer"
                      className="bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                )}

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-300">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex@example.com"
                    className="bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-300">Password</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  ) : isLoginMode ? (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>Sign In</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Create Account</span>
                    </>
                  )}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => { setIsLoginMode(!isLoginMode); setMessage(null); }}
                    className="text-xs text-slate-400 hover:text-cyan-300 transition-colors"
                  >
                    {isLoginMode ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* TAB 2: Supabase Credentials Setup */}
        {activeTab === 'supabase_config' && (
          <form onSubmit={handleSaveCredentials} className="flex flex-col gap-3">
            <div className="text-xs text-slate-400 leading-relaxed">
              Connect your free ($0) Supabase project to enable cloud synchronization. Follow the instructions in <code className="text-cyan-300 font-mono">SUPABASE_SETUP.md</code> to execute the SQL schema.
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-cyan-400" />
                <span>Supabase Project URL</span>
              </label>
              <input
                type="url"
                required
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="https://xyzcompany.supabase.co"
                className="bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-cyan-400" />
                <span>Supabase Anon / Public Key</span>
              </label>
              <input
                type="text"
                required
                value={customKey}
                onChange={(e) => setCustomKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                className="bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div className="flex gap-2 pt-2">
              {isConfigured && (
                <button
                  type="button"
                  onClick={handleResetCredentials}
                  className="py-2.5 px-3 rounded-xl border border-slate-700 text-slate-400 hover:text-white text-xs font-medium"
                >
                  Clear
                </button>
              )}
              <button
                type="submit"
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500 transition-all"
              >
                Save & Connect Supabase
              </button>
            </div>

            <a
              href="https://supabase.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-cyan-400/80 hover:text-cyan-300 flex items-center justify-center gap-1 mt-1"
            >
              <span>Need a free Supabase project? Sign up here</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </form>
        )}
      </div>
    </div>
  );
};

