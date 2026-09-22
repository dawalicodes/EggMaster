/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Calendar, Layers, ShieldAlert, PlusCircle, Filter, Trash, Edit, Check, Scale, Egg, TrendingUp, Info } from 'lucide-react';
import { DailyRecord, Batch, User } from '../types';
import CustomSelect from './CustomSelect';
import { getLocalDateString } from '../utils/date';

interface EggMortalityTrackerProps {
  dailyRecords: DailyRecord[];
  batches: Batch[];
  user: User | null;
  onAddRecord: (record: Omit<DailyRecord, 'id'>) => void;
  onDeleteRecord: (recordId: string) => void;
  usersList?: User[];
}

export default function EggMortalityTracker({
  dailyRecords,
  batches,
  user,
  onAddRecord,
  onDeleteRecord,
  usersList = []
}: EggMortalityTrackerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState(batches[0]?.id || '');
  const [date, setDate] = useState(getLocalDateString()); // Baseline default

  // Layer fields
  const [eggsCollected, setEggsCollected] = useState<number>(0);
  const [eggsBroken, setEggsBroken] = useState<number>(0);
  const [eggsSpoilt, setEggsSpoilt] = useState<number>(0);

  // Broiler fields
  const [avgWeightKg, setAvgWeightKg] = useState<number | ''>('');
  const [feedTypeUsed, setFeedTypeUsed] = useState<'Broiler Starter' | 'Broiler Grower' | 'Broiler Finisher' | 'Layers Mash'>('Broiler Starter');

  // Shared fields
  const [mortalityCount, setMortalityCount] = useState<number>(0);
  const [mortalityCause, setMortalityCause] = useState('');
  const [feedConsumedBags, setFeedConsumedBags] = useState<number>(2.0);
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Filtering lists
  const [filterBatchId, setFilterBatchId] = useState('all');
  const [filterType, setFilterType] = useState<'all' | 'layer' | 'broiler'>('all');
  const [filterDate, setFilterDate] = useState('');

  // Iframe-safe delete confirmation state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Target batch current birds count for the form
  const selectedBatch = batches.find(b => b.id === selectedBatchId);
  const isBroilerBatch = selectedBatch?.flockType === 'broiler';
  const liveBirds = selectedBatch ? selectedBatch.currentCount : 0;

  // Calculate current age in days
  const getBatchDays = (batch?: Batch) => {
    if (!batch) return 0;
    const today = new Date();
    const acquired = new Date(batch.dateAcquired);
    const diffTime = today.getTime() - acquired.getTime();
    const diffDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
    return (batch.ageDaysAtAcquisition ?? (batch.ageWeeksAtAcquisition ? batch.ageWeeksAtAcquisition * 7 : 1)) + diffDays;
  };

  // Cumulative feed & previous weight for FCR calculation
  const getCumulativeFeedBags = (batchId: string) => {
    return dailyRecords
      .filter(r => r.batchId === batchId)
      .reduce((sum, r) => sum + r.feedConsumedBags, 0);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedBatchId) {
      setErrorMsg('Please select a valid flock batch.');
      return;
    }
    if (mortalityCount < 0 || feedConsumedBags < 0) {
      setErrorMsg('Numerical fields cannot contain negative quantities.');
      return;
    }

    if (isBroilerBatch) {
      if (avgWeightKg !== '' && Number(avgWeightKg) < 0) {
        setErrorMsg('Average bird weight cannot be negative.');
        return;
      }
    } else {
      if (eggsCollected < 0 || eggsBroken < 0 || eggsSpoilt < 0) {
        setErrorMsg('Egg harvest quantities cannot be negative.');
        return;
      }
      if (eggsCollected < (eggsBroken + eggsSpoilt)) {
        setErrorMsg('Eggs collected cannot be less than broken and spoilt counts combined.');
        return;
      }
    }

    // Dynamic FCR calculation if weight is provided for broiler
    let dynamicFCR: number | undefined = undefined;
    if (isBroilerBatch && avgWeightKg && Number(avgWeightKg) > 0.05) {
      const currentFeedKg = (getCumulativeFeedBags(selectedBatchId) + feedConsumedBags) * 25;
      const weightGainKg = Math.max(0.1, (liveBirds * Number(avgWeightKg)) - ((selectedBatch?.initialCount || 100) * 0.045));
      dynamicFCR = Number((currentFeedKg / weightGainKg).toFixed(2));
    }

    onAddRecord({
      date,
      batchId: selectedBatchId,
      eggsCollected: isBroilerBatch ? 0 : eggsCollected,
      eggsBroken: isBroilerBatch ? 0 : eggsBroken,
      eggsSpoilt: isBroilerBatch ? 0 : eggsSpoilt,
      mortalityCount,
      mortalityCause: mortalityCount > 0 ? mortalityCause : '',
      feedConsumedBags,
      feedTypeUsed: isBroilerBatch ? feedTypeUsed : 'Layers Mash',
      avgWeightKg: isBroilerBatch && avgWeightKg !== '' ? Number(avgWeightKg) : undefined,
      fcr: dynamicFCR,
      notes,
      createdBy: user?.id || 'admin_user'
    });

    // Reset fields
    setEggsCollected(0);
    setEggsBroken(0);
    setEggsSpoilt(0);
    setAvgWeightKg('');
    setMortalityCount(0);
    setMortalityCause('');
    setFeedConsumedBags(2.0);
    setNotes('');
    setShowAddForm(false);
  };

  // Filter daily records
  const filteredRecords = dailyRecords.filter(rec => {
    const batch = batches.find(b => b.id === rec.batchId);
    const matchesBatch = filterBatchId === 'all' || rec.batchId === filterBatchId;
    const matchesDate = !filterDate || rec.date === filterDate;
    const matchesType = filterType === 'all' 
      ? true 
      : filterType === 'broiler' 
        ? batch?.flockType === 'broiler'
        : (batch?.flockType === 'layer' || !batch?.flockType);
    return matchesBatch && matchesDate && matchesType;
  }).sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-6" id="egg_mortality_tracker_container">
      {/* Head section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-800 font-display flex items-center gap-2">
            Daily Operations & Flock Log Book
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Log egg harvests, broiler weight samples, casualties, feed types, and daily consumption.
          </p>
        </div>

        <button
          id="btn_toggle_daily_record"
          onClick={() => {
            setShowAddForm(!showAddForm);
            if (!selectedBatchId && batches.length > 0) {
              setSelectedBatchId(batches[0].id);
            }
          }}
          className="px-4 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow flex items-center gap-1 cursor-pointer"
        >
          <PlusCircle className="w-4.5 h-4.5" /> Record Today's Log
        </button>
      </div>

      {/* Daily recording logging form */}
      {showAddForm && (
        <form onSubmit={handleCreate} className="bg-white p-5 sm:p-6 rounded-2xl border-2 border-emerald-600/30 shadow-sm space-y-5" id="daily_logging_form">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-3 gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                Daily Flock Activity Entry
                {selectedBatch && (
                  <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-extrabold ${
                    isBroilerBatch ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {isBroilerBatch ? 'Broiler Flock' : 'Layer Flock'}
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500">
                {isBroilerBatch 
                  ? 'Track weight gain, broiler feed type, and flock mortality.' 
                  : 'Track egg harvests, broken/spoilt counts, and feed intake.'}
              </p>
            </div>
            <span className="text-[10px] text-slate-400 font-medium italic">Estimated record time: 15 seconds</span>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 text-red-700 border border-red-100 rounded-lg text-xs font-medium">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 block">Flock Batch</label>
              <CustomSelect
                value={selectedBatchId}
                onChange={(e) => {
                  setSelectedBatchId(e.target.value);
                  const b = batches.find(x => x.id === e.target.value);
                  if (b?.flockType === 'broiler') {
                    const days = getBatchDays(b);
                    if (days <= 14) setFeedTypeUsed('Broiler Starter');
                    else if (days <= 28) setFeedTypeUsed('Broiler Grower');
                    else setFeedTypeUsed('Broiler Finisher');
                  }
                }}
                className="mt-1 w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:bg-white text-slate-800"
              >
                <option value="">-- Choose Batch --</option>
                {batches.filter(b => b.status === 'active').map(b => (
                  <option key={b.id} value={b.id}>
                    [{b.flockType === 'broiler' ? 'Broiler' : 'Layer'}] {b.name} ({b.currentCount} alive)
                  </option>
                ))}
              </CustomSelect>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block">Date of Operations</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:bg-white text-slate-800 font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block">Daily Feed Consumed (Bags)</label>
              <input
                type="number"
                step="0.05"
                required
                min="0"
                value={feedConsumedBags}
                onChange={(e) => setFeedConsumedBags(Number(e.target.value))}
                placeholder="e.g. 2.5"
                className="mt-1 w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:bg-white text-slate-800 font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">25kg bag standard ({feedConsumedBags * 25} kg total)</span>
            </div>
          </div>

          {/* DYNAMIC SECTION: BROILER VS LAYER */}
          {isBroilerBatch ? (
            /* BROILER PRODUCTION SECTION */
            <div className="p-4 bg-blue-50/70 border border-blue-200/80 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Scale className="w-4 h-4 text-blue-700" />
                  <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider">Broiler Growth & Feed Management</h4>
                </div>
                {selectedBatch && (
                  <span className="text-xs text-blue-800 font-bold">
                    Age: Day {getBatchDays(selectedBatch)} of {selectedBatch.targetAgeDays || 42}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block">Average Sampled Weight (kg/bird)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.04"
                    max="5.0"
                    value={avgWeightKg}
                    onChange={(e) => setAvgWeightKg(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 1.85 (leave blank if not weighing today)"
                    className="mt-1 w-full text-xs font-bold px-3 py-2 border border-blue-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 text-slate-900 shadow-2xs font-mono"
                  />
                  <span className="text-[10px] text-blue-600 mt-0.5 block">
                    Target: {selectedBatch?.targetWeightKg || 2.2} kg 
                    {avgWeightKg && selectedBatch?.targetWeightKg 
                      ? ` (${((Number(avgWeightKg) / selectedBatch.targetWeightKg) * 100).toFixed(0)}% reached)` 
                      : ''}
                  </span>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block">Feed Phase / Ration</label>
                  <CustomSelect
                    value={feedTypeUsed}
                    onChange={(e) => setFeedTypeUsed(e.target.value as any)}
                    className="mt-1 w-full text-xs px-3 py-2 border border-blue-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 text-slate-800 font-medium"
                  >
                    <option value="Broiler Starter">Broiler Starter (Day 1 - 14)</option>
                    <option value="Broiler Grower">Broiler Grower (Day 15 - 28)</option>
                    <option value="Broiler Finisher">Broiler Finisher (Day 29+ to Harvest)</option>
                  </CustomSelect>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Matches dietary crude protein & energy needs</span>
                </div>
              </div>
            </div>
          ) : (
            /* LAYER PRODUCTION SECTION */
            <div className="grid grid-cols-3 gap-3 bg-amber-50/50 p-4 rounded-xl border border-amber-150">
              <div>
                <label className="text-xs font-bold text-slate-700 block">Eggs Harvested</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={eggsCollected}
                  onChange={(e) => setEggsCollected(Number(e.target.value))}
                  placeholder="e.g. 850"
                  className="mt-1 w-full text-xs font-extrabold px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 text-slate-900 shadow-2xs font-mono"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">{(eggsCollected / 30).toFixed(1)} crates</span>
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
                  className="mt-1 w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 text-slate-800 shadow-2xs font-mono"
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
                  className="mt-1 w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 text-slate-800 shadow-2xs font-mono"
                />
              </div>
            </div>
          )}

          {/* Mortality */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-rose-50/40 p-3.5 rounded-xl border border-rose-100">
              <label className="text-xs font-bold text-slate-700 block">Mortality Casualties Today</label>
              <input
                type="number"
                required
                min="0"
                value={mortalityCount}
                onChange={(e) => setMortalityCount(Number(e.target.value))}
                placeholder="0"
                className="mt-1 w-full text-xs px-3 py-2 border border-rose-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-rose-600 text-slate-800 shadow-2xs font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Birds alive in batch: {liveBirds}</span>
            </div>

            {mortalityCount > 0 ? (
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <label className="text-xs font-semibold text-slate-600 block">Suspected Mortality Reason</label>
                <input
                  type="text"
                  value={mortalityCause}
                  onChange={(e) => setMortalityCause(e.target.value)}
                  placeholder="e.g. Heat stress, ascites, predator, sudden death"
                  className="mt-1 w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-rose-600 text-slate-800"
                />
              </div>
            ) : (
              <div className="flex items-center text-xs text-slate-400 p-3.5">
                <span>Casualty reason field appears automatically when mortality is entered.</span>
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 block">General Notes & Observations</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Record any general flock behaviors, coop ventilation changes, water additives, etc."
              className="mt-1 w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white text-slate-800 h-16"
            />
          </div>

          {/* Computed summary banner */}
          <div className="bg-slate-50 p-3 rounded-xl text-xs text-slate-600 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 font-semibold">
            <span>Summary for this Entry:</span>
            {isBroilerBatch ? (
              <div className="flex flex-wrap gap-4">
                <span>Live Biomass: <strong className="text-blue-700">{avgWeightKg ? `${(liveBirds * Number(avgWeightKg)).toFixed(1)} kg` : 'Weight pending'}</strong></span>
                <span>Feed Consumed: <strong className="text-blue-700">{feedConsumedBags * 25} kg</strong></span>
              </div>
            ) : (
              <div className="flex flex-wrap gap-4">
                <span>Saleable Eggs: <strong className="text-emerald-700">{Math.max(0, eggsCollected - eggsBroken - eggsSpoilt)}</strong></span>
                <span>Laying Rate: <strong className="text-emerald-700">{liveBirds > 0 ? ((eggsCollected / liveBirds) * 100).toFixed(1) : 0}%</strong></span>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-3">
            <button
              id="btn_cancel_log"
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3.5 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
            >
              Close Form
            </button>
            <button
              id="btn_save_daily_log"
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow cursor-pointer"
            >
              Record Session
            </button>
          </div>
        </form>
      )}

      {/* Filters ledger */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Log Book Filter:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Filter Flock Type */}
          <CustomSelect
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none bg-slate-50 text-slate-800 font-medium"
          >
            <option value="all">All Flock Types</option>
            <option value="layer">Layers Only</option>
            <option value="broiler">Broilers Only</option>
          </CustomSelect>

          <CustomSelect
            value={filterBatchId}
            onChange={(e) => setFilterBatchId(e.target.value)}
            className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none bg-slate-50 text-slate-800 font-medium"
          >
            <option value="all">All Batches</option>
            {batches.map(b => (
              <option key={b.id} value={b.id}>
                [{b.flockType === 'broiler' ? 'Broiler' : 'Layer'}] {b.name}
              </option>
            ))}
          </CustomSelect>

          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none bg-slate-50 text-slate-800 font-mono"
          />

          {(filterBatchId !== 'all' || filterDate || filterType !== 'all') && (
            <button
              id="btn_reset_filters"
              onClick={() => {
                setFilterBatchId('all');
                setFilterType('all');
                setFilterDate('');
              }}
              className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2.5 py-1.5 font-bold rounded cursor-pointer"
            >
              Clear Filter
            </button>
          )}
        </div>
      </div>

      {/* Grid records */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-400 text-[9px] sm:text-[10px] uppercase font-bold tracking-wider sm:tracking-widest whitespace-nowrap">
                <th className="px-3 py-2.5 sm:px-5 sm:py-3.5">Date</th>
                <th className="px-3 py-2.5 sm:px-5 sm:py-3.5 min-w-[150px]">Flock / Batch</th>
                <th className="px-3 py-2.5 sm:px-5 sm:py-3.5 text-center">Production / Yield</th>
                <th className="px-3 py-2.5 sm:px-5 sm:py-3.5 text-center">Quality / Weight Metric</th>
                <th className="px-3 py-2.5 sm:px-5 sm:py-3.5 text-center min-w-[120px]">Mortality Casualties</th>
                <th className="px-3 py-2.5 sm:px-5 sm:py-3.5 text-center">Feed Consumed & Type</th>
                <th className="px-3 py-2.5 sm:px-5 sm:py-3.5 text-right">Logged By / Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filteredRecords.map(rec => {
                const batch = batches.find(b => b.id === rec.batchId);
                const isBroiler = batch?.flockType === 'broiler';
                const saleable = rec.eggsCollected - rec.eggsBroken - rec.eggsSpoilt;
                const birdsCount = batch ? batch.currentCount : 1;
                const layRate = (rec.eggsCollected / (birdsCount || 1)) * 100;

                return (
                  <tr key={rec.id} className="hover:bg-slate-50/50 font-sans text-[11px] sm:text-xs" id={`record_row_${rec.id}`}>
                    <td className="px-3 py-3 sm:px-5 sm:py-4 font-mono font-medium text-slate-600 whitespace-nowrap">{rec.date}</td>
                    <td className="px-3 py-3 sm:px-5 sm:py-4 font-bold text-slate-800 break-words whitespace-normal max-w-[160px]">
                      <div>{batch ? batch.name : 'Archived Batch'}</div>
                      <div className="mt-0.5">
                        {isBroiler ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200 uppercase">
                            <Scale className="w-2.5 h-2.5" /> Broiler
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 uppercase">
                            <Egg className="w-2.5 h-2.5" /> Layer
                          </span>
                        )}
                      </div>
                    </td>
                    
                    {/* Production / Yield column */}
                    <td className="px-3 py-3 sm:px-5 sm:py-4 text-center whitespace-nowrap">
                      {isBroiler ? (
                        <div>
                          <span className="font-mono font-bold text-blue-800">
                            {rec.avgWeightKg ? `${rec.avgWeightKg} kg/bird` : 'Daily Maintenance'}
                          </span>
                          {rec.avgWeightKg && batch?.targetWeightKg && (
                            <span className="block text-[10px] text-slate-400 font-mono">
                              {((rec.avgWeightKg / batch.targetWeightKg) * 100).toFixed(0)}% of {batch.targetWeightKg}kg target
                            </span>
                          )}
                        </div>
                      ) : (
                        <div>
                          <span className="font-mono font-extrabold text-emerald-700">{saleable.toLocaleString()} saleable</span>
                          <span className="block text-[10px] text-slate-400 font-mono">({rec.eggsCollected} gathered)</span>
                        </div>
                      )}
                    </td>

                    {/* Quality / Weight metric column */}
                    <td className="px-3 py-3 sm:px-5 sm:py-3.5 text-center whitespace-nowrap">
                      {isBroiler ? (
                        rec.fcr ? (
                          <span className="inline-block px-2 py-0.5 font-bold font-mono bg-blue-50 text-blue-800 rounded border border-blue-200 text-[10px]">
                            FCR {rec.fcr}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px] font-mono">Normal growth</span>
                        )
                      ) : (
                        <div>
                          <span className="inline-block px-1.5 py-0.5 rounded font-mono font-bold bg-amber-50 text-amber-800 border border-amber-100/50 text-[10px]">
                            {layRate.toFixed(1)}% rate
                          </span>
                          {(rec.eggsBroken > 0 || rec.eggsSpoilt > 0) && (
                            <span className="block text-[10px] text-rose-600 font-mono mt-0.5">
                              {rec.eggsBroken} broken, {rec.eggsSpoilt} spoilt
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Mortality casualties */}
                    <td className="px-3 py-3 sm:px-5 sm:py-4 text-center">
                      {rec.mortalityCount > 0 ? (
                        <div className="max-w-[130px] mx-auto">
                          <span className="inline-block px-2 py-0.5 font-bold font-mono bg-rose-100 text-rose-700 rounded text-[10px] whitespace-nowrap">
                            {rec.mortalityCount} Dead
                          </span>
                          {rec.mortalityCause && (
                            <span className="block text-[9px] text-slate-500 mt-0.5 italic break-words whitespace-normal leading-snug">
                              ({rec.mortalityCause})
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>

                    {/* Feed consumed & type */}
                    <td className="px-3 py-3 sm:px-5 sm:py-4 text-center font-mono whitespace-nowrap">
                      <div className="text-amber-900 font-bold">{rec.feedConsumedBags} bags</div>
                      <div className="text-[10px] text-slate-400 font-sans">
                        {rec.feedTypeUsed || (isBroiler ? 'Broiler Ration' : 'Layers Mash')}
                      </div>
                    </td>

                    {/* Logged by / actions */}
                    <td className="px-3 py-3 sm:px-5 sm:py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2.5">
                        <span className="text-[10px] text-slate-400 italic">By: {(() => {
                          const matchedUser = usersList.find(u => u.id === rec.createdBy || u.username === rec.createdBy);
                          if (matchedUser) {
                            return matchedUser.username;
                          }
                          return rec.createdBy === 'admin_user' || rec.createdBy === 'admin'
                            ? 'Admin'
                            : (rec.createdBy === 'worker_user' || rec.createdBy === 'worker' ? 'Worker' : rec.createdBy);
                        })()}</span>
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
                              className={`p-1 rounded transition-colors cursor-pointer ${
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
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
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
