import React, { useState, useEffect } from 'react';
import { Shield, Key, Settings, UserPlus, MoreVertical } from 'lucide-react';
import { api } from '../lib/api';
import type { User } from '../types';

type SectionType = 'Users' | 'Roles' | 'Settings';

export const Administration: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<SectionType>('Users');

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const data = await api.getUsers();
        setUsers(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadUsers();
  }, []);

  if (loading) {
    return <div className="text-secondary font-headline p-8">Loading administration dashboard...</div>;
  }

  return (
    <div className="space-y-stack-lg max-w-[1400px] mx-auto w-full">
      {/* Header */}
      <div>
        <h2 className="font-headline text-2xl font-bold text-on-surface">Administration</h2>
        <p className="font-sans text-sm text-secondary mt-1">Configure global workspaces, manage user authorizations, and inspect audit definitions.</p>
      </div>

      {/* Tab Navigation layout */}
      <div className="flex flex-col md:flex-row gap-6 items-start font-sans">
        
        {/* Sidebar settings tabs */}
        <div className="w-full md:w-64 bg-surface-container-low/40 border border-outline-variant rounded-md p-2 flex flex-col gap-1 shrink-0">
          <button
            onClick={() => setActiveSection('Users')}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-md font-headline text-xs font-bold uppercase tracking-wider text-left transition-colors ${
              activeSection === 'Users' 
                ? 'bg-primary text-white' 
                : 'text-secondary hover:bg-surface-container'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Users & Members</span>
          </button>
          <button
            onClick={() => setActiveSection('Roles')}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-md font-headline text-xs font-bold uppercase tracking-wider text-left transition-colors ${
              activeSection === 'Roles' 
                ? 'bg-primary text-white' 
                : 'text-secondary hover:bg-surface-container'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>Roles & Permissions</span>
          </button>
          <button
            onClick={() => setActiveSection('Settings')}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-md font-headline text-xs font-bold uppercase tracking-wider text-left transition-colors ${
              activeSection === 'Settings' 
                ? 'bg-primary text-white' 
                : 'text-secondary hover:bg-surface-container'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Workspace Settings</span>
          </button>
        </div>

        {/* Dynamic section display */}
        <div className="flex-1 w-full bg-surface-container-lowest border border-outline-variant rounded-md overflow-hidden shadow-sm">
          
          {/* USERS AND MEMBERS */}
          {activeSection === 'Users' && (
            <div>
              <div className="p-6 border-b border-outline-variant flex justify-between items-center bg-surface-container-low/20">
                <div>
                  <h3 className="font-headline text-lg font-bold text-on-surface">Users &amp; Members</h3>
                  <p className="text-secondary text-xs mt-0.5">Invite new team members and assign project access roles.</p>
                </div>
                <button 
                  onClick={() => alert('Member invitation sent.')}
                  className="bg-primary hover:bg-primary-container text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all font-headline text-sm font-semibold shadow-sm"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Invite User</span>
                </button>
              </div>

              {/* Members Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container-low/50 border-b border-outline-variant">
                      <th className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider">Name</th>
                      <th className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider">Email Address</th>
                      <th className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider">Assigned Role</th>
                      <th className="px-6 py-4 font-headline text-xs font-bold text-secondary uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-surface transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase">
                              {user.name.substring(0, 2)}
                            </div>
                            <span className="font-semibold text-sm text-on-surface">{user.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-secondary text-sm">{user.email}</td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-secondary/15 text-on-secondary-container">
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                            user.status === 'Active' 
                              ? 'bg-green-50 text-green-700 border-green-200' 
                              : 'bg-gray-100 text-gray-500 border-gray-200'
                          }`}>
                            {user.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button className="text-secondary hover:text-primary"><MoreVertical className="w-5 h-5" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ROLES AND PERMISSIONS */}
          {activeSection === 'Roles' && (
            <div className="p-6 space-y-4">
              <h3 className="font-headline text-lg font-bold text-on-surface">Roles &amp; Security Profiles</h3>
              <p className="text-secondary text-sm">Define granular read/write access policies for government treasury gates.</p>
              
              <div className="space-y-4 pt-4">
                <div className="p-4 border border-outline-variant rounded-md">
                  <p className="font-semibold text-sm text-on-surface">Administrator Profile</p>
                  <p className="text-xs text-secondary mt-1">Full override, client creations, invoice posting, and tax auditor authorizations.</p>
                </div>
                <div className="p-4 border border-outline-variant rounded-md">
                  <p className="font-semibold text-sm text-on-surface">Project Manager Profile</p>
                  <p className="text-xs text-secondary mt-1">Add POs, review invoices, check site maps, and download compliance reports.</p>
                </div>
              </div>
            </div>
          )}

          {/* WORKSPACE SETTINGS */}
          {activeSection === 'Settings' && (
            <div className="p-6 space-y-4">
              <h3 className="font-headline text-lg font-bold text-on-surface">Workspace Configuration</h3>
              <p className="text-secondary text-sm">Configure server clusters, default tax zones, and currency configurations.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-secondary uppercase tracking-wider block">Default Currency Zone</label>
                  <input type="text" value="INR (₹) - Indian Rupee" disabled className="w-full bg-surface-container opacity-60 cursor-not-allowed" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-secondary uppercase tracking-wider block">Standard GST Rate</label>
                  <input type="text" value="18% GST" disabled className="w-full bg-surface-container opacity-60 cursor-not-allowed" />
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
