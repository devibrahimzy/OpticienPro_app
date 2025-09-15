// server.js
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { registerUser, loginUser, changePassword } = require("./auth");
const db = require("./db");

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());

// ==================== BASIC ROUTES ====================
app.get("/", (req, res) => res.send("Backend is running ✅"));

// ==================== AUTHENTICATION ROUTES ====================
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const result = loginUser(username, password);
  res.json(result);
});

app.post("/register", (req, res) => {
  const { username, password, fullName, role, adminCode } = req.body;

  if (role === "admin" && adminCode !== "451222") {
    return res.json({ success: false, message: "Invalid admin code" });
  }

  const result = registerUser(username, password, fullName, role);
  res.json(result);
});

// Change password endpoint
app.post("/users/:userId/change-password", async (req, res) => {
  const userId = parseInt(req.params.userId);
  const { currentPassword, newPassword } = req.body;

  const result = await changePassword(userId, currentPassword, newPassword);
  res.json(result);
});

// ==================== USER MANAGEMENT ROUTES ====================
app.get("/users", (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT id, username, role, full_name, created_at 
      FROM users 
      ORDER BY created_at DESC
    `);
    const rows = stmt.all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== SETTINGS ROUTES ====================

// Get settings for a user
app.get("/settings/:userId", (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const stmt = db.prepare("SELECT dark_mode FROM settings WHERE user_id = ?");
    let settings = stmt.get(userId);

    if (!settings) {
      // Create default settings if none exist (dark mode = 1 by default)
      const insert = db.prepare("INSERT INTO settings (user_id, dark_mode) VALUES (?, 1)");
      insert.run(userId);
      settings = { dark_mode: 1 };
    }

    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Update settings for a user
app.patch("/settings/:userId", (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const { dark_mode } = req.body;

    const stmt = db.prepare("UPDATE settings SET dark_mode = ? WHERE user_id = ?");
    stmt.run(dark_mode ? 1 : 0, userId);

    res.json({ success: true, dark_mode });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== DASHBOARD STATS ====================
app.get("/api/dashboard/stats", (req, res) => {
  try {
    const { userId, userRole } = req.query;
    
    // Determine if user is admin
    const isAdmin = userRole === 'admin';
    
    // Total clients (for this user or all users if admin)
    const clientsQuery = isAdmin ? `
      SELECT COUNT(*) as count FROM clients WHERE archived = 0
    ` : `
      SELECT COUNT(DISTINCT c.id) as count 
      FROM clients c
      JOIN ventes v ON c.id = v.client_id
      WHERE c.archived = 0 AND v.user_id = ?
    `;
    
    const clientsStmt = db.prepare(clientsQuery);
    const clientsResult = isAdmin ? clientsStmt.get() : clientsStmt.get(userId);
    
    // Today's sales (for this user or all users if admin)
    const salesQuery = isAdmin ? `
      SELECT SUM(total_ttc) as total FROM ventes 
      WHERE date(date_vente) = date('now') AND statut = 'finalisée'
    ` : `
      SELECT SUM(total_ttc) as total FROM ventes 
      WHERE date(date_vente) = date('now') 
      AND statut = 'finalisée'
      AND user_id = ?
    `;
    
    const salesStmt = db.prepare(salesQuery);
    const salesResult = isAdmin ? salesStmt.get() : salesStmt.get(userId);
    
    // Low stock items (both montures and verres) - global for all users
    const stockStmt = db.prepare(`
      SELECT COUNT(*) as count FROM (
        -- Montures with low stock
        SELECT m.id
        FROM montures m
        LEFT JOIN stock s ON s.produit_id = m.id AND s.produit_type = 'monture' AND s.statut = 'livré'
        WHERE m.status = 'active'
        GROUP BY m.id
        HAVING COALESCE(SUM(s.quantite), 0) <= 5
        
        UNION ALL
        
        -- Verres with low stock
        SELECT v.id
        FROM verres v
        LEFT JOIN stock s ON s.produit_id = v.id AND s.produit_type = 'verre' AND s.statut = 'livré'
        WHERE v.status = 'active'
        GROUP BY v.id
        HAVING COALESCE(SUM(s.quantite), 0) <= 5
      )
    `);
    const stockResult = stockStmt.get();
    
    // Pending orders - global for all users
    const ordersStmt = db.prepare("SELECT COUNT(*) as count FROM stock WHERE statut = 'commande'");
    const ordersResult = ordersStmt.get();
    
    // Unpaid invoices (for this user or all users if admin)
    const invoicesQuery = isAdmin ? `
      SELECT COUNT(*) as count FROM factures WHERE statut = 'impayée'
    ` : `
      SELECT COUNT(*) as count 
      FROM factures f
      JOIN ventes v ON f.vente_id = v.id
      WHERE f.statut = 'impayée' AND v.user_id = ?
    `;
    
    const invoicesStmt = db.prepare(invoicesQuery);
    const invoicesResult = isAdmin ? invoicesStmt.get() : invoicesStmt.get(userId);
    
    const stats = {
      totalClients: clientsResult.count,
      todaySales: salesResult.total || 0,
      lowStockItems: stockResult.count,
      pendingOrders: ordersResult.count,
      unpaidInvoices: invoicesResult.count
    };
    
    res.json(stats);
  } catch (err) {
    console.error("Dashboard stats error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// ==================== RECENT SALES ====================
app.get("/api/dashboard/recent-sales", (req, res) => {
  try {
    const { userId, userRole } = req.query;
    
    // Determine if user is admin
    const isAdmin = userRole === 'admin';
    
    const query = isAdmin ? `
      SELECT v.id, v.total_ttc, v.date_vente, 
             c.nom, c.prenom, v.statut, u.username as vendeur
      FROM ventes v
      LEFT JOIN clients c ON v.client_id = c.id
      LEFT JOIN users u ON v.user_id = u.id
      WHERE v.statut = 'finalisée'
      ORDER BY v.date_vente DESC
      LIMIT 5
    ` : `
      SELECT v.id, v.total_ttc, v.date_vente, 
             c.nom, c.prenom, v.statut
      FROM ventes v
      LEFT JOIN clients c ON v.client_id = c.id
      WHERE v.statut = 'finalisée'
      AND v.user_id = ?
      ORDER BY v.date_vente DESC
      LIMIT 5
    `;
    
    const stmt = db.prepare(query);
    const rows = isAdmin ? stmt.all() : stmt.all(userId);
    
    res.json(rows);
  } catch (err) {
    console.error("Recent sales error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// ==================== LOW STOCK ITEMS ====================
app.get("/api/dashboard/low-stock", (req, res) => {
  try {
    // Low stock remains global (not user-specific)
    const query = `
      -- Montures with low stock
      SELECT 
        m.ref, 
        m.marque, 
        'monture' as produit_type,
        COALESCE(SUM(CASE WHEN s.statut = 'livré' THEN s.quantite ELSE 0 END), 0) as stock_total
      FROM montures m
      LEFT JOIN stock s ON s.produit_id = m.id AND s.produit_type = 'monture'
      WHERE m.status = 'active'
      GROUP BY m.id, m.ref, m.marque
      HAVING stock_total <= 5
      
      UNION ALL
      
      -- Verres with low stock
      SELECT 
        v.ref, 
        v.type_verre as marque, 
        'verre' as produit_type,
        COALESCE(SUM(CASE WHEN s.statut = 'livré' THEN s.quantite ELSE 0 END), 0) as stock_total
      FROM verres v
      LEFT JOIN stock s ON s.produit_id = v.id AND s.produit_type = 'verre'
      WHERE v.status = 'active'
      GROUP BY v.id, v.ref, v.type_verre
      HAVING stock_total <= 5
      
      ORDER BY stock_total ASC
      LIMIT 10
    `;
    
    const stmt = db.prepare(query);
    const rows = stmt.all();
    
    res.json(rows);
  } catch (err) {
    console.error("Low stock error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// ==================== PENDING ORDERS ====================
app.get("/api/dashboard/pending-orders", (req, res) => {
  try {
    // Pending orders remain global (not user-specific)
    const query = `
      SELECT 
        s.id, 
        s.produit_type, 
        s.produit_id, 
        s.quantite, 
        s.prix_unitaire, 
        s.date_demande,
        CASE 
          WHEN s.produit_type = 'monture' THEN m.ref
          WHEN s.produit_type = 'verre' THEN v.ref
        END as ref,
        CASE 
          WHEN s.produit_type = 'monture' THEN m.marque
          WHEN s.produit_type = 'verre' THEN v.type_verre
        END as marque,
        f.nom as fournisseur_nom
      FROM stock s
      LEFT JOIN montures m ON s.produit_type = 'monture' AND s.produit_id = m.id
      LEFT JOIN verres v ON s.produit_type = 'verre' AND s.produit_id = v.id
      LEFT JOIN fournisseurs f ON s.fournisseur_id = f.id
      WHERE s.statut = 'commande'
      ORDER BY s.date_demande DESC
      LIMIT 5
    `;
    
    const stmt = db.prepare(query);
    const rows = stmt.all();
    
    res.json(rows);
  } catch (err) {
    console.error("Pending orders error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// ==================== INCOMPLETE SALES ====================
app.get("/api/dashboard/incomplete-sales", (req, res) => {
  try {
    const { userId, userRole } = req.query;
    
    // Determine if user is admin
    const isAdmin = userRole === 'admin';
    
    const query = isAdmin ? `
      SELECT 
        v.id,
        v.total_ttc,
        v.date_vente,
        c.nom as client_nom,
        c.prenom as client_prenom,
        v.statut,
        u.username as vendeur
      FROM ventes v
      LEFT JOIN clients c ON v.client_id = c.id
      LEFT JOIN users u ON v.user_id = u.id
      WHERE v.statut = 'ouverte'
      ORDER BY v.date_vente DESC
      LIMIT 5
    ` : `
      SELECT 
        v.id,
        v.total_ttc,
        v.date_vente,
        c.nom as client_nom,
        c.prenom as client_prenom,
        v.statut
      FROM ventes v
      LEFT JOIN clients c ON v.client_id = c.id
      WHERE v.statut = 'ouverte'
      AND v.user_id = ?
      ORDER BY v.date_vente DESC
      LIMIT 5
    `;

    const stmt = db.prepare(query);
    const rows = isAdmin ? stmt.all() : stmt.all(userId);

    res.json(rows);
  } catch (err) {
    console.error("Incomplete sales error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// ==================== ADMIN USER MANAGEMENT ROUTES ====================

// Get all users with their sales performance
app.get("/api/admin/users", (req, res) => {
  try {
    const query = `
      SELECT 
        u.id, 
        u.username, 
        u.full_name, 
        u.role, 
        u.is_active, 
        u.created_at,
        COUNT(DISTINCT v.id) as sales_count,
        SUM(v.total_ttc) as total_sales,
        MAX(v.date_vente) as last_sale_date
      FROM users u
      LEFT JOIN ventes v ON u.id = v.user_id AND v.statut = 'finalisée'
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `;
    
    const stmt = db.prepare(query);
    const rows = stmt.all();
    
    res.json(rows);
  } catch (err) {
    console.error("Users fetch error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// Toggle user active status (archive/unarchive)
app.patch("/api/admin/users/:id/status", (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { is_active } = req.body;
    
    // Prevent self-archiving
    if (userId === req.user?.id) {
      return res.status(400).json({ error: "Cannot change your own status" });
    }
    
    const stmt = db.prepare("UPDATE users SET is_active = ? WHERE id = ?");
    const result = stmt.run(is_active ? 1 : 0, userId);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    
    res.json({ success: true, is_active });
  } catch (err) {
    console.error("User status update error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// Get detailed user performance stats
app.get("/api/admin/users/:id/performance", (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    const query = `
      SELECT 
        u.username,
        u.full_name,
        u.role,
        COUNT(DISTINCT v.id) as total_sales,
        SUM(v.total_ttc) as total_revenue,
        AVG(v.total_ttc) as avg_sale_value,
        MIN(v.date_vente) as first_sale_date,
        MAX(v.date_vente) as last_sale_date,
        COUNT(DISTINCT v.client_id) as unique_clients
      FROM users u
      LEFT JOIN ventes v ON u.id = v.user_id AND v.statut = 'finalisée'
      WHERE u.id = ?
      GROUP BY u.id
    `;
    
    const stmt = db.prepare(query);
    const userStats = stmt.get(userId);
    
    // Get monthly sales data for charts
    const monthlyQuery = `
      SELECT 
        strftime('%Y-%m', v.date_vente) as month,
        COUNT(*) as sales_count,
        SUM(v.total_ttc) as total_revenue
      FROM ventes v
      WHERE v.user_id = ? AND v.statut = 'finalisée'
      GROUP BY strftime('%Y-%m', v.date_vente)
      ORDER BY month DESC
      LIMIT 12
    `;
    
    const monthlyStmt = db.prepare(monthlyQuery);
    const monthlyData = monthlyStmt.all(userId);
    
    res.json({ ...userStats, monthly_data: monthlyData });
  } catch (err) {
    console.error("User performance error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// ==================== FOURNISSEURS ROUTES ====================
app.get('/fournisseurs', (req, res) => {
  const { archived } = req.query;
  let query = 'SELECT * FROM fournisseurs';
  let params = [];

  if (archived !== undefined) {
    query += ' WHERE is_active = ?';
    params.push(archived === 'true' ? 0 : 1);
  }

  query += ' ORDER BY nom';

  try {
    const stmt = db.prepare(query);
    const rows = stmt.all(...params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/fournisseurs/:id', (req, res) => {
  const { id } = req.params;
  try {
    const stmt = db.prepare('SELECT * FROM fournisseurs WHERE id = ?');
    const row = stmt.get(id);
    if (!row) {
      res.status(404).json({ error: 'Fournisseur not found' });
      return;
    }
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/fournisseurs', (req, res) => {
  const { nom, tel, email, adresse, notes } = req.body;

  if (!nom) {
    res.status(400).json({ error: 'Nom is required' });
    return;
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO fournisseurs (nom, tel, email, adresse, notes)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(nom, tel, email, adresse, notes);
    
    const getStmt = db.prepare('SELECT * FROM fournisseurs WHERE id = ?');
    const row = getStmt.get(result.lastInsertRowid);
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/fournisseurs/:id', (req, res) => {
  const { id } = req.params;
  const { nom, tel, email, adresse, notes } = req.body;

  if (!nom) {
    res.status(400).json({ error: 'Nom is required' });
    return;
  }

  try {
    const stmt = db.prepare(`
      UPDATE fournisseurs 
      SET nom = ?, tel = ?, email = ?, adresse = ?, notes = ?
      WHERE id = ?
    `);
    const result = stmt.run(nom, tel, email, adresse, notes, id);
    
    if (result.changes === 0) {
      res.status(404).json({ error: 'Fournisseur not found' });
      return;
    }
    
    const getStmt = db.prepare('SELECT * FROM fournisseurs WHERE id = ?');
    const row = getStmt.get(id);
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/fournisseurs/:id/archive', (req, res) => {
  const { id } = req.params;
  let { archived } = req.body;

  // Ensure boolean value
  if (archived === "true" || archived === 1) archived = true;
  else if (archived === "false" || archived === 0) archived = false;

  if (typeof archived !== 'boolean') {
    return res.status(400).json({ error: 'Archived must be a boolean' });
  }

  try {
    const stmt = db.prepare('UPDATE fournisseurs SET is_active = ? WHERE id = ?');
    const result = stmt.run(archived ? 0 : 1, id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Fournisseur not found' });
    }

    const fournisseur = db.prepare('SELECT * FROM fournisseurs WHERE id = ?').get(id);
    res.json({ success: true, message: archived ? 'Fournisseur archivé' : 'Fournisseur restauré', fournisseur });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Updated to work without fournisseur_id in products tables
app.get('/fournisseurs/:id/products', (req, res) => {
  const { id } = req.params;

  try {
    // Since fournisseur_id is removed from montures and verres tables,
    // we need to check products associated with this supplier via stock table
    const stmt = db.prepare(`
      SELECT DISTINCT
        s.produit_type as type,
        s.produit_id as id,
        CASE 
          WHEN s.produit_type = 'monture' THEN m.ref
          WHEN s.produit_type = 'verre' THEN v.ref
        END as ref,
        CASE 
          WHEN s.produit_type = 'monture' THEN m.marque
          WHEN s.produit_type = 'verre' THEN v.type_verre
        END as nom,
        CASE 
          WHEN s.produit_type = 'monture' THEN m.prix_vente
          WHEN s.produit_type = 'verre' THEN v.prix_vente
        END as prix_vente,
        CASE 
          WHEN s.produit_type = 'monture' THEN m.status
          WHEN s.produit_type = 'verre' THEN v.status
        END as status
      FROM stock s
      LEFT JOIN montures m ON s.produit_type = 'monture' AND s.produit_id = m.id
      LEFT JOIN verres v ON s.produit_type = 'verre' AND s.produit_id = v.id
      WHERE s.fournisseur_id = ?
      ORDER BY s.produit_type, ref
    `);
    const rows = stmt.all(id);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== CLIENTS ROUTES ====================
app.get('/clients', (req, res) => {
  const { archived } = req.query;
  let query = 'SELECT * FROM clients';
  let params = [];

  if (archived !== undefined) {
    query += ' WHERE archived = ?';
    params.push(archived === 'true' ? 1 : 0);
  }

  query += ' ORDER BY nom, prenom';

  try {
    const stmt = db.prepare(query);
    const rows = stmt.all(...params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/clients/:id', (req, res) => {
  const { id } = req.params;
  try {
    const stmt = db.prepare('SELECT * FROM clients WHERE id = ?');
    const row = stmt.get(id);
    if (!row) {
      res.status(404).json({ error: 'Client not found' });
      return;
    }
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/clients', (req, res) => {
  const { nom, prenom, tel, email, adresse, date_naissance, notes } = req.body;

  if (!nom || !prenom) {
    res.status(400).json({ error: 'Nom and prenom are required' });
    return;
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO clients (nom, prenom, tel, email, adresse, date_naissance, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(nom, prenom, tel, email, adresse, date_naissance, notes);
    
    const getStmt = db.prepare('SELECT * FROM clients WHERE id = ?');
    const row = getStmt.get(result.lastInsertRowid);
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/clients/:id', (req, res) => {
  const { id } = req.params;
  const { nom, prenom, tel, email, adresse, date_naissance, notes } = req.body;

  if (!nom || !prenom) {
    res.status(400).json({ error: 'Nom and prenom are required' });
    return;
  }

  try {
    const stmt = db.prepare(`
      UPDATE clients 
      SET nom = ?, prenom = ?, tel = ?, email = ?, adresse = ?, date_naissance = ?, notes = ?
      WHERE id = ?
    `);
    const result = stmt.run(nom, prenom, tel, email, adresse, date_naissance, notes, id);
    
    if (result.changes === 0) {
      res.status(404).json({ error: 'Client not found' });
      return;
    }
    
    const getStmt = db.prepare('SELECT * FROM clients WHERE id = ?');
    const row = getStmt.get(id);
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/clients/:id/archive', (req, res) => {
  const { id } = req.params;
  const { archived } = req.body;

  if (typeof archived !== 'boolean') {
    res.status(400).json({ error: 'Archived must be a boolean' });
    return;
  }

  try {
    const stmt = db.prepare('UPDATE clients SET archived = ? WHERE id = ?');
    const result = stmt.run(archived ? 1 : 0, id);
    
    if (result.changes === 0) {
      res.status(404).json({ error: 'Client not found' });
      return;
    }
    
    const getStmt = db.prepare('SELECT * FROM clients WHERE id = ?');
    const row = getStmt.get(id);
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/clients/:id/sales', (req, res) => {
  const { id } = req.params;

  try {
    const stmt = db.prepare(`
      SELECT 
        v.id,
        v.date_vente,
        v.total_ttc,
        v.total_client,
        v.statut,
        u.full_name as user_name
      FROM ventes v
      JOIN users u ON v.user_id = u.id
      WHERE v.client_id = ?
        AND v.statut != 'annulée'
      ORDER BY v.date_vente DESC
    `);
    const rows = stmt.all(id);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/clients/:id/sales-detailed', (req, res) => {
  const { id } = req.params;

  try {
    const stmt = db.prepare(`
      SELECT 
        v.id,
        v.date_vente,
        v.total_ttc,
        v.total_client,
        v.total_mutuelle,
        v.statut,
        u.full_name as user_name,
        m.nom as mutuelle_nom,
        m.couverture_type,
        m.couverture_valeur,
        m.plafond,
        vl.produit_type,
        vl.produit_id,
        vl.qte,
        vl.pu_ht,
        vl.remise,
        vl.total_ligne,
        CASE 
          WHEN vl.produit_type = 'monture' THEN mt.ref
          WHEN vl.produit_type = 'verre' THEN vr.ref
        END as produit_ref,
        CASE 
          WHEN vl.produit_type = 'monture' THEN mt.marque
          WHEN vl.produit_type = 'verre' THEN vr.type_verre
        END as produit_marque,
        CASE 
          WHEN vl.produit_type = 'monture' THEN mt.matiere
          WHEN vl.produit_type = 'verre' THEN vr.traitement
        END as produit_details,
        CASE 
          WHEN vl.produit_type = 'monture' THEN mt.couleur
          WHEN vl.produit_type = 'verre' THEN vr.indice
        END as produit_spec
      FROM ventes v
      JOIN users u ON v.user_id = u.id
      LEFT JOIN mutuelles m ON v.mutuelle_id = m.id
      JOIN vente_lignes vl ON v.id = vl.vente_id
      LEFT JOIN montures mt ON vl.produit_type = 'monture' AND vl.produit_id = mt.id
      LEFT JOIN verres vr ON vl.produit_type = 'verre' AND vl.produit_id = vr.id
      WHERE v.client_id = ?
        AND v.statut != 'annulée'
      ORDER BY v.date_vente DESC, v.id, vl.id
    `);
    const rows = stmt.all(id);
    
    // Group by sale
    const salesMap = new Map();
    
    rows.forEach(row => {
      if (!salesMap.has(row.id)) {
        salesMap.set(row.id, {
          id: row.id,
          date_vente: row.date_vente,
          total_ttc: row.total_ttc,
          total_client: row.total_client,
          total_mutuelle: row.total_mutuelle,
          statut: row.statut,
          user_name: row.user_name,
          mutuelle: row.mutuelle_nom ? {
            nom: row.mutuelle_nom,
            couverture_type: row.couverture_type,
            couverture_valeur: row.couverture_valeur,
            plafond: row.plafond
          } : null,
          lignes: []
        });
      }
      
      const sale = salesMap.get(row.id);
      sale.lignes.push({
        produit_type: row.produit_type,
        produit_id: row.produit_id,
        qte: row.qte,
        pu_ht: row.pu_ht,
        remise: row.remise,
        total_ligne: row.total_ligne,
        produit_ref: row.produit_ref,
        produit_marque: row.produit_marque,
        produit_details: row.produit_details,
        produit_spec: row.produit_spec
      });
    });
    
    const sales = Array.from(salesMap.values());
    res.json(sales);
  } catch (err) {
    console.error('Error fetching detailed client sales:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== MONTURES ROUTES ====================
app.get("/montures", (req, res) => {
  try {
    const stmt = db.prepare("SELECT * FROM montures ORDER BY created_at DESC");
    const rows = stmt.all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/montures", (req, res) => {
  const { ref, marque, matiere, couleur, prix_vente } = req.body;
  try {
    const stmt = db.prepare(
      `INSERT INTO montures (ref, marque, matiere, couleur, prix_vente) VALUES (?, ?, ?, ?, ?)`
    );
    const result = stmt.run(ref, marque, matiere, couleur, prix_vente);
    
    const getStmt = db.prepare("SELECT * FROM montures WHERE id = ?");
    const row = getStmt.get(result.lastInsertRowid);
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/montures/:id", (req, res) => {
  const { id } = req.params;
  const { ref, marque, matiere, couleur, prix_vente } = req.body;
  try {
    const stmt = db.prepare(
      `UPDATE montures SET ref=?, marque=?, matiere=?, couleur=?, prix_vente=? WHERE id=?`
    );
    const result = stmt.run(ref, marque, matiere, couleur, prix_vente, id);
    
    const getStmt = db.prepare("SELECT * FROM montures WHERE id = ?");
    const row = getStmt.get(id);
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/montures/:id", (req, res) => {
  const { id } = req.params;
  try {
    const stmt = db.prepare("DELETE FROM montures WHERE id=?");
    const result = stmt.run(id);
    res.json({ success: true, changes: result.changes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/montures-with-stock", (req, res) => {
  try {
    const stmt = db.prepare("SELECT * FROM montures ORDER BY created_at DESC");
    const montures = stmt.all();
    
    const monturesWithStock = montures.map((monture) => {
      const stockStmt = db.prepare(`
        SELECT SUM(quantite) as total_stock, 
               (SELECT prix_unitaire FROM stock 
                WHERE produit_type = 'monture' AND produit_id = ? AND statut = 'livré' 
                ORDER BY date_livraison DESC LIMIT 1) as dernier_prix_achat
        FROM stock 
        WHERE produit_type = 'monture' AND produit_id = ? AND statut = 'livré'
      `);
      const stockResult = stockStmt.get(monture.id, monture.id);
      
      return {
        ...monture,
        stock: stockResult.total_stock || 0,
        prix_achat: stockResult.dernier_prix_achat || 0
      };
    });
    
    res.json(monturesWithStock);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== VERRES ROUTES ====================
app.get("/verres", (req, res) => {
  try {
    const stmt = db.prepare("SELECT * FROM verres ORDER BY created_at DESC");
    const rows = stmt.all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/verres", (req, res) => {
  const { ref, type_verre, indice, diametre, traitement, prix_vente } = req.body;
  try {
    const stmt = db.prepare(
      `INSERT INTO verres (ref, type_verre, indice, diametre, traitement, prix_vente) VALUES (?, ?, ?, ?, ?, ?)`
    );
    const result = stmt.run(ref, type_verre, indice, diametre, traitement, prix_vente);
    
    const getStmt = db.prepare("SELECT * FROM verres WHERE id = ?");
    const row = getStmt.get(result.lastInsertRowid);
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/verres/:id", (req, res) => {
  const { id } = req.params;
  const { ref, type_verre, indice, diametre, traitement, prix_vente } = req.body;
  try {
    const stmt = db.prepare(
      `UPDATE verres SET ref=?, type_verre=?, indice=?, diametre=?, traitement=?, prix_vente=? WHERE id=?`
    );
    const result = stmt.run(ref, type_verre, indice, diametre, traitement, prix_vente, id);
    
    const getStmt = db.prepare("SELECT * FROM verres WHERE id = ?");
    const row = getStmt.get(id);
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/verres/:id", (req, res) => {
  const { id } = req.params;
  try {
    const stmt = db.prepare("DELETE FROM verres WHERE id=?");
    const result = stmt.run(id);
    res.json({ success: true, changes: result.changes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/verres-with-stock", (req, res) => {
  try {
    const stmt = db.prepare("SELECT * FROM verres ORDER BY created_at DESC");
    const verres = stmt.all();
    
    const verresWithStock = verres.map((verre) => {
      const stockStmt = db.prepare(`
        SELECT SUM(quantite) as total_stock, 
               (SELECT prix_unitaire FROM stock 
                WHERE produit_type = 'verre' AND produit_id = ? AND statut = 'livré' 
                ORDER BY date_livraison DESC LIMIT 1) as dernier_prix_achat
        FROM stock 
        WHERE produit_type = 'verre' AND produit_id = ? AND statut = 'livré'
      `);
      const stockResult = stockStmt.get(verre.id, verre.id);
      
      return {
        ...verre,
        stock: stockResult.total_stock || 0,
        prix_achat: stockResult.dernier_prix_achat || 0
      };
    });
    
    res.json(verresWithStock);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== STOCK MANAGEMENT ROUTES ====================
app.get("/stock-demands", (req, res) => {
  try {
    const stmt = db.prepare("SELECT * FROM stock ORDER BY created_at DESC");
    const rows = stmt.all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/stock-demands", (req, res) => {
  const { produit_type, produit_id, quantite, prix_unitaire, fournisseur_id } = req.body;

  try {
    const stmt = db.prepare(`
      INSERT INTO stock (produit_type, produit_id, quantite, prix_unitaire, fournisseur_id, statut) 
      VALUES (?, ?, ?, ?, ?, 'commande')
    `);
    const result = stmt.run(produit_type, produit_id, quantite, prix_unitaire, fournisseur_id || null);
    res.json({ id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/stock-demands/:id", (req, res) => {
  const { produit_type, produit_id, quantite, prix_unitaire, fournisseur_id, statut, date_livraison_prevue } = req.body;
  try {
    const stmt = db.prepare(`
      UPDATE stock SET produit_type = ?, produit_id = ?, quantite = ?, prix_unitaire = ?, fournisseur_id = ?, statut = ?, date_livraison = ? WHERE id = ?
    `);
    const result = stmt.run(produit_type, produit_id, quantite, prix_unitaire, fournisseur_id || null, statut, date_livraison_prevue || null, req.params.id);
    res.json({ updated: result.changes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/stock-demands/:id", (req, res) => {
  try {
    const stmt = db.prepare("DELETE FROM stock WHERE id = ?");
    const result = stmt.run(req.params.id);
    res.json({ deleted: result.changes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/stock-demands/:id/status", (req, res) => {
  const { id } = req.params;
  const { statut } = req.body;

  try {
    const getStmt = db.prepare("SELECT * FROM stock WHERE id = ?");
    const demand = getStmt.get(id);
    
    if (!demand) {
      return res.status(404).json({ error: "Demande non trouvée" });
    }

    const updateStmt = db.prepare(`
      UPDATE stock SET statut = ?, date_livraison = CASE WHEN ? = 'livré' THEN datetime('now') ELSE date_livraison END WHERE id = ?
    `);
    updateStmt.run(statut, statut, id);
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== MUTUELLES ROUTES ====================
app.get("/mutuelles", (req, res) => {
  try {
    // Check if we should show only archived mutuelles
    const isActive = req.query.is_active;
    
    let stmt;
    if (isActive === "0") {
      // Show only archived mutuelles
      stmt = db.prepare("SELECT * FROM mutuelles WHERE is_active = 0 ORDER BY nom");
    } else if (isActive === "1") {
      // Show only active mutuelles (default)
      stmt = db.prepare("SELECT * FROM mutuelles WHERE is_active = 1 ORDER BY nom");
    } else {
      // Show all mutuelles if no specific filter
      stmt = db.prepare("SELECT * FROM mutuelles ORDER BY nom");
    }
    
    const mutuelles = stmt.all();
    res.json(mutuelles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/mutuelles/:id", (req, res) => {
  try {
    const stmt = db.prepare("SELECT * FROM mutuelles WHERE id = ?");
    const row = stmt.get(req.params.id);
    if (!row) return res.status(404).json({ error: "Mutuelle non trouvée" });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/mutuelles", (req, res) => {
  const { nom, couverture_type, couverture_valeur, plafond, notes } = req.body;
  try {
    const stmt = db.prepare(`
      INSERT INTO mutuelles (nom, couverture_type, couverture_valeur, plafond, notes)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(nom, couverture_type, couverture_valeur, plafond, notes);
    res.json({
      id: result.lastInsertRowid,
      nom,
      couverture_type,
      couverture_valeur,
      plafond,
      notes,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/mutuelles/:id", (req, res) => {
  const { nom, couverture_type, couverture_valeur, plafond, notes } = req.body;
  try {
    const stmt = db.prepare(`
      UPDATE mutuelles
      SET nom = ?, couverture_type = ?, couverture_valeur = ?, plafond = ?, notes = ?
      WHERE id = ?
    `);
    const result = stmt.run(nom, couverture_type, couverture_valeur, plafond, notes, req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: "Mutuelle non trouvée" });
    res.json({
      id: parseInt(req.params.id),
      nom,
      couverture_type,
      couverture_valeur,
      plafond,
      notes,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update the DELETE endpoint to use soft delete
app.delete("/mutuelles/:id", (req, res) => {
  try {
    const stmt = db.prepare("UPDATE mutuelles SET is_active = 0 WHERE id = ?");
    const result = stmt.run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: "Mutuelle non trouvée" });
    res.json({ message: "Mutuelle désactivée", id: parseInt(req.params.id) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a new endpoint to reactivate a mutuelle
app.patch("/mutuelles/:id/reactivate", (req, res) => {
  try {
    const stmt = db.prepare("UPDATE mutuelles SET is_active = 1 WHERE id = ?");
    const result = stmt.run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: "Mutuelle non trouvée" });
    res.json({ message: "Mutuelle réactivée", id: parseInt(req.params.id) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== HELPER FUNCTIONS ====================
function validateStockAvailability(lignes) {
  for (const ligne of lignes) {
    const stockStmt = db.prepare(`
      SELECT SUM(quantite) as available_stock 
      FROM stock 
      WHERE produit_type = ? AND produit_id = ? AND statut = 'livré'
    `);
    const stockResult = stockStmt.get(ligne.produit_type, ligne.produit_id);
    const availableStock = stockResult.available_stock || 0;

    if (availableStock < ligne.qte) {
      return {
        valid: false,
        message: `Stock insuffisant pour ${ligne.produit_type} ID ${ligne.produit_id}. Disponible: ${availableStock}, Demandé: ${ligne.qte}`
      };
    }
  }
  return { valid: true };
}

function reserveStock(lignes) {
  const stockUpdates = [];
  
  for (const ligne of lignes) {
    const stockStmt = db.prepare(`
      SELECT id, quantite FROM stock 
      WHERE produit_type = ? AND produit_id = ? AND statut = 'livré' AND quantite > 0
      ORDER BY date_livraison ASC
    `);
    const stockEntries = stockStmt.all(ligne.produit_type, ligne.produit_id);
    
    let remainingQty = ligne.qte;
    
    for (const stockEntry of stockEntries) {
      if (remainingQty <= 0) break;
      
      const qtyToReserve = Math.min(remainingQty, stockEntry.quantite);
      
      const updateStmt = db.prepare(`
        UPDATE stock SET quantite = quantite - ? WHERE id = ?
      `);
      updateStmt.run(qtyToReserve, stockEntry.id);
      
      stockUpdates.push({
        stock_id: stockEntry.id,
        quantity_reserved: qtyToReserve,
        produit_type: ligne.produit_type,
        produit_id: ligne.produit_id
      });
      
      remainingQty -= qtyToReserve;
    }
  }
  
  return stockUpdates;
}

function restoreStock(lignes) {
  for (const ligne of lignes) {
    const restoreStmt = db.prepare(`
      UPDATE stock 
      SET quantite = quantite + ? 
      WHERE produit_type = ? AND produit_id = ? AND statut = 'livré'
      ORDER BY date_livraison DESC 
      LIMIT 1
    `);
    restoreStmt.run(ligne.qte, ligne.produit_type, ligne.produit_id);
  }
}

// ==================== VENTES ROUTES ====================
app.get("/ventes", (req, res) => { 
  try {
    // Get user_id and role from query params
    const userId = req.query.user_id;
    const userRole = req.query.user_role;
    
    if (!userId) {
      return res.status(400).json({ error: "user_id is required" });
    }

    // Determine if user is admin
    const isAdmin = userRole === 'admin';
    
    const query = isAdmin ? `
      SELECT v.*, 
             c.nom as client_nom, 
             c.prenom as client_prenom, 
             u.username as user_nom, 
             m.nom as mutuelle_nom
      FROM ventes v
      LEFT JOIN clients c ON v.client_id = c.id
      LEFT JOIN users u ON v.user_id = u.id
      LEFT JOIN mutuelles m ON v.mutuelle_id = m.id
      ORDER BY v.date_vente DESC
    ` : `
      SELECT v.*, 
             c.nom as client_nom, 
             c.prenom as client_prenom, 
             u.username as user_nom, 
             m.nom as mutuelle_nom
      FROM ventes v
      LEFT JOIN clients c ON v.client_id = c.id
      LEFT JOIN users u ON v.user_id = u.id
      LEFT JOIN mutuelles m ON v.mutuelle_id = m.id
      WHERE v.user_id = ?
      ORDER BY v.date_vente DESC
    `;
    
    const stmt = db.prepare(query);
    const ventes = isAdmin ? stmt.all() : stmt.all(userId);

    // Add lignes to each vente
    const ligneStmt = db.prepare("SELECT * FROM vente_lignes WHERE vente_id = ?");
    for (let vente of ventes) {
      vente.lignes = ligneStmt.all(vente.id);
    }

    res.json(ventes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new sale
app.post("/ventes", (req, res) => {
  const { client_id, user_id, mutuelle_id, avance, reste, total_ht, total_ttc, total_mutuelle, total_client, lignes } = req.body;

  try {
    db.exec('BEGIN TRANSACTION');

    // Validate stock availability
    const stockValidation = validateStockAvailability(lignes);
    if (!stockValidation.valid) {
      db.exec('ROLLBACK');
      return res.status(400).json({ error: stockValidation.message });
    }

    // Insert the sale
    const stmt = db.prepare(`
      INSERT INTO ventes (client_id, user_id, mutuelle_id, total_ht, total_ttc, total_mutuelle, total_client, avance, reste)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      client_id,
      user_id,
      mutuelle_id || null,
      total_ht,
      total_ttc,
      total_mutuelle,
      total_client,
      avance,
      reste
    );

    const venteId = result.lastInsertRowid;

    // Insert lines
    const ligneStmt = db.prepare(`
      INSERT INTO vente_lignes (vente_id, produit_type, produit_id, qte, pu_ht, remise, tva, total_ligne)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const l of lignes) {
      ligneStmt.run(
        venteId,
        l.produit_type,
        l.produit_id,
        l.qte,
        l.pu_ht,
        l.remise,
        l.tva,
        l.total_ligne // total_ligne must be calculated in frontend
      );
    }

    // Reserve stock
    reserveStock(lignes);

    // Generate invoice immediately (even if not fully paid)
    const countStmt = db.prepare('SELECT COUNT(*) as count FROM factures');
    const invoiceCount = countStmt.get();
    const invoiceNumber = `FACT-${new Date().getFullYear()}-${(invoiceCount.count + 1).toString().padStart(6, '0')}`;

    // Create invoice
    const invoiceStmt = db.prepare(`
      INSERT INTO factures (vente_id, user_id, numero, total_ttc, date_facture, statut) 
      VALUES (?, ?, ?, ?, datetime('now'), ?)
    `);
    invoiceStmt.run(venteId, user_id, invoiceNumber, total_ttc, avance >= total_client ? 'payée' : 'en attente');

    // Get the newly created invoice
    const newInvoiceStmt = db.prepare('SELECT * FROM factures WHERE vente_id = ?');
    const newInvoice = newInvoiceStmt.get(venteId);

    db.exec('COMMIT');

    res.json({
      id: venteId,
      client_id,
      user_id,
      mutuelle_id,
      total_ht,
      total_ttc,
      total_mutuelle,
      total_client,
      avance,
      reste,
      lignes,
      facture: newInvoice
    });
  } catch (err) {
    db.exec('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
});

// Update a sale
app.put("/ventes/:id", (req, res) => {
  const venteId = parseInt(req.params.id);
  const { client_id, user_id, mutuelle_id, avance, reste, total_ht, total_ttc, total_mutuelle, total_client, lignes } = req.body;

  try {
    db.exec('BEGIN TRANSACTION');

    // Get existing sale and lines
    const existingSaleStmt = db.prepare("SELECT * FROM ventes WHERE id = ?");
    const existingSale = existingSaleStmt.get(venteId);

    if (!existingSale) {
      db.exec('ROLLBACK');
      return res.status(404).json({ error: "Vente non trouvée" });
    }

    const existingLinesStmt = db.prepare("SELECT * FROM vente_lignes WHERE vente_id = ?");
    const existingLines = existingLinesStmt.all(venteId);

    // Restore stock
    restoreStock(existingLines);

    // Validate new stock availability
    const stockValidation = validateStockAvailability(lignes);
    if (!stockValidation.valid) {
      db.exec('ROLLBACK');
      return res.status(400).json({ error: stockValidation.message });
    }

    // Update the sale
    const updateSaleStmt = db.prepare(`
      UPDATE ventes 
      SET client_id = ?, user_id = ?, mutuelle_id = ?, 
          total_ht = ?, total_ttc = ?, total_mutuelle = ?, 
          total_client = ?, avance = ?, reste = ?
      WHERE id = ?
    `);
    updateSaleStmt.run(
      client_id, 
      user_id, 
      mutuelle_id || null, 
      total_ht,
      total_ttc,
      total_mutuelle,
      total_client,
      avance, 
      reste,
      venteId
    );

    // Delete old lines
    db.prepare("DELETE FROM vente_lignes WHERE vente_id = ?").run(venteId);

    // Insert new lines
    const insertLineStmt = db.prepare(`
      INSERT INTO vente_lignes (vente_id, produit_type, produit_id, qte, pu_ht, remise, tva, total_ligne) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const ligne of lignes) {
      insertLineStmt.run(
        venteId,
        ligne.produit_type,
        ligne.produit_id,
        ligne.qte,
        ligne.pu_ht,
        ligne.remise,
        ligne.tva,
        ligne.total_ligne // calculated in frontend
      );
    }

    // Reserve new stock
    reserveStock(lignes);

    db.exec('COMMIT');
    res.json({ success: true });
  } catch (error) {
    db.exec('ROLLBACK');
    res.status(500).json({ error: error.message });
  }
});

app.delete("/ventes/:id", (req, res) => {
  const { id } = req.params;
  
  try {
    // Start transaction
    db.exec('BEGIN TRANSACTION');

    // Get existing lines before canceling
    const existingLinesStmt = db.prepare("SELECT * FROM vente_lignes WHERE vente_id = ?");
    const existingLines = existingLinesStmt.all(id);

    // Restore stock from canceled sale
    restoreStock(existingLines);

    // Update sale status to canceled
    const stmt = db.prepare("UPDATE ventes SET statut = 'annulée' WHERE id = ?");
    const result = stmt.run(id);

    // Update associated invoice status to canceled
    const invoiceStmt = db.prepare("UPDATE factures SET statut = 'annulée' WHERE vente_id = ?");
    invoiceStmt.run(id);

    db.exec('COMMIT');
    res.json({ message: "Vente annulée avec succès", changes: result.changes });
  } catch (err) {
    db.exec('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
});

app.post('/ventes/:id/paiement', (req, res) => {
  const { id } = req.params;
  const { montant, mode, ref_piece } = req.body;

  try {
    // Start transaction
    db.exec('BEGIN TRANSACTION');

    // Get the sale details
    const venteStmt = db.prepare('SELECT * FROM ventes WHERE id = ?');
    const vente = venteStmt.get(id);
    if (!vente) {
      db.exec('ROLLBACK');
      return res.status(404).json({ error: 'Vente non trouvée' });
    }

    // Add payment record
    const paymentStmt = db.prepare(`
      INSERT INTO reglements (vente_id, mode, montant, ref_piece) 
      VALUES (?, ?, ?, ?)
    `);
    paymentStmt.run(id, mode, montant, ref_piece || null);

    // Calculate total payments so far
    const paymentsStmt = db.prepare(`
      SELECT SUM(montant) as total_paiements FROM reglements WHERE vente_id = ?
    `);
    const payments = paymentsStmt.get(id);
    const totalPaiements = payments.total_paiements || 0;
    const nouveauReste = vente.total_client - totalPaiements;

    // Update sale with new balance
    const updateStmt = db.prepare(`
      UPDATE ventes SET avance = ?, reste = ? WHERE id = ?
    `);
    updateStmt.run(totalPaiements, nouveauReste, id);

    // Update invoice status based on payment
    const invoiceStmt = db.prepare(`
      UPDATE factures SET statut = ? WHERE vente_id = ?
    `);
    
    if (nouveauReste <= 0) {
      // Update sale status to closed
      const statusStmt = db.prepare("UPDATE ventes SET statut = 'finalisée' WHERE id = ?");
      statusStmt.run(id);
      
      // Update invoice status to paid
      invoiceStmt.run('payée', id);
    } else {
      // Update invoice status to partially paid
      invoiceStmt.run('partiellement payée', id);
    }

    db.exec('COMMIT');

    res.json({ 
      success: true, 
      message: 'Paiement enregistré',
      reste: nouveauReste
    });
  } catch (err) {
    db.exec('ROLLBACK');
    console.error('Payment error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// --- Get payment history for a sale ---
app.get('/ventes/:id/paiements', (req, res) => {
  const { id } = req.params;
  
  try {
    const stmt = db.prepare(`
      SELECT * FROM reglements WHERE vente_id = ? ORDER BY date_reglement DESC
    `);
    const paiements = stmt.all(id);
    res.json(paiements);
  } catch (err) {
    console.error('Error fetching payments:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// --- Règlements ---
app.get("/reglements/:vente_id", (req, res) => {
  try {
    const stmt = db.prepare("SELECT * FROM reglements WHERE vente_id = ?");
    const rows = stmt.all(req.params.vente_id);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/reglements", (req, res) => {
  const { vente_id, mode, montant, ref_piece } = req.body;

  try {
    // Updated: removed facture_id field
    const stmt = db.prepare(`
      INSERT INTO reglements (vente_id, mode, montant, ref_piece)
      VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run(vente_id, mode, montant, ref_piece);
    
    const getStmt = db.prepare("SELECT * FROM reglements WHERE id = ?");
    const row = getStmt.get(result.lastInsertRowid);
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== FACTURES ROUTES ====================
app.post("/factures", (req, res) => {
  const { vente_id, user_id, numero, total_ttc } = req.body;
  
  try {
    // Updated: removed pdf_path, added user_id
    const stmt = db.prepare(`
      INSERT INTO factures (vente_id, user_id, numero, total_ttc)
      VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run(vente_id, user_id, numero, total_ttc);
    
    const getStmt = db.prepare("SELECT * FROM factures WHERE id = ?");
    const row = getStmt.get(result.lastInsertRowid);
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET all invoices (with user-based filtering)
app.get('/factures', (req, res) => {
  const { user_id, role } = req.query;
  
  try {
    let query = `
      SELECT 
        f.id,
        f.numero,
        f.vente_id,
        c.nom || ' ' || c.prenom as client_nom,
        f.date_facture,
        f.total_ttc,
        f.statut,
        v.statut as vente_statut,
        u.username as created_by
      FROM factures f
      JOIN ventes v ON f.vente_id = v.id
      JOIN clients c ON v.client_id = c.id
      JOIN users u ON f.user_id = u.id
    `;
    
    // Add WHERE clause if user is not admin
    if (role !== 'admin') {
      query += ` WHERE f.user_id = ? `;
    }
    
    query += ` ORDER BY f.date_facture DESC`;
    
    const stmt = db.prepare(query);
    const rows = role === 'admin' ? stmt.all() : stmt.all(user_id);
    
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single invoice by ID
app.get('/factures/:id', (req, res) => {
  const { id } = req.params;
  
  try {
    const stmt = db.prepare(`
      SELECT 
        f.*,
        c.nom || ' ' || c.prenom as client_nom,
        c.adresse as client_adresse,
        c.tel as client_tel,
        v.statut as vente_statut,
        v.total_ht,
        v.total_ttc,
        v.total_mutuelle,
        v.total_client,
        v.avance,
        v.reste,
        u.username as created_by,
        u.full_name as created_by_name
      FROM factures f
      JOIN ventes v ON f.vente_id = v.id
      JOIN clients c ON v.client_id = c.id
      JOIN users u ON f.user_id = u.id
      WHERE f.id = ?
    `);
    const row = stmt.get(id);
    if (!row) {
      return res.status(404).json({ error: 'Facture non trouvée' });
    }
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET invoice items
app.get('/factures/:id/lignes', (req, res) => {
  const { id } = req.params;
  
  try {
    const stmt = db.prepare(`
      SELECT 
        vl.*,
        CASE 
          WHEN vl.produit_type = 'monture' THEN m.ref
          WHEN vl.produit_type = 'verre' THEN v.ref
        END as produit_ref,
        CASE 
          WHEN vl.produit_type = 'monture' THEN m.marque
          WHEN vl.produit_type = 'verre' THEN v.type_verre
        END as produit_details
      FROM vente_lignes vl
      LEFT JOIN montures m ON vl.produit_type = 'monture' AND vl.produit_id = m.id
      LEFT JOIN verres v ON vl.produit_type = 'verre' AND vl.produit_id = v.id
      WHERE vl.vente_id = (
        SELECT vente_id FROM factures WHERE id = ?
      )
    `);
    const rows = stmt.all(id);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET factures by vente_id (simplified version)
app.get('/factures/vente/:vente_id', (req, res) => {
  const { vente_id } = req.params;
  
  try {
    const stmt = db.prepare(`
      SELECT 
        f.numero,
        f.date_facture,
        f.total_ttc,
        f.statut
      FROM factures f
      WHERE f.vente_id = ?
    `);
    const rows = stmt.all(vente_id);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Archive/annul an invoice
app.put("/factures/:id/annuler", (req, res) => {
  const { id } = req.params;
  
  try {
    const stmt = db.prepare("UPDATE factures SET statut = 'annulée' WHERE id = ?");
    const result = stmt.run(id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: "Facture non trouvée" });
    }
    
    res.json({ message: "Facture annulée avec succès" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// ==================== RAPPORTS =========================
// API Routes for Reports (updated to include user role filtering)
app.get('/api/rapports/ventes-par-mois', (req, res) => {
  try {
    const { dateDebut, dateFin, userId, userRole } = req.query;
    
    // Determine if user is admin
    const isAdmin = userRole === 'admin';
    
    let query = `
      SELECT 
        strftime('%Y-%m', v.date_vente) as mois,
        COUNT(*) as ventes,
        SUM(v.total_ttc) as ca
      FROM ventes v
      WHERE v.statut = 'finalisée'
    `;
    
    const params = [];
    
    if (dateDebut && dateFin) {
      query += ` AND v.date_vente BETWEEN ? AND date(?, '+1 day')`;
      params.push(dateDebut, dateFin);
    }
    
    // Only filter by user if not admin
    if (!isAdmin && userId) {
      query += ` AND v.user_id = ?`;
      params.push(userId);
    }
    
    query += ` GROUP BY strftime('%Y-%m', v.date_vente) ORDER BY mois`;
    
    const stmt = db.prepare(query);
    const results = stmt.all(...params);
    
    // Format for frontend
    const formattedResults = results.map(row => ({
      mois: row.mois.split('-')[1], // Just the month part
      ventes: row.ventes,
      ca: parseFloat(row.ca || 0)
    }));
    
    res.json(formattedResults);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/rapports/produits-populaires', (req, res) => {
  try {
    const { dateDebut, dateFin, userId, userRole } = req.query;
    
    // Determine if user is admin
    const isAdmin = userRole === 'admin';
    
    let query = `
      SELECT 
        vl.produit_type,
        COUNT(*) as quantite,
        SUM(vl.total_ligne) as chiffre_affaires
      FROM vente_lignes vl
      JOIN ventes v ON vl.vente_id = v.id
      WHERE v.statut = 'finalisée'
    `;
    
    const params = [];
    
    if (dateDebut && dateFin) {
      query += ` AND v.date_vente BETWEEN ? AND date(?, '+1 day')`;
      params.push(dateDebut, dateFin);
    }
    
    // Only filter by user if not admin
    if (!isAdmin && userId) {
      query += ` AND v.user_id = ?`;
      params.push(userId);
    }
    
    query += ` GROUP BY vl.produit_type ORDER BY quantite DESC`;
    
    const stmt = db.prepare(query);
    const results = stmt.all(...params);
    
    // Format for frontend pie chart
    const colors = ["#8884d8", "#82ca9d", "#ffc658", "#ff7300"];
    const formattedResults = results.map((row, index) => ({
      name: row.produit_type === 'monture' ? 'Montures' : 
            row.produit_type === 'verre' ? 'Verres' : row.produit_type,
      value: row.quantite,
      color: colors[index % colors.length],
      chiffre_affaires: parseFloat(row.chiffre_affaires || 0)
    }));
    
    res.json(formattedResults);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/rapports/top-clients', (req, res) => {
  try {
    const { dateDebut, dateFin, limit = 5, userId, userRole } = req.query;
    
    // Determine if user is admin
    const isAdmin = userRole === 'admin';
    
    let query = `
      SELECT 
        c.id,
        c.nom || ' ' || c.prenom as nom_complet,
        COUNT(v.id) as commandes,
        SUM(v.total_ttc) as ca,
        MAX(v.date_vente) as derniere_visite
      FROM clients c
      JOIN ventes v ON c.id = v.client_id
      WHERE v.statut = 'finalisée' AND c.archived = 0
    `;
    
    const params = [];
    
    if (dateDebut && dateFin) {
      query += ` AND v.date_vente BETWEEN ? AND date(?, '+1 day')`;
      params.push(dateDebut, dateFin);
    }
    
    // Only filter by user if not admin
    if (!isAdmin && userId) {
      query += ` AND v.user_id = ?`;
      params.push(userId);
    }
    
    query += ` 
      GROUP BY c.id
      ORDER BY ca DESC
      LIMIT ?
    `;
    params.push(parseInt(limit));
    
    const stmt = db.prepare(query);
    const results = stmt.all(...params);
    
    const formattedResults = results.map(row => ({
      nom: row.nom_complet,
      commandes: row.commandes,
      ca: parseFloat(row.ca || 0),
      derniereVisite: row.derniere_visite
    }));
    
    res.json(formattedResults);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/rapports/kpi', (req, res) => {
  try {
    const { dateDebut, dateFin, userId, userRole } = req.query;
    
    // Determine if user is admin
    const isAdmin = userRole === 'admin';
    
    let whereClause = "WHERE v.statut = 'finalisée'";
    const params = [];
    
    if (dateDebut && dateFin) {
      whereClause += " AND v.date_vente BETWEEN ? AND date(?, '+1 day')";
      params.push(dateDebut, dateFin);
    }
    
    // Only filter by user if not admin
    if (!isAdmin && userId) {
      whereClause += " AND v.user_id = ?";
      params.push(userId);
    }
    
    // Total sales
    const ventesQuery = `
      SELECT COUNT(*) as total_ventes, 
             SUM(total_ttc) as chiffre_affaires,
             AVG(total_ttc) as panier_moyen
      FROM ventes v
      ${whereClause}
    `;
    
    // New clients (filtered by user if provided)
    let clientsWhereClause = "";
    let clientsParams = [];
    
    if (dateDebut && dateFin) {
      clientsWhereClause = "WHERE c.created_at BETWEEN ? AND ?";
      clientsParams.push(dateDebut, dateFin);
    }
    
    // If userId is provided and user is not admin, filter clients by those who made purchases with this user
    if (!isAdmin && userId) {
      if (clientsWhereClause) {
        clientsWhereClause += " AND c.id IN (SELECT DISTINCT client_id FROM ventes WHERE user_id = ?)";
      } else {
        clientsWhereClause = "WHERE c.id IN (SELECT DISTINCT client_id FROM ventes WHERE user_id = ?)";
      }
      clientsParams.push(userId);
    }
    
    const clientsQuery = `
      SELECT COUNT(*) as nouveaux_clients
      FROM clients c
      ${clientsWhereClause}
    `;
    
    const ventesStmt = db.prepare(ventesQuery);
    const clientsStmt = db.prepare(clientsQuery);
    
    const ventesData = ventesStmt.get(...params);
    const clientsData = clientsStmt.get(...clientsParams);
    
    // Previous period comparison (simplified)
    const kpiData = {
      total_ventes: ventesData.total_ventes || 0,
      chiffre_affaires: parseFloat(ventesData.chiffre_affaires || 0),
      panier_moyen: parseFloat(ventesData.panier_moyen || 0),
      nouveaux_clients: clientsData.nouveaux_clients || 0
    };
    
    res.json(kpiData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// ==================== SERVER START ====================
app.listen(PORT, "127.0.0.1", () => {
  console.log(`✅ Backend is running at http://127.0.0.1:${PORT}`);
});
