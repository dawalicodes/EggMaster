/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Activity,
  User as UserIcon,
  LogOut,
  RefreshCw,
  Layers,
  FileText,
  AlertCircle,
  ShieldCheck,
  PlusCircle,
  Database,
  Download,
  Upload,
  Coins,
  Syringe,
  Package
} from 'lucide-react';

import {
  User,
  Batch,
  DailyRecord,
  FeedStock,
  InventoryItem,
  Expense,
  Income,
  CreditPayment,
  VaccinationLog,
  FarmBackupPayload,
  Customer,
  Supplier
} from './types';

import {
  getFarmData,
  syncFarmData,
  resetServerDatabase,
  wipeServerDatabase,
  IS_USING_WORKER,
  IS_PRODUCTION_PAGES,
  API_BASE
} from './utils/api';

import LoginScreen from './components/LoginScreen';
import DashboardView from './components/DashboardView';
import FlockManager from './components/FlockManager';
import EggMortalityTracker from './components/EggMortalityTracker';
import FinanceCreditTracker from './components/FinanceCreditTracker';
import InventoryTracker from './components/InventoryTracker';
import VaccinationTracker from './components/VaccinationTracker';
import ReportsViewer from './components/ReportsViewer';
import ProfileManager from './components/ProfileManager';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncDelaying, setSyncDelaying] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'flocks' | 'logs' | 'inventory' | 'finances' | 'health' | 'reports' | 'profiles'>('dashboard');

  // Unified State representing complete schema payload
  const [batches, setBatches] = useState<Batch[]>([]);
  const [dailyRecords, setDailyRecords] = useState<DailyRecord[]>([]);
  const [feedStock, setFeedStock] = useState<FeedStock[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [income, setIncome] = useState<Income[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [creditPayments, setCreditPayments] = useState<CreditPayment[]>([]);
  const [vaccinationLogs, setVaccinationLogs] = useState<VaccinationLog[]>([]);

  // Success Synclogs Alert messages
  const [syncStatusMsg, setSyncStatusMsg] = useState({ success: true, text: 'System ready.' });
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmWipe, setConfirmWipe] = useState(false);

  // On mount and user login, read farm state
  useEffect(() => {
    // Check if user session persisted
    const savedUser = sessionStorage.getItem('poultry_user');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }
    
    loadFarmDatabase();
  }, []);

  const loadFarmDatabase = async () => {
    setLoading(true);
    try {
      const { data } = await getFarmData();
      setUnifiedFields(data);
    } catch (err: any) {
      setSyncStatusMsg({ success: false, text: err.message || 'Failed to fetch farm data from server.' });
    } finally {
      setLoading(false);
    }
  };

  const setUnifiedFields = (data: FarmBackupPayload) => {
    setBatches(data.batches || []);
    setDailyRecords(data.dailyRecords || []);
    setFeedStock(data.feedStock || []);
    setInventoryItems(data.inventoryItems || []);
    setExpenses(data.expenses || []);
    setIncome(data.income || []);
    setCustomers(data.customers || []);
    setSuppliers(data.suppliers || []);
    setCreditPayments(data.creditPayments || []);
    setVaccinationLogs(data.vaccinationLogs || []);
  };

  const getUnifiedPayload = (): FarmBackupPayload => {
    return {
      batches,
      dailyRecords,
      feedStock,
      inventoryItems,
      expenses,
      income,
      customers,
      suppliers,
      creditPayments,
      vaccinationLogs
    };
  };

  // Helper trigger to perform remote synchronization on mutation changes
  const dispatchSync = async (updatedPayload: FarmBackupPayload) => {
    setSyncDelaying(true);
    try {
      const res = await syncFarmData(updatedPayload, currentUser);
      setSyncStatusMsg({ success: res.success, text: res.message });
      if (res.success) {
        setTimeout(() => {
          setSyncStatusMsg({ success: true, text: 'Cloud Synchronised' });
        }, 3000);
      }
    } catch (err: any) {
      setSyncStatusMsg({ success: false, text: err.message || 'Failed to sync changes with server.' });
    } finally {
      setSyncDelaying(false);
    }
  };

  // --- MUTATION ACTORS ---

  // Batches management
  const handleAddBatch = (batch: Omit<Batch, 'id'>) => {
    const newBatch: Batch = {
      ...batch,
      id: `batch_${Date.now()}`
    };
    const updatedPayload = {
      ...getUnifiedPayload(),
      batches: [...batches, newBatch]
    };
    setBatches(updatedPayload.batches);
    dispatchSync(updatedPayload);
  };

  const handleUpdateBatchStatus = (batchId: string, status: 'active' | 'depleted') => {
    const updatedPayload = {
      ...getUnifiedPayload(),
      batches: batches.map(b => b.id === batchId ? { ...b, status } : b)
    };
    setBatches(updatedPayload.batches);
    dispatchSync(updatedPayload);
  };

  // Daily logs management
  const handleAddRecord = (record: Omit<DailyRecord, 'id'>) => {
    const newRecord: DailyRecord = {
      ...record,
      id: `record_${Date.now()}`
    };

    // Auto decrement bird counts from the corresponding batch!
    const targetBatch = batches.find(b => b.id === record.batchId);
    let updatedBatches = [...batches];
    if (targetBatch && record.mortalityCount > 0) {
      updatedBatches = batches.map(b =>
        b.id === record.batchId
          ? { ...b, currentCount: Math.max(0, b.currentCount - record.mortalityCount) }
          : b
      );
    }

    // Auto decrement consumed feed from inventory!
    const activeFeedItem = feedStock[0]; // Layers Mash is typically feedStock[0]
    let updatedFeeds = [...feedStock];
    if (activeFeedItem && record.feedConsumedBags > 0) {
      updatedFeeds = feedStock.map(f =>
        f.id === activeFeedItem.id
          ? { ...f, quantityBags: Number(Math.max(0, f.quantityBags - record.feedConsumedBags).toFixed(2)) }
          : f
      );
    }

    const updatedPayload: FarmBackupPayload = {
      ...getUnifiedPayload(),
      dailyRecords: [...dailyRecords, newRecord],
      batches: updatedBatches,
      feedStock: updatedFeeds
    };

    setDailyRecords(updatedPayload.dailyRecords);
    setBatches(updatedPayload.batches);
    setFeedStock(updatedPayload.feedStock);
    dispatchSync(updatedPayload);
  };

  const handleDeleteRecord = (recordId: string) => {
    const record = dailyRecords.find(r => r.id === recordId);
    if (!record) return;

    // Restore bird counts of corresponding batch!
    let updatedBatches = [...batches];
    if (record.mortalityCount > 0) {
      updatedBatches = batches.map(b =>
        b.id === record.batchId
          ? { ...b, currentCount: b.currentCount + record.mortalityCount }
          : b
      );
    }

    // Restore consumed feed!
    const activeFeedItem = feedStock[0];
    let updatedFeeds = [...feedStock];
    if (activeFeedItem && record.feedConsumedBags > 0) {
      updatedFeeds = feedStock.map(f =>
        f.id === activeFeedItem.id
          ? { ...f, quantityBags: Number((f.quantityBags + record.feedConsumedBags).toFixed(2)) }
          : f
      );
    }

    const updatedPayload: FarmBackupPayload = {
      ...getUnifiedPayload(),
      dailyRecords: dailyRecords.filter(r => r.id !== recordId),
      batches: updatedBatches,
      feedStock: updatedFeeds
    };

    setDailyRecords(updatedPayload.dailyRecords);
    setBatches(updatedPayload.batches);
    setFeedStock(updatedPayload.feedStock);
    dispatchSync(updatedPayload);
  };

  // Finances logs
  const handleAddExpense = (expense: Omit<Expense, 'id'>) => {
    const newExp: Expense = {
      ...expense,
      id: `exp_${Date.now()}`
    };
    const updatedPayload = {
      ...getUnifiedPayload(),
      expenses: [...expenses, newExp]
    };
    setExpenses(updatedPayload.expenses);
    dispatchSync(updatedPayload);
  };

  const handleDeleteExpense = (expId: string) => {
    const updatedPayload = {
      ...getUnifiedPayload(),
      expenses: expenses.filter(e => e.id !== expId)
    };
    setExpenses(updatedPayload.expenses);
    dispatchSync(updatedPayload);
  };

  const handleUpdateExpense = (updatedExp: Expense) => {
    const updatedPayload = {
      ...getUnifiedPayload(),
      expenses: expenses.map(e => e.id === updatedExp.id ? updatedExp : e)
    };
    setExpenses(updatedPayload.expenses);
    dispatchSync(updatedPayload);
  };

  const handleAddIncome = (inc: Omit<Income, 'id'>) => {
    const newInc: Income = {
      ...inc,
      id: `inc_${Date.now()}`
    };
    const updatedPayload = {
      ...getUnifiedPayload(),
      income: [...income, newInc]
    };
    setIncome(updatedPayload.income);
    dispatchSync(updatedPayload);
  };

  const handleDeleteIncome = (incId: string) => {
    const updatedPayload = {
      ...getUnifiedPayload(),
      income: income.filter(i => i.id !== incId)
    };
    setIncome(updatedPayload.income);
    dispatchSync(updatedPayload);
  };

  const handleAddCreditPayment = (pmt: Omit<CreditPayment, 'id'>) => {
    const newPmt: CreditPayment = {
      ...pmt,
      id: `pmt_${Date.now()}`
    };

    // Update income paid totals and adjust partial/paid state
    const adjustedIncome = income.map(inc => {
      if (inc.id === pmt.incomeId) {
        const afterPaid = inc.amountPaid + pmt.amountPaid;
        const fullyPaidRangeDef = afterPaid >= inc.totalAmount;
        return {
          ...inc,
          amountPaid: afterPaid,
          paymentStatus: (fullyPaidRangeDef ? 'paid' : 'partial') as 'paid' | 'partial'
        };
      }
      return inc;
    });

    const updatedPayload = {
      ...getUnifiedPayload(),
      creditPayments: [...creditPayments, newPmt],
      income: adjustedIncome
    };

    setCreditPayments(updatedPayload.creditPayments);
    setIncome(updatedPayload.income);
    dispatchSync(updatedPayload);
  };

  // Inventory & medications Restocking
  const handleRestockFeed = (feedId: string, addedBags: number, totalCost: number) => {
    // Add quantity and post a feed purchase expense dynamically!
    const feed = feedStock.find(f => f.id === feedId);
    if (!feed) return;

    const newExpense: Expense = {
      id: `exp_${Date.now()}`,
      category: 'feed',
      amount: totalCost,
      date: new Date().toISOString().split('T')[0],
      notes: `Restocked ${addedBags} bags of ${feed.name}`
    };

    const updatedPayload = {
      ...getUnifiedPayload(),
      feedStock: feedStock.map(f => f.id === feedId ? { ...f, quantityBags: f.quantityBags + addedBags } : f),
      expenses: [...expenses, newExpense]
    };

    setFeedStock(updatedPayload.feedStock);
    setExpenses(updatedPayload.expenses);
    dispatchSync(updatedPayload);
  };

  const handleRestockItem = (itemId: string, addedQty: number) => {
    const item = inventoryItems.find(i => i.id === itemId);
    if (!item) return;

    const newExpense: Expense = {
      id: `exp_${Date.now()}`,
      category: item.category === 'drugs' || item.category === 'vaccines' ? 'medication' : 'miscellaneous',
      amount: item.unitCost * addedQty,
      date: new Date().toISOString().split('T')[0],
      notes: `Restocked ${addedQty} ${item.unit} of ${item.name}`
    };

    const updatedPayload = {
      ...getUnifiedPayload(),
      inventoryItems: inventoryItems.map(i => i.id === itemId ? { ...i, quantity: i.quantity + addedQty } : i),
      expenses: [...expenses, newExpense]
    };

    setInventoryItems(updatedPayload.inventoryItems);
    setExpenses(updatedPayload.expenses);
    dispatchSync(updatedPayload);
  };

  const handleAddNewFeed = (feed: Omit<FeedStock, 'id'>) => {
    const newFeed = { ...feed, id: `feed_${Date.now()}` };
    const updatedPayload = { ...getUnifiedPayload(), feedStock: [...feedStock, newFeed] };
    setFeedStock(updatedPayload.feedStock);
    dispatchSync(updatedPayload);
  };

  const handleAddNewItem = (item: Omit<InventoryItem, 'id'>) => {
    const newItem = { ...item, id: `inv_${Date.now()}` };
    const updatedPayload = { ...getUnifiedPayload(), inventoryItems: [...inventoryItems, newItem] };
    setInventoryItems(updatedPayload.inventoryItems);
    dispatchSync(updatedPayload);
  };

  const handleDeleteFeed = (feedId: string) => {
    const updatedPayload = {
      ...getUnifiedPayload(),
      feedStock: feedStock.filter(f => f.id !== feedId)
    };
    setFeedStock(updatedPayload.feedStock);
    dispatchSync(updatedPayload);
  };

  const handleDeleteItem = (itemId: string) => {
    const updatedPayload = {
      ...getUnifiedPayload(),
      inventoryItems: inventoryItems.filter(i => i.id !== itemId)
    };
    setInventoryItems(updatedPayload.inventoryItems);
    dispatchSync(updatedPayload);
  };

  const handleAddNewCustomer = (cust: Omit<Customer, 'id'>) => {
    const newCust = { ...cust, id: `cust_${Date.now()}` };
    const updatedPayload = { ...getUnifiedPayload(), customers: [...customers, newCust] };
    setCustomers(updatedPayload.customers);
    dispatchSync(updatedPayload);
    return newCust;
  };

  const handleAddNewSupplier = (sup: Omit<Supplier, 'id'>) => {
    const newSup = { ...sup, id: `sup_${Date.now()}` };
    const updatedPayload = { ...getUnifiedPayload(), suppliers: [...suppliers, newSup] };
    setSuppliers(updatedPayload.suppliers);
    dispatchSync(updatedPayload);
    return newSup;
  };

  const handleDeleteSupplier = (supId: string) => {
    const updatedPayload = {
      ...getUnifiedPayload(),
      suppliers: suppliers.filter(s => s.id !== supId)
    };
    setSuppliers(updatedPayload.suppliers);
    dispatchSync(updatedPayload);
  };

  // Vet vaccinations logs
  const handleAddVaccination = (log: Omit<VaccinationLog, 'id'>) => {
    const newLog: VaccinationLog = {
      ...log,
      id: `vac_${Date.now()}`
    };
    const updatedPayload = {
      ...getUnifiedPayload(),
      vaccinationLogs: [...vaccinationLogs, newLog]
    };
    setVaccinationLogs(updatedPayload.vaccinationLogs);
    dispatchSync(updatedPayload);
  };

  // --- MANUAL BACKUP FILE SYSTEM EXPORTER & IMPORTER ---

  const handleExportSystemBackup = () => {
    if (currentUser?.role !== 'admin') {
      alert('Access Denied. Only Administrators can export system backups.');
      return;
    }
    const payload = getUnifiedPayload();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `PoultryCare_ActiveFarmBackup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);

    setSyncStatusMsg({ success: true, text: 'Backup downloaded successfully!' });
  };

  const handleImportSystemBackup = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (currentUser?.role !== 'admin') {
      alert('Access Denied. Only Administrators can import system backups.');
      return;
    }
    const fileReader = new FileReader();
    const file = event.target.files?.[0];
    if (!file) return;

    fileReader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target?.result as string) as FarmBackupPayload;
        // Basic schema verification
        if (importedData.batches && importedData.dailyRecords && importedData.feedStock) {
          setUnifiedFields(importedData);
          dispatchSync(importedData);
          alert('System backup successfully restored and synchronised on node containers!');
        } else {
          alert('Invalid backup schema file format.');
        }
      } catch (err) {
        alert('Could not parse JSON. Check file encoding.');
      }
    };
    fileReader.readAsText(file);
  };

  const handleResetToSeedDB = async () => {
    if (!confirmReset) {
      setConfirmReset(true);
      // Auto cancel after 6 seconds if not confirmed
      setTimeout(() => {
        setConfirmReset(prev => prev ? false : false);
      }, 6000);
      return;
    }

    const { data } = await resetServerDatabase();
    setUnifiedFields(data);
    setSyncStatusMsg({ success: true, text: 'Database reset to seed hatchery values.' });
    setConfirmReset(false);
  };

  const handleWipeDB = async () => {
    if (!confirmWipe) {
      setConfirmWipe(true);
      // Auto cancel after 6 seconds if not confirmed
      setTimeout(() => {
        setConfirmWipe(prev => prev ? false : false);
      }, 6000);
      return;
    }

    const { data } = await wipeServerDatabase();
    setUnifiedFields(data);
    setSyncStatusMsg({ success: true, text: 'All demo records have been cleared. Database is now clean.' });
    setConfirmWipe(false);
  };

  // Safe login Success transitioning callback
  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    sessionStorage.setItem('poultry_user', JSON.stringify(user));
  };

  const handleLogOut = () => {
    setCurrentUser(null);
    sessionStorage.removeItem('poultry_user');
  };

  if (!currentUser) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F8FAFC] text-slate-800 font-sans" id="main_wrapper">
      {/* Sidebar - Desktop & Tablet */}
      <aside className="w-20 lg:w-64 bg-slate-900 text-white flex flex-col hidden md:flex shrink-0 transition-all duration-300">
        <div className="p-4 lg:p-6 border-b border-slate-800">
          <div className="flex items-center justify-center lg:justify-start gap-3">
            <div className="w-8 h-8 bg-emerald-500 text-slate-900 rounded flex items-center justify-center font-bold font-display shrink-0">EP</div>
            <h1 className="text-lg font-bold tracking-tight text-white font-display hidden lg:block">
              EggMaster <span className="text-emerald-400 text-sm font-normal">Pro</span>
            </h1>
          </div>
        </div>
        
        <nav className="flex-1 p-2 lg:p-4 space-y-1 overflow-y-auto">
          <button
            id="sidebar_tab_dashboard"
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center justify-center lg:justify-start gap-3 p-3 lg:px-4 lg:py-2.5 rounded-lg text-xs font-semibold transition-colors text-left cursor-pointer ${
              activeTab === 'dashboard' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
            title="Dashboard Summary"
          >
            <Activity className="w-4 h-4 shrink-0" />
            <span className="hidden lg:block truncate">Dashboard Summary</span>
          </button>
          
          <button
            id="sidebar_tab_flocks"
            onClick={() => setActiveTab('flocks')}
            className={`w-full flex items-center justify-center lg:justify-start gap-3 p-3 lg:px-4 lg:py-2.5 rounded-lg text-xs font-semibold transition-colors text-left cursor-pointer ${
              activeTab === 'flocks' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
            title="Batches & Flocks"
          >
            <Layers className="w-4 h-4 shrink-0" />
            <span className="hidden lg:block truncate">Batches & Flocks</span>
          </button>
          
          <button
            id="sidebar_tab_logs"
            onClick={() => setActiveTab('logs')}
            className={`w-full flex items-center justify-center lg:justify-start gap-3 p-3 lg:px-4 lg:py-2.5 rounded-lg text-xs font-semibold transition-colors text-left cursor-pointer ${
              activeTab === 'logs' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
            title="Egg & Mortality Logs"
          >
            <FileText className="w-4 h-4 shrink-0" />
            <span className="hidden lg:block truncate">Egg & Mortality Logs</span>
          </button>
          
          <button
            id="sidebar_tab_inventory"
            onClick={() => setActiveTab('inventory')}
            className={`w-full flex items-center justify-center lg:justify-start gap-3 p-3 lg:px-4 lg:py-2.5 rounded-lg text-xs font-semibold transition-colors text-left cursor-pointer ${
              activeTab === 'inventory' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
            title="Feed & Stocks"
          >
            <Package className="w-4 h-4 shrink-0" />
            <span className="hidden lg:block truncate">Feed & Stocks</span>
          </button>
          
          <button
            id="sidebar_tab_finances"
            onClick={() => setActiveTab('finances')}
            className={`w-full flex items-center justify-center lg:justify-start gap-3 p-3 lg:px-4 lg:py-2.5 rounded-lg text-xs font-semibold transition-colors text-left cursor-pointer ${
              activeTab === 'finances' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
            title="Cash Ledger"
          >
            <Coins className="w-4 h-4 shrink-0" />
            <span className="hidden lg:block truncate">Cash Ledger</span>
          </button>
          
          <button
            id="sidebar_tab_health"
            onClick={() => setActiveTab('health')}
            className={`w-full flex items-center justify-center lg:justify-start gap-3 p-3 lg:px-4 lg:py-2.5 rounded-lg text-xs font-semibold transition-colors text-left cursor-pointer ${
              activeTab === 'health' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
            title="Veterinary Health"
          >
            <Syringe className="w-4 h-4 shrink-0" />
            <span className="hidden lg:block truncate">Veterinary Health</span>
          </button>
          
          {currentUser?.role === 'admin' && (
            <button
              id="sidebar_tab_reports"
              onClick={() => setActiveTab('reports')}
              className={`w-full flex items-center justify-center lg:justify-start gap-3 p-3 lg:px-4 lg:py-2.5 rounded-lg text-xs font-semibold transition-colors text-left cursor-pointer ${
                activeTab === 'reports' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
              title="Analytics & CSVs"
            >
              <FileText className="w-4 h-4 shrink-0" />
              <span className="hidden lg:block truncate">Analytics & CSVs</span>
            </button>
          )}

          <button
            id="sidebar_tab_profiles"
            onClick={() => setActiveTab('profiles')}
            className={`w-full flex items-center justify-center lg:justify-start gap-3 p-3 lg:px-4 lg:py-2.5 rounded-lg text-xs font-semibold transition-colors text-left cursor-pointer ${
              activeTab === 'profiles' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
            title="Profiles & Workers"
          >
            <UserIcon className="w-4 h-4 shrink-0" />
            <span className="hidden lg:block truncate">Profiles & Workers</span>
          </button>
        </nav>
        
        {/* Profile Card Bottom Sidebar */}
        <div 
          onClick={() => setActiveTab('profiles')}
          className="p-4 lg:p-6 border-t border-slate-800 hover:bg-slate-850 transition-colors cursor-pointer group flex justify-center lg:justify-start"
          title="Manage Profiles"
        >
          <div className="flex items-center gap-3 justify-center lg:justify-start">
            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center border-2 border-emerald-500 font-bold text-white text-sm group-hover:border-white transition-all shrink-0">
              {currentUser.name.substring(0, 2).toUpperCase()}
            </div>
            <div className="overflow-hidden hidden lg:block">
              <div className="text-sm font-semibold truncate text-white group-hover:text-emerald-400 transition-colors">{currentUser.name}</div>
              <div className="text-xs text-slate-500 uppercase tracking-wider font-medium">{currentUser.role}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Viewport Container */}
      <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden bg-[#F8FAFC]">
        {/* Responsive Header Bar */}
        <header className="sticky top-0 z-50 h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between shadow-3xs">
          <div className="flex items-center gap-3">
            {/* Mobile Brand Name */}
            <div className="flex md:hidden items-center gap-2">
              <div className="w-7 h-7 bg-emerald-500 text-slate-950 rounded flex items-center justify-center font-bold text-xs font-display">EP</div>
              <span className="font-extrabold text-slate-800 tracking-tight text-sm font-display">EggMaster Pro</span>
            </div>
            <div className="hidden md:block text-slate-500 text-xs font-semibold">
               Main Farm Command Center &bull; {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Sync connection details */}
            <div className="flex items-center gap-1.5 px-2 py-1 sm:px-2.5 sm:py-1 bg-slate-50 border border-slate-200 rounded-full text-[10px] font-bold" title={IS_USING_WORKER ? `Connected to worker at ${API_BASE}` : IS_PRODUCTION_PAGES ? "No cloud database connected! Setting VITE_API_URL required in Pages settings." : "Using local Express sandbox because VITE_API_URL is empty"}>
              <span className={`h-2 w-2 rounded-full shrink-0 ${IS_USING_WORKER ? 'bg-emerald-500' : IS_PRODUCTION_PAGES ? 'bg-rose-500' : 'bg-blue-500'} animate-pulse`} />
              <span className="text-slate-600 font-mono hidden sm:inline">
                {IS_USING_WORKER ? 'Connected' : IS_PRODUCTION_PAGES ? 'Disconnected' : 'Connected'}
              </span>
              <span className="text-slate-600 font-mono sm:hidden">
                {IS_USING_WORKER ? 'Connected' : IS_PRODUCTION_PAGES ? 'Disconnected' : 'Connected'}
              </span>
              {syncDelaying && <RefreshCw className="w-3 h-3 animate-spin text-emerald-600 shrink-0" />}
            </div>

            {/* Notification low stock banner count if any */}
            {feedStock.some(f => f.quantityBags < f.lowStockThreshold) && (
              <div className="bg-amber-100 text-amber-800 text-[10px] px-3 py-1 rounded-full border border-amber-200 font-bold hidden sm:block">
                Low Feed Warning
              </div>
            )}

            <button
              id="header_logout_btn"
              onClick={handleLogOut}
              className="p-1.5 px-3 border border-slate-200 hover:border-slate-350 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 rounded-lg transition-colors text-xs flex items-center gap-1.5 font-bold shadow-3xs cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-500" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </header>

        {/* Tab switcher for Mobile views */}
        <nav className="md:hidden bg-white border-b border-slate-200 sticky top-16 z-45 shadow-4xs overflow-x-auto whitespace-nowrap scrollbar-none px-4" id="primary_tab_bar">
          <div className="flex gap-1 py-2 text-xs font-bold text-slate-600">
            <button
              id="tab_dashboard"
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'dashboard' ? 'bg-emerald-600 text-white shadow-xs' : 'hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              Dashboard
            </button>
            <button
              id="tab_flocks"
              onClick={() => setActiveTab('flocks')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'flocks' ? 'bg-emerald-600 text-white shadow-xs' : 'hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              Flocks
            </button>
            <button
              id="tab_logs"
              onClick={() => setActiveTab('logs')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'logs' ? 'bg-emerald-600 text-white shadow-xs' : 'hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              Logs
            </button>
            <button
              id="tab_inventory"
              onClick={() => setActiveTab('inventory')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'inventory' ? 'bg-emerald-600 text-white shadow-xs' : 'hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              Stocks
            </button>
            <button
              id="tab_finances"
              onClick={() => setActiveTab('finances')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'finances' ? 'bg-emerald-600 text-white shadow-xs' : 'hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              Cash
            </button>
            <button
              id="tab_health"
              onClick={() => setActiveTab('health')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'health' ? 'bg-emerald-600 text-white shadow-xs' : 'hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              Veterinary
            </button>
            {currentUser?.role === 'admin' && (
              <button
                id="tab_reports"
                onClick={() => setActiveTab('reports')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'reports' ? 'bg-emerald-600 text-white shadow-xs' : 'hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                CSV Reports
              </button>
            )}
            <button
              id="tab_profiles"
              onClick={() => setActiveTab('profiles')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'profiles' ? 'bg-emerald-600 text-white shadow-xs' : 'hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              Profiles
            </button>
          </div>
        </nav>

        {/* Viewport content area */}
        <main className="flex-1 py-8 px-4 sm:px-8 max-w-7xl w-full transition-opacity pb-22" id="main_port">
          {loading ? (
            <div className="h-96 flex flex-col justify-center items-center gap-4 text-slate-400 font-medium font-sans">
              <RefreshCw className="w-10 h-10 animate-spin text-emerald-600" />
              <span>Fetching secure farm metrics...</span>
            </div>
          ) : (
            <div className="space-y-6">
              {!syncStatusMsg.success && (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 sm:p-5 text-xs text-rose-700 leading-relaxed shadow-3xs flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                  <div className="p-2.5 bg-rose-100 text-rose-700 rounded-xl shrink-0">
                    <AlertCircle className="w-5 h-5 text-rose-600 animate-pulse" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <h4 className="font-bold text-rose-900 text-sm">Database Synchronization Error</h4>
                    <p className="text-rose-700 font-medium">
                      {syncStatusMsg.text}
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Make sure your Cloudflare Worker is deployed with wrangler and connected to your D1 database, and that the <strong>VITE_API_URL</strong> environment variable matches your worker's live URL.
                    </p>
                  </div>
                  <button onClick={() => setSyncStatusMsg({ success: true, text: 'System ready.' })} className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-lg text-[10px] font-bold transition-all shrink-0 cursor-pointer">
                    Dismiss Error
                  </button>
                </div>
              )}

              {!IS_USING_WORKER && (
                <div className="bg-blue-50/80 border border-blue-150 rounded-2xl p-4 sm:p-5 text-xs text-slate-700 leading-relaxed shadow-3xs flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                  <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl shrink-0">
                    <Database className="w-5 h-5" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <h4 className="font-bold text-slate-900 text-sm">Local Sandbox Mode Enabled</h4>
                    <p className="text-slate-600">
                      You are logged in and saving data securely inside the workspace sandbox container (stored in <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800 font-mono">poultry_db.json</code>). 
                      To route queries to your newly created <strong>Cloudflare Worker</strong> backend, add your custom <strong>VITE_API_URL</strong> environment variable under Settings (set as a <strong>Text</strong> value, not a Secret).
                    </p>
                  </div>
                </div>
              )}

              {/* View components renderer dynamically */}
              {activeTab === 'dashboard' && (
                <DashboardView
                  batches={batches}
                  dailyRecords={dailyRecords}
                  feedStock={feedStock}
                  inventoryItems={inventoryItems}
                  expenses={expenses}
                  income={income}
                  vaccinationLogs={vaccinationLogs}
                />
              )}

              {activeTab === 'flocks' && (
                <FlockManager
                  batches={batches}
                  suppliers={suppliers}
                  dailyRecords={dailyRecords}
                  user={currentUser}
                  onAddBatch={handleAddBatch}
                  onUpdateBatchStatus={handleUpdateBatchStatus}
                />
              )}

              {activeTab === 'logs' && (
                <EggMortalityTracker
                  dailyRecords={dailyRecords}
                  batches={batches}
                  user={currentUser}
                  onAddRecord={handleAddRecord}
                  onDeleteRecord={handleDeleteRecord}
                />
              )}

              {activeTab === 'inventory' && (
                <InventoryTracker
                  feedStock={feedStock}
                  inventoryItems={inventoryItems}
                  suppliers={suppliers}
                  user={currentUser}
                  onRestockFeed={handleRestockFeed}
                  onRestockItem={handleRestockItem}
                  onAddNewFeed={handleAddNewFeed}
                  onAddNewItem={handleAddNewItem}
                  onDeleteFeed={handleDeleteFeed}
                  onDeleteItem={handleDeleteItem}
                  onAddNewSupplier={handleAddNewSupplier}
                  onDeleteSupplier={handleDeleteSupplier}
                />
              )}

              {activeTab === 'finances' && (
                <FinanceCreditTracker
                  expenses={expenses}
                  income={income}
                  customers={customers}
                  suppliers={suppliers}
                  creditPayments={creditPayments}
                  user={currentUser}
                  onAddExpense={handleAddExpense}
                  onAddIncome={handleAddIncome}
                  onAddCreditPayment={handleAddCreditPayment}
                  onDeleteExpense={handleDeleteExpense}
                  onDeleteIncome={handleDeleteIncome}
                  onUpdateExpense={handleUpdateExpense}
                  onAddCustomer={handleAddNewCustomer}
                />
              )}

              {activeTab === 'health' && (
                <VaccinationTracker
                  vaccinationLogs={vaccinationLogs}
                  batches={batches}
                  onAddVaccination={handleAddVaccination}
                />
              )}

              {activeTab === 'reports' && currentUser?.role === 'admin' && (
                <ReportsViewer
                  batches={batches}
                  dailyRecords={dailyRecords}
                  expenses={expenses}
                  income={income}
                />
              )}

              {activeTab === 'profiles' && (
                <ProfileManager
                  currentUser={currentUser!}
                  onProfileUpdate={(updated) => {
                    setCurrentUser(updated);
                    sessionStorage.setItem('poultry_user', JSON.stringify(updated));
                  }}
                />
              )}
            </div>
          )}
        </main>
      </div>

    </div>
  );
}
