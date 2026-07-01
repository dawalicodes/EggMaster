import { Hono } from 'hono';
import { cors } from 'hono/cors';

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

// Enable CORS middleware
app.use('*', cors({
  origin: '*',
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  maxAge: 86400,
}));

// --- DATABASE HELPER SEED DATA ---
const INITIAL_USERS = [
  { id: 'admin_user', username: 'admin', name: 'Farm Manager Admin', role: 'admin', password: 'admin123' },
  { id: 'worker_user', username: 'worker', name: 'Farm Caretaker Worker', role: 'worker', password: 'worker123' }
];

const INITIAL_SUPPLIERS = [
  { id: 'sup_1', name: 'Golden Chicks Hatchery Ltd', contact: '+1 (555) 019-2831' },
  { id: 'sup_2', name: 'Vitality Feeds & Nutrition', contact: '+1 (555) 012-9844' },
  { id: 'sup_3', name: 'Avian Vet Care Supplies', contact: '+1 (555) 014-4321' }
];

const INITIAL_CUSTOMERS = [
  { id: 'cust_1', name: 'Metro Fresh Supermarkets', contact: '+1 (555) 017-8822' },
  { id: 'cust_2', name: 'Central Egg Distributors', contact: '+1 (555) 018-4933' },
  { id: 'cust_3', name: 'Organic Barn Wholesalers', contact: '+1 (555) 011-3040' }
];

const INITIAL_BATCHES = [
  {
    id: 'batch_1',
    name: 'Lohmann Brown Batch A',
    initialCount: 1000,
    currentCount: 986,
    dateAcquired: '2025-11-01',
    sourceSupplierId: 'sup_1',
    ageWeeksAtAcquisition: 18,
    status: 'active'
  },
  {
    id: 'batch_2',
    name: 'Hy-Line Silver Batch B',
    initialCount: 800,
    currentCount: 798,
    dateAcquired: '2026-04-10',
    sourceSupplierId: 'sup_1',
    ageWeeksAtAcquisition: 16,
    status: 'active'
  }
];

const INITIAL_DAILY_RECORDS = [
  {
    id: 'record_2026-05-15_b1',
    date: '2026-05-15',
    batchId: 'batch_1',
    eggsCollected: 890,
    eggsBroken: 12,
    eggsSpoilt: 3,
    mortalityCount: 0,
    mortalityCause: '',
    feedConsumedBags: 2.50,
    notes: 'Routine coop disinfection carried out',
    createdBy: 'admin_user'
  },
  {
    id: 'record_2026-05-15_b2',
    date: '2026-05-15',
    batchId: 'batch_2',
    eggsCollected: 120,
    eggsBroken: 4,
    eggsSpoilt: 1,
    mortalityCount: 1,
    mortalityCause: 'Normal culling',
    feedConsumedBags: 1.80,
    notes: '',
    createdBy: 'worker_user'
  }
];

const INITIAL_FEED_STOCK = [
  { id: 'feed_1', name: 'Layers Premium Mash (50kg)', quantityBags: 24.5, unitCost: 42.00, lowStockThreshold: 10, supplierId: 'sup_2' },
  { id: 'feed_2', name: 'Growers Gold Mash (50kg)', quantityBags: 3.0, unitCost: 38.50, lowStockThreshold: 5, supplierId: 'sup_2' }
];

const INITIAL_INVENTORY_ITEMS = [
  { id: 'inv_1', name: 'Plastic Egg Crates (30-egg size)', category: 'equipment', quantity: 180, unit: 'crates', unitCost: 3.50, lowStockThreshold: 50 },
  { id: 'inv_2', name: 'Newcastle Disease Vaccine (G7)', category: 'vaccines', quantity: 4, unit: 'vials', unitCost: 15.00, lowStockThreshold: 2 },
  { id: 'inv_3', name: 'Broad Spectrum Antibiotic powder', category: 'drugs', quantity: 1, unit: 'packets', unitCost: 22.00, lowStockThreshold: 3 }
];

const INITIAL_EXPENSES = [
  { id: 'exp_1', category: 'feed', amount: 840.00, date: '2026-05-10', notes: 'Purchased 20 bags Layers Mash', batchId: '' },
  { id: 'exp_2', category: 'medication', amount: 60.00, date: '2026-05-12', notes: 'Newcastle vaccines + booster vitamins', batchId: 'batch_1' },
  { id: 'exp_3', category: 'labor', amount: 350.00, date: '2026-05-15', notes: 'Bi-weekly farm helper salary', batchId: '' }
];

