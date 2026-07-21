import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, ArrowRight, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from '../lib/toast';
import { api } from '../lib/api';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, verifyMfa, setSession } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // MFA states
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaToken, setMfaToken] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);

  // Forced Password Change states
  const [requiresPasswordChange, setRequiresPasswordChange] = useState(false);
  const [changeTempToken, setChangeTempToken] = useState('');
  const [requiredNewPassword, setRequiredNewPassword] = useState('');
  const [requiredConfirmPassword, setRequiredConfirmPassword] = useState('');

  // Forgot Password states
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const [forgotStep, setForgotStep] = useState<'username' | 'otp' | 'reset'>('username');
  const [forgotUsername, setForgotUsername] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleForgotUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotUsername) {
      toast.error('Username is required');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: forgotUsername })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to request OTP');
      }
      toast.success('An OTP code has been sent to your registered email address.');
      setForgotStep('otp');
    } catch (err: any) {
      toast.error(err.message || 'Failed to request OTP');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode) {
      toast.error('OTP code is required');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: forgotUsername, code: otpCode })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to verify OTP');
      }
      const data = await res.json();
      if (data.resetToken) {
        setResetToken(data.resetToken);
        toast.success('OTP verified successfully.');
        setForgotStep('reset');
      } else if (data.accessToken && data.user) {
        setSession(data.accessToken, data.user);
        toast.success('Signed in via one-time code');
        navigate('/dashboard');
      } else {
        throw new Error('Invalid server response');
      }
    } catch (err: any) {
      toast.error(err.message || 'Verification failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      toast.error('Both password fields are required');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetToken, newPassword })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to reset password');
      }
      toast.success('Password updated successfully. Please sign in with your new password.');
      setForgotPasswordMode(false);
      setForgotStep('username');
      setForgotUsername('');
      setOtpCode('');
      setResetToken('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.message || 'Password reset failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const data = await login(email, password);
      if (data && data.requiresPasswordChange) {
        setRequiresPasswordChange(true);
        setChangeTempToken(data.tempToken);
        setRequiredNewPassword('');
        setRequiredConfirmPassword('');
        toast.info('You must set a new password before continuing.');
      } else if (data && data.mfaRequired) {
        setMfaRequired(true);
        setMfaToken(data.mfaToken);
        setMfaCode('');
        toast.info('Two-Factor Authentication is required for superadmin accounts');
      } else {
        toast.success('Signed in successfully — welcome back!');
        navigate('/dashboard');
      }
    } catch (err: any) {
      toast.error(`Login failed — ${err.message || 'Invalid username or password'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequiredPasswordChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requiredNewPassword || !requiredConfirmPassword) {
      toast.error('Both password fields are required');
      return;
    }
    if (requiredNewPassword !== requiredConfirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (requiredNewPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }
    setIsSubmitting(true);
    try {
      const data = await api.changeRequiredPassword(changeTempToken, requiredNewPassword);
      if (data.accessToken && data.user) {
        setSession(data.accessToken, data.user);
        toast.success('Password updated successfully — welcome to NPMS!');
        navigate('/dashboard');
      } else {
        throw new Error('Failed to update password');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update password');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaCode) {
      toast.error('Code is required');
      return;
    }
    setIsSubmitting(true);
    try {
      await verifyMfa(mfaToken, mfaCode);
      toast.success('Signed in successfully — welcome back!');
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(`MFA verification failed — ${err.message || 'Invalid code'}`);
    } finally {
      setIsSubmitting(false);
    }
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
                src="/logo.png" 
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
            {requiresPasswordChange ? (
              <>
                <div className="space-y-1.5">
                  <h1 className="font-headline text-3xl font-extrabold text-[#14335C] tracking-tight">
                    Set New Password
                  </h1>
                  <p className="font-sans text-xs text-[#6B7280]">
                    Your account requires a password change before proceeding.
                  </p>
                </div>

                <form className="space-y-4" onSubmit={handleRequiredPasswordChangeSubmit} aria-label="Required password change form">
                  <div className="relative group">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#0D9488] transition-colors pointer-events-none">
                      <Lock className="w-5 h-5" />
                    </div>
                    <input 
                      id="requiredNewPassword"
                      type="password"
                      required
                      placeholder="New Password (min 6 chars)"
                      value={requiredNewPassword}
                      onChange={(e) => setRequiredNewPassword(e.target.value)}
                      className="w-full h-12 pl-11 pr-4 rounded-xl bg-[#F3F4F6] text-sm text-[#14335C] placeholder-gray-400 border-none outline-none focus:bg-white focus:ring-2 focus:ring-[#0D9488] transition-all"
                      aria-label="New Password"
                    />
                  </div>

                  <div className="relative group">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#0D9488] transition-colors pointer-events-none">
                      <Lock className="w-5 h-5" />
                    </div>
                    <input 
                      id="requiredConfirmPassword"
                      type="password"
                      required
                      placeholder="Confirm New Password"
                      value={requiredConfirmPassword}
                      onChange={(e) => setRequiredConfirmPassword(e.target.value)}
                      className="w-full h-12 pl-11 pr-4 rounded-xl bg-[#F3F4F6] text-sm text-[#14335C] placeholder-gray-400 border-none outline-none focus:bg-white focus:ring-2 focus:ring-[#0D9488] transition-all"
                      aria-label="Confirm New Password"
                    />
                  </div>

                  <div className="space-y-4 pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full h-12 bg-[#0D9488] hover:bg-[#0F766E] text-white font-headline text-sm font-semibold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488] focus-visible:ring-offset-2"
                    >
                      {isSubmitting ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" aria-hidden="true" />
                          <span>Updating Password...</span>
                        </>
                      ) : (
                        <>
                          <span>Save &amp; Continue</span>
                          <ArrowRight className="w-4 h-4" aria-hidden="true" />
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRequiresPasswordChange(false);
                        setChangeTempToken('');
                      }}
                      className="w-full h-12 border border-gray-300 text-gray-700 hover:bg-gray-50 font-headline text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all"
                    >
                      <span>Back to Sign In</span>
                    </button>
                  </div>
                </form>
              </>
            ) : forgotPasswordMode ? (
              <>
                {forgotStep === 'username' && (
                  <>
                    <div className="space-y-1.5">
                      <h1 className="font-headline text-3xl font-extrabold text-[#14335C] tracking-tight">
                        Forgot Password
                      </h1>
                      <p className="font-sans text-xs text-[#6B7280]">
                        Enter your username to request a verification OTP
                      </p>
                    </div>

                    <form className="space-y-4" onSubmit={handleForgotUsernameSubmit} aria-label="Forgot password form">
                      {/* Username Input */}
                      <div className="relative group">
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#0D9488] transition-colors pointer-events-none">
                          <User className="w-5 h-5" />
                        </div>
                        <input 
                          id="forgotUsername"
                          type="text"
                          required
                          placeholder="Username"
                          value={forgotUsername}
                          onChange={(e) => setForgotUsername(e.target.value)}
                          autoComplete="username"
                          className="w-full h-12 pl-11 pr-4 rounded-xl bg-[#F3F4F6] text-sm text-[#14335C] placeholder-gray-400 border-none outline-none focus:bg-white focus:ring-2 focus:ring-[#0D9488] transition-all"
                          aria-label="Username"
                        />
                      </div>

                      <div className="space-y-4 pt-2">
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="w-full h-12 bg-[#0D9488] hover:bg-[#0F766E] text-white font-headline text-sm font-semibold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488] focus-visible:ring-offset-2"
                        >
                          {isSubmitting ? (
                            <>
                              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" aria-hidden="true" />
                              <span>Sending OTP...</span>
                            </>
                          ) : (
                            <>
                              <span>Request OTP</span>
                              <ArrowRight className="w-4 h-4" aria-hidden="true" />
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setForgotPasswordMode(false);
                            setForgotStep('username');
                          }}
                          className="w-full h-12 border border-gray-300 text-gray-700 hover:bg-gray-50 font-headline text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all"
                        >
                          <span>Back to Sign In</span>
                        </button>
                      </div>
                    </form>
                  </>
                )}

                {forgotStep === 'otp' && (
                  <>
                    <div className="space-y-1.5">
                      <h1 className="font-headline text-3xl font-extrabold text-[#14335C] tracking-tight">
                        Verify OTP
                      </h1>
                      <p className="font-sans text-xs text-[#6B7280]">
                        Enter the 6-digit OTP code sent to your email
                      </p>
                    </div>

                    <form className="space-y-4" onSubmit={handleForgotOtpSubmit} aria-label="OTP verification form">
                      {/* OTP Input */}
                      <div className="relative group">
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#0D9488] transition-colors pointer-events-none">
                          <Lock className="w-5 h-5" />
                        </div>
                        <input 
                          id="otpCode"
                          type="text"
                          required
                          maxLength={6}
                          placeholder="6-digit OTP code"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                          className="w-full h-12 pl-11 pr-4 rounded-xl bg-[#F3F4F6] text-sm text-[#14335C] placeholder-gray-400 border-none outline-none focus:bg-white focus:ring-2 focus:ring-[#0D9488] transition-all font-mono tracking-widest text-center text-lg font-bold"
                          aria-label="OTP Code"
                        />
                      </div>

                      <div className="space-y-4 pt-2">
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="w-full h-12 bg-[#0D9488] hover:bg-[#0F766E] text-white font-headline text-sm font-semibold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488] focus-visible:ring-offset-2"
                        >
                          {isSubmitting ? (
                            <>
                              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" aria-hidden="true" />
                              <span>Verifying...</span>
                            </>
                          ) : (
                            <>
                              <span>Verify Code</span>
                              <ArrowRight className="w-4 h-4" aria-hidden="true" />
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => setForgotStep('username')}
                          className="w-full h-12 border border-gray-300 text-gray-700 hover:bg-gray-50 font-headline text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all"
                        >
                          <span>Back</span>
                        </button>
                      </div>
                    </form>
                  </>
                )}

                {forgotStep === 'reset' && (
                  <>
                    <div className="space-y-1.5">
                      <h1 className="font-headline text-3xl font-extrabold text-[#14335C] tracking-tight">
                        Reset Password
                      </h1>
                      <p className="font-sans text-xs text-[#6B7280]">
                        Enter your new password below
                      </p>
                    </div>

                    <form className="space-y-4" onSubmit={handleForgotResetSubmit} aria-label="Reset password form">
                      {/* New Password */}
                      <div className="relative group">
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#0D9488] transition-colors pointer-events-none">
                          <Lock className="w-5 h-5" />
                        </div>
                        <input 
                          id="newPassword"
                          type="password"
                          required
                          placeholder="New Password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full h-12 pl-11 pr-4 rounded-xl bg-[#F3F4F6] text-sm text-[#14335C] placeholder-gray-400 border-none outline-none focus:bg-white focus:ring-2 focus:ring-[#0D9488] transition-all"
                          aria-label="New Password"
                        />
                      </div>

                      {/* Confirm Password */}
                      <div className="relative group">
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#0D9488] transition-colors pointer-events-none">
                          <Lock className="w-5 h-5" />
                        </div>
                        <input 
                          id="confirmPassword"
                          type="password"
                          required
                          placeholder="Confirm New Password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full h-12 pl-11 pr-4 rounded-xl bg-[#F3F4F6] text-sm text-[#14335C] placeholder-gray-400 border-none outline-none focus:bg-white focus:ring-2 focus:ring-[#0D9488] transition-all"
                          aria-label="Confirm Password"
                        />
                      </div>

                      <div className="space-y-4 pt-2">
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="w-full h-12 bg-[#0D9488] hover:bg-[#0F766E] text-white font-headline text-sm font-semibold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488] focus-visible:ring-offset-2"
                        >
                          {isSubmitting ? (
                            <>
                              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" aria-hidden="true" />
                              <span>Updating Password...</span>
                            </>
                          ) : (
                            <>
                              <span>Reset Password</span>
                              <ArrowRight className="w-4 h-4" aria-hidden="true" />
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </>
                )}
              </>
            ) : !mfaRequired ? (
              <>
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
                        setForgotUsername(email);
                        setForgotPasswordMode(true);
                        setForgotStep('username');
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
                  </div>
                </form>
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                  <h1 className="font-headline text-3xl font-extrabold text-[#14335C] tracking-tight">
                    Security Verification
                  </h1>
                  <p className="font-sans text-xs text-[#6B7280]">
                    Enter the code from your authenticator app to complete sign in
                  </p>
                </div>

                {/* MFA Form */}
                <form className="space-y-4" onSubmit={handleMfaSubmit} aria-label="MFA verification form">
                  
                  {/* Verification Code Input */}
                  <div className="relative group">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#0D9488] transition-colors pointer-events-none">
                      <Lock className="w-5 h-5" />
                    </div>
                    <input 
                      id="mfaCode"
                      type="text"
                      required
                      maxLength={useBackupCode ? 10 : 6}
                      placeholder={useBackupCode ? "10-character backup code" : "6-digit verification code"}
                      value={mfaCode}
                      onChange={(e) => setMfaCode(useBackupCode ? e.target.value : e.target.value.replace(/\D/g, ''))}
                      className="w-full h-12 pl-11 pr-4 rounded-xl bg-[#F3F4F6] text-sm text-[#14335C] placeholder-gray-400 border-none outline-none focus:bg-white focus:ring-2 focus:ring-[#0D9488] transition-all font-mono tracking-widest text-center text-lg font-bold"
                      aria-label="Verification Code"
                    />
                  </div>

                  {/* Backup Code Toggle */}
                  <div className="flex items-center justify-between text-xs select-none">
                    <button 
                      type="button"
                      onClick={() => {
                        setUseBackupCode(!useBackupCode);
                        setMfaCode('');
                      }}
                      className="font-headline font-bold text-[#0D9488] hover:underline"
                    >
                      {useBackupCode ? "Use standard 6-digit TOTP" : "Use a backup code instead"}
                    </button>
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
                          <span>Verifying code...</span>
                        </>
                      ) : (
                        <>
                          <span>Verify & Sign In</span>
                          <ArrowRight className="w-4 h-4" aria-hidden="true" />
                        </>
                      )}
                    </button>

                    {/* Back Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setMfaRequired(false);
                        setMfaToken('');
                        setMfaCode('');
                      }}
                      className="w-full h-12 border border-gray-300 text-gray-700 hover:bg-gray-50 font-headline text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all"
                    >
                      <span>Back to Sign In</span>
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>



        </section>
      </div>
    </main>
  );
};
