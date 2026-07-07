import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Eye, EyeOff, ArrowRight } from 'lucide-react';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate authentication and route to dashboard
    navigate('/dashboard');
  };

  return (
    <main className="flex min-h-screen w-full bg-surface text-on-surface">
      {/* Left Side: Brand Panel */}
      <section className="hidden lg:flex lg:w-1/2 bg-primary relative overflow-hidden flex-col justify-between p-12">
        {/* Dot grid texture */}
        <div 
          className="absolute inset-0 opacity-10 pointer-events-none" 
          style={{ 
            backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', 
            backgroundSize: '32px 32px' 
          }} 
        />
        
        {/* Top Logo Lockup */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-on-primary-container rounded-lg flex items-center justify-center">
              <Briefcase className="w-6 h-6 text-primary" />
            </div>
            <span className="font-headline text-3xl font-extrabold text-white tracking-tight">NPMS</span>
          </div>
        </div>

        {/* Content & Stat Card */}
        <div className="relative z-10 space-y-8">
          <div className="space-y-4">
            <h2 className="font-headline text-4xl font-bold leading-tight text-white max-w-md">
              Enterprise Billing &amp; Invoicing Reimagined.
            </h2>
            <p className="font-sans text-lg text-primary-fixed-dim max-w-sm">
              Access your project portfolios, manage purchase orders, and streamline tax compliance with the industry's most trusted billing infrastructure.
            </p>
          </div>

          {/* Stat Card */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-xl w-fit flex gap-8">
            <div>
              <p className="font-headline text-[10px] text-primary-fixed-dim uppercase tracking-widest font-bold">Active Projects</p>
              <p className="font-headline text-2xl font-bold text-white mt-1">1,284</p>
            </div>
            <div className="w-[1px] bg-white/20" />
            <div>
              <p className="font-headline text-[10px] text-primary-fixed-dim uppercase tracking-widest font-bold">Efficiency</p>
              <p className="font-headline text-2xl font-bold text-white mt-1">99.8%</p>
            </div>
          </div>
        </div>

        {/* Bottom Copyright */}
        <div className="relative z-10">
          <p className="font-headline text-xs text-primary-fixed-dim">
            &copy; 2026 National Project Management Systems. Institutional Reliability.
          </p>
        </div>

        {/* Background Glow */}
        <div className="absolute bottom-[-10%] right-[-10%] w-[80%] h-[80%] opacity-20 pointer-events-none">
          <div className="w-full h-full rounded-full border-[60px] border-white/10" />
        </div>
      </section>

      {/* Right Side: Login Form */}
      <section className="w-full lg:w-1/2 flex items-center justify-center bg-surface p-6 md:p-12">
        <div className="w-full max-w-[440px] space-y-10">
          {/* Header */}
          <div className="space-y-3">
            <div className="lg:hidden mb-8">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white">
                  <Briefcase className="w-5 h-5" />
                </div>
                <span className="font-headline text-2xl font-extrabold text-on-surface">NPMS</span>
              </div>
            </div>
            <h1 className="font-headline text-3xl font-bold text-on-surface">Welcome back</h1>
            <p className="font-sans text-sm text-secondary">Please enter your institutional credentials to continue.</p>
          </div>

          {/* Form */}
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Email Field */}
            <div className="space-y-2">
              <label className="font-headline text-xs font-semibold text-secondary uppercase tracking-wider" htmlFor="email">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                className="w-full"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="font-headline text-xs font-semibold text-secondary uppercase tracking-wider" htmlFor="password">
                  Password
                </label>
                <a href="#" className="font-headline text-xs font-semibold text-primary hover:underline">
                  Forgot password?
                </a>
              </div>
              <div className="relative group">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="w-full pr-12"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center gap-2">
              <input
                id="remember"
                type="checkbox"
                className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary focus:bg-white"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <label htmlFor="remember" className="font-sans text-sm text-secondary select-none">
                Remember this device for 30 days
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full bg-primary hover:bg-primary-container text-on-primary font-headline text-sm font-semibold h-10 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm"
            >
              <span>Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Contact Admin */}
          <div className="border-t border-outline-variant pt-6 text-center">
            <p className="font-sans text-sm text-secondary">
              Don't have an account? <a href="#" className="text-primary hover:underline font-semibold">Contact your administrator</a>
            </p>
          </div>

          {/* Links footer */}
          <div className="flex justify-center gap-6 font-headline text-[10px] text-secondary font-bold tracking-widest pt-4">
            <a href="#" className="hover:text-on-surface transition-colors">PRIVACY POLICY</a>
            <a href="#" className="hover:text-on-surface transition-colors">SECURITY</a>
            <a href="#" className="hover:text-on-surface transition-colors font-bold">TERMS</a>
          </div>
        </div>
      </section>
    </main>
  );
};