const INITIAL_INCOME = [
  { id: 'inc_1', source: 'egg_sales', quantity: 50, unitPrice: 7.50, totalAmount: 375.00, date: '2026-05-18', customerId: 'cust_1', paymentStatus: 'paid', amountPaid: 375.00 },
  { id: 'inc_2', source: 'egg_sales', quantity: 120, unitPrice: 7.20, totalAmount: 864.00, date: '2026-05-22', customerId: 'cust_2', paymentStatus: 'partial', amountPaid: 500.00 }
];

const INITIAL_CREDIT_PAYMENTS = [
  { id: 'pmt_1', incomeId: 'inc_2', amountPaid: 500.00, date: '2026-05-22', notes: 'First instalment for wholesale egg order' }
];

const INITIAL_VACCINATION_LOGS = [
  { id: 'vac_1', batchId: 'batch_1', vaccineOrDrugName: 'Newcastle G7 Vaccine', dateAdministered: '2026-05-02', nextDueDate: '2026-06-02', dosage: '0.2ml/bird via drops', notes: 'Administered under Vet guidance' }
];

// Helper to seed database if empty
async function seedDatabaseIfEmpty(db: D1Database): Promise<void> {
  const usersCheck = await db.prepare("SELECT count(*) as count FROM users").first<{ count: number }>();
  if (usersCheck && usersCheck.count > 0) {
    return; // Already seeded
  }

  // Seed everything transactionally via batching
  const batchStatements: D1PreparedStatement[] = [];

  INITIAL_USERS.forEach(u => batchStatements.push(db.prepare("INSERT INTO users (id, username, password, name, role) VALUES (?, ?, ?, ?, ?)") .bind(u.id, u.username, u.password, u.name, u.role)));
  INITIAL_SUPPLIERS.forEach(s => batchStatements.push(db.prepare("INSERT INTO suppliers (id, name, contact) VALUES (?, ?, ?)") .bind(s.id, s.name, s.contact)));
  INITIAL_CUSTOMERS.forEach(c => batchStatements.push(db.prepare("INSERT INTO customers (id, name, contact) VALUES (?, ?, ?)") .bind(c.id, c.name, c.contact)));
  INITIAL_BATCHES.forEach(b => batchStatements.push(db.prepare("INSERT INTO batches (id, name, initialCount, currentCount, dateAcquired, sourceSupplierId, ageWeeksAtAcquisition, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)") .bind(b.id, b.name, b.initialCount, b.currentCount, b.dateAcquired, b.sourceSupplierId, b.ageWeeksAtAcquisition, b.status)));
  INITIAL_DAILY_RECORDS.forEach(r => batchStatements.push(db.prepare("INSERT INTO dailyRecords (id, date, batchId, eggsCollected, eggsBroken, eggsSpoilt, mortalityCount, mortalityCause, feedConsumedBags, notes, createdBy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)") .bind(r.id, r.date, r.batchId, r.eggsCollected, r.eggsBroken, r.eggsSpoilt, r.mortalityCount, r.mortalityCause, r.feedConsumedBags, r.notes, r.createdBy)));
  INITIAL_FEED_STOCK.forEach(f => batchStatements.push(db.prepare("INSERT INTO feedStock (id, name, quantityBags, unitCost, lowStockThreshold, supplierId) VALUES (?, ?, ?, ?, ?, ?)") .bind(f.id, f.name, f.quantityBags, f.unitCost, f.lowStockThreshold, f.supplierId)));
  INITIAL_INVENTORY_ITEMS.forEach(i => batchStatements.push(db.prepare("INSERT INTO inventoryItems (id, name, category, quantity, unit, unitCost, lowStockThreshold) VALUES (?, ?, ?, ?, ?, ?, ?)") .bind(i.id, i.name, i.category, i.quantity, i.unit, i.unitCost, i.lowStockThreshold)));
  INITIAL_EXPENSES.forEach(e => batchStatements.push(db.prepare("INSERT INTO expenses (id, category, amount, date, notes, batchId) VALUES (?, ?, ?, ?, ?, ?)") .bind(e.id, e.category, e.amount, e.date, e.notes, e.batchId)));
  INITIAL_INCOME.forEach(i => batchStatements.push(db.prepare("INSERT INTO income (id, source, quantity, unitPrice, totalAmount, date, customerId, paymentStatus, amountPaid) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)") .bind(i.id, i.source, i.quantity, i.unitPrice, i.totalAmount, i.date, i.customerId, i.paymentStatus, i.amountPaid)));
  INITIAL_CREDIT_PAYMENTS.forEach(p => batchStatements.push(db.prepare("INSERT INTO creditPayments (id, incomeId, amountPaid, date, notes) VALUES (?, ?, ?, ?, ?)") .bind(p.id, p.incomeId, p.amountPaid, p.date, p.notes)));
  INITIAL_VACCINATION_LOGS.forEach(v => batchStatements.push(db.prepare("INSERT INTO vaccinationLogs (id, batchId, vaccineOrDrugName, dateAdministered, nextDueDate, dosage, notes) VALUES (?, ?, ?, ?, ?, ?, ?)") .bind(v.id, v.batchId, v.vaccineOrDrugName, v.dateAdministered, v.nextDueDate, v.dosage, v.notes)));

  await db.batch(batchStatements);
}

