import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, ArrowRight, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from '../lib/toast';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await login(email, password);
      toast.success('Signed in successfully — welcome back!');
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(`Login failed — ${err.message || 'Invalid username or password'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSSOLogin = () => {
    toast.info('Single Sign-On (SSO) integration is coming soon.');
  };

  return (
    <main className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 md:p-8 bg-gradient-to-br from-[#0B1F3F] to-[#1B3E7A] font-sans antialiased overflow-y-auto">
      {/* ─── Main Content Split Card ─── */}
      <div className="w-full max-w-[1000px] min-h-[600px] bg-white rounded-3xl shadow-[0_20px_50px_rgba(11,31,63,0.25)] overflow-hidden flex flex-col md:flex-row transition-all duration-300">
        
        {/* Left Side: Brand Panel */}
        <section 
          className="w-full md:w-[45%] bg-gradient-to-br from-[#14335C] to-[#1B3E7A] relative overflow-hidden flex flex-col justify-between p-8 lg:p-10 text-white select-none shrink-0"
        >
          {/* Subtle abstract line/dot network background pattern in the corners */}
          <div className="absolute inset-0 opacity-20 pointer-events-none" aria-hidden="true">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              {/* Nodes and Connection Lines */}
              <circle cx="15%" cy="15%" r="3" fill="#2DD4BF" />
              <circle cx="35%" cy="20%" r="4" fill="#ffffff" />
              <circle cx="10%" cy="40%" r="3" fill="#ffffff" />
              <line x1="15%" y1="15%" x2="35%" y2="20%" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
              <line x1="15%" y1="15%" x2="10%" y2="40%" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />

              <circle cx="90%" cy="85%" r="4" fill="#2DD4BF" />
              <circle cx="75%" cy="70%" r="3" fill="#ffffff" />
              <circle cx="85%" cy="60%" r="4" fill="#ffffff" />
              <line x1="90%" y1="85%" x2="75%" y2="70%" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
              <line x1="90%" y1="85%" x2="85%" y2="60%" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
            </svg>
          </div>

          {/* Top Logo Chip */}
          <div className="relative z-10 self-start">
            <div className="bg-white rounded-lg p-2 flex items-center justify-center shadow-md">
              <img 
                src="/nicsilogo.jpg.jpeg" 
                alt="NICSI Logo" 
                className="h-8 object-contain"
              />
            </div>
          </div>

          {/* Center Brand Text */}
          <div className="relative z-10 my-10 md:my-0 space-y-6">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#A8C1E0] block">
              PROJECT MONITORING SYSTEM
            </span>
            <h2 className="font-headline text-3xl lg:text-4xl font-extrabold leading-tight text-white tracking-tight">
              Welcome to NPMS
            </h2>
            <p className="font-sans text-sm text-[#C5D5EC] leading-relaxed">
              Billing &amp; Invoice Management for NICSI Zonal Office Operations.
            </p>

            {/* Feature List */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-white/90">
                <span className="w-5 h-5 rounded-full bg-[#2DD4BF]/10 flex items-center justify-center text-[#2DD4BF] shrink-0">
                  <Check className="w-3.5 h-3.5" />
                </span>
                <span>Project &amp; Purchase Order tracking</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-white/90">
                <span className="w-5 h-5 rounded-full bg-[#2DD4BF]/10 flex items-center justify-center text-[#2DD4BF] shrink-0">
                  <Check className="w-3.5 h-3.5" />
                </span>
                <span>Tax invoice management</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-white/90">
                <span className="w-5 h-5 rounded-full bg-[#2DD4BF]/10 flex items-center justify-center text-[#2DD4BF] shrink-0">
                  <Check className="w-3.5 h-3.5" />
                </span>
                <span>Secure role-based access</span>
              </div>
            </div>
          </div>

          {/* Zonal Credibility Info */}
          <div className="relative z-10 pt-4 border-t border-white/10">
            <p className="font-sans text-[10px] text-[#8FA8CC] leading-relaxed">
              A Section 8 Company under NIC, MeitY, Government of India
            </p>
          </div>
        </section>

        {/* Right Side: Form Panel */}
        <section 
          className="flex-1 bg-white p-8 sm:p-10 md:p-12 lg:p-14 flex flex-col justify-between relative"
        >
          {/* Top Lockup Row */}
          <div className="flex items-center justify-end text-xs text-gray-400 font-semibold gap-2 z-10 mb-6 md:mb-0 select-none">
            <img 
              src="/government_of_india_official_logo.jpg" 
              alt="Government of India Emblem" 
              className="h-6 object-contain mix-blend-multiply"
            />
            <span className="text-[#6B7280]">Government of India</span>
          </div>

          {/* Center Form Section */}
          <div className="space-y-6 my-auto max-w-[380px] w-full mx-auto">
            <div className="space-y-1.5">
              <h1 className="font-headline text-3xl font-extrabold text-[#14335C] tracking-tight">
                Sign in
              </h1>
              <p className="font-sans text-xs text-[#6B7280]">
                Enter your credentials to access the dashboard
              </p>
            </div>

            {/* Form inputs */}
            <form className="space-y-4" onSubmit={handleSubmit} aria-label="Login form">
              
              {/* Username Input */}
              <div className="relative group">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#0D9488] transition-colors pointer-events-none">
                  <User className="w-5 h-5" />
                </div>
                <input 
                  id="username"
                  type="text"
                  required
                  placeholder="Username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  className="w-full h-12 pl-11 pr-4 rounded-xl bg-[#F3F4F6] text-sm text-[#14335C] placeholder-gray-400 border-none outline-none focus:bg-white focus:ring-2 focus:ring-[#0D9488] transition-all"
                  aria-label="Username"
                />
              </div>

              {/* Password Input */}
              <div className="relative group">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#0D9488] transition-colors pointer-events-none">
                  <Lock className="w-5 h-5" />
                </div>
                <input 
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full h-12 pl-11 pr-16 rounded-xl bg-[#F3F4F6] text-sm text-[#14335C] placeholder-gray-400 border-none outline-none focus:bg-white focus:ring-2 focus:ring-[#0D9488] transition-all"
                  aria-label="Password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 font-headline text-xs font-bold text-[#0D9488] hover:text-[#0F766E] transition-colors focus:outline-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>

              {/* Checkbox Row */}
              <div className="flex items-center justify-between text-xs select-none">
                <div className="flex items-center gap-2 cursor-pointer">
                  <input 
                    id="remember"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-[#E2E8F0] text-[#0D9488] focus:ring-[#0D9488] cursor-pointer"
                  />
                  <label htmlFor="remember" className="text-[#6B7280] cursor-pointer font-sans">
                    Remember me
                  </label>
                </div>
                <a 
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    toast.info('Please contact your zonal administrator to reset credentials.');
                  }}
                  className="font-headline font-bold text-[#0D9488] hover:underline"
                >
                  Forgot Password?
                </a>
              </div>

              {/* Action Buttons */}
              <div className="space-y-4 pt-2">
                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-12 bg-[#0D9488] hover:bg-[#0F766E] text-white font-headline text-sm font-semibold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488] focus-visible:ring-offset-2"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" aria-hidden="true" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </>
                  )}
                </button>

                {/* Divider Row */}
                <div className="relative flex py-1 items-center select-none">
                  <div className="flex-grow border-t border-gray-100"></div>
                  <span className="flex-shrink mx-3 text-[10px] text-gray-400 uppercase tracking-widest font-bold">Or</span>
                  <div className="flex-grow border-t border-gray-100"></div>
                </div>

                {/* SSO Button */}
                <button
                  type="button"
                  onClick={handleSSOLogin}
                  className="w-full h-12 border border-[#1B3E7A] text-[#1B3E7A] hover:bg-[#1B3E7A]/5 font-headline text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all"
                >
                  <span>Sign in with Government SSO</span>
                </button>
              </div>
            </form>
          </div>

          {/* Bottom Lockup */}
          <div className="text-center text-xs text-gray-400 font-medium pt-6 select-none md:mt-0">
            <span>Need access? </span>
            <a 
              href="#"
              onClick={(e) => {
                e.preventDefault();
                toast.info('Access requests must be approved by the zonal NICSI coordinator.');
              }}
              className="text-[#0D9488] hover:underline font-bold"
            >
              Contact your administrator
            </a>
          </div>

        </section>
      </div>
    </main>
  );
};
