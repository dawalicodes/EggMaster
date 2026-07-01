-- EggMaster Pro - Relational Database Schema for Cloudflare D1 (SQLite)

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL
);

-- 2. Suppliers Table
CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contact TEXT
);

-- 3. Customers Table
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contact TEXT
);

-- 4. Batches Table
CREATE TABLE IF NOT EXISTS batches (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  initialCount INTEGER NOT NULL,
  currentCount INTEGER NOT NULL,
  dateAcquired TEXT NOT NULL,
  sourceSupplierId TEXT,
  ageWeeksAtAcquisition INTEGER NOT NULL,
  status TEXT NOT NULL,
  FOREIGN KEY (sourceSupplierId) REFERENCES suppliers(id)
);

-- 5. Daily Records Table
CREATE TABLE IF NOT EXISTS dailyRecords (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  batchId TEXT NOT NULL,
  eggsCollected INTEGER NOT NULL,
  eggsBroken INTEGER NOT NULL,
  eggsSpoilt INTEGER NOT NULL,
  mortalityCount INTEGER NOT NULL,
  mortalityCause TEXT,
  feedConsumedBags REAL NOT NULL,
  notes TEXT,
  createdBy TEXT,
  FOREIGN KEY (batchId) REFERENCES batches(id),
  FOREIGN KEY (createdBy) REFERENCES users(id)
);

-- 6. Feed Stock Table
CREATE TABLE IF NOT EXISTS feedStock (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  quantityBags REAL NOT NULL,
  unitCost REAL NOT NULL,
  lowStockThreshold REAL NOT NULL,
  supplierId TEXT,
  FOREIGN KEY (supplierId) REFERENCES suppliers(id)
);

-- 7. Inventory Items Table
CREATE TABLE IF NOT EXISTS inventoryItems (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  quantity REAL NOT NULL,
  unit TEXT NOT NULL,
  unitCost REAL NOT NULL,
  lowStockThreshold REAL NOT NULL
);

-- 8. Expenses Table
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  amount REAL NOT NULL,
  date TEXT NOT NULL,
  notes TEXT,
  batchId TEXT,
  FOREIGN KEY (batchId) REFERENCES batches(id)
);

-- 9. Income Table
CREATE TABLE IF NOT EXISTS income (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  quantity REAL NOT NULL,
  unitPrice REAL NOT NULL,
  totalAmount REAL NOT NULL,
  date TEXT NOT NULL,
  customerId TEXT,
  paymentStatus TEXT NOT NULL,
  amountPaid REAL NOT NULL,
  FOREIGN KEY (customerId) REFERENCES customers(id)
);

-- 10. Credit Payments Table
CREATE TABLE IF NOT EXISTS creditPayments (
  id TEXT PRIMARY KEY,
  incomeId TEXT NOT NULL,
  amountPaid REAL NOT NULL,
  date TEXT NOT NULL,
  notes TEXT,
  FOREIGN KEY (incomeId) REFERENCES income(id)
);

-- 11. Vaccination Logs Table
CREATE TABLE IF NOT EXISTS vaccinationLogs (
  id TEXT PRIMARY KEY,
  batchId TEXT NOT NULL,
  vaccineOrDrugName TEXT NOT NULL,
  dateAdministered TEXT NOT NULL,
  nextDueDate TEXT,
  dosage TEXT,
  notes TEXT,
  FOREIGN KEY (batchId) REFERENCES batches(id)
);