// Ensure database has initial seed tables populated
app.use('*', async (c, next) => {
  await seedDatabaseIfEmpty(c.env.DB);
  await next();
});

// --- AUTHENTICATION ENDPOINT ---
app.post('/api/login', async (c) => {
  const { username, password } = await c.req.json() as any;
  const user = await c.env.DB.prepare("SELECT * FROM users WHERE username = ? AND password = ?").bind(username, password).first<any>();
  if (user) {
    const { password: _, ...userWithoutPassword } = user;
    return c.json({
      status: 'success',
      user: userWithoutPassword
    });
  }
  return c.json({ status: 'error', message: 'Invalid credentials.' }, 401);
});

// --- BACKWARD COMPATIBILITY: GET FULL DATABASE TREE (For Web React Client) ---
app.get('/api/data', async (c) => {
  const [
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
  ] = await Promise.all([
    c.env.DB.prepare("SELECT * FROM batches").all().then(r => r.results),
    c.env.DB.prepare("SELECT * FROM dailyRecords").all().then(r => r.results),
    c.env.DB.prepare("SELECT * FROM feedStock").all().then(r => r.results),
    c.env.DB.prepare("SELECT * FROM inventoryItems").all().then(r => r.results),
    c.env.DB.prepare("SELECT * FROM expenses").all().then(r => r.results),
    c.env.DB.prepare("SELECT * FROM income").all().then(r => r.results),
    c.env.DB.prepare("SELECT * FROM customers").all().then(r => r.results),
    c.env.DB.prepare("SELECT * FROM suppliers").all().then(r => r.results),
    c.env.DB.prepare("SELECT * FROM creditPayments").all().then(r => r.results),
    c.env.DB.prepare("SELECT * FROM vaccinationLogs").all().then(r => r.results),
    c.env.DB.prepare("SELECT id, username, name, role FROM users").all().then(r => r.results),
  ]);

  return c.json({
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
  });
});

