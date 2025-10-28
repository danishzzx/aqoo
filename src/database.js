import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, '..', 'data', 'aqoo.db');

// Ensure data directory exists
const dataDir = join(__dirname, '..', 'data');
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);

// Initialize database schema
const initDatabase = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS vps_hosts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      original_host TEXT NOT NULL,
      original_user TEXT NOT NULL,
      original_port INTEGER DEFAULT 22,
      managed_user TEXT NOT NULL,
      managed_port INTEGER DEFAULT 22,
      private_key_path TEXT NOT NULL,
      public_key_path TEXT NOT NULL,
      setup_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_accessed DATETIME,
      status TEXT DEFAULT 'active',
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS connection_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vps_host_id INTEGER NOT NULL,
      connection_type TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      success INTEGER DEFAULT 1,
      error_message TEXT,
      FOREIGN KEY (vps_host_id) REFERENCES vps_hosts(id)
    );

    CREATE TABLE IF NOT EXISTS ssh_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vps_host_id INTEGER NOT NULL,
      key_type TEXT NOT NULL,
      fingerprint TEXT,
      created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (vps_host_id) REFERENCES vps_hosts(id)
    );

    CREATE INDEX IF NOT EXISTS idx_vps_hosts_name ON vps_hosts(name);
    CREATE INDEX IF NOT EXISTS idx_connection_logs_vps ON connection_logs(vps_host_id);
  `);
};

// Initialize the database
initDatabase();

// VPS Host operations
export const saveVPSHost = (hostData) => {
  const stmt = db.prepare(`
    INSERT INTO vps_hosts (
      name, original_host, original_user, original_port,
      managed_user, managed_port, private_key_path, public_key_path, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  return stmt.run(
    hostData.name,
    hostData.originalHost,
    hostData.originalUser,
    hostData.originalPort || 22,
    hostData.managedUser,
    hostData.managedPort || 22,
    hostData.privateKeyPath,
    hostData.publicKeyPath,
    hostData.notes || null
  );
};

export const getAllVPSHosts = () => {
  const stmt = db.prepare('SELECT * FROM vps_hosts ORDER BY setup_date DESC');
  return stmt.all();
};

export const getVPSHostByName = (name) => {
  const stmt = db.prepare('SELECT * FROM vps_hosts WHERE name = ?');
  return stmt.get(name);
};

export const updateVPSHost = (id, updates) => {
  const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
  const values = Object.values(updates);
  const stmt = db.prepare(`UPDATE vps_hosts SET ${fields} WHERE id = ?`);
  return stmt.run(...values, id);
};

export const deleteVPSHost = (id) => {
  const stmt = db.prepare('DELETE FROM vps_hosts WHERE id = ?');
  return stmt.run(id);
};

export const updateLastAccessed = (id) => {
  const stmt = db.prepare('UPDATE vps_hosts SET last_accessed = CURRENT_TIMESTAMP WHERE id = ?');
  return stmt.run(id);
};

// Connection log operations
export const logConnection = (vpsHostId, connectionType, success = true, errorMessage = null) => {
  const stmt = db.prepare(`
    INSERT INTO connection_logs (vps_host_id, connection_type, success, error_message)
    VALUES (?, ?, ?, ?)
  `);
  return stmt.run(vpsHostId, connectionType, success ? 1 : 0, errorMessage);
};

export const getConnectionLogs = (vpsHostId = null, limit = 50) => {
  let query = 'SELECT * FROM connection_logs';
  const params = [];
  
  if (vpsHostId) {
    query += ' WHERE vps_host_id = ?';
    params.push(vpsHostId);
  }
  
  query += ' ORDER BY timestamp DESC LIMIT ?';
  params.push(limit);
  
  const stmt = db.prepare(query);
  return stmt.all(...params);
};

// SSH Key operations
export const saveSSHKey = (vpsHostId, keyType, fingerprint) => {
  const stmt = db.prepare(`
    INSERT INTO ssh_keys (vps_host_id, key_type, fingerprint)
    VALUES (?, ?, ?)
  `);
  return stmt.run(vpsHostId, keyType, fingerprint);
};

export default db;
