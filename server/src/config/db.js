import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432'),
  max: 20, // Maximum number of concurrent connections in the pool
  idleTimeoutMillis: 60000, // Close idle connections after 60 seconds
  connectionTimeoutMillis: 10000, // Return an error if a connection takes longer than 10 seconds
});

// Structural check verifying communication with your PostgreSQL DDL schema
pool.on('connect', () => {
  console.log(' PostgreSQL connection pool established successfully.');
});

pool.on('error', (err) => {
  console.error(' Unexpected database error on idle pool connection:', err);
});

export const query = (text, params) => pool.query(text, params);
export default pool;