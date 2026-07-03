/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import bcrypt from 'bcryptjs';

// Resolve directory name for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));

// Database file path
const DB_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DB_DIR, 'poultry_db.json');

// Helper to calculate weeks between two dates
function getWeeksDifference(dateStr1: string, dateStr2: string): number {
  const d1 = new Date(dateStr1);
  const d2 = new Date(dateStr2);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.floor(diffDays / 7);
}

// Ensure database directory and file exist with detailed realistic seed data.
function getInitialData() {
  const today = new Date();
  const formatDate = (d: Date) => d.toISOString().split('T')[0];
  const getDateOffset = (offsetDays: number) => {
    const d = new Date(today.getTime());
    d.setDate(today.getDate() + offsetDays);
    return formatDate(d);
  };

  const currentDate = formatDate(today);
  
  const suppliers = [
    { id: 'sup_1', name: 'Golden Chicks Hatchery Ltd', contact: '+1 (555) 019-2831' },
    { id: 'sup_2', name: 'Vitality Feeds & Nutrition', contact: '+1 (555) 012-9844' },
    { id: 'sup_3', name: 'Avian Vet Care Supplies', contact: '+1 (555) 014-4321' }
  ];

  const customers = [
    { id: 'cust_1', name: 'Metro Fresh Supermarkets', contact: '+1 (555) 017-8822' },
    { id: 'cust_2', name: 'Central Egg Distributors', contact: '+1 (555) 018-4933' },
    { id: 'cust_3', name: 'Organic Barn Wholesalers', contact: '+1 (555) 011-3040' }
  ];

  // Batch 1: Lohmann Brown (laying) acquired 240 days ago
  // Batch 2: Hy-Line Silver acquired 80 days ago
  const batches = [
    {
      id: 'batch_1',
      name: 'Lohmann Brown Batch A',
      initialCount: 1000,
      currentCount: 986, // 14 birds mortality over months
      dateAcquired: getDateOffset(-240),
      sourceSupplierId: 'sup_1',
      ageWeeksAtAcquisition: 18, // acquired as point of lay
      status: 'active'
    },
    {
      id: 'batch_2',
      name: 'Hy-Line Silver Batch B',
      initialCount: 800,
      currentCount: 798, // 2 birds mortality
      dateAcquired: getDateOffset(-80),
      sourceSupplierId: 'sup_1',
      ageWeeksAtAcquisition: 16,
      status: 'active'
    }
  ];

  // Seed daily records for last 15 days to populate graphs wonderfully
  const dailyRecords = [];
  
  for (let i = 0; i <= 14; i++) {
    const dateStr = getDateOffset(-14 + i);

    // Batch 1: Lohmann Brown Batch A
    // Stable high layer performance (~90% production rate)
    // Daily collection: ~880 to ~915 eggs. Broken: ~10 to ~16. Spoilt: ~2 to ~5.
    const collected1 = Math.floor(880 + Math.random() * 35);
    const broken1 = Math.floor(10 + Math.random() * 8);
    const spoilt1 = Math.floor(2 + Math.random() * 4);
    // Mortality: occasionally 1 bird
    const mort1 = Math.random() > 0.8 ? 1 : 0;
    // Feed: Consuming consistent amounts (~2.5 bags per day)
    const feed1 = 2.5;

    dailyRecords.push({
      id: `record_${dateStr}_b1`,
      date: dateStr,
      batchId: 'batch_1',
      eggsCollected: collected1,
      eggsBroken: broken1,
      eggsSpoilt: spoilt1,
      mortalityCount: mort1,
      mortalityCause: mort1 > 0 ? (Math.random() > 0.5 ? 'Heat stress' : 'Egg bound') : '',
      feedConsumedBags: feed1,
      notes: i === 7 ? 'Routine coop disinfection carried out' : '',
      createdBy: 'admin_user'
    });

    // Batch 2: Hy-Line Silver Batch B
    // Just coming into lay (production rate starts around 15% 14 days ago, and reaches 60% of 798 birds today)
    const birdCount2 = 798;
    const progressFactor = i / 14; // 0 to 1
    const targetProdRate = 0.15 + (progressFactor * 0.45); // 15% to 60%
    const collected2 = Math.floor(birdCount2 * targetProdRate + (Math.random() * 20 - 10));
    const broken2 = Math.floor(2 + Math.random() * 6);
    const spoilt2 = Math.floor(1 + Math.random() * 2);
    const mort2 = i === 4 ? 1 : i === 12 ? 1 : 0;
    const feed2 = 1.8 + (progressFactor * 0.4); // Feed consumption rises as they grow and lay more

    dailyRecords.push({
      id: `record_${dateStr}_b2`,
      date: dateStr,
      batchId: 'batch_2',
      eggsCollected: collected2,
      eggsBroken: broken2,
      eggsSpoilt: spoilt2,
      mortalityCount: mort2,
      mortalityCause: mort2 > 0 ? 'Normal culling' : '',
      feedConsumedBags: Number(feed2.toFixed(2)),
      notes: '',
      createdBy: 'worker_user'
    });
  }

  const feedStock = [
    { id: 'feed_1', name: 'Layers Premium Mash (50kg)', quantityBags: 24.5, unitCost: 42.00, lowStockThreshold: 10, supplierId: 'sup_2' },
    { id: 'feed_2', name: 'Growers Gold Mash (50kg)', quantityBags: 3.0, unitCost: 38.50, lowStockThreshold: 5, supplierId: 'sup_2' } // This triggers alert (3 < 5)
  ];

  const inventoryItems = [
    { id: 'inv_1', name: 'Plastic Egg Crates (30-egg size)', category: 'equipment', quantity: 180, unit: 'crates', unitCost: 3.50, lowStockThreshold: 50 },
    { id: 'inv_2', name: 'Newcastle Disease Vaccine (G7)', category: 'vaccines', quantity: 4, unit: 'vials', unitCost: 15.00, lowStockThreshold: 2 },
    { id: 'inv_3', name: 'Broad Spectrum Antibiotic powder', category: 'drugs', quantity: 1, unit: 'packets', unitCost: 22.00, lowStockThreshold: 3 } // Triggers alert (1 < 3)
  ];

  // Expenses: feed purchases, transport, wages
  const expenses = [
    { id: 'exp_1', category: 'feed', amount: 840.00, date: getDateOffset(-19), notes: 'Purchased 20 bags Layers Mash', batchId: '' },
    { id: 'exp_2', category: 'medication', amount: 60.00, date: getDateOffset(-17), notes: 'Newcastle vaccines + booster vitamins', batchId: 'batch_1' },
    { id: 'exp_3', category: 'labor', amount: 350.00, date: getDateOffset(-14), notes: 'Bi-weekly farm helper salary', batchId: '' },
    { id: 'exp_4', category: 'transport', amount: 75.00, date: getDateOffset(-9), notes: 'Delivery cost for egg crates and tools', batchId: '' },
    { id: 'exp_5', category: 'feed', amount: 385.00, date: getDateOffset(-5), notes: '10 bags growers mash', batchId: 'batch_2' }
  ];

  // Income: Egg sales, sales of laying-exhausted birds or manure
  const income = [
    { id: 'inc_1', source: 'egg_sales', quantity: 50, unitPrice: 7.50, totalAmount: 375.00, date: getDateOffset(-11), customerId: 'cust_1', paymentStatus: 'paid', amountPaid: 375.00 },
    { id: 'inc_2', source: 'egg_sales', quantity: 120, unitPrice: 7.20, totalAmount: 864.00, date: getDateOffset(-7), customerId: 'cust_2', paymentStatus: 'partial', amountPaid: 500.00 }, // Owed $364
    { id: 'inc_3', source: 'manure_sales', quantity: 30, unitPrice: 5.00, totalAmount: 150.00, date: getDateOffset(-4), customerId: 'cust_3', paymentStatus: 'paid', amountPaid: 150.00 },
    { id: 'inc_4', source: 'egg_sales', quantity: 80, unitPrice: 7.50, totalAmount: 600.00, date: getDateOffset(-1), customerId: 'cust_1', paymentStatus: 'unpaid', amountPaid: 0.00 } // Owed $600
  ];

  const creditPayments = [
    { id: 'pmt_1', incomeId: 'inc_2', amountPaid: 500.00, date: getDateOffset(-7), notes: 'First instalment for wholesale egg order' }
  ];

  const vaccinationLogs = [
    { id: 'vac_1', batchId: 'batch_1', vaccineOrDrugName: 'Newcastle G7 Vaccine', dateAdministered: getDateOffset(-27), nextDueDate: getDateOffset(3), dosage: '0.2ml/bird via drops', notes: 'Administered under Vet guidance' },
    { id: 'vac_2', batchId: 'batch_2', vaccineOrDrugName: 'Gumboro Booster vaccine', dateAdministered: getDateOffset(-11), nextDueDate: getDateOffset(19), dosage: 'Water dilution', notes: 'All birds vaccinated successfully' }
  ];

  const users = [
    { id: 'admin_user', username: 'vinci', name: 'Farm Manager', role: 'admin', password: bcrypt.hashSync('admin123', 10) },
    { id: 'worker_user', username: 'worker', name: 'Farm Caretaker Worker', role: 'worker', password: bcrypt.hashSync('worker123', 10) }
  ];

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
    vaccinationLogs,
    users
  };
}

