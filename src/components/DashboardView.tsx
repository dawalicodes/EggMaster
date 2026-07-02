/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  Flame,
  BatteryCharging,
  Coins,
  DollarSign,
  Activity,
  Calendar,
  Layers,
  ShoppingBag,
  Bell
} from 'lucide-react';
import { Batch, DailyRecord, FeedStock, InventoryItem, Expense, Income, VaccinationLog } from '../types';

interface DashboardViewProps {
  batches: Batch[];
  dailyRecords: DailyRecord[];
  feedStock: FeedStock[];
  inventoryItems: InventoryItem[];
  expenses: Expense[];
  income: Income[];
  vaccinationLogs: VaccinationLog[];
}

export default function DashboardView({
  batches,
  dailyRecords,
  feedStock,
  inventoryItems,
  expenses,
  income,
  vaccinationLogs
}: DashboardViewProps) {
  const [timeRange, setTimeRange] = useState<'7days' | '14days'>('7days');
  const [hoveredData, setHoveredData] = useState<{ label: string; value: number } | null>(null);

  // --- 1. CORE CALCULATIONS ---
  // Active Batches & Birds
  const activeBatches = batches.filter(b => b.status === 'active');
  const totalBirdsAlive = activeBatches.reduce((val, b) => val + b.currentCount, 0);

  // Latest production date available
  const sortedRecords = [...dailyRecords].sort((a, b) => b.date.localeCompare(a.date));
  const latestDate = sortedRecords.length > 0 ? sortedRecords[0].date : new Date().toISOString().split('T')[0];

  // Filter latest records (of all batches)
  const latestBatchRecords = dailyRecords.filter(r => r.date === latestDate);
  const eggsCollectedToday = latestBatchRecords.reduce((acc, r) => acc + r.eggsCollected, 0);
  const eggsBrokenToday = latestBatchRecords.reduce((acc, r) => acc + r.eggsBroken, 0);
  const eggsSpoiltToday = latestBatchRecords.reduce((acc, r) => acc + r.eggsSpoilt, 0);
  const mortalityToday = latestBatchRecords.reduce((acc, r) => acc + r.mortalityCount, 0);
  const feedToday = latestBatchRecords.reduce((acc, r) => acc + r.feedConsumedBags, 0);

  // Financial calculations for "Today" (latest date)
  const incomeToday = income.filter(i => i.date === latestDate).reduce((acc, i) => acc + i.totalAmount, 0);
  const expensesToday = expenses.filter(e => e.date === latestDate).reduce((acc, e) => acc + e.amount, 0);
  const profitToday = incomeToday - expensesToday;

  // --- 2. ALERT TRIGGERS ---
  const alerts: { type: 'danger' | 'warning' | 'info'; title: string; desc: string }[] = [];

  // Low Feed Alerts
  feedStock.forEach(feed => {
    if (feed.quantityBags < feed.lowStockThreshold) {
      alerts.push({
        type: 'danger',
        title: `Low Feed Stock: ${feed.name}`,
        desc: `Remaining quantities are down to ${feed.quantityBags} bags (Low stock limit: ${feed.lowStockThreshold} bags). Order more soon.`
      });
    }
  });

  // Low Inventory alerts
  inventoryItems.forEach(item => {
    if (item.quantity < item.lowStockThreshold) {
      alerts.push({
        type: 'warning',
        title: `Low Inventory: ${item.name}`,
        desc: `Stock is at ${item.quantity} ${item.unit} (Limit: ${item.lowStockThreshold}).`
      });
    }
  });

  // High Mortality Spike Alert
  latestBatchRecords.forEach(rec => {
    const batch = batches.find(b => b.id === rec.batchId);
    if (batch && batch.currentCount > 0) {
      const dailyMortalityRate = (rec.mortalityCount / (batch.currentCount + rec.mortalityCount)) * 100;
      if (rec.mortalityCount > 3 || dailyMortalityRate > 1.5) {
        alerts.push({
          type: 'danger',
          title: `Mortality Alert: ${batch.name}`,
          desc: `${rec.mortalityCount} deaths recorded on ${latestDate} (${dailyMortalityRate.toFixed(2)}% rate). Please inspect for illness.`
        });
      }
    }
  });

  // Egg Production Drop Alert
  // Compare recent date with previous date
  if (sortedRecords.length > 2) {
    const uniqueDates = Array.from(new Set(dailyRecords.map(r => r.date))).sort((a, b) => b.localeCompare(a));
    if (uniqueDates.length >= 2) {
      const mostRecent = uniqueDates[0];
      const secondRecent = uniqueDates[1];

      batches.forEach(b => {
        const recRecent = dailyRecords.find(r => r.date === mostRecent && r.batchId === b.id);
        const recPrior = dailyRecords.find(r => r.date === secondRecent && r.batchId === b.id);
        if (recRecent && recPrior) {
          const rateRecent = b.currentCount > 0 ? (recRecent.eggsCollected / b.currentCount) * 100 : 0;
          const ratePrior = b.currentCount > 0 ? (recPrior.eggsCollected / b.currentCount) * 100 : 0;
          const drop = ratePrior - rateRecent;
          if (drop > 10) {
            alerts.push({
              type: 'warning',
              title: `Production Slump on ${b.name}`,
              desc: `Lay rate fell from ${ratePrior.toFixed(0)}% down to ${rateRecent.toFixed(0)}% (a drop of ${drop.toFixed(0)}%).`
            });
          }
        }
      });
    }
  }

  // Next Due Vaccinations Alerts
  const currentTimestamp = new Date().getTime(); // Based on local time
  vaccinationLogs.forEach(v => {
    if (v.nextDueDate) {
      const dueTime = new Date(v.nextDueDate).getTime();
      const diffDays = (dueTime - currentTimestamp) / (1000 * 60 * 60 * 24);
      if (diffDays >= 0 && diffDays <= 7) {
        const batch = batches.find(b => b.id === v.batchId);
        alerts.push({
          type: 'info',
          title: `Vaccination Reminder: ${v.vaccineOrDrugName}`,
          desc: `Schedule due in ${Math.round(diffDays)} days (${v.nextDueDate}) for flock "${batch?.name || 'All'}".`
        });
      }
    }
  });

  // --- 3. TREND DATA PREPARATION (CHART CALCULATIONS) ---
  const limit = timeRange === '7days' ? 7 : 14;
  // Get unique last 'limit' dates
  const uniqueDatesSorted = Array.from(new Set(dailyRecords.map(r => r.date)))
    .sort((a, b) => a.localeCompare(b))
    .slice(-limit);

  // 3a. Production Rate Trend
  // For each date, calculate sum(eggs) / sum(birds) %
  const prodTrend = uniqueDatesSorted.map(dName => {
    const recsOnDate = dailyRecords.filter(r => r.date === dName);
    const totalCollected = recsOnDate.reduce((s, r) => s + r.eggsCollected, 0);
    // Find live birds corresponding to active batches on that date.
    // For simplicity, we use total current counts
    const totalFlockSize = activeBatches.reduce((s, b) => s + b.currentCount, 0);
    const percentage = totalFlockSize > 0 ? (totalCollected / totalFlockSize) * 100 : 0;
    return {
      label: dName.substring(5), // Show MM-DD
      value: Number(percentage.toFixed(1))
    };
  });

  // 3b. Daily Mortality Trend
  const mortalityTrend = uniqueDatesSorted.map(dName => {
    const recsOnDate = dailyRecords.filter(r => r.date === dName);
    const deathsSum = recsOnDate.reduce((s, r) => s + r.mortalityCount, 0);
    return {
      label: dName.substring(5),
      value: deathsSum
    };
  });

  // 3c. Dynamic Net Profit Trend
  const profitTrend = uniqueDatesSorted.map(dName => {
    const dayIncome = income.filter(i => i.date === dName).reduce((s, i) => s + i.totalAmount, 0);
    const dayExpenses = expenses.filter(e => e.date === dName).reduce((s, e) => s + e.amount, 0);
    return {
      label: dName.substring(5),
      value: dayIncome - dayExpenses
    };
  });

  // --- 4. DOCK RESPONSIVE SVG GRAPH GENERATOR ---
  function renderSvgLineChart(
    dataList: { label: string; value: number }[],
    strokeColor: string,
    fillGradient: string,
    chartId: string,
    unitSuffix = ''
  ) {
    if (dataList.length === 0) {
      return (
        <div className="h-40 flex items-center justify-center text-xs text-slate-400">
          No records captured for this timeline
        </div>
      );
    }

    const chartHeight = 120;
    const chartWidth = 360;
    const padding = 20;

    const values = dataList.map(d => d.value);
    const minVal = Math.min(...values, 0);
    const maxVal = Math.max(...values, 10);
    const rangeVal = maxVal - minVal || 1;

    // Convert coordinates
    const points = dataList.map((d, i) => {
      const xRatio = dataList.length > 1 ? i / (dataList.length - 1) : 0.5;
      const x = padding + xRatio * (chartWidth - padding * 2);
      const y = chartHeight - padding - ((d.value - minVal) / rangeVal) * (chartHeight - padding * 2);
      return { x, y, label: d.label, val: d.value };
    });

    const pathData = points.reduce(
      (acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`),
      ''
    );

    const closedPathData = `${pathData} L ${points[points.length - 1].x} ${chartHeight - padding} L ${points[0].x} ${chartHeight - padding} Z`;

    return (
      <div className="relative">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-40 overflow-visible font-mono">
          <defs>
            <linearGradient id={`${chartId}-grad`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
              <stop offset="100%" stopColor={strokeColor} stopOpacity="0.00" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line
            x1={padding}
            y1={chartHeight - padding}
            x2={chartWidth - padding}
            y2={chartHeight - padding}
            stroke="#e2e8f0"
            strokeWidth="1"
          />
          <line
            x1={padding}
            y1={padding}
            x2={chartWidth - padding}
            y2={padding}
            stroke="#f1f5f9"
            strokeWidth="1"
          />

          {/* Area under the curve */}
          <path d={closedPathData} fill={`url(#${chartId}-grad)`} />

          {/* The main stroke line */}
          <path d={pathData} fill="none" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" />

          {/* Target Nodes */}
          {points.map((p, idx) => (
            <g
              key={idx}
              className="cursor-pointer group/node"
              onMouseEnter={() => setHoveredData({ label: p.label, value: p.val })}
              onMouseLeave={() => setHoveredData(null)}
            >
              <circle
                cx={p.x}
                cy={p.y}
                r="4.5"
                className="fill-white duration-100"
                stroke={strokeColor}
                strokeWidth="2.5"
              />
              <circle cx={p.x} cy={p.y} r="10" className="opacity-0 group-hover/node:opacity-10 fill-slate-900" />
            </g>
          ))}

          {/* Date Labels below graph */}
          {points.map((p, idx) => {
            // Show first, middle, last to prevent overlap in mobile UI
            if (idx === 0 || idx === points.length - 1 || (dataList.length > 5 && idx === Math.floor(dataList.length / 2))) {
              return (
                <text
                  key={idx}
                  x={p.x}
                  y={chartHeight - 4}
                  textAnchor="middle"
                  className="fill-slate-400 text-[9px] font-sans font-medium"
                >
                  {p.label}
                </text>
              );
            }
            return null;
          })}
        </svg>

        {/* Float Tooltip */}
        {hoveredData && (
          <div className="absolute top-1 left-1.5 opacity-90 block bg-slate-900 text-white rounded-md px-2 py-1 text-[10px] font-semibold tracking-wide pointer-events-none transition-opacity">
            Date: {hoveredData.label} | <span className="font-mono">{hoveredData.value}{unitSuffix}</span>
          </div>
        )}
      </div>
    );
  }

  // Calculate some aggregate performance metrics
  const totalCratesCollected = eggsCollectedToday / 30;
  const averageLayRate = activeBatches.reduce((acc, b) => {
    // Find last 7 records for batch
    const recs = dailyRecords.filter(r => r.batchId === b.id).slice(-7);
    const sumEggs = recs.reduce((s, r) => s + r.eggsCollected, 0);
    const layRate = (sumEggs / (b.currentCount * (recs.length || 1))) * 100;
    return acc + (isNaN(layRate) ? 0 : layRate);
  }, 0) / (activeBatches.length || 1);

  return (
    <div className="space-y-6" id="dashboard_view_container">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
        <div>
          <h1 className="text-xl font-bold tracking-tight font-display text-slate-800">
            Farm Dashboard
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            Real-time daily operations, live performance logs, and feed alerts.
          </p>
        </div>
      </div>

      {/* Grid: Left column (Bento Stats) & Right column (Warnings & Alerts) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Statistics Cards */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Today's Operating Indicators</h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* Birds Card */}
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex flex-col justify-between">
              <span className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
                Flocks
              </span>
              <span className="text-xl font-bold mt-2 text-slate-800 font-display">
                {totalBirdsAlive.toLocaleString()} <span className="text-xs text-slate-400 font-sans">birds</span>
              </span>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Across {activeBatches.length} active batches
              </span>
            </div>

            {/* Collected Card */}
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex flex-col justify-between">
              <span className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
                Egg Harvest
              </span>
              <span className="text-xl font-bold mt-2 text-slate-800 font-display">
                {eggsCollectedToday.toLocaleString()} <span className="text-xs text-slate-400 font-sans">eggs</span>
              </span>
              <span className="text-[10px] text-slate-500 mt-1 block">
                {totalCratesCollected.toFixed(1)} crates harvested
              </span>
            </div>

            {/* Broken/Spoilt Card */}
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex flex-col justify-between">
              <span className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
                Damaged/Spent
              </span>
              <span className="text-xl font-bold mt-2 text-red-600 font-display">
                {eggsBrokenToday + eggsSpoiltToday} <span className="text-xs text-red-400 font-sans">eggs</span>
              </span>
              <span className="text-[10px] text-slate-500 mt-1 block">
                {eggsBrokenToday} broken, {eggsSpoiltToday} spoilt
              </span>
            </div>

            {/* Mortality Card */}
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex flex-col justify-between">
              <span className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
                Mortalities
              </span>
              <span className="text-xl font-bold mt-2 text-slate-800 font-display">
                {mortalityToday} <span className="text-xs text-slate-400 font-sans">count</span>
              </span>
              <span className="text-[10px] text-emerald-700 font-semibold mt-1 block">
                {totalBirdsAlive > 0 ? ((mortalityToday / totalBirdsAlive) * 100).toFixed(3) : 0}% today rate
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Feed Consumption */}
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
              <span className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider block">Today's Feed Intake</span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-lg font-bold text-slate-800 font-display">
                  {Math.round(feedToday)} <span className="text-xs text-slate-400 font-sans">bags consumed</span>
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-2">
                Overall feeding conversion average: <span className="font-bold text-slate-700">{eggsCollectedToday > 0 ? (feedToday / (eggsCollectedToday / 30)).toFixed(2) : '0.0'} bags/crate</span>
              </p>
            </div>

            {/* Cash flow today */}
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
              <span className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider block">Income Today</span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-lg font-bold text-emerald-600 font-display">
                  ₦{incomeToday.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-2">
                Pending collectible debts: <span className="font-bold text-amber-700">₦{income.filter(i => i.paymentStatus !== 'paid').reduce((s, i) => s + (i.totalAmount - i.amountPaid), 0).toFixed(2)}</span>
              </p>
            </div>

            {/* Financial balance today */}
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
              <span className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider block">Expenses Today</span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-lg font-bold text-slate-800 font-display">
                  ₦{expensesToday.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-2">
                Net Profit Today:{' '}
                <span className={`font-bold ${profitToday >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {profitToday >= 0 ? '+' : ''}₦{profitToday.toFixed(2)}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Live Alerts Stream */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Farm Alerts ({alerts.length})
            </h3>
            <span className="text-[10px] text-zinc-400 font-sans">Auto-inspected</span>
          </div>

          <div className="space-y-3.5 max-h-55 overflow-y-auto pr-1">
            {alerts.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                <div className="font-medium">All systems safe!</div>
                <div className="text-[10px] text-slate-400">Feed stocks, laying rates, and vaccine timelines comply with targets.</div>
              </div>
            ) : (
              alerts.map((al, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border flex items-start gap-2.5 ${
                    al.type === 'danger'
                      ? 'bg-rose-50/70 border-rose-100 text-rose-900'
                      : al.type === 'warning'
                      ? 'bg-amber-50/70 border-amber-100 text-amber-900'
                      : 'bg-indigo-50/70 border-indigo-100 text-indigo-900'
                  }`}
                  id={`alert_idx_${idx}`}
                >
                  <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                    al.type === 'danger' ? 'bg-rose-500' : al.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                  }`} />
                  <div>
                    <div className="text-xs font-bold leading-tight">{al.title}</div>
                    <div className="text-[10px] leading-snug font-medium text-slate-500 mt-1">{al.desc}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
              Laying & Operational Trends
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Continuous records reflecting flock yield and health thresholds.</p>
          </div>

          <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              id="btn_range_7"
              onClick={() => setTimeRange('7days')}
              className={`px-3 py-1 text-xs font-semibold rounded-md ${
                timeRange === '7days' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              7 Days
            </button>
            <button
              id="btn_range_14"
              onClick={() => setTimeRange('14days')}
              className={`px-3 py-1 text-xs font-semibold rounded-md ${
                timeRange === '14days' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              14 Days
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Chart 1: Production Rate */}
          <div className="space-y-2 border border-slate-100 p-4 rounded-xl">
            <div className="flex justify-between items-center bg-slate-50/50 px-2 py-1.5 rounded-lg">
              <span className="text-xs font-bold text-slate-700">
                Laying Efficiency
              </span>
              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded font-mono">
                Avg: {averageLayRate.toFixed(1)}%
              </span>
            </div>
            {renderSvgLineChart(prodTrend, '#059669', 'emerald-grad', 'charge-lay', '%')}
            <span className="text-[10px] text-slate-400 block text-center italic">
              Target optimal: {'>'}80% production rate
            </span>
          </div>

          {/* Chart 2: Mortality */}
          <div className="space-y-2 border border-slate-100 p-4 rounded-xl">
            <div className="flex justify-between items-center bg-slate-50/50 px-2 py-1.5 rounded-lg">
              <span className="text-xs font-bold text-slate-700">
                Cumulative Morbidity
              </span>
              <span className="text-[10px] text-rose-700 font-bold bg-rose-50 px-1.5 py-0.5 rounded font-mono">
                Total: {mortalityTrend.reduce((s, r) => s + r.value, 0)} birds
              </span>
            </div>
            {renderSvgLineChart(mortalityTrend, '#dc2626', 'red-grad', 'charge-mort')}
            <span className="text-[10px] text-slate-400 block text-center italic">
              Lower is better. Alerts trigger if deaths spike in laying house.
            </span>
          </div>

          {/* Chart 3: Net Profit */}
          <div className="space-y-2 border border-slate-100 p-4 rounded-xl">
            <div className="flex justify-between items-center bg-slate-50/50 px-2 py-1.5 rounded-lg">
              <span className="text-xs font-bold text-slate-700">
                Net Farm Receipts
              </span>
              <span className="text-[10px] text-amber-900 font-bold bg-amber-50 px-1.5 py-0.5 rounded font-mono">
                Range: ₦{profitTrend.reduce((s, r) => s + r.value, 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
            {renderSvgLineChart(profitTrend, '#b45309', 'amber-grad', 'charge-profit', ' ₦')}
            <span className="text-[10px] text-slate-400 block text-center italic">
              Reflects sale proceeds minus operational expenses.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
