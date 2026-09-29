const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config();

async function initDB() {
  const connectionUri = process.env.DATABASE_URL || process.env.POSTGRES_URL || 'postgresql://postgres:postgres@localhost:5432/sdlc_maturity';
  
  console.log(`Connecting to PostgreSQL database at ${connectionUri}...`);
  
  const client = new Client({
    connectionString: connectionUri
  });
  
  try {
    await client.connect();
    console.log('Connected to database.');
    
    const schemaPath = path.join(__dirname, 'postgres_schema.sql');
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found at ${schemaPath}`);
    }
    
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('Executing schema script...');
    await client.query(schemaSql);
    console.log('Schema executed successfully.');
    
  } catch (error) {
    console.error('Failed to initialize database:', error);
  } finally {
    await client.end();
  }
}

initDB();
