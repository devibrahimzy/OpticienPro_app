PRAGMA foreign_keys = ON;

BEGIN TRANSACTION;

-- users
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'vendeur', -- e.g., 'admin', 'vendeur', 'opticien'
  full_name TEXT,
  is_active BOOLEAN DEFAULT 1, -- Soft delete flag
  created_at TEXT DEFAULT (datetime('now'))
);

-- clients
CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nom TEXT,
  prenom TEXT,
  tel TEXT,
  email TEXT,
  adresse TEXT,
  date_naissance TEXT,
  notes TEXT,
  archived BOOLEAN DEFAULT 0, -- Soft delete/archive flag
  created_at TEXT DEFAULT (datetime('now'))
);

-- fournisseurs (Suppliers)
CREATE TABLE IF NOT EXISTS fournisseurs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nom TEXT NOT NULL,
  tel TEXT,
  email TEXT,
  adresse TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT 1, -- Soft delete flag
  created_at TEXT DEFAULT (datetime('now'))
);

-- montures (Frames) - removed fournisseur_id
CREATE TABLE IF NOT EXISTS montures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ref TEXT NOT NULL,
  marque TEXT,
  matiere TEXT,
  couleur TEXT,
  prix_vente REAL DEFAULT 0 CHECK (prix_vente >= 0),
  status TEXT DEFAULT 'active', -- 'active', 'discontinued', 'hidden'
  created_at TEXT DEFAULT (datetime('now'))
);

-- verres (Lenses) - removed fournisseur_id
CREATE TABLE IF NOT EXISTS verres (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ref TEXT NOT NULL,
  type_verre TEXT, -- e.g., 'vision simple', 'progressif'
  indice REAL,     -- e.g., 1.5, 1.67
  diametre INTEGER,
  traitement TEXT, -- e.g., 'anti-reflet', 'blue light'
  prix_vente REAL DEFAULT 0 CHECK (prix_vente >= 0),
  status TEXT DEFAULT 'active', -- 'active', 'discontinued', 'hidden'
  created_at TEXT DEFAULT (datetime('now'))
);

-- mutuelles (Insurance)
CREATE TABLE IF NOT EXISTS mutuelles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nom TEXT NOT NULL,
  couverture_type TEXT DEFAULT '%', -- '%' or 'MAD'
  couverture_valeur REAL DEFAULT 0,
  plafond REAL DEFAULT 0,
  notes TEXT,
  is_active BOOLEAN DEFAULT 1 
);

-- ventes (Sales Orders)
CREATE TABLE IF NOT EXISTS ventes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  mutuelle_id INTEGER,
  date_vente TEXT DEFAULT (datetime('now')),
  total_ht REAL DEFAULT 0 CHECK (total_ht >= 0),
  total_ttc REAL DEFAULT 0 CHECK (total_ttc >= 0),
  total_mutuelle REAL DEFAULT 0 CHECK (total_mutuelle >= 0),
  total_client REAL DEFAULT 0 CHECK (total_client >= 0),
  avance REAL DEFAULT 0 CHECK (avance >= 0),
  reste REAL DEFAULT 0 CHECK (reste >= 0),
  statut TEXT NOT NULL DEFAULT 'ouverte', -- 'ouverte', 'finalisée', 'annulée'
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY(client_id) REFERENCES clients(id),
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(mutuelle_id) REFERENCES mutuelles(id)
);

-- lignes de vente (Sale Line Items)
CREATE TABLE IF NOT EXISTS vente_lignes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vente_id INTEGER NOT NULL,
  produit_type TEXT NOT NULL CHECK (produit_type IN ('monture', 'verre')),
  produit_id INTEGER NOT NULL,
  qte INTEGER DEFAULT 1 CHECK (qte > 0),
  pu_ht REAL NOT NULL CHECK (pu_ht >= 0), -- Price at the time of sale (immutable)
  remise REAL DEFAULT 0 CHECK (remise >= 0),
  tva REAL DEFAULT 0 CHECK (tva >= 0),
  total_ligne REAL DEFAULT 0 CHECK (total_ligne >= 0),
  FOREIGN KEY(vente_id) REFERENCES ventes(id) ON DELETE CASCADE
);

-- factures (Invoices) - removed pdf_path, user_id added
CREATE TABLE IF NOT EXISTS factures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vente_id INTEGER NOT NULL UNIQUE,
  user_id INTEGER NOT NULL DEFAULT 1,              -- assigned 1 for existing rows
  numero TEXT NOT NULL UNIQUE,                     -- Invoice number is unique and mandatory
  date_facture TEXT DEFAULT (datetime('now')),
  total_ttc REAL NOT NULL CHECK (total_ttc >= 0),
  statut TEXT NOT NULL DEFAULT 'en attente', 
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY(vente_id) REFERENCES ventes(id) ON DELETE CASCADE,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- reglements (Payments) - removed facture_id
CREATE TABLE IF NOT EXISTS reglements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vente_id INTEGER NOT NULL,
  mode TEXT NOT NULL,               -- 'espèces', 'carte', 'chèque', 'virement'
  montant REAL NOT NULL CHECK (montant > 0),
  date_reglement TEXT DEFAULT (datetime('now')),
  ref_piece TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY(vente_id) REFERENCES ventes(id) ON DELETE CASCADE
);

-- stock table (Stock movements/orders)
CREATE TABLE IF NOT EXISTS stock (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  produit_type TEXT NOT NULL CHECK (produit_type IN ('monture', 'verre')),
  produit_id INTEGER NOT NULL,
  quantite INTEGER NOT NULL, -- Can be positive (addition) or negative (removal/correction)
  prix_unitaire REAL NOT NULL CHECK (prix_unitaire >= 0), -- Cost price
  fournisseur_id INTEGER,
  statut TEXT NOT NULL DEFAULT 'en attente', -- 'en attente', 'livré', 'annulé'
  date_demande TEXT DEFAULT (datetime('now')),
  date_livraison TEXT,
  notes TEXT, -- For recording reasons for stock changes
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY(fournisseur_id) REFERENCES fournisseurs(id) ON DELETE SET NULL
);

-- settings table (store user preferences)
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  dark_mode BOOLEAN DEFAULT 1,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

COMMIT;
