/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User, Key, Plus, Trash, Edit, Shield, ShieldAlert, CheckCircle, UserPlus, Users, Lock } from 'lucide-react';
import { User as UserType } from '../types';

interface ProfileManagerProps {
  currentUser: UserType;
  onProfileUpdate: (updatedUser: UserType) => void;
}

export default function ProfileManager({ currentUser, onProfileUpdate }: ProfileManagerProps) {
  const [usersList, setUsersList] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Editing current user
  const [currName, setCurrName] = useState(currentUser.name);
  const [currUsername, setCurrUsername] = useState(currentUser.username);
  const [currPassword, setCurrPassword] = useState('');

  // Registering new user (Admin-only)
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'worker'>('worker');

  // Editing other user (Admin-only)
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'worker'>('worker');

  // Confirm delete
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Fetch all users
  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        setUsersList(data);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Update current logged in user profile
  const handleUpdateSelf = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currName.trim() || !currUsername.trim()) {
      setErrorMsg('Name and Username are required.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const payload: any = {
        name: currName,
        username: currUsername,
      };
      if (currPassword.trim()) {
        payload.password = currPassword;
      }

      const response = await fetch(`/api/users/${currentUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (response.ok && data.status === 'success') {
        setSuccessMsg('Your profile has been updated successfully!');
        setCurrPassword('');
        // Notify parent App component
        onProfileUpdate(data.user);
        fetchUsers();
      } else {
        setErrorMsg(data.message || 'Failed to update profile.');
      }
    } catch (err) {
      setErrorMsg('Network error. Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  // Create new user worker/admin
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newUsername.trim() || !newPassword.trim()) {
      setErrorMsg('All fields are required to register a new user.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          username: newUsername,
          password: newPassword,
          role: newRole
        })
      });

      const data = await response.json();
      if (response.ok && data.status === 'success') {
        setSuccessMsg(`User profile for "${newName}" has been registered.`);
        setNewName('');
        setNewUsername('');
        setNewPassword('');
        setNewRole('worker');
        fetchUsers();
      } else {
        setErrorMsg(data.message || 'Failed to create user.');
      }
    } catch (err) {
      setErrorMsg('Network error. Failed to create user.');
    } finally {
      setLoading(false);
    }
  };

  // Submit edits for another user
  const handleUpdateOtherUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUserId) return;
    if (!editName.trim() || !editUsername.trim()) {
      setErrorMsg('Name and Username are required.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const payload: any = {
        name: editName,
        username: editUsername,
        role: editRole
      };
      if (editPassword.trim()) {
        payload.password = editPassword;
      }

      const response = await fetch(`/api/users/${editingUserId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (response.ok && data.status === 'success') {
        setSuccessMsg(`User "${editName}" updated successfully.`);
        setEditingUserId(null);
        setEditName('');
        setEditUsername('');
        setEditPassword('');
        fetchUsers();
      } else {
        setErrorMsg(data.message || 'Failed to update user.');
      }
    } catch (err) {
      setErrorMsg('Network error. Failed to update user.');
    } finally {
      setLoading(false);
    }
  };

  // Delete user profile
  const handleDeleteUser = async (id: string) => {
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const response = await fetch(`/api/users/${id}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      if (response.ok && data.status === 'success') {
        setSuccessMsg('User profile successfully removed.');
        setDeleteConfirmId(null);
        fetchUsers();
      } else {
        setErrorMsg(data.message || 'Failed to delete user.');
      }
    } catch (err) {
      setErrorMsg('Network error. Failed to delete user.');
    } finally {
      setLoading(false);
    }
  };

  const startEditingUser = (user: UserType) => {
    setEditingUserId(user.id);
    setEditName(user.name);
    setEditUsername(user.username);
    setEditRole(user.role);
    setEditPassword('');
    setErrorMsg('');
    setSuccessMsg('');
  };

  return (
    <div className="space-y-6" id="profile_manager_container">
      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-3xs" id="profile_header_card">
        <div>
          <h2 className="text-xl font-bold text-slate-800 font-display flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600" />
            Profile & Worker Management
          </h2>
          <p className="text-slate-500 text-xs mt-1">
            Change your security credentials, add caretakers/workers, or adjust roles.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-slate-600 self-start md:self-auto">
          <Shield className="w-4 h-4 text-emerald-600" />
          <span>Role: <span className="uppercase text-emerald-700 font-bold">{currentUser.role}</span></span>
        </div>
      </div>

      {/* Alert Messages */}
      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-2xl text-xs flex items-center gap-2 animate-in fade-in" id="profile_error_alert">
          <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-2xl text-xs flex items-center gap-2 animate-in fade-in" id="profile_success_alert">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="profile_grid">
        {/* EDIT SELF PROFILE */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-100 shadow-3xs space-y-4" id="self_profile_card">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <User className="w-4 h-4 text-emerald-600" />
              My Profile Settings
            </h3>
            <p className="text-slate-400 text-[11px] mt-0.5">Edit your personal login profile information.</p>
          </div>

          <form onSubmit={handleUpdateSelf} className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block">Full Display Name</label>
              <input
                type="text"
                required
                disabled={currentUser.role === 'worker'}
                value={currName}
                onChange={(e) => setCurrName(e.target.value)}
                className="mt-1.5 w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-650 text-slate-800 font-medium disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
                id="input_self_name"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block">Username</label>
              <input
                type="text"
                required
                disabled={currentUser.role === 'worker'}
                value={currUsername}
                onChange={(e) => setCurrUsername(e.target.value)}
                className="mt-1.5 w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-650 text-slate-800 font-mono font-medium disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
                id="input_self_username"
              />
              {currentUser.role === 'worker' && (
                <p className="text-[10px] text-amber-600 mt-1 font-sans font-medium">
                  Only Administrators can change your name or username.
                </p>
              )}
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block">
                Change Password <span className="text-slate-400 font-normal">(Leave blank to keep current)</span>
              </label>
              <div className="relative mt-1.5">
                <input
                  type="password"
                  value={currPassword}
                  onChange={(e) => setCurrPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full text-xs pl-9 pr-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-650 text-slate-800 font-mono"
                  id="input_self_password"
                />
                <Key className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-3" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl font-bold text-xs transition-colors cursor-pointer shadow-3xs"
              id="btn_save_self_profile"
            >
              Update My Credentials
            </button>
          </form>
        </div>

        {/* WORKER / DIRECTORY MANAGEMENT (Admin-only view for modification, Worker reads names only) */}
        <div className="lg:col-span-2 space-y-6" id="worker_directory_section">
          
          {/* Active Editing Form Overlay / Mode */}
          {editingUserId && (
            <div className="bg-amber-50/50 p-6 rounded-2xl border border-amber-200 shadow-3xs space-y-4 animate-in fade-in" id="edit_worker_panel">
              <div className="flex justify-between items-center border-b border-amber-200 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-amber-800 flex items-center gap-1.5">
                    <Edit className="w-4 h-4" />
                    Edit Member Profile: {editName}
                  </h3>
                  <p className="text-slate-500 text-[11px] mt-0.5">Modifying role permissions or resetting password.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingUserId(null)}
                  className="text-xs font-bold text-slate-500 hover:text-slate-700 px-2 py-1 rounded bg-slate-200/50"
                >
                  Cancel
                </button>
              </div>

              <form onSubmit={handleUpdateOtherUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Display Name</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="mt-1.5 w-full text-xs px-3.5 py-2.5 border border-slate-200 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Username</label>
                  <input
                    type="text"
                    required
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    className="mt-1.5 w-full text-xs px-3.5 py-2.5 border border-slate-200 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Set New Password</label>
                  <input
                    type="password"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="Leave blank to keep current"
                    className="mt-1.5 w-full text-xs px-3.5 py-2.5 border border-slate-200 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Role & Privileges</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as 'admin' | 'worker')}
                    className="mt-1.5 w-full text-xs px-3 py-2.5 border border-slate-200 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-850 font-semibold"
                  >
                    <option value="worker">Worker (Log entries only, no finance deletes)</option>
                    <option value="admin">Admin (Full administrative access)</option>
                  </select>
                </div>

                <div className="md:col-span-2 pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Directory and Add Worker side-by-side / grid */}
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
            
            {/* List members table */}
            <div className={`bg-white rounded-2xl border border-slate-100 shadow-3xs p-6 space-y-4 ${currentUser.role === 'admin' ? 'xl:col-span-3' : 'xl:col-span-5'}`} id="users_directory_list">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-emerald-600" />
                  Farm Staff Directory
                </h3>
                <p className="text-slate-400 text-[11px] mt-0.5 font-sans">Registered system users and active login profiles.</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-400 text-[9px] uppercase font-bold tracking-wider whitespace-nowrap">
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">Username</th>
                      <th className="px-3 py-2">Role</th>
                      {currentUser.role === 'admin' && <th className="px-3 py-2 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {usersList.map(u => (
                      <tr key={u.id} className="hover:bg-slate-50/40">
                        <td className="px-3 py-3 font-semibold text-slate-800">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center text-[10px] font-bold">
                              {u.name.substring(0, 2).toUpperCase()}
                            </span>
                            <span>{u.name} {u.id === currentUser.id && <span className="text-[9px] bg-emerald-50 text-emerald-600 border border-emerald-100 px-1 py-0.5 rounded font-sans ml-1">You</span>}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3 font-mono text-slate-500">{u.username}</td>
                        <td className="px-3 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            u.role === 'admin' 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                              : 'bg-amber-50 text-amber-700 border border-amber-100'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        {currentUser.role === 'admin' && (
                          <td className="px-3 py-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => startEditingUser(u)}
                                className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                                title="Edit Credentials/Role"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>

                              {u.id !== currentUser.id ? (
                                <>
                                  <button
                                    onClick={() => {
                                      if (deleteConfirmId === u.id) {
                                        handleDeleteUser(u.id);
                                      } else {
                                        setDeleteConfirmId(u.id);
                                        setTimeout(() => {
                                          setDeleteConfirmId(prev => prev === u.id ? null : prev);
                                        }, 4000);
                                      }
                                    }}
                                    className={`p-1 rounded transition-all ${
                                      deleteConfirmId === u.id 
                                        ? 'text-red-600 bg-red-50 border border-red-150 animate-pulse'
                                        : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                                    }`}
                                    title={deleteConfirmId === u.id ? "Click again to confirm delete" : "Delete User Profile"}
                                  >
                                    <Trash className="w-3.5 h-3.5" />
                                  </button>
                                  {deleteConfirmId === u.id && (
                                    <span className="text-[9px] font-bold text-rose-600 animate-pulse">Confirm?</span>
                                  )}
                                </>
                              ) : (
                                <span className="text-[10px] text-slate-300 italic px-1">Protected</span>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                    {usersList.length === 0 && (
                      <tr>
                        <td colSpan={currentUser.role === 'admin' ? 4 : 3} className="px-4 py-8 text-center text-slate-400">
                          No profiles retrieved.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* REGISTER NEW PROFILE (Admin only) */}
            {currentUser.role === 'admin' ? (
              <div className="xl:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-3xs space-y-4" id="register_worker_card">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <UserPlus className="w-4 h-4 text-emerald-600" />
                    Add Farm Staff Profile
                  </h3>
                  <p className="text-slate-400 text-[11px] mt-0.5">Register a new caretaker, worker or sub-admin.</p>
                </div>

                <form onSubmit={handleCreateUser} className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Staff Full Name</label>
                    <input
                      type="text"
                      required
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="e.g. Samuel Okafor"
                      className="mt-1.5 w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-650 text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Login Username</label>
                    <input
                      type="text"
                      required
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      placeholder="e.g. samuel_poultry"
                      className="mt-1.5 w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-650 text-slate-800 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Password</label>
                    <div className="relative mt-1.5">
                      <input
                        type="password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full text-xs pl-9 pr-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-650 text-slate-800 font-mono"
                      />
                      <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-3" />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Role Privileges</label>
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value as 'admin' | 'worker')}
                      className="mt-1.5 w-full text-xs px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-650 text-slate-850 font-bold"
                    >
                      <option value="worker">Worker (Write logs, no finance deletes)</option>
                      <option value="admin">Admin (Full write/delete control)</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl font-bold text-xs transition-colors cursor-pointer shadow-3xs"
                  >
                    Register Profile
                  </button>
                </form>
              </div>
            ) : (
              <div className="xl:col-span-5 p-5 bg-amber-50/50 rounded-2xl border border-amber-200 text-slate-600 text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Only administrators have authorization to register, edit, or remove other system worker profiles. If you need details changed, contact your administrator.</span>
              </div>
            )}

          </div>

        </div>
      </div>
    </div>
  );
}
