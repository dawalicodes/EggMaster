/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Calendar, Layers, ShieldAlert, PlusCircle, Filter, Trash, Edit, Check } from 'lucide-react';
import { DailyRecord, Batch, User } from '../types';

interface EggMortalityTrackerProps {
  dailyRecords: DailyRecord[];
  batches: Batch[];
  user: User | null;
  onAddRecord: (record: Omit<DailyRecord, 'id'>) => void;
  onDeleteRecord: (recordId: string) => void;
}

export default function EggMortalityTracker({
  dailyRecords,
  batches,
  user,
  onAddRecord,
  onDeleteRecord
}: EggMortalityTrackerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState(batches[0]?.id || '');
  const [date, setDate] = useState('2026-05-29'); // Baseline default
  const [eggsCollected, setEggsCollected] = useState<number>(0);
  const [eggsBroken, setEggsBroken] = useState<number>(0);
  const [eggsSpoilt, setEggsSpoilt] = useState<number>(0);
  const [mortalityCount, setMortalityCount] = useState<number>(0);
  const [mortalityCause, setMortalityCause] = useState('');
  const [feedConsumedBags, setFeedConsumedBags] = useState<number>(2.0);
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Filtering lists
  const [filterBatchId, setFilterBatchId] = useState('all');
  const [filterDate, setFilterDate] = useState('');

  // Iframe-safe delete confirmation state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Target batch current birds count for the form
  const selectedBatch = batches.find(b => b.id === selectedBatchId);
  const liveBirds = selectedBatch ? selectedBatch.currentCount : 0;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedBatchId) {
      setErrorMsg('Please select a valid layer flock batch.');
      return;
    }
    if (eggsCollected < 0 || eggsBroken < 0 || eggsSpoilt < 0 || mortalityCount < 0 || feedConsumedBags < 0) {
      setErrorMsg('Numerical fields cannot contain negative quantities.');
      return;
    }
    if (eggsCollected < (eggsBroken + eggsSpoilt)) {
      setErrorMsg('Eggs collected cannot be less than broken and spoilt counts combined.');
      return;
    }

    // Call callback to add record - auto calculate saleable elsewhere or let it list
    onAddRecord({
      date,
      batchId: selectedBatchId,
      eggsCollected,
      eggsBroken,
      eggsSpoilt,
      mortalityCount,
      mortalityCause: mortalityCount > 0 ? mortalityCause : '',
      feedConsumedBags,
      notes,
      createdBy: user?.name || 'Worker Log'
    });

    // Reset fields
    setEggsCollected(0);
    setEggsBroken(0);
    setEggsSpoilt(0);
    setMortalityCount(0);
    setMortalityCause('');
    setFeedConsumedBags(2.0);
    setNotes('');
    setShowAddForm(false);
  };

  // Filter daily records
  const filteredRecords = dailyRecords.filter(rec => {
    const matchesBatch = filterBatchId === 'all' || rec.batchId === filterBatchId;
    const matchesDate = !filterDate || rec.date === filterDate;
    return matchesBatch && matchesDate;
  }).sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-6" id="egg_mortality_tracker_container">
      {/* Head section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-800 font-display flex items-center gap-2">
            Laying & Mortality Log Book
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Record laying sessions, damaged eggs, casualties, and daily feed consumption.
          </p>
        </div>

        <button
          id="btn_toggle_daily_record"
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow flex items-center gap-1"
        >
          <PlusCircle className="w-4.5 h-4.5" /> Record Today's Log
        </button>
      </div>

      {/* Daily recording logging form */}
      {showAddForm && (
        <form onSubmit={handleCreate} className="bg-white p-5 rounded-xl border-2 border-emerald-600/30 shadow-xs space-y-4" id="daily_logging_form">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest text-emerald-700">Quick Daily Operations Log</h3>
            <span className="text-[10px] text-slate-400 font-medium italic">Estimated record time: 15 seconds</span>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 text-red-700 border border-red-100 rounded-lg text-xs font-medium">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 block">Flock Batch</label>
              <select
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                className="mt-1 w-full text-xs px-2 px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:bg-white text-slate-800"
              >
                <option value="">-- Choose Batch --</option>
                {batches.filter(b => b.status === 'active').map(b => (
                  <option key={b.id} value={b.id}>{b.name} ({b.currentCount} birds alive)</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 block">Date of Operations</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:bg-white text-slate-800 font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 block">Feed Consumed (Bags)</label>
              <input
                type="number"
                step="0.05"
                required
                min="0"
                value={feedConsumedBags}
                onChange={(e) => setFeedConsumedBags(Number(e.target.value))}
                placeholder="e.g. 2.5"
                className="mt-1 w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:bg-white text-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 bg-amber-50/40 p-3 rounded-lg border border-amber-100/50">
            <div>
              <label className="text-xs font-bold text-slate-700 block">Eggs Harvested</label>
              <input
                type="number"
                required
                min="0"
                value={eggsCollected}
                onChange={(e) => setEggsCollected(Number(e.target.value))}
                placeholder="e.g. 850"
                className="mt-1 w-full text-xs font-extrabold px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:bg-white text-slate-900 shadow-xs"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-rose-700 block">Broken Eggs</label>
              <input
                type="number"
                required
                min="0"
                value={eggsBroken}
                onChange={(e) => setEggsBroken(Number(e.target.value))}
                placeholder="0"
                className="mt-1 w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:bg-white text-slate-800 shadow-xs"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 block">Spoilt Eggs</label>
              <input
                type="number"
                required
                min="0"
                value={eggsSpoilt}
                onChange={(e) => setEggsSpoilt(Number(e.target.value))}
                placeholder="0"
                className="mt-1 w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:bg-white text-slate-800 shadow-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-red-50/20 p-3 rounded-lg border border-red-100/30">
              <label className="text-xs font-bold text-slate-700 block">Mortality Deaths Today</label>
              <input
                type="number"
                required
                min="0"
                value={mortalityCount}
                onChange={(e) => setMortalityCount(Number(e.target.value))}
                placeholder="0"
                className="mt-1 w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:bg-white text-slate-800 shadow-xs"
              />
            </div>

            {mortalityCount > 0 && (
              <div className="p-3 rounded-lg">
                <label className="text-xs font-semibold text-slate-500 block">Suspected Mortality Reason</label>
                <input
                  type="text"
                  value={mortalityCause}
                  onChange={(e) => setMortalityCause(e.target.value)}
                  placeholder="e.g. Heat congestion, predator, egg bound"
                  className="mt-1 w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:bg-white text-slate-800"
                />
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 block">General Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Record any general behaviors, coops repairs etc."
              className="mt-1 w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white text-slate-800 h-16"
            />
          </div>

          <div className="bg-slate-50 p-2.5 rounded-lg text-[11px] text-slate-500 flex justify-between items-center font-semibold">
            <span>Dynamic Computed Yield For Entry:</span>
            <div className="flex gap-4">
              <span>Saleable Eggs: <span className="text-emerald-700 font-extrabold">{Math.max(0, eggsCollected - eggsBroken - eggsSpoilt)}</span></span>
              <span>Laying Rate: <span className="text-emerald-700 font-extrabold">{liveBirds > 0 ? ((eggsCollected / liveBirds) * 100).toFixed(1) : 0}%</span></span>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-3">
            <button
              id="btn_cancel_log"
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3.5 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
            >
              Close Form
            </button>
            <button
              id="btn_save_daily_log"
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow"
            >
              Record Session
            </button>
          </div>
        </form>
      )}

      {/* Filters ledger */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Book Filter:</span>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <select
            value={filterBatchId}
            onChange={(e) => setFilterBatchId(e.target.value)}
            className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none bg-slate-50 text-slate-800 font-medium"
          >
            <option value="all">All Batches</option>
            {batches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>

          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none bg-slate-50 text-slate-800 font-mono"
          />

          {(filterBatchId !== 'all' || filterDate) && (
            <button
              id="btn_reset_filters"
              onClick={() => {
                setFilterBatchId('all');
                setFilterDate('');
              }}
              className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2.5 py-1.5 font-bold rounded"
            >
              Clear Filter
            </button>
          )}
        </div>
      </div>

      {/* Grid records */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-400 text-[9px] sm:text-[10px] uppercase font-bold tracking-wider sm:tracking-widest whitespace-nowrap">
                <th className="px-3 py-2.5 sm:px-5 sm:py-3.5">Date</th>
                <th className="px-3 py-2.5 sm:px-5 sm:py-3.5 min-w-[140px]">Flock / Batch</th>
                <th className="px-3 py-2.5 sm:px-5 sm:py-3.5 text-center">Harvested Eggs</th>
                <th className="px-3 py-2.5 sm:px-5 sm:py-3.5 text-center">Broken & Spoilt</th>
                <th className="px-3 py-2.5 sm:px-5 sm:py-3.5 text-center">Saleable Eggs</th>
                <th className="px-3 py-2.5 sm:px-5 sm:py-3.5 text-center">Lay Yield</th>
                <th className="px-3 py-2.5 sm:px-5 sm:py-3.5 text-center min-w-[130px]">Mortality Death</th>
                <th className="px-3 py-2.5 sm:px-5 sm:py-3.5 text-center">Consumed Feed</th>
                <th className="px-3 py-2.5 sm:px-5 sm:py-3.5 text-right">Logged By / Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filteredRecords.map(rec => {
                const batch = batches.find(b => b.id === rec.batchId);
                const saleable = rec.eggsCollected - rec.eggsBroken - rec.eggsSpoilt;
                // Laying rate based on birds alive in batch at that point or currently
                const birdsCount = batch ? batch.currentCount : 1;
                const layRate = (rec.eggsCollected / (birdsCount || 1)) * 100;
 
                return (
                  <tr key={rec.id} className="hover:bg-slate-50/50 font-sans text-[11px] sm:text-xs" id={`record_row_${rec.id}`}>
                    <td className="px-3 py-3 sm:px-5 sm:py-4 font-mono font-medium text-slate-600 whitespace-nowrap">{rec.date}</td>
                    <td className="px-3 py-3 sm:px-5 sm:py-4 font-bold text-slate-800 break-words whitespace-normal max-w-[150px]">
                      {batch ? batch.name : 'Archived Batch'}
                    </td>
                    <td className="px-3 py-3 sm:px-5 sm:py-4 text-center font-mono font-semibold whitespace-nowrap">{rec.eggsCollected.toLocaleString()}</td>
                    <td className="px-3 py-3 sm:px-5 sm:py-3.5 text-center font-mono text-rose-600 whitespace-nowrap">
                      {rec.eggsBroken} broken, {rec.eggsSpoilt} spoilt
                    </td>
                    <td className="px-3 py-3 sm:px-5 sm:py-4 text-center font-mono font-extrabold text-emerald-700 whitespace-nowrap">
                      {saleable.toLocaleString()}
                    </td>
                    <td className="px-3 py-3 sm:px-5 sm:py-4 text-center whitespace-nowrap">
                      <span className="inline-block px-1.5 py-0.5 rounded font-mono font-bold bg-amber-50 text-amber-800 border border-amber-100/50 text-[10px]">
                        {layRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-3 py-3 sm:px-5 sm:py-4 text-center">
                      {rec.mortalityCount > 0 ? (
                        <div className="max-w-[120px] mx-auto">
                          <span className="inline-block px-2 py-0.5 font-bold font-mono bg-red-100 text-red-700 rounded text-[10px] whitespace-nowrap">
                            {rec.mortalityCount} Dead
                          </span>
                          {rec.mortalityCause && (
                            <span className="block text-[9px] text-slate-400 mt-0.5 italic break-words whitespace-normal leading-snug">
                              ({rec.mortalityCause})
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="px-3 py-3 sm:px-5 sm:py-4 text-center font-mono text-amber-900 font-semibold bg-amber-50/20 whitespace-nowrap">
                      {rec.feedConsumedBags} bags
                    </td>
                    <td className="px-3 py-3 sm:px-5 sm:py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2.5">
                        <span className="text-[10px] text-slate-400 italic">By: {rec.createdBy}</span>
                        {user?.role === 'admin' ? (
                          <div className="flex items-center gap-1">
                            {deleteConfirmId === rec.id && (
                              <span className="text-[9px] font-bold text-amber-600 animate-pulse">Confirm?</span>
                            )}
                            <button
                              id={`delete_rec_${rec.id}`}
                              onClick={() => {
                                if (deleteConfirmId === rec.id) {
                                  onDeleteRecord(rec.id);
                                  setDeleteConfirmId(null);
                                } else {
                                  setDeleteConfirmId(rec.id);
                                  setTimeout(() => {
                                    setDeleteConfirmId(prev => prev === rec.id ? null : prev);
                                  }, 4000);
                                }
                              }}
                              className={`p-1 rounded transition-colors ${
                                deleteConfirmId === rec.id
                                  ? 'text-red-600 bg-red-50 border border-red-200 animate-pulse'
                                  : 'text-slate-400 hover:text-red-600'
                              }`}
                              title={deleteConfirmId === rec.id ? "Click again to confirm delete" : "Delete record"}
                            >
                              <Trash className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="p-1 text-[10px] text-zinc-300" title="Worker cannot delete records"><ShieldAlert className="w-3.5 h-3.5" /></span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredRecords.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-5 py-8 text-center text-slate-400">
                    No matching daily log entries located for this selection.
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