// --- BACKWARD COMPATIBILITY: BULK SYNC (For Web React Client) ---
app.post('/api/sync', async (c) => {
  const { data, user } = await c.req.json() as any;
  if (!data) {
    return c.json({ status: 'error', message: 'No payload data provided' }, 400);
  }

  // Permission Checks for Worker role
  if (user && user.role === 'worker') {
    const expensesCount = await c.env.DB.prepare("SELECT count(*) as count FROM expenses").first<{ count: number }>();
    const incomeCount = await c.env.DB.prepare("SELECT count(*) as count FROM income").first<{ count: number }>();
    if (data.expenses.length < (expensesCount?.count || 0) || data.income.length < (incomeCount?.count || 0)) {
      return c.json({ 
        status: 'error', 
        message: 'Permission denied: Workers cannot delete or modify historical financial records.' 
      }, 403);
    }
  }

  const db = c.env.DB;
  const batchOps: D1PreparedStatement[] = [];

  // Transactionally wipe and overwrite D1 tables during React application sync
  batchOps.push(db.prepare("DELETE FROM batches"));
  batchOps.push(db.prepare("DELETE FROM dailyRecords"));
  batchOps.push(db.prepare("DELETE FROM feedStock"));
  batchOps.push(db.prepare("DELETE FROM inventoryItems"));
  batchOps.push(db.prepare("DELETE FROM expenses"));
  batchOps.push(db.prepare("DELETE FROM income"));
  batchOps.push(db.prepare("DELETE FROM customers"));
  batchOps.push(db.prepare("DELETE FROM suppliers"));
  batchOps.push(db.prepare("DELETE FROM creditPayments"));
  batchOps.push(db.prepare("DELETE FROM vaccinationLogs"));

  data.suppliers?.forEach((s: any) => batchOps.push(db.prepare("INSERT INTO suppliers (id, name, contact) VALUES (?, ?, ?)") .bind(s.id, s.name, s.contact)));
  data.customers?.forEach((cust: any) => batchOps.push(db.prepare("INSERT INTO customers (id, name, contact) VALUES (?, ?, ?)") .bind(cust.id, cust.name, cust.contact)));
  data.batches?.forEach((b: any) => batchOps.push(db.prepare("INSERT INTO batches (id, name, initialCount, currentCount, dateAcquired, sourceSupplierId, ageWeeksAtAcquisition, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)") .bind(b.id, b.name, b.initialCount, b.currentCount, b.dateAcquired, b.sourceSupplierId, b.ageWeeksAtAcquisition, b.status)));
  data.dailyRecords?.forEach((r: any) => batchOps.push(db.prepare("INSERT INTO dailyRecords (id, date, batchId, eggsCollected, eggsBroken, eggsSpoilt, mortalityCount, mortalityCause, feedConsumedBags, notes, createdBy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)") .bind(r.id, r.date, r.batchId, r.eggsCollected, r.eggsBroken, r.eggsSpoilt, r.mortalityCount, r.mortalityCause, r.feedConsumedBags, r.notes, r.createdBy)));
  data.feedStock?.forEach((f: any) => batchOps.push(db.prepare("INSERT INTO feedStock (id, name, quantityBags, unitCost, lowStockThreshold, supplierId) VALUES (?, ?, ?, ?, ?, ?)") .bind(f.id, f.name, f.quantityBags, f.unitCost, f.lowStockThreshold, f.supplierId)));
  data.inventoryItems?.forEach((i: any) => batchOps.push(db.prepare("INSERT INTO inventoryItems (id, name, category, quantity, unit, unitCost, lowStockThreshold) VALUES (?, ?, ?, ?, ?, ?, ?)") .bind(i.id, i.name, i.category, i.quantity, i.unit, i.unitCost, i.lowStockThreshold)));
  data.expenses?.forEach((e: any) => batchOps.push(db.prepare("INSERT INTO expenses (id, category, amount, date, notes, batchId) VALUES (?, ?, ?, ?, ?, ?)") .bind(e.id, e.category, e.amount, e.date, e.notes, e.batchId)));
  data.income?.forEach((inc: any) => batchOps.push(db.prepare("INSERT INTO income (id, source, quantity, unitPrice, totalAmount, date, customerId, paymentStatus, amountPaid) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)") .bind(inc.id, inc.source, inc.quantity, inc.unitPrice, inc.totalAmount, inc.date, inc.customerId, inc.paymentStatus, inc.amountPaid)));
  data.creditPayments?.forEach((p: any) => batchOps.push(db.prepare("INSERT INTO creditPayments (id, incomeId, amountPaid, date, notes) VALUES (?, ?, ?, ?, ?)") .bind(p.id, p.incomeId, p.amountPaid, p.date, p.notes)));
  data.vaccinationLogs?.forEach((v: any) => batchOps.push(db.prepare("INSERT INTO vaccinationLogs (id, batchId, vaccineOrDrugName, dateAdministered, nextDueDate, dosage, notes) VALUES (?, ?, ?, ?, ?, ?, ?)") .bind(v.id, v.batchId, v.vaccineOrDrugName, v.dateAdministered, v.nextDueDate, v.dosage, v.notes)));

  await db.batch(batchOps);
  return c.json({ status: 'success', message: 'Database successfully synchronised.' });
});

