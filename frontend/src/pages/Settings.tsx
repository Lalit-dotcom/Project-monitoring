import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Laptop, 
  Globe, 
  Trash2, 
  Copy, 
  Check, 
  AlertTriangle, 
  Smartphone, 
  UserCheck, 
  RefreshCw, 
  Lock,
  Loader2
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { toast } from '../lib/toast';

interface Session {
  id: number;
  deviceLabel: string;
  ipAddress: string;
  createdAt: string;
  lastActiveAt: string;
  isCurrent: boolean;
}

export const Settings: React.FC = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  
  // 2FA states
  const [is2faEnabled, setIs2faEnabled] = useState(false);
  const [setupStep, setSetupStep] = useState<'idle' | 'showing_qr' | 'showing_backup'>('idle');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [totpSecret, setTotpSecret] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [copiedBackup, setCopiedBackup] = useState(false);
  const [passwordForDisable, setPasswordForDisable] = useState('');
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [checking2FA, setChecking2FA] = useState(true);
  const [isSettingUp, setIsSettingUp] = useState(false);

  // Dialog states
  const [revokeSessionId, setRevokeSessionId] = useState<number | null>(null);
  const [showRevokeOthersConfirm, setShowRevokeOthersConfirm] = useState(false);

  const loadSessions = async () => {
    try {
      setSessionsLoading(true);
      const data = await api.getSessions();
      setSessions(data);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load active sessions');
    } finally {
      setSessionsLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
    
    const fetch2faStatus = async () => {
      if (user?.role !== 'superadmin') {
        setChecking2FA(false);
        return;
      }
      try {
        const data = await api.get2FAStatus();
        setIs2faEnabled(data.enabled);
      } catch (e) {
        console.error('Failed to fetch 2FA status:', e);
      } finally {
        setChecking2FA(false);
      }
    };
    fetch2faStatus();
  }, [user]);

  const handleRevokeSession = async () => {
    if (revokeSessionId === null) return;
    try {
      await api.revokeSession(revokeSessionId);
      toast.success('Session revoked successfully');
      loadSessions();
    } catch (err: any) {
      toast.error(err.message || 'Failed to revoke session');
    } finally {
      setRevokeSessionId(null);
    }
  };

  const handleRevokeOthers = async () => {
    try {
      await api.revokeOtherSessions();
      toast.success('All other sessions revoked successfully');
      loadSessions();
    } catch (err: any) {
      toast.error(err.message || 'Failed to revoke other sessions');
    } finally {
      setShowRevokeOthersConfirm(false);
    }
  };

  const handleSetup2FA = async () => {
    if (isSettingUp) return;
    setIsSettingUp(true);
    try {
      const data = await api.setup2FA();
      setQrCodeUrl(data.qrCodeDataUrl);
      setTotpSecret(data.secret);
      setSetupStep('showing_qr');
      setVerificationCode('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to initialize 2FA');
    } finally {
      setIsSettingUp(false);
    }
  };

  const handleConfirm2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode || verificationCode.length < 6) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }
    try {
      const data = await api.confirm2FA(verificationCode);
      setBackupCodes(data.backupCodes);
      setIs2faEnabled(true);
      setSetupStep('showing_backup');
      toast.success('Two-factor authentication enabled successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Verification failed. Try again.');
    }
  };

  const handleDisable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordForDisable) {
      toast.error('Password is required');
      return;
    }
    try {
      await api.disable2FA(passwordForDisable);
      setIs2faEnabled(false);
      setShowDisableModal(false);
      setPasswordForDisable('');
      toast.success('Two-factor authentication disabled');
    } catch (err: any) {
      toast.error(err.message || 'Failed to disable 2FA');
    }
  };

  const copyBackupCodesToClipboard = () => {
    const text = backupCodes.join('\n');
    navigator.clipboard.writeText(text);
    setCopiedBackup(true);
    toast.success('Backup codes copied to clipboard');
    setTimeout(() => setCopiedBackup(false), 3000);
  };

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.round(diffMs / 60000);
    const diffHours = Math.round(diffMs / 3600000);
    const diffDays = Math.round(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className="space-y-stack-lg max-w-[1000px] mx-auto w-full font-sans">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div>
          <Breadcrumbs crumbs={[{ label: 'NPMS' }, { label: 'Settings' }]} />
          <h2 className="font-headline text-2xl font-bold text-on-surface">Account Settings</h2>
          <p className="text-sm text-secondary mt-1">Manage your active sessions and security configurations.</p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 gap-8">
        
        {/* TOTP 2FA SECTION (SUPERADMIN ONLY) */}
        {user?.role === 'superadmin' && (
          <div className="bg-surface border border-outline-variant rounded-xl p-6 shadow-sm space-y-6 relative overflow-hidden">
            
            {/* Header info */}
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary/10 rounded-lg text-primary shrink-0">
                <Shield className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-on-surface font-headline">Two-Factor Authentication (2FA)</h3>
                <p className="text-xs text-secondary leading-relaxed">
                  Protect your superadmin account with an extra layer of security. Verify logins with a 6-digit TOTP code from Google Authenticator, Authy, or Microsoft Authenticator.
                </p>
              </div>
            </div>

            {/* Current State Badge */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-secondary uppercase tracking-wider">Status:</span>
              {checking2FA ? (
                <span className="inline-flex items-center gap-1 text-xs text-secondary animate-pulse">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Checking status...
                </span>
              ) : is2faEnabled ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-status-success-bg border border-status-success-border text-status-success-text rounded-full text-xs font-semibold">
                  <UserCheck className="w-3.5 h-3.5" /> Enabled
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-status-neutral-bg border border-status-neutral-border text-status-neutral-text rounded-full text-xs font-semibold">
                  <Lock className="w-3.5 h-3.5" /> Disabled
                </span>
              )}
            </div>

            {/* 2FA SETUP WIZARD */}
            {!checking2FA && (
              <div className="pt-4 border-t border-outline-variant/60">
                
                {/* IDLE / DISABLED STATE */}
                {setupStep === 'idle' && !is2faEnabled && (
                  <div className="space-y-4">
                    <p className="text-xs text-secondary leading-relaxed">
                      Setting up 2FA will require scannable authentication on login attempts. Ensure you have an authenticator app installed on your smartphone before enabling.
                    </p>
                    <button
                      onClick={handleSetup2FA}
                      disabled={isSettingUp}
                      className="px-4 py-2.5 bg-primary hover:bg-primary-container text-white text-xs font-bold font-headline rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isSettingUp ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Initializing Setup...</span>
                        </>
                      ) : (
                        <span>Enable Two-Factor Authentication</span>
                      )}
                    </button>
                  </div>
                )}

                {/* SHOWING QR CODE FOR SCANNING */}
                {setupStep === 'showing_qr' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-surface-container-low/40 p-5 rounded-xl border border-outline-variant">
                    <div className="flex flex-col items-center justify-center p-4 bg-white rounded-lg border border-outline-variant">
                      {qrCodeUrl ? (
                        <img src={qrCodeUrl} alt="2FA QR Code" className="w-48 h-48" />
                      ) : (
                        <div className="w-48 h-48 flex items-center justify-center text-xs text-secondary">
                          Generating QR Code...
                        </div>
                      )}
                      <div className="mt-3 text-center">
                        <span className="text-[10px] text-secondary font-bold uppercase tracking-wider block">Manual Key</span>
                        <code className="text-xs font-mono select-all bg-surface-container px-2 py-0.5 rounded text-on-surface font-semibold mt-1 inline-block break-all">
                          {totpSecret}
                        </code>
                      </div>
                    </div>

                    <form onSubmit={handleConfirm2FA} className="space-y-4">
                      <div className="space-y-2">
                        <h4 className="text-sm font-bold text-on-surface font-headline">Verify Authenticator Setup</h4>
                        <p className="text-xs text-secondary leading-relaxed">
                          1. Scan the QR code on your phone's authenticator app.<br/>
                          2. Enter the generated 6-digit verification code below to verify configuration.
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-secondary uppercase tracking-wider">Verification Code</label>
                        <input
                          type="text"
                          maxLength={6}
                          placeholder="e.g. 123456"
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                          className="h-10 w-full md:w-48 text-center font-mono font-bold tracking-widest text-lg rounded-lg border border-outline-variant bg-surface outline-none focus:ring-2 focus:ring-primary focus:border-primary text-on-surface"
                        />
                      </div>

                      <div className="flex items-center gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setSetupStep('idle')}
                          className="px-4 py-2 border border-outline-variant hover:bg-surface-container text-secondary text-xs font-bold font-headline rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 bg-primary hover:bg-primary-container text-white text-xs font-bold font-headline rounded-lg shadow-sm transition-colors"
                        >
                          Verify & Activate
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* SHOWING BACKUP CODES ONCE */}
                {setupStep === 'showing_backup' && (
                  <div className="bg-status-success-bg/10 border border-status-success-border rounded-xl p-5 space-y-4">
                    <div className="flex gap-2.5 text-status-success-text">
                      <UserCheck className="w-5 h-5 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold font-headline">2FA Enabled Successfully!</h4>
                        <p className="text-xs text-status-success-text/90 leading-relaxed">
                          Save these backup recovery codes immediately. If you lose access to your authenticator app, you can use these codes to log back into your superadmin account. Each code can only be used once.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-4 bg-surface rounded-lg border border-outline-variant font-mono text-center text-xs font-bold text-on-surface">
                      {backupCodes.map((code, idx) => (
                        <div key={idx} className="p-2 bg-surface-container rounded border border-outline-variant/60 select-all">
                          {code}
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <button
                        onClick={copyBackupCodesToClipboard}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-surface border border-outline-variant hover:bg-surface-container text-on-surface text-xs font-bold font-headline rounded-lg transition-colors"
                      >
                        {copiedBackup ? <Check className="w-4 h-4 text-status-success-text" /> : <Copy className="w-4 h-4" />}
                        <span>{copiedBackup ? 'Codes Copied!' : 'Copy to Clipboard'}</span>
                      </button>

                      <button
                        onClick={() => {
                          setSetupStep('idle');
                          setBackupCodes([]);
                        }}
                        className="px-4 py-2 bg-primary hover:bg-primary-container text-white text-xs font-bold font-headline rounded-lg shadow-sm transition-colors"
                      >
                        I've Saved the Codes
                      </button>
                    </div>
                  </div>
                )}

                {/* ENABLED & ACTIVE STATE */}
                {is2faEnabled && setupStep === 'idle' && (
                  <div className="space-y-3">
                    <p className="text-xs text-secondary leading-relaxed">
                      Two-factor authentication is active on your superadmin profile. Standard logins will require verification from your synchronized smartphone device.
                    </p>
                    <button
                      onClick={() => setShowDisableModal(true)}
                      className="px-4 py-2 border border-error text-error hover:bg-error/5 text-xs font-bold font-headline rounded-lg transition-colors"
                    >
                      Disable 2FA
                    </button>
                  </div>
                )}

              </div>
            )}

          </div>
        )}

        {/* ACTIVE SESSIONS SECTION */}
        <div className="bg-surface border border-outline-variant rounded-xl p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-outline-variant/60 pb-4">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-secondary/10 rounded-lg text-secondary shrink-0">
                <Laptop className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-on-surface font-headline">Active Sessions</h3>
                <p className="text-xs text-secondary">
                  Monitor and manage sessions currently logged into your account across various devices.
                </p>
              </div>
            </div>

            {sessions.length > 1 && (
              <button
                onClick={() => setShowRevokeOthersConfirm(true)}
                className="px-3.5 py-1.5 bg-error/10 hover:bg-error/20 text-error font-headline text-xs font-bold rounded-lg transition-colors"
              >
                Log Out Other Devices
              </button>
            )}
          </div>

          {sessionsLoading ? (
            <div className="py-12 text-center text-xs text-secondary animate-pulse flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-primary" />
              <span>Loading logged-in sessions...</span>
            </div>
          ) : sessions.length === 0 ? (
            <div className="py-8 text-center text-xs text-secondary">
              No active sessions found.
            </div>
          ) : (
            <div className="divide-y divide-outline-variant/60">
              {sessions.map((session) => (
                <div key={session.id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4 font-sans text-xs">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-surface-container rounded-lg text-secondary mt-0.5">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-on-surface text-sm">{session.deviceLabel}</span>
                        {session.isCurrent && (
                          <span className="inline-flex items-center px-2 py-0.5 bg-primary/10 border border-primary/20 text-primary rounded-full text-[10px] font-bold">
                            This device
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-secondary text-[11px]">
                        <span className="flex items-center gap-1">
                          <Globe className="w-3.5 h-3.5 text-outline" /> {session.ipAddress}
                        </span>
                        <span className="w-1.5 h-1.5 rounded-full bg-outline-variant" />
                        <span>Logged in: {new Date(session.createdAt).toLocaleDateString()}</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-outline-variant" />
                        <span>Active: {formatRelativeTime(session.lastActiveAt)}</span>
                      </div>
                    </div>
                  </div>

                  {!session.isCurrent && (
                    <button
                      onClick={() => setRevokeSessionId(session.id)}
                      className="p-2 text-secondary hover:text-error hover:bg-error/5 rounded-lg transition-all"
                      title="Revoke session"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* 2FA DISABLE PASSWORD MODAL */}
      {showDisableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in">
          <div className="bg-surface border border-outline-variant rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 animate-scale-up font-sans">
            <div className="flex gap-3 text-error">
              <AlertTriangle className="w-6 h-6 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-base font-bold text-on-surface font-headline">Confirm Disabling 2FA</h4>
                <p className="text-xs text-secondary leading-relaxed">
                  For security, confirm your superadmin password to disable two-factor authentication. Disabling this exposes your account to higher credentials takeover risks.
                </p>
              </div>
            </div>

            <form onSubmit={handleDisable2FA} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-secondary uppercase tracking-wider block">Confirm Password</label>
                <input
                  type="password"
                  required
                  placeholder="Enter current password"
                  value={passwordForDisable}
                  onChange={(e) => setPasswordForDisable(e.target.value)}
                  className="h-10 w-full rounded-lg border border-outline-variant bg-surface px-3 text-sm outline-none focus:ring-2 focus:ring-primary focus:border-primary text-on-surface"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowDisableModal(false);
                    setPasswordForDisable('');
                  }}
                  className="px-4 py-2 border border-outline-variant hover:bg-surface-container text-secondary text-xs font-bold font-headline rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-error hover:bg-red-700 text-white text-xs font-bold font-headline rounded-lg shadow-sm transition-colors"
                >
                  Disable 2FA
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DIALOGS */}
      <ConfirmDialog
        open={revokeSessionId !== null}
        title="Revoke session login?"
        description="This will revoke the active session. The device will be logged out immediately."
        confirmLabel="Revoke Session"
        cancelLabel="Keep Session"
        variant="danger"
        onConfirm={handleRevokeSession}
        onCancel={() => setRevokeSessionId(null)}
      />

      <ConfirmDialog
        open={showRevokeOthersConfirm}
        title="Revoke all other active logins?"
        description="This will log out every device currently signed in to your profile, except for this browser window."
        confirmLabel="Revoke Others"
        cancelLabel="Keep Others"
        variant="danger"
        onConfirm={handleRevokeOthers}
        onCancel={() => setShowRevokeOthersConfirm(false)}
      />

    </div>
  );
};