// Initialise DB file if it doesn't exist
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

if (!fs.existsSync(DB_PATH)) {
  fs.writeFileSync(DB_PATH, JSON.stringify(getInitialData(), null, 2));
}

function isBCryptHash(str: string): boolean {
  return /^\$2[ayb]\$.{56}$/.test(str);
}

// Read database
function readDb() {
  try {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    const parsed = JSON.parse(data);
    let changed = false;

    if (!parsed.users) {
      parsed.users = [
        { id: 'admin_user', username: 'vinci', name: 'Farm Manager', role: 'admin', password: bcrypt.hashSync('admin123', 10) },
        { id: 'worker_user', username: 'worker', name: 'Farm Caretaker Worker', role: 'worker', password: bcrypt.hashSync('worker123', 10) }
      ];
      changed = true;
    } else {
      // Migrate any plaintext passwords to hashed
      parsed.users.forEach((u: any) => {
        if (u.password && !isBCryptHash(u.password)) {
          u.password = bcrypt.hashSync(u.password, 10);
          changed = true;
        }
      });
    }

    if (changed) {
      fs.writeFileSync(DB_PATH, JSON.stringify(parsed, null, 2));
    }
    return parsed;
  } catch (error) {
    console.error('Error reading DB, resetting to seed data:', error);
    const initial = getInitialData();
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2));
    return initial;
  }
}

