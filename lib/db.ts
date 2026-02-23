import mysql from "mysql2/promise";

const pool = mysql.createPool({
  host: process.env.DB_HOST ?? "localhost",
  port: Number(process.env.DB_PORT ?? 3306),
  database: process.env.DB_NAME ?? "dashboard",
  user: process.env.DB_USER ?? "admin",
  password: process.env.DB_PASSWORD ?? "test1234",
  charset: "utf8mb4",
  dateStrings: true,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export default pool;
