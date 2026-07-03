/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Calendar, PlusCircle, Bookmark, ClipboardList, CheckCircle } from 'lucide-react';
import { VaccinationLog, Batch } from '../types';
import CustomSelect from './CustomSelect';

interface VaccinationTrackerProps {
  vaccinationLogs: VaccinationLog[];
  batches: Batch[];
  onAddVaccination: (log: Omit<VaccinationLog, 'id'>) => void;
}

export default function VaccinationTracker({
  vaccinationLogs,
  batches,
  onAddVaccination
}: VaccinationTrackerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [batchId, setBatchId] = useState(batches[0]?.id || '');
  const [vaccineName, setVaccineName] = useState('');
  const [dateAdministered, setDateAdministered] = useState(new Date().toISOString().split('T')[0]);
  const [nextDueDate, setNextDueDate] = useState('');
  const [dosage, setDosage] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vaccineName.trim() || !batchId) {
      alert('Vaccine/Drug Name and Target Flock Batch are required.');
      return;
    }

    onAddVaccination({
      batchId,
      vaccineOrDrugName: vaccineName,
      dateAdministered,
      nextDueDate: nextDueDate || undefined,
      dosage,
      notes: notes || undefined
    });

    // Reset Form
    setVaccineName('');
    setNextDueDate('');
    setDosage('');
    setNotes('');
    setShowAddForm(false);
  };

  // Identify upcoming schedule within next 14 days
  const activeAlerts = vaccinationLogs.filter(v => {
    if (!v.nextDueDate) return false;
    const current = new Date().getTime();
    const target = new Date(v.nextDueDate).getTime();
    const diff = (target - current) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 14;
  });

  return (
    <div className="space-y-6" id="vaccination_tracker_container">
      {/* Header and Trigger layout */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-800 font-display flex items-center gap-2">
            Preventive Health & Medication
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Record veterinary vaccinations, dose volumes administered, and schedule next immunisations.
          </p>
        </div>

        <button
          id="btn_toggle_vac_form"
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition-colors shadow flex items-center gap-1"
        >
          <PlusCircle className="w-4.5 h-4.5" /> Log Preventive Dose
        </button>
      </div>

      {/* Adding Vaccine Log */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="bg-white p-5 rounded-xl border-2 border-emerald-600/20 shadow-xs space-y-4 font-sans" id="vaccination_form">
          <div className="border-b border-slate-100 pb-2.5">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest text-emerald-700">Log Administration Session</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 block">Flock Batch</label>
              <CustomSelect
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
                className="mt-1 w-full text-xs px-2.5 py-2 border border-slate-200 bg-slate-50 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-600"
                required
              >
                <option value="">-- Choose target flock --</option>
                {batches.filter(b => b.status === 'active').map(b => (
                  <option key={b.id} value={b.id}>{b.name} ({b.currentCount} birds)</option>
                ))}
              </CustomSelect>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 block">Vaccine / Medication Name</label>
              <input
                type="text"
                required
                value={vaccineName}
                onChange={(e) => setVaccineName(e.target.value)}
                placeholder="e.g. Newcastle G7 vaccine booster"
                className="mt-1 w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-lime-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 block">Date Administered</label>
              <input
                type="date"
                required
                value={dateAdministered}
                onChange={(e) => setDateAdministered(e.target.value)}
                className="mt-1 w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-lime-600 font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 block">Booster/Next Due Date (Optional)</label>
              <input
                type="date"
                value={nextDueDate}
                onChange={(e) => setNextDueDate(e.target.value)}
                className="mt-1 w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-lime-600 font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 block">Dose Volume & Method</label>
              <input
                type="text"
                required
                value={dosage}
                onChange={(e) => setDosage(e.target.value)}
                placeholder="e.g. 0.2ml underwing, 1ml in water"
                className="mt-1 w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-lime-600"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 block">Veterinary Remarks / Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. healthy birds, cold vaccination storage chain secure"
              className="mt-1 w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-600 h-16"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3.5 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-850 rounded-lg shadow"
            >
              Save Vet Log
            </button>
          </div>
        </form>
      )}

      {/* Grid splits into upcoming list and master log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Vaccinations Alarm Card */}
        <div className="lg:col-span-1 bg-white p-5 rounded-xl border border-slate-100 shadow-xs space-y-4">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2">
            Upcoming Health schedule Tasks
          </h3>

          <div className="space-y-3.5 max-h-96 overflow-y-auto pr-1">
            {activeAlerts.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
                <span>All scheduled booster limits are optimal! No preventative drops due this week.</span>
              </div>
            ) : (
              activeAlerts.map(sch => {
                const batch = batches.find(b => b.id === sch.batchId);
                const current = new Date().getTime(); // System time
                const target = new Date(sch.nextDueDate!).getTime();
                const diffDays = Math.ceil((target - current) / (1000 * 60 * 60 * 24));

                return (
                  <div
                    key={sch.id}
                    className="p-3 border-l-4 border-amber-500 bg-amber-50/50 rounded-r-lg space-y-1.5"
                    id={`upcoming_sch_${sch.id}`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-[11px] font-bold text-slate-800 uppercase">{sch.vaccineOrDrugName}</span>
                      <span className="text-[10px] bg-amber-100 text-amber-900 border border-amber-200 font-bold px-1.5 rounded-full font-sans">
                        In {diffDays} Days
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 leading-snug">
                      Flock: <strong className="text-slate-700">{batch?.name || 'All'}</strong> <br />
                      Due Date: <span className="font-mono font-bold text-slate-700">{sch.nextDueDate}</span> <br />
                      Dose: <span className="text-slate-700 italic font-medium">{sch.dosage}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Master Log table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Health Records & Vaccine Archives</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/20 text-slate-400 text-[9px] sm:text-[10px] uppercase font-bold tracking-wider sm:tracking-widest whitespace-nowrap">
                  <th className="px-3 py-2.5 sm:px-5 sm:py-3.5">Admin Date</th>
                  <th className="px-3 py-2.5 sm:px-5 sm:py-3.5 min-w-[140px]">Target Flock Batch</th>
                  <th className="px-3 py-2.5 sm:px-5 sm:py-3.5 min-w-[200px]">Vaccine / Compound Administered</th>
                  <th className="px-3 py-2.5 sm:px-5 sm:py-3.5 text-center">Dosage Volume</th>
                  <th className="px-3 py-2.5 sm:px-5 sm:py-3.5 text-right">Next Booster Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px] sm:text-xs text-slate-700">
                {vaccinationLogs
                  .sort((a, b) => b.dateAdministered.localeCompare(a.dateAdministered))
                  .map(log => {
                    const batch = batches.find(b => b.id === log.batchId);

                    return (
                      <tr key={log.id} className="hover:bg-slate-50/50" id={`vac_log_${log.id}`}>
                        <td className="px-3 py-3 sm:px-5 sm:py-4 font-mono font-semibold text-slate-500 whitespace-nowrap">{log.dateAdministered}</td>
                        <td className="px-3 py-3 sm:px-5 sm:py-4 font-bold text-slate-800 break-words whitespace-normal max-w-[150px]">{batch ? batch.name : 'All Flocks'}</td>
                        <td className="px-3 py-3 sm:px-5 sm:py-4 font-medium break-words whitespace-normal max-w-[240px]">
                          <div className="font-semibold text-slate-800">{log.vaccineOrDrugName}</div>
                          {log.notes && <div className="text-[10px] text-slate-400 italic mt-0.5 break-words whitespace-normal leading-normal">"{log.notes}"</div>}
                        </td>
                        <td className="px-3 py-3 sm:px-5 sm:py-4 text-center font-mono text-slate-500 italic bg-slate-50/10 whitespace-nowrap">
                          {log.dosage}
                        </td>
                        <td className="px-3 py-3 sm:px-5 sm:py-4 text-right font-mono font-bold whitespace-nowrap">
                          {log.nextDueDate ? (
                            <span className="text-lime-700 bg-lime-50 px-2 py-0.5 rounded border border-lime-100/50">
                              {log.nextDueDate}
                            </span>
                          ) : (
                            <span className="text-slate-300">- Single Dose</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                {vaccinationLogs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-slate-400">
                      No preventive medical procedures logged. Rest easy and log new ones.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