// --- API WIPE AND RESET ---
app.post('/api/reset', async (c) => {
  const db = c.env.DB;
  await db.batch([
    db.prepare("DELETE FROM batches"),
    db.prepare("DELETE FROM dailyRecords"),
    db.prepare("DELETE FROM feedStock"),
    db.prepare("DELETE FROM inventoryItems"),
    db.prepare("DELETE FROM expenses"),
    db.prepare("DELETE FROM income"),
    db.prepare("DELETE FROM customers"),
    db.prepare("DELETE FROM suppliers"),
    db.prepare("DELETE FROM creditPayments"),
    db.prepare("DELETE FROM vaccinationLogs"),
  ]);
  await seedDatabaseIfEmpty(db);
  return c.json({ status: 'success', message: 'D1 SQL Tables reset to seed values.' });
});

app.post('/api/wipe', async (c) => {
  const db = c.env.DB;
  await db.batch([
    db.prepare("DELETE FROM batches"),
    db.prepare("DELETE FROM dailyRecords"),
    db.prepare("DELETE FROM feedStock"),
    db.prepare("DELETE FROM inventoryItems"),
    db.prepare("DELETE FROM expenses"),
    db.prepare("DELETE FROM income"),
    db.prepare("DELETE FROM customers"),
    db.prepare("DELETE FROM suppliers"),
    db.prepare("DELETE FROM creditPayments"),
    db.prepare("DELETE FROM vaccinationLogs"),
  ]);
  return c.json({ status: 'success', message: 'All tables emptied successfully.' });
});

// --- USERS MANAGEMENT ROUTES ---
app.get('/api/users', async (c) => {
  const users = await c.env.DB.prepare("SELECT id, username, name, role FROM users").all();
  return c.json(users.results);
});

app.post('/api/users', async (c) => {
  const { name, username, password, role } = await c.req.json() as any;
  if (!name || !username || !password || !role) {
    return c.json({ status: 'error', message: 'All fields are required.' }, 400);
  }

  const existing = await c.env.DB.prepare("SELECT id FROM users WHERE LOWER(username) = LOWER(?)").bind(username).first();
  if (existing) {
    return c.json({ status: 'error', message: `Username "${username}" is already taken.` }, 400);
  }

  const id = 'user_' + Math.random().toString(36).substring(2, 11);
  await c.env.DB.prepare("INSERT INTO users (id, name, username, password, role) VALUES (?, ?, ?, ?, ?)")
    .bind(id, name, username, password, role)
    .run();

  return c.json({ status: 'success', message: 'User profile created successfully.', user: { id, name, username, role } });
});

app.put('/api/users/:id', async (c) => {
  const id = c.req.param('id');
  const { name, username, password, role } = await c.req.json() as any;

  const user = await c.env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(id).first<any>();
  if (!user) {
    return c.json({ status: 'error', message: 'User not found.' }, 404);
  }

  if (username && username.toLowerCase() !== user.username.toLowerCase()) {
    const existing = await c.env.DB.prepare("SELECT id FROM users WHERE LOWER(username) = LOWER(?) AND id != ?").bind(username, id).first();
    if (existing) {
      return c.json({ status: 'error', message: `Username "${username}" is already taken.` }, 400);
    }
  }

  const updatedName = name || user.name;
  const updatedUsername = username || user.username;
  const updatedPassword = password || user.password;
  let updatedRole = role || user.role;

  if (user.role === 'admin' && role === 'worker') {
    const adminsCount = await c.env.DB.prepare("SELECT count(*) as count FROM users WHERE role = 'admin'").first<{ count: number }>();
    if (adminsCount && adminsCount.count <= 1) {
      return c.json({ status: 'error', message: 'Cannot demote the only remaining Administrator.' }, 400);
    }
  }

  await c.env.DB.prepare("UPDATE users SET name = ?, username = ?, password = ?, role = ? WHERE id = ?")
    .bind(updatedName, updatedUsername, updatedPassword, updatedRole, id)
    .run();

  return c.json({ status: 'success', message: 'User profile updated.', user: { id, name: updatedName, username: updatedUsername, role: updatedRole } });
});

app.delete('/api/users/:id', async (c) => {
  const id = c.req.param('id');
  const user = await c.env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(id).first<any>();
  if (!user) {
    return c.json({ status: 'error', message: 'User not found.' }, 404);
  }

  if (user.role === 'admin') {
    const adminsCount = await c.env.DB.prepare("SELECT count(*) as count FROM users WHERE role = 'admin'").first<{ count: number }>();
    if (adminsCount && adminsCount.count <= 1) {
      return c.json({ status: 'error', message: 'Cannot delete the only remaining Administrator.' }, 400);
    }
  }

  await c.env.DB.prepare("DELETE FROM users WHERE id = ?").bind(id).run();
  return c.json({ status: 'success', message: 'User profile deleted.' });
});


