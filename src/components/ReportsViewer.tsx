/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import {
  FileText,
  TrendingUp,
  Download,
  Calendar,
  Layers,
  Percent,
  TrendingDown,
  DollarSign,
  Coffee,
  CheckCircle2
} from 'lucide-react';
import { Batch, DailyRecord, Expense, Income } from '../types';

interface ReportsViewerProps {
  batches: Batch[];
  dailyRecords: DailyRecord[];
  expenses: Expense[];
  income: Income[];
}

export default function ReportsViewer({
  batches,
  dailyRecords,
  expenses,
  income
}: ReportsViewerProps) {
  const [reportDuration, setReportDuration] = useState<'all' | 'weekly' | 'monthly'>('all');

  // Filter relative to current date
  const filterByDuration = <T extends { date: string }>(items: T[]): T[] => {
    if (reportDuration === 'all') return items;
    const refDate = new Date();

    return items.filter(item => {
      const itemDate = new Date(item.date);
      const diffTime = refDate.getTime() - itemDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (reportDuration === 'weekly') {
        return diffDays >= 0 && diffDays <= 7;
      } else {
        return diffDays >= 0 && diffDays <= 30;
      }
    });
  };

  const activeRecords = filterByDuration(dailyRecords);
  const activeExpenses = filterByDuration(expenses);
  const activeIncome = filterByDuration(income);

  // Aggregated Stats
  const eggsCollected = activeRecords.reduce((s, r) => s + r.eggsCollected, 0);
  const eggsBroken = activeRecords.reduce((s, r) => s + r.eggsBroken, 0);
  const eggsSpoilt = activeRecords.reduce((s, r) => s + r.eggsSpoilt, 0);
  const deathsCount = activeRecords.reduce((s, r) => s + r.mortalityCount, 0);
  const feedBags = activeRecords.reduce((s, r) => s + r.feedConsumedBags, 0);

  const saleableEggs = eggsCollected - eggsBroken - eggsSpoilt;
  const eggCrates = saleableEggs / 30; // 30 eggs per standard crate/tray

  const totalRevenue = activeIncome.reduce((s, i) => s + i.totalAmount, 0);
  const totalExpenditure = activeExpenses.reduce((s, e) => s + e.amount, 0);
  const netProfit = totalRevenue - totalExpenditure;

  // Efficiency Computations
  // 1. Cost per Crate of Eggs = Total farm expenditures / total crates produced
  const costPerCrate = eggCrates > 0 ? totalExpenditure / eggCrates : 0;

  // 2. Feed-to-egg ratio = bags consumed per crate produced
  const feedToEggRatio = eggCrates > 0 ? feedBags / eggCrates : 0;

  // 3. Average lay rate = Eggs collected / estimated birds alive across period
  const totalActiveBirds = batches.filter(b => b.status === 'active').reduce((s, b) => s + b.currentCount, 0);
  const occurrencesMultiplier = Array.from(new Set(activeRecords.map(r => r.date))).length || 1;
  const eggsPerBird = totalActiveBirds > 0 ? eggsCollected / (totalActiveBirds * occurrencesMultiplier) : 0;

  // 4. Mortality rate relative to period
  const totalInitialBirds = batches.reduce((s, b) => s + b.initialCount, 0);
  const mortalityRate = totalInitialBirds > 0 ? (deathsCount / totalInitialBirds) * 100 : 0;

  // CSV Generation Tools
  const downloadDailyRecordsCSV = () => {
    const headers = ['Date', 'Batch', 'Eggs Collected', 'Broken', 'Spoilt', 'Saleable', 'Mortality', 'Cause', 'Feed Consumed (Bags)', 'Logger Notes'];
    const rows = dailyRecords.map(rec => {
      const batchName = batches.find(b => b.id === rec.batchId)?.name || 'N/A';
      const saleable = rec.eggsCollected - rec.eggsBroken - rec.eggsSpoilt;
      return [
        rec.date,
        `"${batchName}"`,
        rec.eggsCollected,
        rec.eggsBroken,
        rec.eggsSpoilt,
        saleable,
        rec.mortalityCount,
        `"${rec.mortalityCause || ''}"`,
        rec.feedConsumedBags,
        `"${rec.notes || ''}"`
      ];
    });

    triggerCSVDownload('Daily_Operations_Ledger_Backups', headers, rows);
  };

  const downloadFinancialLedgerCSV = () => {
    // Generate expense book joined with sales proceeds for Excel
    const headers = ['Date', 'Entry Type', 'Particular Name / Category', 'Quantity', 'Unit Value ($)', 'Grand Total ($)', 'Debtor Status', 'Settled Todate'];
    const rows = [
      ...income.map(i => [i.date, 'INCOME_PROCEED', i.source, i.quantity, i.unitPrice, i.totalAmount, i.paymentStatus, i.amountPaid]),
      ...expenses.map(e => [e.date, 'EXPENSE_SPEND', e.category, '1', e.amount, e.amount, '-', '-'])
    ].sort((a, b) => String(b[0]).localeCompare(String(a[0])));

    triggerCSVDownload('Farm_Cashflow_Transactions_Export', headers, rows);
  };

  const triggerCSVDownload = (filename: string, headers: string[], rows: any[][]) => {
    const csvContent = 'data:text/csv;charset=utf-8,'
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6" id="reports_viewer_container">
      {/* Header filter layouts */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-800 font-display flex items-center gap-2">
            Farm Analytics & Financial Health
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Evaluate cost efficiencies, feed conversion margins, and download spreadsheet logs.
          </p>
        </div>

        {/* Filter limits */}
        <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-semibold">
          <button
            id="period_all"
            onClick={() => setReportDuration('all')}
            className={`px-3 py-1.5 rounded-md ${
              reportDuration === 'all' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500'
            }`}
          >
            All Time
          </button>
          <button
            id="period_weekly"
            onClick={() => setReportDuration('weekly')}
            className={`px-3 py-1.5 rounded-md ${
              reportDuration === 'weekly' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500'
            }`}
          >
            Last 7 Days
          </button>
          <button
            id="period_monthly"
            onClick={() => setReportDuration('monthly')}
            className={`px-3 py-1.5 rounded-md ${
              reportDuration === 'monthly' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500'
            }`}
          >
            Last 30 Days
          </button>
        </div>
      </div>

      {/* Grid Indicators of Efficiencies */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs">
          <span className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider block">Production Cost</span>
          <span className="text-xl font-extrabold text-slate-800 mt-1.5 block font-mono">
            ₦{costPerCrate.toFixed(2)} <span className="text-xs font-sans text-slate-400">/ crate</span>
          </span>
          <span className="text-[10px] text-zinc-500 mt-2 block font-medium">
            Accumulated farm expense per tray produced (30 eggs).
          </span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs">
          <span className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider block">Feed Efficiency</span>
          <span className="text-xl font-extrabold text-emerald-700 mt-1.5 block font-mono">
            {feedToEggRatio.toFixed(3)} <span className="text-xs font-sans text-slate-400">bags/crate</span>
          </span>
          <span className="text-[10px] text-zinc-500 mt-2 block font-medium">
            Amount of feed mash bags consumed to generate 30 eggs.
          </span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs">
          <span className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider block">Est. Yield Per Hen</span>
          <span className="text-xl font-extrabold text-amber-700 mt-1.5 block font-mono">
            {(eggsPerBird * 100).toFixed(1)}% <span className="text-xs font-sans text-slate-400">efficiency</span>
          </span>
          <span className="text-[10px] text-zinc-500 mt-2 block font-medium">
            Daily average yield rate per bird alive in laying coops.
          </span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs">
          <span className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider block">Total Flock Mortality</span>
          <span className="text-xl font-extrabold text-rose-600 mt-1.5 block font-mono">
            {mortalityRate.toFixed(2)}% <span className="text-xs font-sans text-slate-400">accumulated</span>
          </span>
          <span className="text-[10px] text-zinc-500 mt-2 block font-medium">
            Percentage losses of original acquired stock (Goal: {'<'}5%).
          </span>
        </div>
      </div>

      {/* Financial Performance Ledger */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs space-y-4">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest border-b border-slate-100 pb-2">
            Farm Profit & Loss Breakdown
          </h3>

          <div className="space-y-3 font-sans text-xs">
            <div className="flex justify-between py-1 border-b border-dashed border-slate-100">
              <span className="text-slate-500">Gross Sales proceeds</span>
              <span className="font-bold font-mono text-emerald-600">+₦{totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-dashed border-slate-100">
              <span className="text-slate-500">Less: Operational expenditures</span>
              <span className="font-bold font-mono text-rose-600">-₦{totalExpenditure.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between py-2 bg-slate-50 px-2.5 rounded-lg font-bold">
              <span className="text-slate-800">NET Farm income result</span>
              <span className={`font-mono text-sm ${netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {netProfit >= 0 ? '+' : ''}₦{netProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="p-3 bg-emerald-50 rounded-lg text-[11px] text-emerald-900 border border-emerald-100">
            <strong>Pro Tip:</strong> Reevaluate feed wastage if Feed-to-trays yield scales above 0.15 bags/crate. Lay pullets operate at highest efficiency when lay mash waste is kept low.
          </div>
        </div>

        {/* CSV and operations exporting tool */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-1.5">
              Offline backup & Data Exports
            </h3>
            <p className="text-[11px] text-slate-400 leading-snug mt-2">
              Export farm books as pristine, comma-separated spreadsheets. These file formats are fully compatible with Microsoft Excel, Google Sheets, or Apple Numbers. Keep secure local farm copies on your device!
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
            <button
              id="csv_export_operations"
              onClick={downloadDailyRecordsCSV}
              className="flex items-center justify-center gap-2 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all shadow-xs"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              Export Laying Logs CSV
            </button>

            <button
              id="csv_export_finances"
              onClick={downloadFinancialLedgerCSV}
              className="flex items-center justify-center gap-2 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all shadow-xs"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              Export Financials CSV
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
