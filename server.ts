import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("results.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS exam_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    class TEXT NOT NULL,
    absent_number TEXT NOT NULL,
    score INTEGER NOT NULL,
    violations INTEGER NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.post("/api/results", (req, res) => {
    const { name, class: className, absentNumber, score, violations } = req.body;
    try {
      const stmt = db.prepare(`
        INSERT INTO exam_results (name, class, absent_number, score, violations)
        VALUES (?, ?, ?, ?, ?)
      `);
      stmt.run(name, className, absentNumber, score, violations);
      res.json({ success: true });
    } catch (error) {
      console.error("Database error:", error);
      res.status(500).json({ error: "Failed to save results" });
    }
  });

  app.get("/api/results", (req, res) => {
    try {
      const results = db.prepare("SELECT * FROM exam_results ORDER BY timestamp DESC").all();
      res.json(results);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch results" });
    }
  });

  app.get("/api/results/download", (req, res) => {
    try {
      const results = db.prepare("SELECT * FROM exam_results ORDER BY timestamp DESC").all();
      
      // Simple CSV generation
      const headers = ["ID", "Nama", "Kelas", "No Absen", "Skor", "Pelanggaran", "Waktu"];
      const rows = results.map((r: any) => [
        r.id,
        r.name,
        r.class,
        r.absent_number,
        r.score,
        r.violations,
        r.timestamp
      ]);
      
      const csvContent = [
        headers.join(","),
        ...rows.map(row => row.join(","))
      ].join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=hasil_ujian.csv");
      res.send(csvContent);
    } catch (error) {
      res.status(500).send("Failed to generate CSV");
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