// Write database
function writeDb(data: any) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// Run initial migration/check on startup
readDb();

// Login API Endpoint
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const db = readDb();
  
  const user = db.users.find((u: any) => u.username.toLowerCase() === username.toLowerCase());
  if (user && bcrypt.compareSync(password, user.password)) {
    const { password: _, ...userWithoutPassword } = user;
    return res.json({
      status: 'success',
      user: userWithoutPassword
    });
  }
  
  return res.status(401).json({ status: 'error', message: 'Invalid credentials.' });
});

// Get Database State
app.get('/api/data', (req, res) => {
  res.json(readDb());
});

// Full state synchronization (receives full local backup or updates merge)
app.post('/api/sync', (req, res) => {
  const { data, user } = req.body;
  if (!data) {
    return res.status(400).json({ status: 'error', message: 'No payload data provided' });
  }

  // If worker, check if trying to manipulate or delete critical finances
  const currentDb = readDb();
  if (user && user.role === 'worker') {
    // Basic audit: prevent deletion or alteration of historical financial items.
    // For safety, let workers insert logs but block deleting records.
    if (data.expenses.length < currentDb.expenses.length || data.income.length < currentDb.income.length) {
      return res.status(403).json({
        status: 'error',
        message: 'Permission denied: Workers cannot delete or modify historical financial records.'
      });
    }
  }

  writeDb(data);
  res.json({ status: 'success', message: 'Database successfully synchronised.' });
});

