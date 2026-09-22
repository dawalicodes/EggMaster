/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'admin' | 'worker';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  password?: string; // used for backend credentials check
}

export type FlockType = 'layer' | 'broiler';

export interface Batch {
  id: string;
  name: string;
  initialCount: number;
  currentCount: number;
  dateAcquired: string; // YYYY-MM-DD
  sourceSupplierId: string; // references Supplier
  ageWeeksAtAcquisition: number; // age in weeks when acquired (for layers, e.g. 16-18)
  ageDaysAtAcquisition?: number; // age in days when acquired (for broilers, e.g. 1 day-old-chick)
  flockType?: FlockType; // 'layer' or 'broiler', default 'layer'
  breed?: string; // e.g. 'Cobb 500', 'Ross 308', 'Lohmann Brown', 'Hy-Line Silver'
  targetWeightKg?: number; // target live market weight in kg for broilers (e.g. 2.2 kg)
  targetAgeDays?: number; // target harvest age in days for broilers (e.g. 42 days)
  status: 'active' | 'depleted';
}

export interface DailyRecord {
  id: string;
  date: string; // YYYY-MM-DD
  batchId: string;
  eggsCollected: number; // for layers
  eggsBroken: number; // for layers
  eggsSpoilt: number; // for layers
  mortalityCount: number;
  mortalityCause?: string;
  feedConsumedBags: number; // e.g., 0.5 bags, 2 bags
  feedConsumedKg?: number; // feed consumed in kg
  feedTypeUsed?: string; // e.g. "Broiler Starter", "Broiler Grower", "Broiler Finisher", "Layers Mash"
  feedStockId?: string; // specific feedStock item consumed
  avgWeightKg?: number; // for broilers: sample average bird weight in kg (e.g. 0.45 kg, 1.35 kg)
  fcr?: number; // calculated Feed Conversion Ratio
  notes?: string;
  createdBy: string; // User ID or username
}

export interface FeedStock {
  id: string;
  name: string; // e.g. "Broiler Starter Crumble", "Broiler Grower", "Broiler Finisher", "Layers Premium Mash"
  quantityBags: number; // floating point quantity remaining
  unitCost: number; // price per bag
  lowStockThreshold: number; // raise alert if remaining below this limit
  supplierId: string;
  category?: 'starter' | 'grower' | 'finisher' | 'layer_mash' | 'other' | string;
  feedCategory?: 'starter' | 'grower' | 'finisher' | 'layer_mash' | 'other' | string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: 'drugs' | 'vaccines' | 'equipment' | 'other';
  quantity: number;
  unit: string; // e.g. "vials", "liters", "units"
  unitCost: number;
  lowStockThreshold: number;
}

export interface Expense {
  id: string;
  category: 'feed' | 'medication' | 'transport' | 'labor' | 'miscellaneous';
  amount: number;
  date: string; // YYYY-MM-DD
  notes?: string;
  batchId?: string; // optional association with flock batch
  supplierId?: string; // references Supplier
  paymentStatus?: 'paid' | 'unpaid' | 'partial';
  amountPaid?: number; // amount paid to supplier
}

export interface Income {
  id: string;
  source: 'egg_sales' | 'bird_sales' | 'broiler_meat_sales' | 'manure_sales' | 'other';
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  date: string; // YYYY-MM-DD
  customerId?: string; // references Customer (if on credit or logged customer)
  paymentStatus: 'paid' | 'unpaid' | 'partial';
  amountPaid: number;
  saleUnit?: 'crates' | 'birds' | 'kg' | 'bags' | 'units' | 'per_crate' | 'per_kg' | 'per_bird';
  totalWeightKg?: number; // total weight if sold by weight
  weightKg?: number; // alias for weight in kg
  batchId?: string; // optional linked flock batch
}

export interface Customer {
  id: string;
  name: string;
  contact: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact: string;
}

export interface CreditPayment {
  id: string;
  incomeId: string; // references Income
  amountPaid: number;
  date: string; // YYYY-MM-DD
  notes?: string;
}

export interface VaccinationLog {
  id: string;
  batchId: string;
  vaccineOrDrugName: string;
  dateAdministered: string; // YYYY-MM-DD
  nextDueDate?: string; // YYYY-MM-DD
  dosage: string; // e.g. "0.5ml per bird"
  notes?: string;
}

export interface FarmBackupPayload {
  batches: Batch[];
  dailyRecords: DailyRecord[];
  feedStock: FeedStock[];
  inventoryItems: InventoryItem[];
  expenses: Expense[];
  income: Income[];
  customers: Customer[];
  suppliers: Supplier[];
  creditPayments: CreditPayment[];
  vaccinationLogs: VaccinationLog[];
  users?: User[];
}
