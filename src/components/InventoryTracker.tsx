/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ShoppingCart, Plus, Package, Edit, Trash, AlertTriangle, HelpCircle } from 'lucide-react';
import { FeedStock, InventoryItem, Supplier, User } from '../types';
import CustomSelect from './CustomSelect';

interface InventoryTrackerProps {
  feedStock: FeedStock[];
  inventoryItems: InventoryItem[];
  suppliers: Supplier[];
  user: User | null;
  onRestockFeed: (feedId: string, addedBags: number, totalCost: number) => void;
  onRestockItem: (itemId: string, addedQty: number) => void;
  onAddNewFeed: (feed: Omit<FeedStock, 'id'>) => void;
  onAddNewItem: (item: Omit<InventoryItem, 'id'>) => void;
  onDeleteFeed: (feedId: string) => void;
  onDeleteItem: (itemId: string) => void;
  onAddNewSupplier: (sup: Omit<Supplier, 'id'>) => void;
  onDeleteSupplier: (supId: string) => void;
}

export default function InventoryTracker({
  feedStock,
  inventoryItems,
  suppliers,
  user,
  onRestockFeed,
  onRestockItem,
  onAddNewFeed,
  onAddNewItem,
  onDeleteFeed,
  onDeleteItem,
  onAddNewSupplier,
  onDeleteSupplier
}: InventoryTrackerProps) {
  const [activeSubView, setActiveSubView] = useState<'feed' | 'general' | 'vendors'>('feed');

  // Iframe-safe delete confirmation states
  const [deleteConfirmFeedId, setDeleteConfirmFeedId] = useState<string | null>(null);
  const [deleteConfirmItemId, setDeleteConfirmItemId] = useState<string | null>(null);
  const [deleteConfirmSupplierId, setDeleteConfirmSupplierId] = useState<string | null>(null);

  // Addition states for Feed
  const [showFeedForm, setShowFeedForm] = useState(false);
  const [feedName, setFeedName] = useState('');
  const [feedQty, setFeedQty] = useState<number>(10);
  const [feedCost, setFeedCost] = useState<number>(42);
  const [feedThreshold, setFeedThreshold] = useState<number>(5);
  const [feedSupId, setFeedSupId] = useState(suppliers[0]?.id || '');

  // Addition states for Items
  const [showItemForm, setShowItemForm] = useState(false);
  const [itemName, setItemName] = useState('');
  const [itemCategory, setItemCategory] = useState<'drugs' | 'vaccines' | 'equipment' | 'other'>('drugs');
  const [itemQty, setItemQty] = useState<number>(5);
  const [itemUnit, setItemUnit] = useState('vials');
  const [itemCost, setItemCost] = useState<number>(12);
  const [itemThreshold, setItemThreshold] = useState<number>(2);

  // Addition states for Suppliers (Primary Vendors)
  const [supName, setSupName] = useState('');
  const [supContact, setSupContact] = useState('');

  // Quick incremental restocker states
  const [restockFeedId, setRestockFeedId] = useState('');
  const [restockBags, setRestockBags] = useState<number>(5);

  const [restockItemId, setRestockItemId] = useState('');
  const [restockQty, setRestockQty] = useState<number>(5);

  const handleCreateFeed = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedName.trim()) return;
    onAddNewFeed({
      name: feedName,
      quantityBags: feedQty,
      unitCost: feedCost,
      lowStockThreshold: feedThreshold,
      supplierId: feedSupId || 'sup_2'
    });
    setFeedName('');
    setShowFeedForm(false);
  };

  const handleCreateItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) return;
    onAddNewItem({
      name: itemName,
      category: itemCategory,
      quantity: itemQty,
      unit: itemUnit,
      unitCost: itemCost,
      lowStockThreshold: itemThreshold
    });
    setItemName('');
    setShowItemForm(false);
  };

  const handleCreateSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supName.trim()) return;
    onAddNewSupplier({
      name: supName,
      contact: supContact
    });
    setSupName('');
    setSupContact('');
  };

  const handleIncrFeed = (e: React.FormEvent) => {
    e.preventDefault();
    const feed = feedStock.find(f => f.id === restockFeedId);
    if (!feed) return;
    const computedCost = restockBags * feed.unitCost;
    onRestockFeed(restockFeedId, restockBags, computedCost);
    setRestockFeedId('');
  };

  const handleIncrItem = (e: React.FormEvent) => {
    e.preventDefault();
    onRestockItem(restockItemId, restockQty);
    setRestockItemId('');
  };

  return (
    <div className="space-y-6" id="inventory_tracker_container">
      {/* Sub tabs header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-800 font-display flex items-center gap-2">
            Stock & Inventory Trackers
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Log remaining feed logs, vaccine boxes, egg carton crates, and low-level warning flags.
          </p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
          <button
            id="inv_tab_feed"
            onClick={() => setActiveSubView('feed')}
            className={`px-4 py-1.5 rounded-lg cursor-pointer ${
              activeSubView === 'feed' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500'
            }`}
          >
            Feed Management
          </button>
          <button
            id="inv_tab_general"
            onClick={() => setActiveSubView('general')}
            className={`px-4 py-1.5 rounded-lg cursor-pointer ${
              activeSubView === 'general' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500'
            }`}
          >
            Medicine, Tools & Crates
          </button>
          <button
            id="inv_tab_vendors"
            onClick={() => setActiveSubView('vendors')}
            className={`px-4 py-1.5 rounded-lg cursor-pointer ${
              activeSubView === 'vendors' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500'
            }`}
          >
            Primary Vendors
          </button>
        </div>
      </div>

      {activeSubView === 'feed' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* restock and register */}
          <div className="lg:col-span-1 space-y-4">
            {/* Quick incremental stock adder */}
            <form onSubmit={handleIncrFeed} className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs space-y-3">
              <h3 className="text-xs font-bold text-slate-700 uppercase">Quick Feed Restock Entry</h3>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block">Feed Compound</label>
                <CustomSelect
                  value={restockFeedId}
                  onChange={(e) => setRestockFeedId(e.target.value)}
                  className="mt-1 w-full text-xs px-2.5 py-1.5 border border-slate-200 bg-slate-50 rounded"
                  required
                >
                  <option value="">-- Select stock --</option>
                  {feedStock.map(f => (
                    <option key={f.id} value={f.id}>{f.name} (Now: {f.quantityBags} bags)</option>
                  ))}
                </CustomSelect>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block">Added Bags</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={restockBags}
                  onChange={(e) => setRestockBags(Number(e.target.value))}
                  className="mt-1 w-full text-xs px-2.5 py-1 text-slate-700 border border-slate-200 rounded font-mono"
                />
              </div>

              {restockFeedId && (
                <div className="bg-slate-50 border border-slate-200 text-slate-700 p-2.5 rounded text-[11px]">
                  Estimated cost automatically posted: <span className="font-bold">₦{((restockBags) * (feedStock.find(f => f.id === restockFeedId)?.unitCost || 0)).toFixed(2)}</span>
                </div>
              )}

              <button
                id="btn_incr_feed"
                type="submit"
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs transition-colors cursor-pointer"
              >
                Stock Feed Pile
              </button>
            </form>

            {/* Register new feed compound form */}
            {!showFeedForm ? (
              <button
                id="btn_toggle_feed_form"
                onClick={() => setShowFeedForm(true)}
                className="w-full py-2 border-2 border-dashed border-slate-300 hover:border-emerald-500 text-slate-500 hover:text-emerald-700 rounded-xl text-xs font-bold transition-all text-center"
              >
                + Register Brand New Feed Variety
              </button>
            ) : (
              <form onSubmit={handleCreateFeed} className="bg-white p-4 rounded-xl border border-emerald-300 shadow-xs space-y-3">
                <h3 className="text-xs font-bold text-emerald-700 uppercase">New Feed Formula Schema</h3>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Compound Name</label>
                  <input
                    type="text"
                    required
                    value={feedName}
                    onChange={(e) => setFeedName(e.target.value)}
                    placeholder="e.g. Layers Premium Crumbly"
                    className="mt-1 w-full text-xs px-2 py-1.5 border border-slate-200 rounded"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Starting Bags</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={feedQty}
                      onChange={(e) => setFeedQty(Number(e.target.value))}
                      className="mt-1 w-full text-xs px-2 py-1 border border-slate-200 rounded"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Cost Per Bag (₦)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={feedCost}
                      onChange={(e) => setFeedCost(Number(e.target.value))}
                      className="mt-1 w-full text-xs px-2 py-1 border border-slate-200 rounded"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Low Stock Alert</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={feedThreshold}
                      onChange={(e) => setFeedThreshold(Number(e.target.value))}
                      className="mt-1 w-full text-xs px-2 py-1 border border-slate-200 rounded"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Primary Vendor</label>
                    <CustomSelect
                      value={feedSupId}
                      onChange={(e) => setFeedSupId(e.target.value)}
                      className="mt-1 w-full text-xs px-2 py-1 border border-slate-200 bg-slate-50 rounded"
                    >
                      {suppliers.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </CustomSelect>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowFeedForm(false)}
                    className="px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold"
                  >
                    Register
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* feed table views */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center whitespace-nowrap">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Feed Stock Pile Tracker</h3>
              <p className="text-[10px] text-slate-500 font-semibold uppercase bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">Automatic alerts enabled</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/20 text-slate-400 text-[9px] sm:text-[10px] uppercase font-bold tracking-wider sm:tracking-widest whitespace-nowrap">
                    <th className="px-3 py-2.5 sm:px-5 sm:py-3 min-w-[140px]">Compound Name</th>
                    <th className="px-3 py-2.5 sm:px-5 sm:py-3 min-w-[130px]">Vendor / Dealer</th>
                    <th className="px-3 py-2.5 sm:px-5 sm:py-3 text-right">Cost margin (₦)</th>
                    <th className="px-3 py-2.5 sm:px-5 sm:py-3 text-center">Alert Limit</th>
                    <th className="px-3 py-2.5 sm:px-5 sm:py-3 text-right">In Stockpile (Bags)</th>
                    <th className="px-3 py-2.5 sm:px-5 sm:py-3 text-right">Safety Status</th>
                    <th className="px-3 py-2.5 sm:px-5 sm:py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px] sm:text-xs text-slate-700">
                  {feedStock.map(f => {
                    const sup = suppliers.find(s => s.id === f.supplierId);
                    const isLow = f.quantityBags < f.lowStockThreshold;

                    return (
                      <tr key={f.id} className="hover:bg-slate-50/50" id={`feed_item_${f.id}`}>
                        <td className="px-3 py-3 sm:px-5 sm:py-4 font-bold text-slate-800 break-words whitespace-normal max-w-[160px]">{f.name}</td>
                        <td className="px-3 py-3 sm:px-5 sm:py-4 text-slate-500 font-medium break-words whitespace-normal max-w-[140px]">{sup ? sup.name : 'Primary Wholesaler'}</td>
                        <td className="px-3 py-3 sm:px-5 sm:py-4 text-right font-mono font-medium whitespace-nowrap">₦{f.unitCost.toFixed(2)} / bag</td>
                        <td className="px-3 py-3 sm:px-5 sm:py-4 text-center font-mono text-slate-400 whitespace-nowrap">{f.lowStockThreshold} bags</td>
                        <td className="px-3 py-3 sm:px-5 sm:py-4 text-right font-mono font-bold text-slate-800 bg-slate-50/30 whitespace-nowrap">
                          {f.quantityBags} bags
                        </td>
                        <td className="px-3 py-3 sm:px-5 sm:py-3.5 text-right whitespace-nowrap">
                          {isLow ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-50 border border-rose-100 text-rose-700 rounded font-bold text-[9px] uppercase">
                              Low Stock
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded font-bold text-[9px] uppercase">
                              Optimal
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 sm:px-5 sm:py-3.5 text-right whitespace-nowrap">
                          {user?.role === 'admin' ? (
                            <div className="flex items-center justify-end gap-1.5">
                              {deleteConfirmFeedId === f.id && (
                                <span className="text-[9px] font-bold text-amber-600 animate-pulse font-sans">Confirm?</span>
                              )}
                              <button
                                id={`del_feed_${f.id}`}
                                onClick={() => {
                                  if (deleteConfirmFeedId === f.id) {
                                    onDeleteFeed(f.id);
                                    setDeleteConfirmFeedId(null);
                                  } else {
                                    setDeleteConfirmFeedId(f.id);
                                    setTimeout(() => {
                                      setDeleteConfirmFeedId(prev => prev === f.id ? null : prev);
                                    }, 4000);
                                  }
                                }}
                                className={`p-1.5 rounded transition-all flex items-center justify-center ${
                                  deleteConfirmFeedId === f.id
                                    ? 'text-red-600 bg-red-50 border border-red-200 animate-pulse'
                                    : 'text-slate-400 hover:text-red-600'
                                }`}
                                title={deleteConfirmFeedId === f.id ? "Click again to confirm delete" : "Delete feed variety"}
                              >
                                <Trash className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-zinc-300 italic" title="Only Admin can delete items">No access</span>
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

      {activeSubView === 'general' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* add inputs */}
          <div className="lg:col-span-1 space-y-4">
            {/* Quick incremental restock */}
            <form onSubmit={handleIncrItem} className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs space-y-3">
              <h3 className="text-xs font-bold text-slate-700 uppercase">Quick General Restock</h3>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block">Select Item</label>
                <CustomSelect
                  value={restockItemId}
                  onChange={(e) => setRestockItemId(e.target.value)}
                  className="mt-1 w-full text-xs px-2 py-1 border border-slate-200 bg-slate-50 rounded"
                  required
                >
                  <option value="">-- Select item --</option>
                  {inventoryItems.map(item => (
                    <option key={item.id} value={item.id}>{item.name} ({item.quantity} {item.unit} left)</option>
                  ))}
                </CustomSelect>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block">Quantity Added</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={restockQty}
                  onChange={(e) => setRestockQty(Number(e.target.value))}
                  className="mt-1 w-full text-xs px-2 py-1 text-slate-700 border border-slate-200 rounded font-mono"
                />
              </div>

              <button
                id="btn_incr_item"
                type="submit"
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs cursor-pointer transition-colors"
              >
                Stock Restock
              </button>
            </form>

            {/* Create form general components */}
            {!showItemForm ? (
              <button
                id="btn_toggle_item_form"
                onClick={() => setShowItemForm(true)}
                className="w-full py-2 border-2 border-dashed border-slate-300 hover:border-emerald-500 text-slate-500 hover:text-emerald-700 rounded-xl text-xs font-bold transition-all text-center"
              >
                + Register New Inventory Item
              </button>
            ) : (
              <form onSubmit={handleCreateItem} className="bg-white p-4 rounded-xl border border-emerald-300 shadow-xs space-y-3">
                <h3 className="text-xs font-bold text-emerald-700 uppercase">New Inventory Item Sheet</h3>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Item Identifier</label>
                  <input
                    type="text"
                    required
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    placeholder="e.g. Cardboard crates (30-egg)"
                    className="mt-1 w-full text-xs px-2 py-1.5 border border-slate-200 rounded"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Category</label>
                    <CustomSelect
                      value={itemCategory}
                      onChange={(e) => setItemCategory(e.target.value as any)}
                      className="mt-1 w-full text-xs px-2 py-1 border border-slate-200 bg-slate-50 rounded"
                    >
                      <option value="drugs">Drugs / Antibiotics</option>
                      <option value="vaccines">Vaccines</option>
                      <option value="equipment">Coop Equipment</option>
                      <option value="other">Miscellaneous</option>
                    </CustomSelect>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Unit type</label>
                    <input
                      type="text"
                      required
                      value={itemUnit}
                      onChange={(e) => setItemUnit(e.target.value)}
                      placeholder="e.g. boxes, vials"
                      className="mt-1 w-full text-xs px-2 py-1 border border-slate-200 rounded"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block font-sans">Qty</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={itemQty}
                      onChange={(e) => setItemQty(Number(e.target.value))}
                      className="mt-1 w-full text-xs px-1.5 py-1 border border-slate-200 rounded font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block font-sans">Unit cost</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={itemCost}
                      onChange={(e) => setItemCost(Number(e.target.value))}
                      className="mt-1 w-full text-xs px-1.5 py-1 border border-slate-200 rounded font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block font-sans">Alert limit</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={itemThreshold}
                      onChange={(e) => setItemThreshold(Number(e.target.value))}
                      className="mt-1 w-full text-xs px-1.5 py-1 border border-slate-200 rounded font-mono"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowItemForm(false)}
                    className="px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold"
                  >
                    Register Item
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* general stock views */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Dynamic Medical supplies & Equipments Ledger</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/20 text-slate-400 text-[9px] sm:text-[10px] uppercase font-bold tracking-wider sm:tracking-widest whitespace-nowrap">
                    <th className="px-3 py-2.5 sm:px-5 sm:py-3 min-w-[140px]">Item identifier</th>
                    <th className="px-3 py-2.5 sm:px-5 sm:py-3">Category</th>
                    <th className="px-3 py-2.5 sm:px-5 sm:py-3 text-right">Unit Value (₦)</th>
                    <th className="px-3 py-2.5 sm:px-5 sm:py-3 text-center">Alert levels</th>
                    <th className="px-3 py-2.5 sm:px-5 sm:py-3 text-right">In stock count</th>
                    <th className="px-3 py-2.5 sm:px-5 sm:py-3 text-right">Safety Status</th>
                    <th className="px-3 py-2.5 sm:px-5 sm:py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px] sm:text-xs text-slate-700">
                  {inventoryItems.map(item => {
                    const isLow = item.quantity < item.lowStockThreshold;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50" id={`item_item_${item.id}`}>
                        <td className="px-3 py-3 sm:px-5 sm:py-4 font-bold text-slate-800 break-words whitespace-normal max-w-[160px]">{item.name}</td>
                        <td className="px-3 py-3 sm:px-5 sm:py-4 capitalize text-slate-500 whitespace-nowrap">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 uppercase tracking-wider text-[9px] font-bold">
                            {item.category}
                          </span>
                        </td>
                        <td className="px-3 py-3 sm:px-5 sm:py-4 text-right font-mono font-medium whitespace-nowrap">₦{item.unitCost?.toFixed(2)} / {item.unit?.replace(/s$/, '')}</td>
                        <td className="px-3 py-3 sm:px-5 sm:py-4 text-center font-mono text-slate-400 whitespace-nowrap">{item.lowStockThreshold} {item.unit}</td>
                        <td className="px-3 py-3 sm:px-5 sm:py-4 text-right font-mono font-bold text-slate-800 bg-slate-50/10 whitespace-nowrap">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="px-3 py-3 sm:px-5 sm:py-3 text-right whitespace-nowrap">
                          {isLow ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-50 border border-rose-100 text-rose-700 rounded font-bold text-[9px] uppercase">
                              Reorder Needed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded font-bold text-[9px] uppercase">
                              Optimal
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 sm:px-5 sm:py-3.5 text-right whitespace-nowrap">
                          {user?.role === 'admin' ? (
                            <div className="flex items-center justify-end gap-1.5">
                              {deleteConfirmItemId === item.id && (
                                <span className="text-[9px] font-bold text-amber-600 animate-pulse font-sans">Confirm?</span>
                              )}
                              <button
                                id={`del_item_${item.id}`}
                                onClick={() => {
                                  if (deleteConfirmItemId === item.id) {
                                    onDeleteItem(item.id);
                                    setDeleteConfirmItemId(null);
                                  } else {
                                    setDeleteConfirmItemId(item.id);
                                    setTimeout(() => {
                                      setDeleteConfirmItemId(prev => prev === item.id ? null : prev);
                                    }, 4000);
                                  }
                                }}
                                className={`p-1.5 rounded transition-all flex items-center justify-center ${
                                  deleteConfirmItemId === item.id
                                    ? 'text-red-600 bg-red-50 border border-red-200 animate-pulse'
                                    : 'text-slate-400 hover:text-red-600'
                                }`}
                                title={deleteConfirmItemId === item.id ? "Click again to confirm delete" : "Delete inventory item"}
                              >
                                <Trash className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-zinc-300 italic" title="Only Admin can delete items">No access</span>
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

      {activeSubView === 'vendors' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="vendors_subview_grid">
          {/* Register new supplier */}
          <div className="lg:col-span-1 space-y-4">
            <form onSubmit={handleCreateSupplier} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-4" id="add_vendor_form">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Register New Partner Vendor</h3>
                <p className="text-slate-400 text-[11px] mt-0.5">Add day-old-chick hatcheries, feed mills, or vet pharmacies.</p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Vendor Company Name</label>
                  <input
                    type="text"
                    required
                    value={supName}
                    onChange={(e) => setSupName(e.target.value)}
                    placeholder="e.g. Zartech Feeds Depot"
                    className="mt-1 w-full text-xs px-3 py-2 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-emerald-600 text-slate-800"
                    id="input_vendor_name"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Phone / Contact Details</label>
                  <input
                    type="text"
                    value={supContact}
                    onChange={(e) => setSupContact(e.target.value)}
                    placeholder="e.g. +234 803 123 4567"
                    className="mt-1 w-full text-xs px-3 py-2 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-emerald-600 text-slate-800"
                    id="input_vendor_contact"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs transition-colors cursor-pointer"
                id="btn_submit_vendor"
              >
                Save Primary Vendor
              </button>
            </form>
          </div>

          {/* Suppliers directory list */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-xs p-5 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Primary Partner Directory</h3>
              <p className="text-slate-400 text-[11px] mt-0.5">Primary sources of birds feed and active medication.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-400 text-[10px] uppercase font-bold tracking-widest whitespace-nowrap">
                    <th className="px-4 py-2.5">Vendor Name</th>
                    <th className="px-4 py-2.5">Contact Details</th>
                    <th className="px-4 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {suppliers.map(sup => (
                    <tr key={sup.id} className="hover:bg-slate-50/50" id={`vendor_row_${sup.id}`}>
                      <td className="px-4 py-3 font-semibold text-slate-800 break-words max-w-[200px]">{sup.name}</td>
                      <td className="px-4 py-3 font-mono text-slate-500">{sup.contact || '-'}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {user?.role === 'admin' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            {deleteConfirmSupplierId === sup.id && (
                              <span className="text-[9px] font-bold text-amber-600 animate-pulse font-sans">Confirm?</span>
                            )}
                            <button
                              id={`del_sup_${sup.id}`}
                              onClick={() => {
                                if (deleteConfirmSupplierId === sup.id) {
                                  onDeleteSupplier(sup.id);
                                  setDeleteConfirmSupplierId(null);
                                } else {
                                  setDeleteConfirmSupplierId(sup.id);
                                  setTimeout(() => {
                                    setDeleteConfirmSupplierId(prev => prev === sup.id ? null : prev);
                                  }, 4000);
                                }
                              }}
                              className={`p-1.5 rounded transition-all flex items-center justify-center ${
                                deleteConfirmSupplierId === sup.id
                                  ? 'text-red-600 bg-red-50 border border-red-200 animate-pulse'
                                  : 'text-slate-400 hover:text-red-600'
                              }`}
                              title={deleteConfirmSupplierId === sup.id ? "Click again to confirm delete" : "Delete Vendor"}
                            >
                              <Trash className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-zinc-300 italic" title="Only Admin can delete suppliers">No access</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {suppliers.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-slate-400">
                        No primary vendors logged yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
