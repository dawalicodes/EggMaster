/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { DollarSign, PlusCircle, ArrowUpRight, ArrowDownRight, Users, Check, AlertCircle, ShieldAlert } from 'lucide-react';
import { Expense, Income, Customer, Supplier, CreditPayment, User } from '../types';

interface FinanceCreditTrackerProps {
  expenses: Expense[];
  income: Income[];
  customers: Customer[];
  suppliers: Supplier[];
  creditPayments: CreditPayment[];
  user: User | null;
  onAddExpense: (expense: Omit<Expense, 'id'>) => void;
  onAddIncome: (income: Omit<Income, 'id'>) => void;
  onAddCreditPayment: (payment: Omit<CreditPayment, 'id'>) => void;
  onDeleteExpense: (id: string) => void;
  onDeleteIncome: (id: string) => void;
  onUpdateExpense?: (expense: Expense) => void;
  onAddCustomer?: (customer: Omit<Customer, 'id'>) => Customer;
}

export default function FinanceCreditTracker({
  expenses,
  income,
  customers,
  suppliers,
  creditPayments,
  user,
  onAddExpense,
  onAddIncome,
  onAddCreditPayment,
  onDeleteExpense,
  onDeleteIncome,
  onUpdateExpense,
  onAddCustomer
}: FinanceCreditTrackerProps) {
  const [activeSubTab, setActiveSubTab] = useState<'ledger' | 'credits'>('ledger');
  const [historyTab, setHistoryTab] = useState<'debts' | 'payments'>('debts');

  // Addition states for Income
  const [showIncomeForm, setShowIncomeForm] = useState(false);
  const [incSource, setIncSource] = useState<'egg_sales' | 'bird_sales' | 'manure_sales' | 'other'>('egg_sales');
  const [incQty, setIncQty] = useState<number>(0);
  const [incPrice, setIncPrice] = useState<number>(0);
  const [incDate, setIncDate] = useState('2026-05-29');
  const [incCustId, setIncCustId] = useState('');
  const [incStatus, setIncStatus] = useState<'paid' | 'unpaid' | 'partial'>('paid');
  const [incPaidAmount, setIncPaidAmount] = useState<number>(0);

  // States for writing custom customer
  const [isCustomCust, setIsCustomCust] = useState(true);
  const [customCustName, setCustomCustName] = useState('');
  const [customCustContact, setCustomCustContact] = useState('');

  // Addition states for Expense
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expCategory, setExpCategory] = useState<'feed' | 'medication' | 'transport' | 'labor' | 'miscellaneous'>('feed');
  const [expAmount, setExpAmount] = useState<number>(0);
  const [expDate, setExpDate] = useState('2026-05-29');
  const [expNotes, setExpNotes] = useState('');
  const [expSupplierId, setExpSupplierId] = useState('');
  const [expStatus, setExpStatus] = useState<'paid' | 'unpaid' | 'partial'>('paid');
  const [expPaidAmount, setExpPaidAmount] = useState<number>(0);

  // Payment State for Debtors
  const [paymentIncomeId, setPaymentIncomeId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentNotes, setPaymentNotes] = useState('');

  // States for Credit Sub-Tabs and Search/Filters
  const [creditType, setCreditType] = useState<'customers' | 'suppliers'>('customers');
  const [searchDebtorQuery, setSearchDebtorQuery] = useState('');
  const [debtorStatusFilter, setDebtorStatusFilter] = useState<'all' | 'outstanding' | 'settled'>('all');
  
  const [searchSupplierQuery, setSearchSupplierQuery] = useState('');
  const [supplierStatusFilter, setSupplierStatusFilter] = useState<'all' | 'outstanding' | 'settled'>('all');

  // Supplier Credit Payment states
  const [paymentExpenseId, setPaymentExpenseId] = useState('');
  const [supplierPaymentAmount, setSupplierPaymentAmount] = useState<number>(0);
  const [supplierPaymentNotes, setSupplierPaymentNotes] = useState('');

  // Iframe-safe delete confirmation state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Calculations
  const totalExp = expenses.reduce((s, e) => s + e.amount, 0);
  const totalInc = income.reduce((s, i) => s + i.totalAmount, 0);
  const totalPaid = income.reduce((s, i) => s + i.amountPaid, 0);
  const outstandingDebt = totalInc - totalPaid;
  const outstandingSupplierDebt = expenses.reduce((sum, e) => {
    if (e.supplierId) {
      const currentPaid = e.amountPaid ?? 0;
      return sum + (e.amount - currentPaid);
    }
    return sum;
  }, 0);

  const handleCreateIncome = (e: React.FormEvent) => {
    e.preventDefault();
    if (incQty <= 0 || incPrice <= 0) {
      alert('Quantity and Unit Price must be positive values.');
      return;
    }

    const calculatedTotal = incQty * incPrice;
    let actualPaid = incPaidAmount;
    if (incStatus === 'paid') {
      actualPaid = calculatedTotal;
    } else if (incStatus === 'unpaid') {
      actualPaid = 0;
    } else {
      if (incPaidAmount >= calculatedTotal) {
        alert('Partial paid amount cannot be equal to or greater than the total amount.');
        return;
      }
    }

    let finalCustId = incCustId || undefined;
    if (isCustomCust && customCustName.trim()) {
      if (onAddCustomer) {
        const newCust = onAddCustomer({
          name: customCustName.trim(),
          contact: customCustContact.trim()
        });
        finalCustId = newCust.id;
      } else {
        // Fallback if callback is missing
        finalCustId = `cust_fallback_${Date.now()}`;
      }
    }

    onAddIncome({
      source: incSource,
      quantity: incQty,
      unitPrice: incPrice,
      totalAmount: calculatedTotal,
      date: incDate,
      customerId: finalCustId,
      paymentStatus: incStatus,
      amountPaid: actualPaid
    });

    // Reset Form
    setShowIncomeForm(false);
    setIncQty(0);
    setIncPrice(0);
    setIncPaidAmount(0);
    setIsCustomCust(true);
    setCustomCustName('');
    setCustomCustContact('');
  };

  const handleCreateExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (expAmount <= 0) {
      alert('Expense amount must be greater than zero.');
      return;
    }

    let actualPaid = expPaidAmount;
    if (expStatus === 'paid') {
      actualPaid = expAmount;
    } else if (expStatus === 'unpaid') {
      actualPaid = 0;
    } else {
      if (expPaidAmount >= expAmount) {
        alert('Partial paid amount cannot be equal to or greater than the total expense amount.');
        return;
      }
    }

    onAddExpense({
      category: expCategory,
      amount: expAmount,
      date: expDate,
      notes: expNotes,
      supplierId: expSupplierId || undefined,
      paymentStatus: expStatus,
      amountPaid: actualPaid
    });

    // Reset Form
    setShowExpenseForm(false);
    setExpAmount(0);
    setExpNotes('');
    setExpSupplierId('');
    setExpStatus('paid');
    setExpPaidAmount(0);
  };

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentAmount <= 0) {
      alert('Payment amount must be greater than zero.');
      return;
    }

    const targetInc = income.find(i => i.id === paymentIncomeId);
    if (!targetInc) {
      alert('Please select a valid invoice account.');
      return;
    }

    const remainingToPay = targetInc.totalAmount - targetInc.amountPaid;
    if (paymentAmount > remainingToPay) {
      alert(`Amount entered ($${paymentAmount}) exceeds outstanding balance of $${remainingToPay}.`);
      return;
    }

    onAddCreditPayment({
      incomeId: paymentIncomeId,
      amountPaid: paymentAmount,
      date: '2026-05-29',
      notes: paymentNotes
    });

    // Reset
    setPaymentIncomeId('');
    setPaymentAmount(0);
    setPaymentNotes('');
  };

  const getCustomerDebtsList = () => {
    // Return all customer credits needing payments
    const creditSales = income.filter(i => i.paymentStatus !== 'paid');
    return creditSales.map(sale => {
      const customer = customers.find(c => c.id === sale.customerId);
      const remainingBalance = sale.totalAmount - sale.amountPaid;
      return {
        ...sale,
        customerName: customer ? customer.name : 'Walk-in cash customer',
        customerPhone: customer ? customer.contact : '-',
        remainingBalance
      };
    });
  };

  const getHistoricalDebts = () => {
    // Return all customer credits, both active and settled/fully paid
    const creditSales = income.filter(i => 
      i.paymentStatus === 'unpaid' || 
      i.paymentStatus === 'partial' || 
      creditPayments.some(cp => cp.incomeId === i.id)
    );
    return creditSales.map(sale => {
      const customer = customers.find(c => c.id === sale.customerId);
      const remainingBalance = sale.totalAmount - sale.amountPaid;
      return {
        ...sale,
        customerName: customer ? customer.name : 'Walk-in cash customer',
        customerPhone: customer ? customer.contact : '-',
        remainingBalance
      };
    });
  };

  const getCreditPaymentsWithDetails = () => {
    return creditPayments.map(cp => {
      const matchedIncome = income.find(inc => inc.id === cp.incomeId);
      const customer = matchedIncome ? customers.find(c => c.id === matchedIncome.customerId) : null;
      return {
        ...cp,
        customerName: customer ? customer.name : 'Walk-in cash customer',
        invoiceSource: matchedIncome ? matchedIncome.source : 'Sale',
        invoiceDate: matchedIncome ? matchedIncome.date : 'N/A',
        invoiceTotal: matchedIncome ? matchedIncome.totalAmount : 0
      };
    });
  };

  // --- SUPPLIER CREDIT HELPERS ---
  const getSupplierCreditsList = () => {
    const creditExpenses = expenses.filter(e => e.supplierId && e.paymentStatus !== 'paid');
    return creditExpenses.map(exp => {
      const supplier = suppliers.find(s => s.id === exp.supplierId);
      const amountPaid = exp.amountPaid ?? 0;
      const remainingBalance = exp.amount - amountPaid;
      return {
        ...exp,
        supplierName: supplier ? supplier.name : 'Unknown Vendor',
        supplierPhone: supplier ? supplier.contact : '-',
        remainingBalance
      };
    });
  };

  const getHistoricalSupplierCredits = () => {
    const creditExpenses = expenses.filter(e => e.supplierId);
    return creditExpenses.map(exp => {
      const supplier = suppliers.find(s => s.id === exp.supplierId);
      const amountPaid = exp.amountPaid ?? 0;
      const remainingBalance = exp.amount - amountPaid;
      return {
        ...exp,
        supplierName: supplier ? supplier.name : 'Unknown Vendor',
        supplierPhone: supplier ? supplier.contact : '-',
        remainingBalance
      };
    });
  };

  const handleRecordSupplierPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (supplierPaymentAmount <= 0) {
      alert('Payment amount must be greater than zero.');
      return;
    }

    const targetExp = expenses.find(exp => exp.id === paymentExpenseId);
    if (!targetExp) {
      alert('Selected credit account not found.');
      return;
    }

    const currentPaid = targetExp.amountPaid ?? 0;
    const remainingToPay = targetExp.amount - currentPaid;

    if (supplierPaymentAmount > remainingToPay) {
      alert(`Amount entered (₦${supplierPaymentAmount}) exceeds outstanding balance of ₦${remainingToPay}.`);
      return;
    }

    const newAmountPaid = currentPaid + supplierPaymentAmount;
    const newStatus = newAmountPaid >= targetExp.amount ? 'paid' : 'partial';

    if (onUpdateExpense) {
      onUpdateExpense({
        ...targetExp,
        amountPaid: newAmountPaid,
        paymentStatus: newStatus,
        notes: targetExp.notes 
          ? `${targetExp.notes} | Paid ₦${supplierPaymentAmount} on ${new Date().toISOString().split('T')[0]}. ${supplierPaymentNotes}` 
          : `Paid ₦${supplierPaymentAmount} on ${new Date().toISOString().split('T')[0]}. ${supplierPaymentNotes}`
      });
      alert(`Payment of ₦${supplierPaymentAmount} successfully recorded for ${targetExp.category} expense.`);
    } else {
      alert('Updating expense is not configured.');
    }

    setPaymentExpenseId('');
    setSupplierPaymentAmount(0);
    setSupplierPaymentNotes('');
  };

  // --- SEARCH AND FILTER METHOD IMPLEMENTATIONS ---
  const getFilteredCustomerDebtsList = () => {
    let list = getCustomerDebtsList();
    if (searchDebtorQuery.trim()) {
      const q = searchDebtorQuery.toLowerCase();
      list = list.filter(deb => 
        deb.customerName.toLowerCase().includes(q) || 
        deb.customerPhone.toLowerCase().includes(q) ||
        deb.source.toLowerCase().includes(q)
      );
    }
    return list;
  };

  const getFilteredHistoricalDebts = () => {
    let list = getHistoricalDebts();
    
    // Status Filter
    if (debtorStatusFilter === 'outstanding') {
      list = list.filter(deb => deb.remainingBalance > 0);
    } else if (debtorStatusFilter === 'settled') {
      list = list.filter(deb => deb.remainingBalance <= 0);
    }

    // Search Query
    if (searchDebtorQuery.trim()) {
      const q = searchDebtorQuery.toLowerCase();
      list = list.filter(deb => 
        deb.customerName.toLowerCase().includes(q) || 
        deb.customerPhone.toLowerCase().includes(q) ||
        deb.source.toLowerCase().includes(q)
      );
    }

    return list;
  };

  const getFilteredSupplierCreditsList = () => {
    let list = getSupplierCreditsList();
    if (searchSupplierQuery.trim()) {
      const q = searchSupplierQuery.toLowerCase();
      list = list.filter(exp => 
        exp.supplierName.toLowerCase().includes(q) || 
        exp.supplierPhone.toLowerCase().includes(q) ||
        exp.category.toLowerCase().includes(q)
      );
    }
    return list;
  };

  const getFilteredHistoricalSupplierCredits = () => {
    let list = getHistoricalSupplierCredits();

    // Status Filter
    if (supplierStatusFilter === 'outstanding') {
      list = list.filter(exp => exp.remainingBalance > 0);
    } else if (supplierStatusFilter === 'settled') {
      list = list.filter(exp => exp.remainingBalance <= 0);
    }

    // Search Query
    if (searchSupplierQuery.trim()) {
      const q = searchSupplierQuery.toLowerCase();
      list = list.filter(exp => 
        exp.supplierName.toLowerCase().includes(q) || 
        exp.supplierPhone.toLowerCase().includes(q) ||
        exp.category.toLowerCase().includes(q)
      );
    }

    return list;
  };

  // --- CSV EXPORT IMPLEMENTATIONS ---
  const exportToCSV = (headers: string[], rows: string[][], filename: string) => {
    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.map(val => `"${(val || '').toString().replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportDebtorsToCSV = () => {
    const data = getFilteredHistoricalDebts();
    const headers = ['Customer Name', 'Phone', 'Invoice Date', 'Purchase Type', 'Quantity', 'Invoiced Amount (₦)', 'Amount Paid (₦)', 'Outstanding Balance (₦)', 'Status'];
    const rows = data.map(d => [
      d.customerName,
      d.customerPhone,
      d.date,
      d.source.replace('_', ' '),
      d.quantity.toString(),
      d.totalAmount.toFixed(2),
      d.amountPaid.toFixed(2),
      d.remainingBalance.toFixed(2),
      d.remainingBalance <= 0 ? 'Settled' : 'Outstanding'
    ]);
    exportToCSV(headers, rows, `Customer_Debtors_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleExportPaymentsToCSV = () => {
    const data = getCreditPaymentsWithDetails();
    const headers = ['Payment Date', 'Customer Name', 'Invoice Type', 'Invoice Date', 'Invoice Total (₦)', 'Payment Amount (₦)', 'Notes'];
    const rows = data.map(d => [
      d.date,
      d.customerName,
      d.invoiceSource.replace('_', ' '),
      d.invoiceDate,
      d.invoiceTotal.toFixed(2),
      d.amountPaid.toFixed(2),
      d.notes || '-'
    ]);
    exportToCSV(headers, rows, `Customer_Payments_Received_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleExportSuppliersToCSV = () => {
    const data = getFilteredHistoricalSupplierCredits();
    const headers = ['Supplier Name', 'Phone', 'Invoice Date', 'Expense Type', 'Total Expense Amount (₦)', 'Amount Paid (₦)', 'Outstanding Balance (₦)', 'Status', 'Notes'];
    const rows = data.map(d => [
      d.supplierName,
      d.supplierPhone,
      d.date,
      d.category,
      d.amount.toFixed(2),
      (d.amountPaid ?? 0).toFixed(2),
      d.remainingBalance.toFixed(2),
      d.remainingBalance <= 0 ? 'Settled' : 'Outstanding',
      d.notes || '-'
    ]);
    exportToCSV(headers, rows, `Supplier_Accounts_Payable_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
  };

  return (
    <div className="space-y-6" id="finance_credit_tracker_container">
      {/* Overview Metric Panel */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col md:flex-row justify-between items-stretch gap-4 md:items-center">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-800 font-display flex items-center gap-2">
            Farm Financial Ledgers
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Log raw sale batches, operational spends, credit lines, and partial offsets.
          </p>
        </div>

        {/* Ledger sub-tabs */}
        <div className="flex bg-slate-100 p-1 rounded-xl self-start md:self-auto border border-slate-200">
          <button
            id="subtab_ledger"
            onClick={() => setActiveSubTab('ledger')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg ${
              activeSubTab === 'ledger' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
            }`}
          >
            Cashflow Ledger
          </button>
          <button
            id="subtab_credits"
            onClick={() => setActiveSubTab('credits')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg ${
              activeSubTab === 'credits' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
            }`}
          >
            Outstanding Debts ({getCustomerDebtsList().length})
          </button>
        </div>
      </div>



      {/* Summary totals */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-100">
          <span className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider block">Total Sales Revenue</span>
          <span className="text-lg font-extrabold text-emerald-600 mt-1 block font-mono">
            ₦{totalInc.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-100">
          <span className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider block">Cash Collected</span>
          <span className="text-lg font-extrabold text-slate-800 mt-1 block font-mono">
            ₦{totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-100">
          <span className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider block">Owed From Buyers</span>
          <span className={`text-lg font-extrabold mt-1 block font-mono ${outstandingDebt > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
            ₦{outstandingDebt.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-100">
          <span className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider block">Total Expenditures</span>
          <span className="text-lg font-extrabold text-rose-600 mt-1 block font-mono">
            ₦{totalExp.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-100">
          <span className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider block">Owed to Suppliers</span>
          <span className={`text-lg font-extrabold mt-1 block font-mono ${outstandingSupplierDebt > 0 ? 'text-red-600' : 'text-slate-400'}`}>
            ₦{outstandingSupplierDebt.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* RENDER ACTIVE SUBTAB CONTENT */}
      {activeSubTab === 'ledger' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form Actions (Only if active forms triggered) */}
          <div className="lg:col-span-1 space-y-4">
            {/* Show Add Income CTA */}
            {!showIncomeForm ? (
              <button
                id="btn_start_income_form"
                onClick={() => { setShowIncomeForm(true); setShowExpenseForm(false); }}
                className="w-full py-3 px-4 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-bold rounded-xl text-xs flex items-center justify-between transition-colors shadow-2xs cursor-pointer"
              >
                <span>Register New Income Sale</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>
            ) : (
              <form onSubmit={handleCreateIncome} className="bg-white p-4 rounded-xl border border-emerald-300 shadow-xs space-y-3">
                <h3 className="text-xs font-bold text-emerald-700 uppercase">Input Sale Proceed</h3>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Source Category</label>
                  <select
                    value={incSource}
                    onChange={(e) => setIncSource(e.target.value as any)}
                    className="mt-1 w-full text-xs px-2.5 py-1.5 border border-slate-200 bg-slate-50 rounded"
                  >
                    <option value="egg_sales">Wholesale Egg Sales</option>
                    <option value="bird_sales">Bird Disposal Hen Sales</option>
                    <option value="manure_sales">Manure Fertilizer Sales</option>
                    <option value="other">Miscellaneous Other</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Quantity Sold</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={incQty}
                      onChange={(e) => setIncQty(Number(e.target.value))}
                      className="mt-1 w-full text-xs px-2 py-1.5 border border-slate-200 rounded"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Unit Price (₦)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      min="0.1"
                      value={incPrice}
                      onChange={(e) => setIncPrice(Number(e.target.value))}
                      className="mt-1 w-full text-xs px-2 py-1.5 border border-slate-200 rounded"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Target Customer</label>
                    <button
                      type="button"
                      onClick={() => setIsCustomCust(!isCustomCust)}
                      className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                    >
                      {isCustomCust ? "Choose from List" : "Custom Customer"}
                    </button>
                  </div>
                  {isCustomCust ? (
                    <div className="mt-1 space-y-1.5">
                      <input
                        type="text"
                        placeholder="Write Customer Name..."
                        required={isCustomCust}
                        value={customCustName}
                        onChange={(e) => setCustomCustName(e.target.value)}
                        className="w-full text-xs px-2 py-1.5 border border-slate-200 rounded"
                      />
                      <input
                        type="text"
                        placeholder="Phone Number (optional)"
                        value={customCustContact}
                        onChange={(e) => setCustomCustContact(e.target.value)}
                        className="w-full text-xs px-2 py-1.5 border border-slate-200 rounded"
                      />
                    </div>
                  ) : (
                    <select
                      value={incCustId}
                      onChange={(e) => setIncCustId(e.target.value)}
                      className="mt-1 w-full text-xs px-2 py-1.5 border border-slate-200 bg-slate-50 rounded"
                    >
                      <option value="">-- Generic Cash Customer --</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Term Status</label>
                    <select
                      value={incStatus}
                      onChange={(e) => setIncStatus(e.target.value as any)}
                      className="mt-1 w-full text-xs px-2 py-1.5 border border-slate-200 bg-slate-50 rounded"
                    >
                      <option value="paid">Fully Settled</option>
                      <option value="unpaid">100% On Credit</option>
                      <option value="partial">Partial Payment</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Transaction Date</label>
                    <input
                      type="date"
                      required
                      value={incDate}
                      onChange={(e) => setIncDate(e.target.value)}
                      className="mt-1 w-full text-xs px-2 py-1 border border-slate-200 rounded font-mono"
                    />
                  </div>
                </div>

                {incStatus === 'partial' && (
                  <div>
                    <label className="text-[10px] font-bold text-rose-700 uppercase block">How much was paid?</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={incPaidAmount}
                      onChange={(e) => setIncPaidAmount(Number(e.target.value))}
                      className="mt-1 w-full text-xs px-2 py-1.5 border border-rose-200 bg-rose-50/20 rounded font-mono font-bold"
                    />
                  </div>
                )}

                <div className="bg-slate-50 p-2 rounded text-[10px] flex justify-between font-semibold">
                  <span>Grand total calculation:</span>
                  <span className="font-mono text-emerald-700">₦{(incQty * incPrice).toFixed(2)}</span>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowIncomeForm(false)}
                    className="px-2.5 py-1 text-xs text-slate-500 hover:bg-slate-50 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3.5 py-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold shadow-xs"
                  >
                    Save Proceed
                  </button>
                </div>
              </form>
            )}

            {/* Show Add Expense CTA */}
            {!showExpenseForm ? (
              <button
                id="btn_start_expense_form"
                onClick={() => { setShowExpenseForm(true); setShowIncomeForm(false); }}
                className="w-full py-3 px-4 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 font-bold rounded-xl text-xs flex items-center justify-between transition-colors shadow-2xs cursor-pointer"
              >
                <span>Register Farm Expense Spend</span>
                <ArrowDownRight className="w-4 h-4" />
              </button>
            ) : (
              <form onSubmit={handleCreateExpense} className="bg-white p-4 rounded-xl border border-rose-300 shadow-xs space-y-3">
                <h3 className="text-xs font-bold text-rose-700 uppercase">Input Expense Record</h3>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Expense Category</label>
                  <select
                    value={expCategory}
                    onChange={(e) => setExpCategory(e.target.value as any)}
                    className="mt-1 w-full text-xs px-2.5 py-1.5 border border-slate-200 bg-slate-50 rounded"
                  >
                    <option value="feed">Feed Purchases</option>
                    <option value="medication">Medication & Vaccines</option>
                    <option value="transport">Transport & Logistics</option>
                    <option value="labor">Labor & Salaries</option>
                    <option value="miscellaneous">Miscellaneous General</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Amount Paid (₦)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      min="0.1"
                      value={expAmount}
                      onChange={(e) => setExpAmount(Number(e.target.value))}
                      className="mt-1 w-full text-xs px-2 py-1.5 border border-slate-200 rounded font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Expense Date</label>
                    <input
                      type="date"
                      required
                      value={expDate}
                      onChange={(e) => setExpDate(e.target.value)}
                      className="mt-1 w-full text-xs px-2 py-1 border border-slate-200 rounded font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Record Notes / Particulars</label>
                  <textarea
                    required
                    value={expNotes}
                    onChange={(e) => setExpNotes(e.target.value)}
                    placeholder="Describe item e.g. 20 bags lay mash"
                    className="mt-1 w-full text-xs px-2 py-1 border border-slate-200 rounded h-12"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Associated Supplier Vendor (Optional)</label>
                  <select
                    value={expSupplierId}
                    onChange={(e) => setExpSupplierId(e.target.value)}
                    className="mt-1 w-full text-xs px-2.5 py-1.5 border border-slate-200 bg-slate-50 rounded"
                  >
                    <option value="">-- No Supplier linked --</option>
                    {suppliers.map(sup => (
                      <option key={sup.id} value={sup.id}>{sup.name}</option>
                    ))}
                  </select>
                </div>

                {expSupplierId && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block">Payment Credit Status</label>
                        <select
                          value={expStatus}
                          onChange={(e) => setExpStatus(e.target.value as any)}
                          className="mt-1 w-full text-xs px-2.5 py-1.5 border border-slate-200 bg-slate-50 rounded"
                        >
                          <option value="paid">100% Fully Settled</option>
                          <option value="unpaid">100% On Supplier Credit</option>
                          <option value="partial">Partial Payment Made</option>
                        </select>
                      </div>

                      {expStatus === 'partial' && (
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase block">Paid to Date (₦)</label>
                          <input
                            type="number"
                            step="0.01"
                            required
                            min="0"
                            max={expAmount - 0.01}
                            value={expPaidAmount}
                            onChange={(e) => setExpPaidAmount(Number(e.target.value))}
                            className="mt-1 w-full text-xs px-2 py-1.5 border border-slate-200 rounded font-mono font-bold text-slate-800"
                          />
                        </div>
                      )}
                    </div>
                  </>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowExpenseForm(false)}
                    className="px-2.5 py-1 text-xs text-slate-500 hover:bg-slate-50 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3.5 py-1 text-xs bg-rose-600 hover:bg-rose-700 text-white rounded font-bold shadow-xs"
                  >
                    Save Spend
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Table Ledger view */}
          <div className="lg:col-span-2 space-y-4 bg-white rounded-xl border border-slate-100 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Dynamic Cashflow History</h3>
              <span className="text-[10px] text-slate-400 font-sans">Synced chronologically</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/20 text-slate-400 text-[9px] sm:text-[10px] uppercase font-bold tracking-wider sm:tracking-widest whitespace-nowrap">
                    <th className="px-3 py-2.5 sm:px-5 sm:py-3">Date</th>
                    <th className="px-3 py-2.5 sm:px-5 sm:py-3">Type</th>
                    <th className="px-3 py-2.5 sm:px-5 sm:py-3 min-w-[180px]">Particulars / Source</th>
                    <th className="px-3 py-2.5 sm:px-5 sm:py-3 text-right">Debit (-)</th>
                    <th className="px-3 py-2.5 sm:px-5 sm:py-3 text-right">Credit (+)</th>
                    <th className="px-3 py-2.5 sm:px-5 sm:py-3 text-right">Status / Offset</th>
                    <th className="px-3 py-2.5 sm:px-5 sm:py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px] sm:text-xs">
                  {/* Merge Income and Expenses together into unified rows for timeline reading */}
                  {[
                    ...income.map(inc => ({ ...inc, _ledgerType: 'income' as const })),
                    ...expenses.map(exp => ({ ...exp, _ledgerType: 'expense' as const }))
                  ]
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .map((item, index) => {
                      const isIncome = item._ledgerType === 'income';

                      return (
                        <tr key={index} className="hover:bg-slate-50/50" id={`ledger_index_${index}`}>
                          <td className="px-3 py-3 sm:px-5 sm:py-3.5 font-mono font-medium text-slate-500 whitespace-nowrap">{item.date}</td>
                          <td className="px-3 py-3 sm:px-5 sm:py-3.5 whitespace-nowrap">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-md font-bold text-[9px] uppercase tracking-wide ${
                                isIncome ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
                              }`}
                            >
                              {isIncome ? 'Proceed' : 'Spend'}
                            </span>
                          </td>
                          <td className="px-3 py-3 sm:px-5 sm:py-3.5 font-semibold text-slate-700 break-words whitespace-normal max-w-[240px]">
                            {isIncome ? (
                              <div>
                                <span className="capitalize">{item.source?.replace('_', ' ')}</span>
                                {item.customerId && (
                                  <span className="block text-[10px] text-slate-400 font-medium font-sans break-words whitespace-normal leading-normal">
                                    Buyer: {customers.find(c => c.id === item.customerId)?.name || 'Generic Buyer'}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div>
                                <span className="capitalize text-rose-800 font-semibold">{item.category}</span>
                                {item.notes && (
                                  <span className="block text-[10px] text-slate-400 font-medium font-sans mt-0.5 break-words whitespace-normal leading-relaxed">
                                    {item.notes}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-3 sm:px-5 sm:py-3.5 text-right font-mono text-rose-600 font-medium whitespace-nowrap">
                            {!isIncome ? `₦${item.amount?.toFixed(2)}` : '-'}
                          </td>
                          <td className="px-3 py-3 sm:px-5 sm:py-3.5 text-right font-mono text-emerald-600 font-bold whitespace-nowrap">
                            {isIncome ? `₦${item.totalAmount?.toFixed(2)}` : '-'}
                          </td>
                          <td className="px-3 py-3 sm:px-5 sm:py-3 text-right whitespace-nowrap">
                            {isIncome ? (
                              <div>
                                <span
                                  className={`inline-block px-1.5 py-0.5 rounded font-mono font-bold text-[10px] ${
                                    item.paymentStatus === 'paid'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : item.paymentStatus === 'unpaid'
                                      ? 'bg-rose-100 text-rose-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {item.paymentStatus === 'paid'
                                    ? 'Settled'
                                    : item.paymentStatus === 'unpaid'
                                    ? 'Owed'
                                    : 'Partial'}
                                </span>
                                {item.paymentStatus !== 'paid' && (
                                  <span className="block text-[9px] text-slate-400 mt-0.5">
                                    Paid: ₦{item.amountPaid?.toFixed(0)}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                          <td className="px-3 py-3 sm:px-5 sm:py-3 text-right whitespace-nowrap">
                            {user?.role === 'admin' ? (
                              <button
                                id={`del_${isIncome ? 'inc' : 'exp'}_${item.id}`}
                                onClick={() => {
                                  if (deleteConfirmId === item.id) {
                                    if (isIncome) {
                                      onDeleteIncome(item.id);
                                    } else {
                                      onDeleteExpense(item.id);
                                    }
                                    setDeleteConfirmId(null);
                                  } else {
                                    setDeleteConfirmId(item.id);
                                    setTimeout(() => {
                                      setDeleteConfirmId(prev => prev === item.id ? null : prev);
                                    }, 4000);
                                  }
                                }}
                                className={`text-[10px] font-bold transition-all ${
                                  deleteConfirmId === item.id
                                    ? 'text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded animate-pulse font-sans'
                                    : 'text-red-500 hover:text-red-700'
                                }`}
                              >
                                {deleteConfirmId === item.id ? 'Confirm Delete?' : 'Delete'}
                              </button>
                            ) : (
                              <span className="text-[10px] text-zinc-300 italic">No access</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'credits' && (
        <>
          {/* Sub-Tabs for Credit Management */}
          <div className="flex border-b border-slate-200 mb-6">
            <button
              id="btn_credit_type_customers"
              type="button"
              onClick={() => setCreditType('customers')}
              className={`pb-3 text-xs font-bold transition-all px-4 -mb-px flex items-center gap-1.5 border-b-2 ${
                creditType === 'customers'
                  ? 'border-emerald-600 text-emerald-800 font-extrabold font-sans'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              👤 Customer Debtors & Receivables (₦{outstandingDebt.toLocaleString(undefined, { minimumFractionDigits: 2 })})
            </button>
            <button
              id="btn_credit_type_suppliers"
              type="button"
              onClick={() => setCreditType('suppliers')}
              className={`pb-3 text-xs font-bold transition-all px-4 -mb-px flex items-center gap-1.5 border-b-2 ${
                creditType === 'suppliers'
                  ? 'border-red-600 text-red-800 font-extrabold font-sans'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              🚚 Supplier Payables & Credit (₦{outstandingSupplierDebt.toLocaleString(undefined, { minimumFractionDigits: 2 })})
            </button>
          </div>

          {creditType === 'customers' ? (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
                {/* Form to offset account */}
                <div className="lg:col-span-1 bg-white p-4 rounded-xl border border-slate-100 shadow-xs space-y-3">
                  <h3 className="text-xs font-bold text-slate-700 uppercase border-b border-slate-100 pb-2 flex items-center gap-1.5">
                    Record partial Customer Payment
                  </h3>

                  <form onSubmit={handleRecordPayment} className="space-y-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block">Debtor Invoice Account</label>
                      <select
                        value={paymentIncomeId}
                        onChange={(e) => setPaymentIncomeId(e.target.value)}
                        className="mt-1 w-full text-xs px-2 px-3 py-2 border border-slate-200 rounded bg-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-600 text-slate-800"
                      >
                        <option value="">-- Choose Account --</option>
                        {getCustomerDebtsList().map(deb => (
                          <option key={deb.id} value={deb.id}>
                            {deb.customerName} (Owed: ₦{deb.remainingBalance.toFixed(2)})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block">Amount Received (₦)</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        min="0.1"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(Number(e.target.value))}
                        className="mt-1 w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded font-mono font-bold text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block">Payment Notes</label>
                      <input
                        type="text"
                        value={paymentNotes}
                        onChange={(e) => setPaymentNotes(e.target.value)}
                        placeholder="e.g. cash on delivery, bank transfer"
                        className="mt-1 w-full text-xs px-2 py-1.5 border border-slate-200 rounded"
                      />
                    </div>

                    <button
                      id="btn_submit_debt_payment"
                      type="submit"
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs shadow cursor-pointer transition-colors"
                    >
                      Record Payment
                    </button>
                  </form>
                </div>

                {/* Outstanding Debts list representation */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 shadow-xs overflow-hidden">
                  <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div>
                      <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Credit Accounts & Outstanding Balances</h3>
                      <span className="text-[10px] text-amber-700 font-bold font-sans">Collection Priority List</span>
                    </div>
                    <div className="w-full sm:w-auto">
                      <input
                        type="text"
                        value={searchDebtorQuery}
                        onChange={(e) => setSearchDebtorQuery(e.target.value)}
                        placeholder="Search buyer name or phone..."
                        className="w-full text-xs px-3 py-1.5 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-emerald-600 bg-white"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/20 text-slate-400 text-[9px] sm:text-[10px] uppercase font-bold tracking-wider sm:tracking-widest whitespace-nowrap">
                          <th className="px-3 py-2.5 sm:px-5 sm:py-3 min-w-[150px]">Customer Buyer</th>
                          <th className="px-3 py-2.5 sm:px-5 sm:py-3">Sale Date</th>
                          <th className="px-3 py-2.5 sm:px-5 sm:py-3 min-w-[130px]">Items Purchased</th>
                          <th className="px-3 py-2.5 sm:px-5 sm:py-3 text-right">Invoiced (₦)</th>
                          <th className="px-3 py-2.5 sm:px-5 sm:py-3 text-right">Paid to Date</th>
                          <th className="px-3 py-2.5 sm:px-5 sm:py-3 text-right">Outstanding Balance Owed</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[11px] sm:text-xs text-slate-700">
                        {getFilteredCustomerDebtsList().map(deb => (
                          <tr key={deb.id} className="hover:bg-slate-50/50" id={`credit_row_${deb.id}`}>
                            <td className="px-3 py-3 sm:px-5 sm:py-3.5 break-words whitespace-normal max-w-[180px]">
                              <div className="font-bold text-slate-800">{deb.customerName}</div>
                              <div className="text-[10px] text-slate-400">{deb.customerPhone}</div>
                            </td>
                            <td className="px-3 py-3 sm:px-5 sm:py-3.5 font-mono text-slate-500 whitespace-nowrap">{deb.date}</td>
                            <td className="px-3 py-3 sm:px-5 sm:py-3.5 break-words whitespace-normal max-w-[160px]">
                              <span className="capitalize">{deb.source?.replace('_', ' ')}</span>
                              <span className="block text-[10px] text-slate-400">Qty: {deb.quantity}</span>
                            </td>
                            <td className="px-3 py-3 sm:px-5 sm:py-3.5 text-right font-mono font-medium whitespace-nowrap">₦{deb.totalAmount?.toFixed(2)}</td>
                            <td className="px-3 py-3 sm:px-5 sm:py-3.5 text-right font-mono text-emerald-700 font-medium whitespace-nowrap">₦{deb.amountPaid?.toFixed(2)}</td>
                            <td className="px-3 py-3 sm:px-5 sm:py-3.5 text-right bg-amber-50/30 whitespace-nowrap">
                              <span className="font-mono font-bold text-red-600 block text-xs sm:text-sm">
                                ₦{deb.remainingBalance?.toFixed(2)}
                              </span>
                              <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 bg-amber-50 border border-amber-200 text-amber-700 mt-1 font-bold rounded uppercase">
                                Pending
                              </span>
                            </td>
                          </tr>
                        ))}
                        {getFilteredCustomerDebtsList().length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                              Awesome! No outstanding buyer debts matching your criteria.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Historical Credit & Repayments Log */}
              <div className="bg-white rounded-xl border border-slate-100 shadow-xs mt-6 overflow-hidden animate-fadeIn" id="historical_repayment_ledger">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                  <div>
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <span>Credit & Payment History Ledger</span>
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-0.5 font-sans font-medium">Detailed tracking of all credit accounts and individual payment offsets</p>
                  </div>

                  {/* Filter & Search Bar */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
                    <input
                      type="text"
                      value={searchDebtorQuery}
                      onChange={(e) => setSearchDebtorQuery(e.target.value)}
                      placeholder="Search customer name..."
                      className="text-xs px-2.5 py-1.5 border border-slate-200 rounded w-full sm:w-44 focus:ring-1 focus:ring-emerald-600 focus:outline-none bg-white"
                    />
                    <select
                      value={debtorStatusFilter}
                      onChange={(e) => setDebtorStatusFilter(e.target.value as any)}
                      className="text-xs px-2 py-1.5 border border-slate-200 rounded bg-white text-slate-700 focus:outline-none"
                    >
                      <option value="all">All Statuses</option>
                      <option value="outstanding">Outstanding Only</option>
                      <option value="settled">Settled Only</option>
                    </select>
                    <button
                      type="button"
                      onClick={handleExportDebtorsToCSV}
                      className="text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded transition-colors cursor-pointer"
                    >
                      Export Invoices CSV
                    </button>
                    <button
                      type="button"
                      onClick={handleExportPaymentsToCSV}
                      className="text-[10px] font-bold uppercase bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 px-3 py-1.5 rounded transition-colors cursor-pointer whitespace-nowrap"
                    >
                      Export Receipts CSV
                    </button>
                  </div>

                  <div className="flex gap-1.5 border border-slate-200 p-0.5 rounded-lg bg-slate-100 self-end md:self-auto">
                    <button
                      id="tab_history_debts"
                      type="button"
                      onClick={() => setHistoryTab('debts')}
                      className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                        historyTab === 'debts' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      All Credit Invoices ({getFilteredHistoricalDebts().length})
                    </button>
                    <button
                      id="tab_history_payments"
                      type="button"
                      onClick={() => setHistoryTab('payments')}
                      className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                        historyTab === 'payments' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Payments Received ({getCreditPaymentsWithDetails().length})
                    </button>
                  </div>
                </div>

                {historyTab === 'debts' ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/20 text-slate-400 text-[9px] sm:text-[10px] uppercase font-bold tracking-wider sm:tracking-widest whitespace-nowrap">
                          <th className="px-3 py-2.5 sm:px-5 sm:py-3">Debtor</th>
                          <th className="px-3 py-2.5 sm:px-5 sm:py-3">Date</th>
                          <th className="px-3 py-2.5 sm:px-5 sm:py-3">Details</th>
                          <th className="px-3 py-2.5 sm:px-5 sm:py-3 text-right">Invoiced (₦)</th>
                          <th className="px-3 py-2.5 sm:px-5 sm:py-3 text-right">Paid to Date (₦)</th>
                          <th className="px-3 py-2.5 sm:px-5 sm:py-3 text-right">Outstanding (₦)</th>
                          <th className="px-3 py-2.5 sm:px-5 sm:py-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[11px] sm:text-xs text-slate-700">
                        {getFilteredHistoricalDebts().map(deb => (
                          <tr key={deb.id} className="hover:bg-slate-50/50">
                            <td className="px-3 py-3 sm:px-5 sm:py-3.5">
                              <div className="font-bold text-slate-800">{deb.customerName}</div>
                              <div className="text-[10px] text-slate-400">{deb.customerPhone}</div>
                            </td>
                            <td className="px-3 py-3 sm:px-5 sm:py-3.5 font-mono text-slate-500">{deb.date}</td>
                            <td className="px-3 py-3 sm:px-5 sm:py-3.5 capitalize">
                              {deb.source?.replace('_', ' ')}
                              <span className="block text-[10px] text-slate-400">Qty: {deb.quantity}</span>
                            </td>
                            <td className="px-3 py-3 sm:px-5 sm:py-3.5 text-right font-mono font-medium">₦{deb.totalAmount?.toFixed(2)}</td>
                            <td className="px-3 py-3 sm:px-5 sm:py-3.5 text-right font-mono text-emerald-700 font-medium">₦{deb.amountPaid?.toFixed(2)}</td>
                            <td className="px-3 py-3 sm:px-5 sm:py-3.5 text-right font-mono font-bold text-slate-700">₦{deb.remainingBalance?.toFixed(2)}</td>
                            <td className="px-3 py-3 sm:px-5 sm:py-3.5 text-center">
                              {deb.remainingBalance <= 0 ? (
                                <span className="inline-flex items-center text-[9px] px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold rounded uppercase">
                                  Settled
                                </span>
                              ) : (
                                <span className="inline-flex items-center text-[9px] px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-700 font-bold rounded uppercase">
                                  Outstanding
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                        {getFilteredHistoricalDebts().length === 0 && (
                          <tr>
                            <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                              No historical credit sales found matching filters.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/20 text-slate-400 text-[9px] sm:text-[10px] uppercase font-bold tracking-wider sm:tracking-widest whitespace-nowrap">
                          <th className="px-3 py-2.5 sm:px-5 sm:py-3">Payment Date</th>
                          <th className="px-3 py-2.5 sm:px-5 sm:py-3">Debtor</th>
                          <th className="px-3 py-2.5 sm:px-5 sm:py-3">Linked Invoice Details</th>
                          <th className="px-3 py-2.5 sm:px-5 sm:py-3 text-right">Amount Received (₦)</th>
                          <th className="px-3 py-2.5 sm:px-5 sm:py-3">Payment Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[11px] sm:text-xs text-slate-700">
                        {[...getCreditPaymentsWithDetails()].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)).map(pmt => (
                          <tr key={pmt.id} className="hover:bg-slate-50/50">
                            <td className="px-3 py-3 sm:px-5 sm:py-3.5 font-mono text-slate-500 font-medium">{pmt.date}</td>
                            <td className="px-3 py-3 sm:px-5 sm:py-3.5 font-bold text-slate-800">{pmt.customerName}</td>
                            <td className="px-3 py-3 sm:px-5 sm:py-3.5">
                              <span className="capitalize">{pmt.invoiceSource?.replace('_', ' ')}</span>
                              <span className="block text-[10px] text-slate-400 font-mono">Invoice Date: {pmt.invoiceDate} • Total: ₦{pmt.invoiceTotal?.toFixed(2)}</span>
                            </td>
                            <td className="px-3 py-3 sm:px-5 sm:py-3.5 text-right font-mono font-bold text-emerald-600 text-xs sm:text-sm">
                              ₦{pmt.amountPaid?.toFixed(2)}
                            </td>
                            <td className="px-3 py-3 sm:px-5 sm:py-3.5 text-slate-500 italic">
                              {pmt.notes || <span className="text-slate-300">-</span>}
                            </td>
                          </tr>
                        ))}
                        {getCreditPaymentsWithDetails().length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-5 py-8 text-center text-slate-400">
                              No payment receipts logged yet.
                              <p className="text-[10px] text-slate-400 mt-1">Offset an outstanding debtor account using the panel above to see logs here.</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* SUPPLIER CREDITS WORKSPACE */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
                {/* Form to pay Supplier */}
                <div className="lg:col-span-1 bg-white p-4 rounded-xl border border-slate-100 shadow-xs space-y-3">
                  <h3 className="text-xs font-bold text-red-700 uppercase border-b border-slate-100 pb-2 flex items-center gap-1.5">
                    Record Supplier Credit Offset
                  </h3>

                  <form onSubmit={handleRecordSupplierPayment} className="space-y-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block">Supplier Credit Account</label>
                      <select
                        value={paymentExpenseId}
                        required
                        onChange={(e) => setPaymentExpenseId(e.target.value)}
                        className="mt-1 w-full text-xs px-2 px-3 py-2 border border-slate-200 rounded bg-slate-50 focus:outline-none focus:ring-1 focus:ring-red-600 text-slate-800"
                      >
                        <option value="">-- Choose Account --</option>
                        {getSupplierCreditsList().map(exp => (
                          <option key={exp.id} value={exp.id}>
                            {exp.supplierName} - {exp.category.toUpperCase()} (Owed: ₦{exp.remainingBalance.toFixed(2)})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block">Amount Paid to Supplier (₦)</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        min="0.1"
                        value={supplierPaymentAmount || ''}
                        onChange={(e) => setSupplierPaymentAmount(Number(e.target.value))}
                        className="mt-1 w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded font-mono font-bold text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block">Payment Notes / Tx Details</label>
                      <input
                        type="text"
                        value={supplierPaymentNotes}
                        onChange={(e) => setSupplierPaymentNotes(e.target.value)}
                        placeholder="e.g. cash, bank transfer reference, receipt number"
                        className="mt-1 w-full text-xs px-2 py-1.5 border border-slate-200 rounded"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded font-bold text-xs shadow cursor-pointer transition-colors"
                    >
                      Record Supplier Payment
                    </button>
                  </form>
                </div>

                {/* Outstanding Supplier Credit list */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 shadow-xs overflow-hidden">
                  <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div>
                      <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Outstanding Accounts Payable</h3>
                      <span className="text-[10px] text-red-700 font-bold font-sans">Supplier Credit Priority List</span>
                    </div>
                    <div className="w-full sm:w-auto">
                      <input
                        type="text"
                        value={searchSupplierQuery}
                        onChange={(e) => setSearchSupplierQuery(e.target.value)}
                        placeholder="Search supplier or category..."
                        className="w-full text-xs px-3 py-1.5 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-red-600 bg-white"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/20 text-slate-400 text-[9px] sm:text-[10px] uppercase font-bold tracking-wider whitespace-nowrap">
                          <th className="px-3 py-2.5 sm:px-5 sm:py-3 min-w-[150px]">Supplier Vendor</th>
                          <th className="px-3 py-2.5 sm:px-5 sm:py-3">Spend Date</th>
                          <th className="px-3 py-2.5 sm:px-5 sm:py-3 min-w-[130px]">Category & Notes</th>
                          <th className="px-3 py-2.5 sm:px-5 sm:py-3 text-right">Invoiced (₦)</th>
                          <th className="px-3 py-2.5 sm:px-5 sm:py-3 text-right">Paid to Date</th>
                          <th className="px-3 py-2.5 sm:px-5 sm:py-3 text-right">Outstanding Owed</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[11px] sm:text-xs text-slate-700">
                        {getFilteredSupplierCreditsList().map(exp => (
                          <tr key={exp.id} className="hover:bg-slate-50/50">
                            <td className="px-3 py-3 sm:px-5 sm:py-3.5 break-words whitespace-normal max-w-[180px]">
                              <div className="font-bold text-slate-800">{exp.supplierName}</div>
                              <div className="text-[10px] text-slate-400">{exp.supplierPhone}</div>
                            </td>
                            <td className="px-3 py-3 sm:px-5 sm:py-3.5 font-mono text-slate-500 whitespace-nowrap">{exp.date}</td>
                            <td className="px-3 py-3 sm:px-5 sm:py-3.5 break-words whitespace-normal max-w-[160px]">
                              <span className="capitalize font-medium text-slate-700">{exp.category}</span>
                              <span className="block text-[10px] text-slate-400 truncate max-w-[150px]" title={exp.notes}>{exp.notes || '-'}</span>
                            </td>
                            <td className="px-3 py-3 sm:px-5 sm:py-3.5 text-right font-mono font-medium whitespace-nowrap">₦{exp.amount.toFixed(2)}</td>
                            <td className="px-3 py-3 sm:px-5 sm:py-3.5 text-right font-mono text-emerald-700 font-medium whitespace-nowrap">₦{(exp.amountPaid ?? 0).toFixed(2)}</td>
                            <td className="px-3 py-3 sm:px-5 sm:py-3.5 text-right bg-red-50/20 whitespace-nowrap font-sans">
                              <span className="font-mono font-bold text-red-600 block text-xs sm:text-sm">
                                ₦{exp.remainingBalance.toFixed(2)}
                              </span>
                              <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 bg-red-50 border border-red-200 text-red-700 mt-1 font-bold rounded uppercase">
                                Payable
                              </span>
                            </td>
                          </tr>
                        ))}
                        {getFilteredSupplierCreditsList().length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                              Excellent! No outstanding payables to suppliers matching your query.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Historical Supplier Credit Log */}
              <div className="bg-white rounded-xl border border-slate-100 shadow-xs mt-6 overflow-hidden animate-fadeIn">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                  <div>
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Supplier Accounts Payable History</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5 font-sans font-medium">Detailed tracking of all credit agreements and settlement history with vendors</p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
                    <input
                      type="text"
                      value={searchSupplierQuery}
                      onChange={(e) => setSearchSupplierQuery(e.target.value)}
                      placeholder="Search vendor or category..."
                      className="text-xs px-2.5 py-1.5 border border-slate-200 rounded w-full sm:w-44 focus:ring-1 focus:ring-red-600 focus:outline-none bg-white"
                    />
                    <select
                      value={supplierStatusFilter}
                      onChange={(e) => setSupplierStatusFilter(e.target.value as any)}
                      className="text-xs px-2 py-1.5 border border-slate-200 rounded bg-white text-slate-700 focus:outline-none"
                    >
                      <option value="all">All Statuses</option>
                      <option value="outstanding">Outstanding Only</option>
                      <option value="settled">Settled Only</option>
                    </select>
                    <button
                      type="button"
                      onClick={handleExportSuppliersToCSV}
                      className="text-[10px] font-bold uppercase bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded transition-colors cursor-pointer"
                    >
                      Export Suppliers CSV
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/20 text-slate-400 text-[9px] sm:text-[10px] uppercase font-bold tracking-wider whitespace-nowrap">
                        <th className="px-3 py-2.5 sm:px-5 sm:py-3">Supplier Vendor</th>
                        <th className="px-3 py-2.5 sm:px-5 sm:py-3">Date</th>
                        <th className="px-3 py-2.5 sm:px-5 sm:py-3">Expense Category</th>
                        <th className="px-3 py-2.5 sm:px-5 sm:py-3 text-right">Invoiced Total (₦)</th>
                        <th className="px-3 py-2.5 sm:px-5 sm:py-3 text-right">Paid to Date (₦)</th>
                        <th className="px-3 py-2.5 sm:px-5 sm:py-3 text-right">Outstanding (₦)</th>
                        <th className="px-3 py-2.5 sm:px-5 sm:py-3 text-center">Status</th>
                        <th className="px-3 py-2.5 sm:px-5 sm:py-3">Notes & Payment Tracking</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[11px] sm:text-xs text-slate-700">
                      {getFilteredHistoricalSupplierCredits().map(exp => (
                        <tr key={exp.id} className="hover:bg-slate-50/50">
                          <td className="px-3 py-3 sm:px-5 sm:py-3.5">
                            <div className="font-bold text-slate-800">{exp.supplierName}</div>
                            <div className="text-[10px] text-slate-400">{exp.supplierPhone}</div>
                          </td>
                          <td className="px-3 py-3 sm:px-5 sm:py-3.5 font-mono text-slate-500">{exp.date}</td>
                          <td className="px-3 py-3 sm:px-5 sm:py-3.5 capitalize">{exp.category}</td>
                          <td className="px-3 py-3 sm:px-5 sm:py-3.5 text-right font-mono font-medium">₦{exp.amount.toFixed(2)}</td>
                          <td className="px-3 py-3 sm:px-5 sm:py-3.5 text-right font-mono text-emerald-700 font-medium">₦{(exp.amountPaid ?? 0).toFixed(2)}</td>
                          <td className="px-3 py-3 sm:px-5 sm:py-3.5 text-right font-mono font-bold text-slate-700">₦{exp.remainingBalance.toFixed(2)}</td>
                          <td className="px-3 py-3 sm:px-5 sm:py-3.5 text-center">
                            {exp.remainingBalance <= 0 ? (
                              <span className="inline-flex items-center text-[9px] px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold rounded uppercase">
                                Settled
                              </span>
                            ) : (
                              <span className="inline-flex items-center text-[9px] px-2 py-0.5 bg-red-50 border border-red-200 text-red-700 font-bold rounded uppercase">
                                Outstanding
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-3 sm:px-5 sm:py-3.5 text-slate-500 text-[10px] max-w-[200px] break-words">
                            {exp.notes || <span className="text-slate-300 italic">-</span>}
                          </td>
                        </tr>
                      ))}
                      {getFilteredHistoricalSupplierCredits().length === 0 && (
                        <tr>
                          <td colSpan={8} className="px-5 py-8 text-center text-slate-400">
                            No supplier credit accounts recorded matching filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
