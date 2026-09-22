/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Layers, Plus, Users, Calendar, HelpCircle, Archive, Trash2, Heart, Scale, Feather, Egg, CheckCircle2 } from 'lucide-react';
import { Batch, Supplier, DailyRecord, User, FlockType } from '../types';
import CustomSelect from './CustomSelect';
import { getLocalDateString } from '../utils/date';

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
  const [filterType, setFilterType] = useState<'all' | 'layer' | 'broiler'>('all');
  
  // Form fields
  const [flockType, setFlockType] = useState<FlockType>('layer');
  const [name, setName] = useState('');
  const [breed, setBreed] = useState('Lohmann Brown');
  const [initialCount, setInitialCount] = useState<number>(500);
  const [dateAcquired, setDateAcquired] = useState(getLocalDateString());
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id || '');
  
  // Layer-specific fields
  const [ageWeeksAtAcquisition, setAgeWeeksAtAcquisition] = useState<number>(18);
  
  // Broiler-specific fields
  const [ageDaysAtAcquisition, setAgeDaysAtAcquisition] = useState<number>(1); // Day-old chicks
  const [targetWeightKg, setTargetWeightKg] = useState<number>(2.2);
  const [targetAgeDays, setTargetAgeDays] = useState<number>(42);
  
  const [errorMsg, setErrorMsg] = useState('');
  const [depleteConfirmId, setDepleteConfirmId] = useState<string | null>(null);

  // Age calculation in days and weeks
  const getBatchAgeDetails = (batch: Batch) => {
    const today = new Date();
    const acquired = new Date(batch.dateAcquired);
    const diffTime = today.getTime() - acquired.getTime();
    const diffDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
    
    if (batch.flockType === 'broiler') {
      const currentDays = (batch.ageDaysAtAcquisition ?? 1) + diffDays;
      const currentWeeks = Math.floor(currentDays / 7);
      return {
        days: currentDays,
        weeks: currentWeeks,
        display: `Day ${currentDays} (Wk ${currentWeeks})`,
        isHarvestReady: currentDays >= (batch.targetAgeDays || 42)
      };
    } else {
      const addedWeeks = Math.floor(diffDays / 7);
      const currentWeeks = batch.ageWeeksAtAcquisition + addedWeeks;
      return {
        days: diffDays + (batch.ageWeeksAtAcquisition * 7),
        weeks: currentWeeks,
        display: `${currentWeeks} wks old`,
        isHarvestReady: false
      };
    }
  };

  // Calculate stats for a batch
  const getBatchStats = (batch: Batch) => {
    const batchRecords = dailyRecords.filter(r => r.batchId === batch.id).sort((a, b) => a.date.localeCompare(b.date));
    const totalMortality = batchRecords.reduce((total, r) => total + r.mortalityCount, 0);
    const currentCount = Math.max(0, batch.initialCount - totalMortality);
    const totalEggsCollected = batchRecords.reduce((total, r) => total + r.eggsCollected, 0);
    const totalFeedBags = batchRecords.reduce((total, r) => total + r.feedConsumedBags, 0);

    // For broilers: latest sample weight & FCR
    const recordsWithWeight = batchRecords.filter(r => r.avgWeightKg && r.avgWeightKg > 0);
    const latestWeightKg = recordsWithWeight.length > 0
      ? recordsWithWeight[recordsWithWeight.length - 1].avgWeightKg!
      : (batch.flockType === 'broiler' ? 0.045 : 0);

    // Standard 25kg bag estimation for FCR
    const totalFeedKg = totalFeedBags * 25;
    const gainedWeightKg = Math.max(0.01, (currentCount * latestWeightKg) - (batch.initialCount * 0.045));
    const estimatedFCR = (batch.flockType === 'broiler' && gainedWeightKg > 0.5) 
      ? Number((totalFeedKg / gainedWeightKg).toFixed(2)) 
      : null;

    return {
      totalMortality,
      currentCount,
      totalEggsCollected,
      totalFeedBags,
      latestWeightKg,
      estimatedFCR,
      mortalityRate: batch.initialCount > 0 ? (totalMortality / batch.initialCount) * 100 : 0
    };
  };

  const handleFlockTypeChange = (type: FlockType) => {
    setFlockType(type);
    if (type === 'broiler') {
      setBreed('Cobb 500');
      if (!name || name.includes('Amber') || name.includes('Layer')) {
        setName(`Broiler Flock ${batches.filter(b => b.flockType === 'broiler').length + 1}`);
      }
    } else {
      setBreed('Lohmann Brown');
      if (!name || name.includes('Broiler')) {
        setName(`Layer Batch ${batches.filter(b => b.flockType !== 'broiler').length + 1}`);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Please specify a descriptive Batch / Flock Name.');
      return;
    }
    if (initialCount <= 0) {
      setErrorMsg('Initial bird flock size must be greater than zero.');
      return;
    }

    onAddBatch({
      name,
      flockType,
      breed,
      initialCount,
      currentCount: initialCount,
      dateAcquired,
      sourceSupplierId: supplierId || suppliers[0]?.id || 'sup_1',
      ageWeeksAtAcquisition: flockType === 'broiler' ? Math.floor(ageDaysAtAcquisition / 7) : ageWeeksAtAcquisition,
      ageDaysAtAcquisition: flockType === 'broiler' ? ageDaysAtAcquisition : ageWeeksAtAcquisition * 7,
      targetWeightKg: flockType === 'broiler' ? targetWeightKg : undefined,
      targetAgeDays: flockType === 'broiler' ? targetAgeDays : undefined,
      status: 'active'
    });

    // Reset Form
    setName('');
    setInitialCount(500);
    setFlockType('layer');
    setAgeWeeksAtAcquisition(18);
    setAgeDaysAtAcquisition(1);
    setTargetWeightKg(2.2);
    setTargetAgeDays(42);
    setShowAddForm(false);
    setErrorMsg('');
  };

  const filteredBatches = batches.filter(b => {
    if (filterType === 'all') return true;
    if (filterType === 'broiler') return b.flockType === 'broiler';
    return b.flockType === 'layer' || !b.flockType;
  });

  const layerCount = batches.filter(b => b.flockType === 'layer' || !b.flockType).length;
  const broilerCount = batches.filter(b => b.flockType === 'broiler').length;

  return (
    <div className="space-y-6" id="flock_manager_container">
      {/* Head */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-800 font-display flex items-center gap-2">
            Flock & Batch Management
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Manage both <strong>Layers</strong> (egg cycles) and <strong>Broilers</strong> (weight, FCR & harvest timelines).
          </p>
        </div>

        <button
          id="btn_toggle_add_batch"
          onClick={() => {
            setShowAddForm(!showAddForm);
            if (!showAddForm && !name) {
              setName(flockType === 'broiler' ? `Broiler Flock ${broilerCount + 1}` : `Layer Batch ${layerCount + 1}`);
            }
          }}
          className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-xs flex items-center gap-1 cursor-pointer"
        >
          <Plus className="w-4.5 h-4.5" /> New Flock / Batch
        </button>
      </div>

      {/* Add Batch Form */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="bg-white p-5 sm:p-6 rounded-2xl border border-emerald-200/90 shadow-sm space-y-5" id="add_batch_form">
          <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Acquire New Flock</h3>
              <p className="text-xs text-slate-500">Configure bird species, origin, target parameters, and acquisition date.</p>
            </div>

            {/* Flock Type Switcher */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit">
              <button
                type="button"
                id="select_flock_type_layer"
                onClick={() => handleFlockTypeChange('layer')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  flockType === 'layer'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Egg className="w-3.5 h-3.5" />
                Layer (Eggs)
              </button>
              <button
                type="button"
                id="select_flock_type_broiler"
                onClick={() => handleFlockTypeChange('broiler')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  flockType === 'broiler'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Scale className="w-3.5 h-3.5" />
                Broiler (Meat)
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-xs leading-5">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-600">Batch Identifier / Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={flockType === 'broiler' ? 'e.g. Cobb 500 Flock 1' : 'e.g. Amber 2026 Pullets'}
                className="mt-1 w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:bg-white text-slate-800"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600">Breed / Genetics</label>
              <input
                type="text"
                value={breed}
                onChange={(e) => setBreed(e.target.value)}
                placeholder={flockType === 'broiler' ? 'e.g. Cobb 500, Ross 308, Marshall' : 'e.g. Lohmann Brown, Hy-Line, ISA Brown'}
                className="mt-1 w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:bg-white text-slate-800"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600">Initial Quantity (Birds)</label>
              <input
                type="number"
                required
                min="10"
                value={initialCount}
                onChange={(e) => setInitialCount(Number(e.target.value))}
                className="mt-1 w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:bg-white text-slate-800 font-mono"
              />
            </div>
          </div>

          {/* Conditional parameters based on Flock Type */}
          {flockType === 'broiler' ? (
            <div className="p-4 bg-blue-50/70 border border-blue-150 rounded-xl space-y-3">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-blue-600" />
                <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider">Broiler Growth Targets & Lifecycle</h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600">Acquisition Age (Days)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    max="60"
                    value={ageDaysAtAcquisition}
                    onChange={(e) => setAgeDaysAtAcquisition(Number(e.target.value))}
                    className="mt-1 w-full text-xs px-3 py-2 border border-blue-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 text-slate-800 font-mono"
                  />
                  <span className="text-[10px] text-blue-600 mt-0.5 block">Day 1 = Day-Old Chicks (DOC)</span>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600">Target Harvest Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1.0"
                    max="5.0"
                    value={targetWeightKg}
                    onChange={(e) => setTargetWeightKg(Number(e.target.value))}
                    className="mt-1 w-full text-xs px-3 py-2 border border-blue-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 text-slate-800 font-mono"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Standard market weight: 2.0 – 2.5 kg</span>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600">Target Harvest Age (Days)</label>
                  <input
                    type="number"
                    min="25"
                    max="90"
                    value={targetAgeDays}
                    onChange={(e) => setTargetAgeDays(Number(e.target.value))}
                    className="mt-1 w-full text-xs px-3 py-2 border border-blue-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 text-slate-800 font-mono"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Typical cycle: 38 – 45 days (6 weeks)</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-emerald-50/60 border border-emerald-150 rounded-xl space-y-3">
              <div className="flex items-center gap-2">
                <Egg className="w-4 h-4 text-emerald-600" />
                <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider">Layer Maturity & Point of Lay</h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600">Age At Acquisition (Weeks)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    max="100"
                    value={ageWeeksAtAcquisition}
                    onChange={(e) => setAgeWeeksAtAcquisition(Number(e.target.value))}
                    className="mt-1 w-full text-xs px-3 py-2 border border-emerald-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 text-slate-800 font-mono"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Point of Lay is usually 16 – 19 weeks</span>
                </div>
                <div className="flex items-center text-xs text-emerald-800 p-2">
                  <span>Layers begin regular egg production around week 18-20 and maintain commercial peak for 70+ weeks.</span>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-600">Hatchery / Supplier Source</label>
              <CustomSelect
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="mt-1 w-full text-xs px-2.5 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:bg-white text-slate-800"
              >
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </CustomSelect>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600">Acquisition Date</label>
              <input
                type="date"
                required
                value={dateAcquired}
                onChange={(e) => setDateAcquired(e.target.value)}
                className="mt-1 w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:bg-white text-slate-800 font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              id="btn_cancel_add_batch"
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3.5 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="btn_save_new_batch"
              type="submit"
              className={`px-4 py-2 text-xs font-bold text-white rounded-lg transition-colors shadow cursor-pointer ${
                flockType === 'broiler' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              Acquire {flockType === 'broiler' ? 'Broiler Flock' : 'Layer Batch'}
            </button>
          </div>
        </form>
      )}

      {/* Filter Tabs & Batches Overview */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50/80 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Flocks & Batches Directory</h3>
            <span className="text-[11px] text-slate-400">({batches.length} total)</span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-200/70 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                filterType === 'all' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({batches.length})
            </button>
            <button
              onClick={() => setFilterType('layer')}
              className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                filterType === 'layer' ? 'bg-emerald-600 text-white shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Egg className="w-3 h-3" /> Layers ({layerCount})
            </button>
            <button
              onClick={() => setFilterType('broiler')}
              className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                filterType === 'broiler' ? 'bg-blue-600 text-white shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Scale className="w-3 h-3" /> Broilers ({broilerCount})
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-400 text-[9px] sm:text-[10px] uppercase font-bold tracking-wider sm:tracking-widest whitespace-nowrap">
                <th className="px-3 py-2.5 sm:px-5 sm:py-3.5 min-w-[170px]">Flock / Purpose</th>
                <th className="px-3 py-2.5 sm:px-5 sm:py-3.5 min-w-[130px]">Supplier & Breed</th>
                <th className="px-3 py-2.5 sm:px-5 sm:py-3.5">Age & Progress</th>
                <th className="px-3 py-2.5 sm:px-5 sm:py-3.5">Original / Alive</th>
                <th className="px-3 py-2.5 sm:px-5 sm:py-3.5 text-center">Mortality Rate</th>
                <th className="px-3 py-2.5 sm:px-5 sm:py-3.5 text-center">Production / Weight</th>
                <th className="px-3 py-2.5 sm:px-5 sm:py-3.5 text-right">Status / Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[11px] sm:text-xs">
              {filteredBatches.map(batch => {
                const stats = getBatchStats(batch);
                const supplier = suppliers.find(s => s.id === batch.sourceSupplierId);
                const ageDetails = getBatchAgeDetails(batch);
                const isDepleted = batch.status === 'depleted';
                const isBroiler = batch.flockType === 'broiler';

                return (
                  <tr
                    key={batch.id}
                    className={`hover:bg-slate-50/70 transition-colors ${
                      isDepleted ? 'bg-slate-50 text-slate-400' : 'text-slate-700'
                    }`}
                    id={`batch_row_${batch.id}`}
                  >
                    <td className="px-3 py-3 sm:px-5 sm:py-4 font-semibold break-words whitespace-normal max-w-[190px]">
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${isDepleted ? 'bg-zinc-300' : isBroiler ? 'bg-blue-600' : 'bg-emerald-600'}`} />
                        <div>
                          <div className="font-bold text-slate-800">{batch.name}</div>
                          <div className="flex items-center gap-1 mt-0.5">
                            {isBroiler ? (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded text-[9px] font-bold uppercase tracking-wider">
                                <Scale className="w-2.5 h-2.5" /> Broiler
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded text-[9px] font-bold uppercase tracking-wider">
                                <Egg className="w-2.5 h-2.5" /> Layer
                              </span>
                            )}
                            <span className="text-[10px] text-slate-400 font-mono">{batch.dateAcquired}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 sm:px-5 sm:py-4 text-slate-600 font-medium break-words whitespace-normal max-w-[140px]">
                      <div>{supplier ? supplier.name : 'Unknown Source'}</div>
                      <div className="text-[10px] text-slate-400 font-medium">{batch.breed || (isBroiler ? 'Broiler Hybrid' : 'Commercial Layer')}</div>
                    </td>
                    <td className="px-3 py-3 sm:px-5 sm:py-3.5 font-mono whitespace-nowrap">
                      <div className="font-bold text-slate-800">{ageDetails.display}</div>
                      {isBroiler ? (
                        <div className="text-[10px] mt-0.5">
                          {ageDetails.isHarvestReady ? (
                            <span className="text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                              ★ Market Ready
                            </span>
                          ) : (
                            <span className="text-slate-400">
                              Target: Day {batch.targetAgeDays || 42}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400">
                          ({batch.ageWeeksAtAcquisition} Wk point of lay)
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 sm:px-5 sm:py-3.5 font-mono whitespace-nowrap">
                      {batch.initialCount} / <span className={`font-bold ${isBroiler ? 'text-blue-700' : 'text-emerald-700'}`}>{stats.currentCount}</span>
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
                    <td className="px-3 py-3 sm:px-5 sm:py-3.5 text-center font-mono whitespace-nowrap">
                      {isBroiler ? (
                        <div>
                          <div className="font-bold text-blue-700">
                            {stats.latestWeightKg > 0.05 ? `${stats.latestWeightKg.toFixed(2)} kg` : 'Sampling pending'}
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1.5 mt-0.5">
                            <span>Target: {batch.targetWeightKg || 2.2} kg</span>
                            {stats.estimatedFCR ? (
                              <span className="font-bold text-slate-600 bg-slate-100 px-1 rounded">FCR {stats.estimatedFCR}</span>
                            ) : null}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="font-bold text-emerald-700">
                            {stats.totalEggsCollected.toLocaleString()} eggs
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {(stats.totalEggsCollected / 30).toFixed(1)} crates
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 sm:px-5 sm:py-4 text-right whitespace-nowrap">
                      {isDepleted ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-zinc-100 text-zinc-500 rounded font-bold text-[10px] uppercase">
                          <Archive className="w-3 h-3" /> {isBroiler ? 'Harvested / Sold' : 'Depleted'}
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
                              className={`px-2 py-1 rounded-md font-bold text-[10px] transition-colors flex items-center gap-1 uppercase cursor-pointer ${
                                depleteConfirmId === batch.id
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                              }`}
                            >
                              <Archive className="w-3 h-3" />
                              {depleteConfirmId === batch.id 
                                ? (isBroiler ? 'Confirm Harvest?' : 'Confirm Deplete?') 
                                : (isBroiler ? 'Market / Harvest' : 'Terminate Batch')}
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
              {filteredBatches.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                    No {filterType === 'all' ? '' : filterType} flocks on record. Click "New Flock / Batch" to begin operations.
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
