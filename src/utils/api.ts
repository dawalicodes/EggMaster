/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FarmBackupPayload, User } from '../types';

// @ts-ignore
let rawApiUrl = (import.meta.env?.VITE_API_URL as string) || '';
if (rawApiUrl.endsWith('/')) {
  rawApiUrl = rawApiUrl.slice(0, -1);
}
export const API_BASE = rawApiUrl;
export const IS_USING_WORKER = !!rawApiUrl;
export const IS_PRODUCTION_PAGES = typeof window !== 'undefined' && window.location.hostname.endsWith('pages.dev');

// Fetch database records from cloud
export async function getFarmData(): Promise<{ data: FarmBackupPayload }> {
  const res = await fetch(`${API_BASE}/api/data`);
  if (!res.ok) {
    throw new Error(`API server returned error status: ${res.status}`);
  }
  const data = await res.json() as FarmBackupPayload;
  return { data };
}

// Sync current data back to server
export async function syncFarmData(
  data: FarmBackupPayload,
  user: User | null
): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE}/api/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data, user })
  });

  if (!response.ok) {
    throw new Error(`Network response was not ok during synchronization (status: ${response.status}).`);
  }

  const result = await response.json();
  if (result.status === 'success') {
    return { success: true, message: 'Synchronised with server successfully!' };
  } else {
    return {
      success: false,
      message: result.message || 'Server rejected synchronisation.'
    };
  }
}

// Manual database reset
export async function resetServerDatabase(): Promise<{ success: boolean; data: FarmBackupPayload }> {
  const res = await fetch(`${API_BASE}/api/reset`, { method: 'POST' });
  if (!res.ok) {
    throw new Error(`Reset request failed on server (status: ${res.status})`);
  }
  const result = await res.json();
  if (result.status === 'success') {
    return { success: true, data: result.data };
  }
  throw new Error(result.message || 'Reset failed');
}

// Wipe database completely
export async function wipeServerDatabase(): Promise<{ success: boolean; data: FarmBackupPayload }> {
  const emptyData = {
    batches: [],
    dailyRecords: [],
    feedStock: [],
    inventoryItems: [],
    expenses: [],
    income: [],
    customers: [],
    suppliers: [],
    creditPayments: [],
    vaccinationLogs: []
  };

  const res = await fetch(`${API_BASE}/api/wipe`, { method: 'POST' });
  if (!res.ok) {
    throw new Error(`Wipe request failed on server (status: ${res.status})`);
  }
  const result = await res.json();
  if (result.status === 'success') {
    return { success: true, data: result.data || emptyData };
  }
  throw new Error(result.message || 'Wipe failed');
}

// Helper structure for initial fallbacks in pure sandbox client mode
function getFallbackSeeds(): FarmBackupPayload {
  const today = new Date();
  const formatDate = (d: Date) => d.toISOString().split('T')[0];
  const getDateOffset = (offsetDays: number) => {
    const d = new Date(today.getTime());
    d.setDate(today.getDate() + offsetDays);
    return formatDate(d);
  };

  return {
    batches: [
      {
        id: 'batch_1',
        name: 'Lohmann Brown Batch A',
        initialCount: 1000,
        currentCount: 986,
        dateAcquired: getDateOffset(-240),
        sourceSupplierId: 'sup_1',
        ageWeeksAtAcquisition: 18,
        status: 'active'
      }
    ],
    dailyRecords: [
      {
        id: `record_${getDateOffset(0)}_b1`,
        date: getDateOffset(0),
        batchId: 'batch_1',
        eggsCollected: 890,
        eggsBroken: 12,
        eggsSpoilt: 3,
        mortalityCount: 0,
        feedConsumedBags: 2.5,
        createdBy: 'admin'
      }
    ],
    feedStock: [
      { id: 'feed_1', name: 'Layers Premium Mash (50kg)', quantityBags: 24.5, unitCost: 42.00, lowStockThreshold: 10, supplierId: 'sup_2' }
    ],
    inventoryItems: [
      { id: 'inv_1', name: 'Plastic Egg Crates (30-egg size)', category: 'equipment', quantity: 180, unit: 'crates', unitCost: 3.50, lowStockThreshold: 50 }
    ],
    expenses: [
      { id: 'exp_1', category: 'feed', amount: 840.00, date: getDateOffset(-19), notes: 'Purchased 20 bags Layers Mash', batchId: '' }
    ],
    income: [
      { id: 'inc_1', source: 'egg_sales', quantity: 50, unitPrice: 7.50, totalAmount: 375.00, date: getDateOffset(-11), customerId: 'cust_1', paymentStatus: 'paid', amountPaid: 375.00 }
    ],
    customers: [
      { id: 'cust_1', name: 'Metro Fresh Supermarkets', contact: '+1 (555) 017-8822' }
    ],
    suppliers: [
      { id: 'sup_1', name: 'Golden Chicks Hatchery Ltd', contact: '+1 (555) 019-2831' },
      { id: 'sup_2', name: 'Vitality Feeds & Nutrition', contact: '+1 (555) 012-9844' }
    ],
    creditPayments: [
      { id: 'pmt_1', incomeId: 'inc_1', amountPaid: 375.00, date: getDateOffset(-11) }
    ],
    vaccinationLogs: [
      { id: 'vac_1', batchId: 'batch_1', vaccineOrDrugName: 'Newcastle G7 Vaccine', dateAdministered: getDateOffset(-27), nextDueDate: getDateOffset(3), dosage: '0.2ml/bird via drops' }
    ]
  };
}
