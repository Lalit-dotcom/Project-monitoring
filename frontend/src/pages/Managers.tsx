import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { toast } from '../lib/toast';
import { X, Search, Plus, UserPlus, Mail, Phone, ShieldAlert, Key } from 'lucide-react';

export const Managers: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [managers, setManagers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 1. Role-based redirect
  useEffect(() => {
    if (user && user.role !== 'superadmin') {
      toast.error('Unauthorized access. Super Admin role required.');
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // 2. Fetch managers on mount
  const loadManagers = async () => {
    setLoading(true);
    try {
      const data = await api.getManagers();
      setManagers(data);
    } catch (err: any) {
      console.error(err);
      toast.error("Couldn't retrieve project managers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role === 'superadmin') {
      loadManagers();
    }
  }, [user]);

  // 3. Password generator
  const generateRandomPassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()';
    let pass = '';
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(pass);
    toast.info('Generated a secure password');
  };

  // 4. Form Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side validations
    if (!fullName.trim() || !username.trim() || !password) {
      toast.error('Full Name, Username, and Password are required.');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters long.');
      return;
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Please enter a valid email address.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await api.createManager({
        fullName: fullName.trim(),
        username: username.trim(),
        password,
        email: email.trim(),
        mobileNumber: mobileNumber.trim()
      });

      toast.success(`Created Manager account: ${result.user.username}`);
      setShowAddModal(false);
      
      // Reset form fields
      setFullName('');
      setUsername('');
      setPassword('');
      setEmail('');
      setMobileNumber('');

      // Reload table
      loadManagers();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to create manager.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered managers for search
  const filteredManagers = managers.filter(m =>
    m.prjMgrName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.username && m.username.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (m.email && m.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // If not superadmin, render a placeholder or block
  if (!user || user.role !== 'superadmin') {
    return (
      <div className="flex flex-col items-center justify-center p-12 min-h-[400px] space-y-4">
        <ShieldAlert className="w-12 h-12 text-error animate-bounce" />
        <h3 className="font-headline text-lg font-bold text-on-surface">Not Authorized</h3>
        <p className="text-secondary text-sm">You do not have permission to view this administrative resource.</p>
      </div>
    );
  }

  return (
    <div className="space-y-stack-lg max-w-[1400px] mx-auto w-full">
      {/* Breadcrumbs & Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <Breadcrumbs crumbs={[{ label: 'NPMS' }, { label: 'Administration' }, { label: 'Project Managers' }]} />
          <h2 className="font-headline text-2xl font-bold text-on-surface mb-1">Project Managers</h2>
          <p className="font-sans text-sm text-secondary">Manage administrative accounts, assign privileges, and track synch-levels.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg hover:bg-primary-container transition-all font-headline text-sm font-semibold shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ml-auto md:ml-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Project Manager</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-surface-container-lowest border border-outline-variant p-4 rounded-md flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-outline absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
          <input
            type="text"
            placeholder="Search managers by name, username, or email..."
            className="w-full bg-[#F3F4F6] border border-outline-variant rounded-lg pl-10 pr-4 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary focus:bg-white transition-all text-on-surface"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-md overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 min-h-[300px] space-y-4">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-secondary font-headline text-sm font-semibold">Retrieving records...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-surface-container-low/50">
                <tr className="border-b border-outline-variant">
                  <th className="p-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider">Manager Details</th>
                  <th className="p-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider">System Username</th>
                  <th className="p-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider">Email Address</th>
                  <th className="p-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider">Mobile Number</th>
                  <th className="p-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider">Sync Source</th>
                  <th className="p-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider">Projects Assigned</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {filteredManagers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-secondary font-headline text-sm">
                      No project managers found matching search query.
                    </td>
                  </tr>
                ) : (
                  filteredManagers.map((m) => (
                    <tr key={m.prjMgrId} className="hover:bg-surface-container-low/30 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-headline text-xs font-bold uppercase">
                            {m.prjMgrName.slice(0, 2)}
                          </div>
                          <div>
                            <p className="font-sans text-sm font-semibold text-on-surface">{m.prjMgrName}</p>
                            <p className="text-[10px] text-secondary font-mono">ID: {m.prjMgrId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-sans text-sm font-medium text-on-surface">
                        {m.username ? (
                          <span className="bg-surface-container px-2 py-0.5 rounded text-xs font-mono">{m.username}</span>
                        ) : (
                          <span className="text-secondary italic text-xs">No user account</span>
                        )}
                      </td>
                      <td className="p-4 font-sans text-sm text-secondary">
                        {m.email ? (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3.5 h-3.5 text-outline" /> {m.email}
                          </span>
                        ) : (
                          <span className="text-outline text-xs">—</span>
                        )}
                      </td>
                      <td className="p-4 font-sans text-sm text-secondary">
                        {m.mobileNumber ? (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5 text-outline" /> {m.mobileNumber}
                          </span>
                        ) : (
                          <span className="text-outline text-xs">—</span>
                        )}
                      </td>
                      <td className="p-4">
                        {m.source === 'manual' ? (
                          <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wide border border-blue-200">
                            Manually Added
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded-full bg-green-50 text-green-700 text-[10px] font-bold uppercase tracking-wide border border-green-200">
                            ERP Synced
                          </span>
                        )}
                      </td>
                      <td className="p-4 font-headline text-sm font-bold text-on-surface">
                        {m.projectCount} projects
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Project Manager Dialog Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowAddModal(false)} />

          {/* Card */}
          <div className="relative bg-surface-container-lowest border border-outline-variant rounded-xl p-6 w-full max-w-md shadow-2xl animate-fade-in-up z-10 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 p-1 rounded-md text-secondary hover:text-on-surface hover:bg-surface-container transition-colors"
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="font-headline text-lg font-bold text-on-surface mb-1">Add Project Manager</h3>
            <p className="font-sans text-xs text-secondary mb-4">Create a manually synchronized manager profile and user account.</p>

            <form onSubmit={handleSubmit} className="space-y-4 font-sans text-left">
              <div>
                <label className="text-[10px] font-bold text-secondary uppercase tracking-wider block mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full bg-[#F3F4F6] border border-outline-variant rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-on-surface"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-secondary uppercase tracking-wider block mb-1">Username *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ramesh"
                  className="w-full bg-[#F3F4F6] border border-outline-variant rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-on-surface"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-secondary uppercase tracking-wider block mb-1">Password *</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Minimum 6 characters"
                    className="flex-1 bg-[#F3F4F6] border border-outline-variant rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-on-surface font-mono"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    className="px-3 py-1.5 bg-surface-container border border-outline-variant hover:bg-surface-container-high rounded-lg text-xs font-semibold text-secondary flex items-center gap-1 transition-colors"
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span>Generate</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-secondary uppercase tracking-wider block mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. ramesh@nic.in"
                  className="w-full bg-[#F3F4F6] border border-outline-variant rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-on-surface"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-secondary uppercase tracking-wider block mb-1">Mobile Number</label>
                <input
                  type="tel"
                  placeholder="e.g. 9876543210"
                  className="w-full bg-[#F3F4F6] border border-outline-variant rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-on-surface"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-outline-variant rounded-lg text-sm font-semibold text-secondary hover:bg-surface-container transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-primary text-on-primary rounded-lg hover:bg-primary-container text-sm font-semibold transition-all flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>{submitting ? 'Creating...' : 'Create Account'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
