/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Loader } from 'lucide-react';
import { User } from '../types';
import { API_BASE, IS_USING_WORKER, IS_PRODUCTION_PAGES } from '../utils/api';

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMsg('Please enter both username and password.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const response = await fetch(`${API_BASE}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();
      if (response.ok && data.status === 'success') {
        onLoginSuccess(data.user);
      } else {
        setErrorMsg(data.message || 'Authentication failed. Please check your credentials.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setErrorMsg('Network/Connection error. Please verify that your Cloudflare backend is active and that VITE_API_URL is configured correctly in your settings.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-50 via-zinc-100 to-amber-50" id="login_container">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="h-16 w-16 bg-emerald-600 text-amber-100 rounded-3xl flex items-center justify-center shadow-lg transform rotate-3 hover:rotate-6 transition-transform">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-9 h-9">
              <path d="M12 2a4 4 0 0 1 4 4v1a4 4 0 0 1-4 4 4 4 0 0 1-4-4V6a4 4 0 0 1 4-4Z"/>
              <path d="M19 19c0-2-4-3-7-3s-7 1-7 3v2h14v-2Z"/>
            </svg>
          </div>
        </div>
        <h2 className="mt-5 text-center text-3xl font-bold tracking-tight text-slate-800 font-display">
          EggMaster <span className="text-emerald-600 font-normal">Pro</span>
        </h2>
        <p className="mt-2 text-center text-sm text-slate-500 max-w">
          Layer Poultry Farm Operational Portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 shadow-md rounded-2xl border border-slate-100 sm:px-10">
          <form className="space-y-6" onSubmit={handleLogin}>
            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-100 text-red-700 rounded-lg text-xs leading-5">
                {errorMsg}
              </div>
            )}

            <div>
              <label htmlFor="username_input" className="block text-xs font-medium text-slate-600 uppercase tracking-wider">
                Username
              </label>
              <div className="mt-1.5 relative rounded-md shadow-sm">
                <input
                  id="username_input"
                  name="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password_input" className="block text-xs font-medium text-slate-600 uppercase tracking-wider">
                Password
              </label>
              <div className="mt-1.5 relative rounded-md shadow-sm">
                <input
                  id="password_input"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white text-sm"
                />
              </div>
            </div>

            <div>
              <button
                id="login_submit_btn"
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-600 transition-colors disabled:bg-slate-300"
              >
                {loading ? (
                  <Loader className="w-5 h-5 animate-spin" />
                ) : (
                  'Sign In'
                )}
              </button>
            </div>
          </form>

          {/* Connection Mode Status */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${
                IS_USING_WORKER 
                  ? 'bg-emerald-500 animate-pulse' 
                  : IS_PRODUCTION_PAGES 
                    ? 'bg-rose-500' 
                    : 'bg-blue-500'
              }`} />
              <span className="text-xs font-bold text-slate-700">
                {IS_USING_WORKER 
                  ? 'Cloud Worker Active' 
                  : IS_PRODUCTION_PAGES 
                    ? 'Cloud Database DISCONNECTED' 
                    : 'Sandbox Environment Active'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              {IS_USING_WORKER ? (
                <span>Connected to remote Cloudflare Worker backend: <code className="bg-slate-50 px-1 py-0.5 rounded text-slate-600 font-mono break-all">{API_BASE}</code></span>
              ) : IS_PRODUCTION_PAGES ? (
                <span className="text-rose-600 font-medium">
                  <strong>WARNING:</strong> This deployed version has NO database connection because <code>VITE_API_URL</code> is not configured in Cloudflare Pages build settings. 
                  Any data you add now will only stay in browser memory and be lost upon page refresh! 
                  Please configure <code>VITE_API_URL</code> pointing to your Cloudflare Worker in your Cloudflare Pages dashboard under <strong>Settings &rarr; Environment variables</strong> and redeploy.
                </span>
              ) : (
                <span>Currently running on the local Sandbox backend database. To connect your deployed Cloudflare Worker backend, please add the <code>VITE_API_URL</code> environment variable as a <strong>Text</strong> variable (not a secret) under Settings.</span>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
