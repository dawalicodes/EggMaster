/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FarmBackupPayload, User } from '../types';

export const API_BASE = ((import.meta as any).env?.VITE_API_URL as string) || '';

const STORAGE_KEY = 'poultry_farm_data';
const PENDING_SYNC_KEY = 'poultry_pending_sync';

// Check if we are online or can reach the API
export async function testConnection(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/data`, { method: 'HEAD', cache: 'no-cache' });
    return res.ok;
  } catch (error) {
    return false;
  }
}

// Fetch database records with offline fallback
export async function getFarmData(): Promise<{ data: FarmBackupPayload; isOffline: boolean }> {
  try {
    const res = await fetch(`${API_BASE}/api/data`);
    if (!res.ok) {
      throw new Error('API server returned error status');
    }
    const data = await res.json() as FarmBackupPayload;
    // Cache to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return { data, isOffline: false };
  } catch (error) {
    console.warn('API server unreachable, fallback to localStorage:', error);
    const localStr = localStorage.getItem(STORAGE_KEY);
    if (localStr) {
      try {
        return { data: JSON.parse(localStr) as FarmBackupPayload, isOffline: true };
      } catch (e) {
        console.error('Local JSON corrupt, reloading default empty seed', e);
      }
    }
    // Return empty state structured payloads if completely fresh and offline
    return { data: getFallbackSeeds(), isOffline: true };
  }
}

// Sync current data back to server
export async function syncFarmData(
  data: FarmBackupPayload,
  user: User | null
): Promise<{ success: boolean; message: string; isOffline: boolean }> {
  // Always update local cache as primary first
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

  try {
    const response = await fetch(`${API_BASE}/api/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data, user })
    });

    const result = await response.json();
    if (response.ok && result.status === 'success') {
      localStorage.removeItem(PENDING_SYNC_KEY);
      return { success: true, message: 'Synchronised with server successfully!', isOffline: false };
    } else {
      return {
        success: false,
        message: result.message || 'Server rejected synchronisation.',
        isOffline: false
      };
    }
  } catch (err) {
    console.warn('Could not sync with server. Changes saved locally:', err);
    localStorage.setItem(PENDING_SYNC_KEY, 'true');
    return {
      success: true,
      message: 'Network offline. Operations stored locally in device storage.',
      isOffline: true
    };
  }
}

// Manual database reset
export async function resetServerDatabase(): Promise<{ success: boolean; data: FarmBackupPayload }> {
  try {
    const res = await fetch(`${API_BASE}/api/reset`, { method: 'POST' });
    const result = await res.json();
    if (res.ok && result.status === 'success') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(result.data));
      return { success: true, data: result.data };
    }
  } catch (err) {
    console.error('Reset failed:', err);
  }
  // If reset failed/offline, overwrite localStorage with fresh local seed
  const fallback = getFallbackSeeds();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(fallback));
  return { success: true, data: fallback };
}

// Wipe database completely
export async function wipeServerDatabase(): Promise<{ success: boolean; data: FarmBackupPayload }> {
  try {
    const res = await fetch(`${API_BASE}/api/wipe`, { method: 'POST' });
    const result = await res.json();
    if (res.ok && result.status === 'success') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(result.data));
      return { success: true, data: result.data };
    }
  } catch (err) {
    console.error('Wipe failed:', err);
  }
  const empty: FarmBackupPayload = {
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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(empty));
  return { success: true, data: empty };
}

// Helper structure for initial fallbacks in pure sandbox client mode
function getFallbackSeeds(): FarmBackupPayload {
  return {
    batches: [
      {
        id: 'batch_1',
        name: 'Lohmann Brown Batch A',
        initialCount: 1000,
        currentCount: 986,
        dateAcquired: '2025-11-01',
        sourceSupplierId: 'sup_1',
        ageWeeksAtAcquisition: 18,
        status: 'active'
      }
    ],
    dailyRecords: [
      {
        id: 'record_2026-05-29_b1',
        date: '2026-05-29',
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
      { id: 'exp_1', category: 'feed', amount: 840.00, date: '2026-05-10', notes: 'Purchased 20 bags Layers Mash', batchId: '' }
    ],
    income: [
      { id: 'inc_1', source: 'egg_sales', quantity: 50, unitPrice: 7.50, totalAmount: 375.00, date: '2026-05-18', customerId: 'cust_1', paymentStatus: 'paid', amountPaid: 375.00 }
    ],
    customers: [
      { id: 'cust_1', name: 'Metro Fresh Supermarkets', contact: '+1 (555) 017-8822' }
    ],
    suppliers: [
      { id: 'sup_1', name: 'Golden Chicks Hatchery Ltd', contact: '+1 (555) 019-2831' },
      { id: 'sup_2', name: 'Vitality Feeds & Nutrition', contact: '+1 (555) 012-9844' }
    ],
    creditPayments: [
      { id: 'pmt_1', incomeId: 'inc_1', amountPaid: 375.00, date: '2026-05-18' }
    ],
    vaccinationLogs: [
      { id: 'vac_1', batchId: 'batch_1', vaccineOrDrugName: 'Newcastle G7 Vaccine', dateAdministered: '2026-05-02', nextDueDate: '2026-06-02', dosage: '0.2ml/bird via drops' }
    ]
  };
}