// --- GRANULAR RESTFUL API ROUTES (For Flutter or granular Client integration) ---

// 1. Batches API
app.get('/api/batches', async (c) => {
  const result = await c.env.DB.prepare("SELECT * FROM batches").all();
  return c.json(result.results);
});
app.post('/api/batches', async (c) => {
  const body = await c.req.json() as any;
  await c.env.DB.prepare("INSERT INTO batches (id, name, initialCount, currentCount, dateAcquired, sourceSupplierId, ageWeeksAtAcquisition, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(body.id, body.name, body.initialCount, body.currentCount, body.dateAcquired, body.sourceSupplierId, body.ageWeeksAtAcquisition, body.status)
    .run();
  return c.json({ status: 'success', data: body });
});
app.delete('/api/batches/:id', async (c) => {
  await c.env.DB.prepare("DELETE FROM batches WHERE id = ?").bind(c.req.param('id')).run();
  return c.json({ status: 'success' });
});

// 2. Daily Records API
app.get('/api/dailyRecords', async (c) => {
  const result = await c.env.DB.prepare("SELECT * FROM dailyRecords ORDER BY date DESC").all();
  return c.json(result.results);
});
app.post('/api/dailyRecords', async (c) => {
  const body = await c.req.json() as any;
  await c.env.DB.prepare("INSERT INTO dailyRecords (id, date, batchId, eggsCollected, eggsBroken, eggsSpoilt, mortalityCount, mortalityCause, feedConsumedBags, notes, createdBy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(body.id, body.date, body.batchId, body.eggsCollected, body.eggsBroken, body.eggsSpoilt, body.mortalityCount, body.mortalityCause, body.feedConsumedBags, body.notes, body.createdBy)
    .run();
  return c.json({ status: 'success', data: body });
});

// 3. Feed Stock API
app.get('/api/feedStock', async (c) => {
  const result = await c.env.DB.prepare("SELECT * FROM feedStock").all();
  return c.json(result.results);
});

// 4. Expenses API
app.get('/api/expenses', async (c) => {
  const result = await c.env.DB.prepare("SELECT * FROM expenses ORDER BY date DESC").all();
  return c.json(result.results);
});
app.post('/api/expenses', async (c) => {
  const body = await c.req.json() as any;
  await c.env.DB.prepare("INSERT INTO expenses (id, category, amount, date, notes, batchId) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(body.id, body.category, body.amount, body.date, body.notes, body.batchId)
    .run();
  return c.json({ status: 'success', data: body });
});

// 5. Income API
app.get('/api/income', async (c) => {
  const result = await c.env.DB.prepare("SELECT * FROM income ORDER BY date DESC").all();
  return c.json(result.results);
});
app.post('/api/income', async (c) => {
  const body = await c.req.json() as any;
  await c.env.DB.prepare("INSERT INTO income (id, source, quantity, unitPrice, totalAmount, date, customerId, paymentStatus, amountPaid) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(body.id, body.source, body.quantity, body.unitPrice, body.totalAmount, body.date, body.customerId, body.paymentStatus, body.amountPaid)
    .run();
  return c.json({ status: 'success', data: body });
});

// 6. Vaccination Logs API
app.get('/api/vaccinationLogs', async (c) => {
  const result = await c.env.DB.prepare("SELECT * FROM vaccinationLogs ORDER BY dateAdministered DESC").all();
  return c.json(result.results);
});
app.post('/api/vaccinationLogs', async (c) => {
  const body = await c.req.json() as any;
  await c.env.DB.prepare("INSERT INTO vaccinationLogs (id, batchId, vaccineOrDrugName, dateAdministered, nextDueDate, dosage, notes) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(body.id, body.batchId, body.vaccineOrDrugName, body.dateAdministered, body.nextDueDate, body.dosage, body.notes)
    .run();
  return c.json({ status: 'success', data: body });
});

// 7. Suppliers API
app.get('/api/suppliers', async (c) => {
  const result = await c.env.DB.prepare("SELECT * FROM suppliers").all();
  return c.json(result.results);
});

// 8. Customers API
app.get('/api/customers', async (c) => {
  const result = await c.env.DB.prepare("SELECT * FROM customers").all();
  return c.json(result.results);
});

export default app;
