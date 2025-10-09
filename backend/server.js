import express from "express";
import cors from "cors";
import mysql from "mysql2";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "tourism_db",
});

db.connect(err => {
  if (err) {
    console.error("❌ Database connection failed:", err);
  } else {
    console.log("✅ Connected to MySQL");
  }
});

app.get("/", (_req, res) => res.send("Tourism API running"));

/** API mẫu: lấy danh sách điểm đến */
app.get("/api/destinations", (_req, res) => {
  db.query("SELECT id, name, city, description, image_url FROM destinations ORDER BY id DESC",
    (err, rows) => {
      if (err) return res.status(500).json({ message: "DB error", error: err });
      res.json(rows);
    });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`🚀 Server started on http://localhost:${PORT}`));

app.get("/api/destinations", (_req, res) => {
  const sql = `
    SELECT d.dest_id, d.name, d.description, d.location, d.image,
           c.name AS city_name
    FROM DESTINATIONS d
    LEFT JOIN CITIES c ON d.city_id = c.city_id
    ORDER BY d.dest_id DESC`;
  db.query(sql, (err, rows) => {
    if (err) return res.status(500).json({ message: "DB error", error: err });
    res.json(rows);
  });
});
