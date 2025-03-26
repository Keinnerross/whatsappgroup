// database.js
const Database = require('better-sqlite3');

const db = new Database('database.db');

// Crear una tabla si no existe
db.exec(`
CREATE TABLE IF NOT EXISTS messagesProgrammed (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,            
  message TEXT NOT NULL,           
  images_count INTEGER NOT NULL,
  images_urls TEXT   -- Nueva columna para guardar las URLs de las imágenes
);

-- Tabla para los grupos

CREATE TABLE IF NOT EXISTS groupsMessagesProgrammed (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  messagesProgrammed_id INTEGER NOT NULL, -- ID de la notificación asociada
  group_name TEXT NOT NULL,         -- Nombre del grupo
  status TEXT NOT NULL,             -- Estado del grupo (Programado/Enviado)
  FOREIGN KEY (messagesProgrammed_id) REFERENCES messagesProgrammed(id) ON DELETE CASCADE
);
`);

module.exports = db;
