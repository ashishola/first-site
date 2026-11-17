import React, { useState } from 'react';
import { KeyRound, Lock, Mail, Phone, Store, User as UserIcon, X } from 'lucide-react';
import { apiRequest, setAuthToken } from '../lib/api.ts';
import { useStore } from '../context/StoreContext.tsx';

export function AuthModal() {
  const {
    loginModalOpen,
    setLoginModalOpen,
    loginModalMode,
    setLoginModalMode,
    login,
    register,
    user,
    refreshUser,
    navigate,
    showToast,
  } = useStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [storeName, setStoreName] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [forgotStep, setForgotStep] = useState<'email' | 'verify'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!loginModalOpen) return null;

  const close = () => {
    setLoginModalOpen(false);
    setError('');
    setForgotStep('email');
    setGeneratedCode('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      close();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(name, email, password, phone);
      close();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiRequest<{ message: string; verificationCode: string }>(
        '/api/auth/forgot-password',
        { method: 'POST', body: JSON.stringify({ email }) }
      );
      setGeneratedCode(res.verificationCode);
      setResetCode(res.verificationCode);
      setForgotStep('verify');
      showToast('Verification code generated', 'info');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await apiRequest('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email, code: resetCode, newPassword }),
      });
      showToast('Password updated! Please sign in.');
      setLoginModalMode('login');
      setForgotStep('email');
      setPassword('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleBecomeSeller = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!user) {
      setError('Please sign in or create an account first to open your seller console.');
      return;
    }
    setLoading(true);
    try {
      const res = await apiRequest<{ token: string }>('/api/auth/become-seller', {
        method: 'POST',
        body: JSON.stringify({ storeName, phone }),
      });
      setAuthToken(res.token);
      await refreshUser();
      close();
      showToast('Seller Console activated!');
      navigate('/admin');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-[2px] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl overflow-hidden grid grid-cols-1 md:grid-cols-5">
        {/* Left Brand Panel */}
        <div className="md:col-span-2 bg-[#2874F0] text-white p-6 flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#FFE500]">
              ShopKart Account
            </p>
            <h2 className="font-display text-2xl font-bold mt-2 leading-tight">
              {loginModalMode === 'login' && 'Welcome Back'}
              {loginModalMode === 'register' && 'Create Account'}
              {loginModalMode === 'forgot' && 'Reset Password'}
              {loginModalMode === 'seller' && 'Sell on ShopKart'}
            </h2>
            <p className="text-sm text-blue-100 mt-2 leading-relaxed">
              {loginModalMode === 'login' &&
                'Access your orders, saved addresses, wishlist, and instant checkout.'}
              {loginModalMode === 'register' &&
                'Sign up in seconds to unlock wishlist sync, order tracking, and exclusive coupons.'}
              {loginModalMode === 'forgot' &&
                'Verify your registered email to set a fresh password securely.'}
              {loginModalMode === 'seller' &&
                'Manage products, inventory, coupons, and live orders directly from the Admin Console.'}
            </p>
          </div>

          <div className="mt-8 pt-4 border-t border-white/20 text-xs text-blue-100 space-y-1">
            <p className="font-semibold text-white">Protected by JWT Auth</p>
            <p>Encrypted passwords & verified payments</p>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="md:col-span-3 p-6 relative">
          <button
            type="button"
            onClick={close}
            aria-label="Close modal"
            className="absolute top-4 right-4 p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>

          {error && (
            <div className="mb-4 p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {error}
            </div>
          )}

          {loginModalMode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#2874F0]"
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-600">Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setError('');
                      setLoginModalMode('forgot');
                    }}
                    className="text-xs font-medium text-[#2874F0] hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#2874F0]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-md bg-[#FB641B] hover:bg-[#e55612] text-white font-semibold text-sm transition-colors disabled:opacity-60"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>

              {/* Quick Demo Fillers */}
              <div className="pt-3 border-t border-slate-100">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Quick Demo Accounts
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => fillDemo('rahul.sharma@example.com', 'Customer@123')}
                    className="py-1.5 px-2.5 rounded border border-slate-200 hover:border-[#2874F0] text-xs font-medium text-slate-700 hover:text-[#2874F0] transition-colors"
                  >
                    Fill Customer
                  </button>
                  <button
                    type="button"
                    onClick={() => fillDemo('ashishola2009@gmail.com', 'Admin@123')}
                    className="py-1.5 px-2.5 rounded border border-slate-200 hover:border-[#2874F0] text-xs font-medium text-slate-700 hover:text-[#2874F0] transition-colors"
                  >
                    Fill Admin
                  </button>
                </div>
              </div>

              <p className="text-center text-xs text-slate-600 pt-2">
                New to ShopKart?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setLoginModalMode('register');
                  }}
                  className="font-semibold text-[#2874F0] hover:underline"
                >
                  Create an account
                </button>
              </p>
            </form>
          )}

          {loginModalMode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Priya Verma"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#2874F0]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="priya@example.com"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#2874F0]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Mobile Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#2874F0]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Password (min 6 chars)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#2874F0]"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-md bg-[#FB641B] hover:bg-[#e55612] text-white font-semibold text-sm transition-colors disabled:opacity-60"
              >
                {loading ? 'Creating Account...' : 'Sign Up & Continue'}
              </button>
              <p className="text-center text-xs text-slate-600 pt-1">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setLoginModalMode('login');
                  }}
                  className="font-semibold text-[#2874F0] hover:underline"
                >
                  Sign In
                </button>
              </p>
            </form>
          )}

          {loginModalMode === 'forgot' && (
            <div className="space-y-4">
              {forgotStep === 'email' ? (
                <form onSubmit={handleForgotEmail} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Registered Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="rahul.sharma@example.com"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#2874F0]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 rounded-md bg-[#2874F0] hover:bg-blue-700 text-white font-semibold text-sm"
                  >
                    {loading ? 'Generating Code...' : 'Send Verification Code'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-3.5">
                  {generatedCode && (
                    <div className="p-2.5 rounded bg-blue-50 border border-blue-200 text-xs text-[#2874F0]">
                      Verification code: <strong className="font-mono-num">{generatedCode}</strong>
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      6-Digit Verification Code
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        required
                        value={resetCode}
                        onChange={(e) => setResetCode(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-md font-mono-num"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 rounded-md bg-[#FB641B] text-white font-semibold text-sm"
                  >
                    {loading ? 'Updating...' : 'Update Password'}
                  </button>
                </form>
              )}
              <button
                type="button"
                onClick={() => setLoginModalMode('login')}
                className="text-xs font-semibold text-[#2874F0] hover:underline"
              >
                Back to Sign In
              </button>
            </div>
          )}

          {loginModalMode === 'seller' && (
            <form onSubmit={handleBecomeSeller} className="space-y-4">
              {!user && (
                <div className="p-3 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-900">
                  Sign in first (or create a customer account), then register your store name to unlock the Seller & Admin Console.{' '}
                  <button
                    type="button"
                    onClick={() => setLoginModalMode('login')}
                    className="font-semibold underline text-[#2874F0]"
                  >
                    Sign In Now
                  </button>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Business / Store Name
                </label>
                <div className="relative">
                  <Store className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="Apex Retail Studio"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#2874F0]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Seller Contact Phone
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98110 44210"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#2874F0]"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !user}
                className="w-full py-2.5 px-4 rounded-md bg-[#2874F0] hover:bg-blue-700 text-white font-semibold text-sm transition-colors disabled:opacity-50"
              >
                {loading ? 'Activating...' : 'Launch Seller Console'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