// Manual database reset
app.post('/api/reset', (req, res) => {
  const db = readDb();
  const initial = getInitialData() as any;
  if (db.users) {
    initial.users = db.users;
  }
  writeDb(initial);
  res.json({ status: 'success', message: 'Database reset to default seed values.', data: initial });
});

// Wipe database completely to start fresh
app.post('/api/wipe', (req, res) => {
  const db = readDb();
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
    vaccinationLogs: [],
    users: db.users || []
  };
  writeDb(emptyData);
  res.json({ status: 'success', message: 'Database cleared completely.', data: emptyData });
});

// Users CRUD Operations
app.get('/api/users', (req, res) => {
  const db = readDb();
  res.json(db.users || []);
});

app.post('/api/users', (req, res) => {
  const { name, username, password, role } = req.body;
  if (!name || !username || !password || !role) {
    return res.status(400).json({ status: 'error', message: 'All fields are required.' });
  }

  const db = readDb();
  if (!db.users) db.users = [];

  const existing = db.users.find((u: any) => u.username.toLowerCase() === username.toLowerCase());
  if (existing) {
    return res.status(400).json({ status: 'error', message: `Username "${username}" is already taken.` });
  }

  const newUser = {
    id: 'user_' + Math.random().toString(36).substring(2, 11),
    name,
    username,
    password: bcrypt.hashSync(password, 10),
    role
  };

  db.users.push(newUser);
  writeDb(db);

  res.json({ status: 'success', message: 'User profile created successfully.', user: newUser });
});

app.put('/api/users/:id', (req, res) => {
  const { id } = req.params;
  const { name, username, password, role, requesterId } = req.body;

  const db = readDb();
  if (!db.users) db.users = [];

  const targetUserIndex = db.users.findIndex((u: any) => u.id === id);
  if (targetUserIndex === -1) {
    return res.status(404).json({ status: 'error', message: 'User not found.' });
  }

  const targetUser = db.users[targetUserIndex];

  // Resolve requester
  const reqId = requesterId || req.query?.requesterId || req.headers['x-requester-id'];
  const requester = db.users.find((u: any) => u.id === reqId);
  if (!requester) {
    return res.status(403).json({ status: 'error', message: 'Unauthorized. Requester credentials are required to update a user.' });
  }

  const isSelf = targetUser.id === requester.id;
  const isSuperAdmin = requester.username.toLowerCase() === 'vinci';
  const isTargetSuperAdmin = targetUser.username.toLowerCase() === 'vinci';
  const isTargetAdmin = targetUser.role === 'admin';

  if (!isSelf && !isSuperAdmin) {
    if (requester.role !== 'admin') {
      return res.status(403).json({ status: 'error', message: 'Permission denied: Workers can only update their own profiles.' });
    }
    if (isTargetSuperAdmin) {
      return res.status(403).json({ status: 'error', message: 'Permission denied: Only the super admin (Farm Manager "vinci") can edit the super admin account.' });
    }
    if (isTargetAdmin) {
      return res.status(403).json({ status: 'error', message: 'Permission denied: Only the super admin (Farm Manager "vinci") can edit other administrator accounts.' });
    }
  }

  if (isTargetSuperAdmin) {
    if (username && username.toLowerCase() !== 'vinci') {
      return res.status(400).json({ status: 'error', message: 'The super admin username must remain "vinci".' });
    }
    if (role && role !== 'admin') {
      return res.status(400).json({ status: 'error', message: 'The super admin role cannot be changed.' });
    }
  }

  if (username && username.toLowerCase() !== targetUser.username.toLowerCase()) {
    const existing = db.users.find((u: any) => u.username.toLowerCase() === username.toLowerCase() && u.id !== id);
    if (existing) {
      return res.status(400).json({ status: 'error', message: `Username "${username}" is already taken.` });
    }
  }

  if (name) db.users[targetUserIndex].name = name;
  if (username) db.users[targetUserIndex].username = username;
  if (password) db.users[targetUserIndex].password = bcrypt.hashSync(password, 10);
  if (role) {
    if (db.users[targetUserIndex].role === 'admin' && role === 'worker') {
      const adminsCount = db.users.filter((u: any) => u.role === 'admin').length;
      if (adminsCount <= 1) {
        return res.status(400).json({ status: 'error', message: 'Cannot demote the only remaining Administrator.' });
      }
    }
    db.users[targetUserIndex].role = role;
  }

  writeDb(db);
  res.json({ status: 'success', message: 'User updated successfully.', user: db.users[targetUserIndex] });
});

