/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Layers, Plus, Users, Calendar, HelpCircle, Archive, Trash2, Heart } from 'lucide-react';
import { Batch, Supplier, DailyRecord, User } from '../types';

interface FlockManagerProps {
  batches: Batch[];
  suppliers: Supplier[];
  dailyRecords: DailyRecord[];
  user: User | null;
  onAddBatch: (batch: Omit<Batch, 'id'>) => void;
  onUpdateBatchStatus: (batchId: string, status: 'active' | 'depleted') => void;
}

export default function FlockManager({
  batches,
  suppliers,
  dailyRecords,
  user,
  onAddBatch,
  onUpdateBatchStatus
}: FlockManagerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [initialCount, setInitialCount] = useState<number>(500);
  const [dateAcquired, setDateAcquired] = useState('2026-05-29');
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id || '');
  const [ageWeeksAtAcquisition, setAgeWeeksAtAcquisition] = useState<number>(18);
  const [errorMsg, setErrorMsg] = useState('');

  // Iframe-safe deplete confirmation state
  const [depleteConfirmId, setDepleteConfirmId] = useState<string | null>(null);

  // Auto age calculator helper
  const calculateCurrentAge = (batch: Batch) => {
    const today = new Date('2026-05-29'); // System local baseline
    const acquired = new Date(batch.dateAcquired);
    const diffTime = today.getTime() - acquired.getTime();
    if (diffTime < 0) return batch.ageWeeksAtAcquisition;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const addedWeeks = Math.floor(diffDays / 7);
    return batch.ageWeeksAtAcquisition + addedWeeks;
  };

  // Calculate stats for a batch
  const getBatchStats = (batch: Batch) => {
    // Mortality is calculated dynamically by summing up all daily records for this batch
    const batchRecords = dailyRecords.filter(r => r.batchId === batch.id);
    const totalMortality = batchRecords.reduce((total, r) => total + r.mortalityCount, 0);
    const currentCount = Math.max(0, batch.initialCount - totalMortality);

    // Total Eggs collected
    const totalEggsCollected = batchRecords.reduce((total, r) => total + r.eggsCollected, 0);

    return {
      totalMortality,
      currentCount,
      totalEggsCollected,
      mortalityRate: batch.initialCount > 0 ? (totalMortality / batch.initialCount) * 100 : 0
    };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Please specify a descriptive Batch Name.');
      return;
    }
    if (initialCount <= 0) {
      setErrorMsg('Initial bird flock size must be greater than zero.');
      return;
    }

    onAddBatch({
      name,
      initialCount,
      currentCount: initialCount,
      dateAcquired,
      sourceSupplierId: supplierId || 'sup_1',
      ageWeeksAtAcquisition,
      status: 'active'
    });

    // Reset Form
    setName('');
    setInitialCount(500);
    setAgeWeeksAtAcquisition(18);
    setShowAddForm(false);
    setErrorMsg('');
  };

  return (
    <div className="space-y-6" id="flock_manager_container">
      {/* Head */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-800 font-display flex items-center gap-2">
            Batch & Flock Management
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Monitor lay ages, initial quantities, and batch-wise mortality rate progression.
          </p>
        </div>

        <button
          id="btn_toggle_add_batch"
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-xs flex items-center gap-1 cursor-pointer"
        >
          <Plus className="w-4.5 h-4.5" /> New Batch
        </button>
      </div>

      {/* Add Batch Form */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="bg-white p-5 rounded-xl border border-lime-200/80 shadow-xs space-y-4" id="add_batch_form">
          <div className="border-b border-slate-100 pb-2">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest">Aquire New Layer Batch</h3>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-xs leading-5">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500">Batch Identifier / Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Amber 2026 Pullets"
                className="mt-1 w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-1 focus:ring-lime-600 focus:bg-white text-slate-800"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500">Initial Quantity (Birds)</label>
              <input
                type="number"
                required
                min="10"
                value={initialCount}
                onChange={(e) => setInitialCount(Number(e.target.value))}
                className="mt-1 w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-1 focus:ring-lime-600 focus:bg-white text-slate-800"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500">Age At Acquisition (Weeks)</label>
              <input
                type="number"
                required
                min="0"
                value={ageWeeksAtAcquisition}
                onChange={(e) => setAgeWeeksAtAcquisition(Number(e.target.value))}
                className="mt-1 w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-1 focus:ring-lime-600 focus:bg-white text-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500">Supplier Source</label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="mt-1 w-full text-xs px-2.5 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-1 focus:ring-lime-600 focus:bg-white text-slate-800"
              >
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500">Acquisition Date</label>
              <input
                type="date"
                required
                value={dateAcquired}
                onChange={(e) => setDateAcquired(e.target.value)}
                className="mt-1 w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-1 focus:ring-lime-600 focus:bg-white text-slate-800 font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              id="btn_cancel_add_batch"
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3.5 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              id="btn_save_new_batch"
              type="submit"
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow cursor-pointer"
            >
              Aquire Batch
            </button>
          </div>
        </form>
      )}

      {/* Batches Table List */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-100">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Dynamic Batches Overview</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-400 text-[9px] sm:text-[10px] uppercase font-bold tracking-wider sm:tracking-widest whitespace-nowrap">
                <th className="px-3 py-2.5 sm:px-5 sm:py-3.5 min-w-[140px]">Batch Name</th>
                <th className="px-3 py-2.5 sm:px-5 sm:py-3.5 min-w-[130px]">Supplier</th>
                <th className="px-3 py-2.5 sm:px-5 sm:py-3.5">Age (Weeks)</th>
                <th className="px-3 py-2.5 sm:px-5 sm:py-3.5">Original / Alive</th>
                <th className="px-3 py-2.5 sm:px-5 sm:py-3.5">Acquired Date</th>
                <th className="px-3 py-2.5 sm:px-5 sm:py-3.5 text-center">Mortality Rate</th>
                <th className="px-3 py-2.5 sm:px-5 sm:py-3.5 text-center">Harvest (Cumulative)</th>
                <th className="px-3 py-2.5 sm:px-5 sm:py-3.5 text-right">Status / Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[11px] sm:text-xs">
              {batches.map(batch => {
                const stats = getBatchStats(batch);
                const supplier = suppliers.find(s => s.id === batch.sourceSupplierId);
                const currentAge = calculateCurrentAge(batch);
                const isDepleted = batch.status === 'depleted';

                return (
                  <tr
                    key={batch.id}
                    className={`hover:bg-slate-50/70 transition-colors ${
                      isDepleted ? 'bg-slate-50 text-slate-400' : 'text-slate-700'
                    }`}
                    id={`batch_row_${batch.id}`}
                  >
                    <td className="px-3 py-3 sm:px-5 sm:py-4 font-semibold break-words whitespace-normal max-w-[160px]">
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${isDepleted ? 'bg-zinc-300' : 'bg-emerald-600'}`} />
                        <span>{batch.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 sm:px-5 sm:py-4 text-slate-500 font-medium break-words whitespace-normal max-w-[140px]">
                      {supplier ? supplier.name : 'Unknown Source'}
                    </td>
                    <td className="px-3 py-3 sm:px-5 sm:py-3.5 font-mono whitespace-nowrap">
                      {currentAge} weeks old
                      <span className="block text-[10px] text-slate-400">
                        ({batch.ageWeeksAtAcquisition} Wk start)
                      </span>
                    </td>
                    <td className="px-3 py-3 sm:px-5 sm:py-3.5 font-mono whitespace-nowrap">
                      {batch.initialCount} / <span className="font-bold text-emerald-700">{stats.currentCount}</span>
                    </td>
                    <td className="px-3 py-3 sm:px-5 sm:py-4 font-mono text-slate-400 whitespace-nowrap">
                      {batch.dateAcquired}
                    </td>
                    <td className="px-3 py-3 sm:px-5 sm:py-4 text-center whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded font-mono font-bold text-[10px] sm:text-[11px] ${
                          stats.mortalityRate > 5
                            ? 'bg-rose-100 text-rose-800'
                            : stats.mortalityRate > 1.5
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {stats.mortalityRate.toFixed(1)}%
                      </span>
                      <span className="block text-[10px] text-slate-400 font-mono mt-0.5">
                        ({stats.totalMortality} deaths)
                      </span>
                    </td>
                    <td className="px-3 py-3 sm:px-5 sm:py-3.5 text-center font-mono font-semibold text-slate-600 whitespace-nowrap">
                      {stats.totalEggsCollected.toLocaleString()}
                    </td>
                    <td className="px-3 py-3 sm:px-5 sm:py-4 text-right whitespace-nowrap">
                      {isDepleted ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-zinc-100 text-zinc-500 rounded font-bold text-[10px] uppercase">
                          <Archive className="w-3 h-3" /> Depleted / Sold
                        </span>
                      ) : (
                        <div className="flex justify-end gap-1.5">
                          {user?.role === 'admin' ? (
                            <button
                              id={`btn_deplete_${batch.id}`}
                              onClick={() => {
                                if (depleteConfirmId === batch.id) {
                                  onUpdateBatchStatus(batch.id, 'depleted');
                                  setDepleteConfirmId(null);
                                } else {
                                  setDepleteConfirmId(batch.id);
                                  setTimeout(() => {
                                    setDepleteConfirmId(prev => prev === batch.id ? null : prev);
                                  }, 4000);
                                }
                              }}
                              className={`px-2 py-1 rounded-md font-bold text-[10px] transition-colors flex items-center gap-1 uppercase ${
                                depleteConfirmId === batch.id
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                              }`}
                            >
                              <Archive className="w-3 h-3" />
                              {depleteConfirmId === batch.id ? 'Confirm Deplete?' : 'Terminate Batch'}
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">No admin actions</span>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {batches.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-slate-400">
                    No active layer flocks on file. Click "New Batch" to begin operations.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