app.delete('/api/users/:id', (req, res) => {
  const { id } = req.params;
  const requesterId = req.body?.requesterId || req.query?.requesterId || req.headers['x-requester-id'];
  const db = readDb();
  if (!db.users) db.users = [];

  const targetUser = db.users.find((u: any) => u.id === id);
  if (!targetUser) {
    return res.status(404).json({ status: 'error', message: 'User not found.' });
  }

  const requester = db.users.find((u: any) => u.id === requesterId);
  if (!requester) {
    return res.status(403).json({ status: 'error', message: 'Unauthorized. Requester credentials are required to delete a user profile.' });
  }

  if (targetUser.username.toLowerCase() === 'vinci') {
    return res.status(400).json({ status: 'error', message: 'The Farm Manager super admin account ("vinci") cannot be deleted.' });
  }

  if (targetUser.role === 'admin') {
    if (requester.username.toLowerCase() !== 'vinci') {
      return res.status(403).json({ status: 'error', message: 'Permission denied: Only the super admin (Farm Manager "vinci") can delete other administrators.' });
    }
    const adminsCount = db.users.filter((u: any) => u.role === 'admin').length;
    if (adminsCount <= 1) {
      return res.status(400).json({ status: 'error', message: 'Cannot delete the only remaining Administrator.' });
    }
  }

  if (targetUser.role === 'worker') {
    if (requester.role !== 'admin') {
      return res.status(403).json({ status: 'error', message: 'Permission denied: Only administrators can delete worker accounts.' });
    }
  }

  if (targetUser.id === requester.id) {
    return res.status(400).json({ status: 'error', message: 'You cannot delete your own logged-in user account.' });
  }

  db.users = db.users.filter((u: any) => u.id !== id);
  writeDb(db);
  res.json({ status: 'success', message: 'User profile deleted.' });
});

// Firewall-friendly alternative to DELETE verb
app.post('/api/users/:id/delete', (req, res) => {
  const { id } = req.params;
  const requesterId = req.body?.requesterId || req.query?.requesterId || req.headers['x-requester-id'];
  const db = readDb();
  if (!db.users) db.users = [];

  const targetUser = db.users.find((u: any) => u.id === id);
  if (!targetUser) {
    return res.status(404).json({ status: 'error', message: 'User not found.' });
  }

  const requester = db.users.find((u: any) => u.id === requesterId);
  if (!requester) {
    return res.status(403).json({ status: 'error', message: 'Unauthorized. Requester credentials are required to delete a user profile.' });
  }

  if (targetUser.username.toLowerCase() === 'vinci') {
    return res.status(400).json({ status: 'error', message: 'The Farm Manager super admin account ("vinci") cannot be deleted.' });
  }

  if (targetUser.role === 'admin') {
    if (requester.username.toLowerCase() !== 'vinci') {
      return res.status(403).json({ status: 'error', message: 'Permission denied: Only the super admin (Farm Manager "vinci") can delete other administrators.' });
    }
    const adminsCount = db.users.filter((u: any) => u.role === 'admin').length;
    if (adminsCount <= 1) {
      return res.status(400).json({ status: 'error', message: 'Cannot delete the only remaining Administrator.' });
    }
  }

  if (targetUser.role === 'worker') {
    if (requester.role !== 'admin') {
      return res.status(403).json({ status: 'error', message: 'Permission denied: Only administrators can delete worker accounts.' });
    }
  }

  if (targetUser.id === requester.id) {
    return res.status(400).json({ status: 'error', message: 'You cannot delete your own logged-in user account.' });
  }

  db.users = db.users.filter((u: any) => u.id !== id);
  writeDb(db);
  res.json({ status: 'success', message: 'User profile deleted.' });
});

// Vite server setup for development & static fallback for production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Poultry Farm System server booted at http://0.0.0.0:${PORT}`);
  });
}

startServer();
