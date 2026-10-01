import express from "express";
import cors from "cors";
import multer from "multer";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const db = new Database("qc.db");
const uploadDir = path.join(__dirname,"uploads");
fs.mkdirSync(uploadDir,{recursive:true});

app.use(cors());
app.use(express.json({limit:"12mb"}));
app.use(express.static(path.join(__dirname,"public")));
app.use("/uploads",express.static(uploadDir));

const storage = multer.diskStorage({
 destination: uploadDir,
 filename: (_,file,cb) => cb(null, Date.now()+"-"+file.originalname.replace(/[^a-zA-Z0-9._-]/g,"_"))
});
const upload = multer({storage, limits:{fileSize:10*1024*1024}});

db.exec(`
CREATE TABLE IF NOT EXISTS jobs(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 contractor TEXT, job_no TEXT, activity TEXT, qc_engineer TEXT,
 status TEXT DEFAULT 'IN PROGRESS',
 contractor_signature TEXT, qc_signature TEXT,
 created_at TEXT DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS checks(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 job_id INTEGER, section_no INTEGER, item_no INTEGER, completed INTEGER DEFAULT 0,
 UNIQUE(job_id,section_no,item_no)
);
CREATE TABLE IF NOT EXISTS attachments(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 job_id INTEGER, section_no INTEGER, item_no INTEGER,
 filename TEXT, original_name TEXT, url TEXT, uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`);

app.get("/api/jobs",(req,res)=>res.json(db.prepare("SELECT * FROM jobs ORDER BY updated_at DESC").all()));
app.post("/api/jobs",(req,res)=>{
 const b=req.body||{};
 const r=db.prepare("INSERT INTO jobs(contractor,job_no,activity,qc_engineer) VALUES(?,?,?,?)")
 .run(b.contractor||"",b.job_no||"",b.activity||"",b.qc_engineer||"");
 res.json(db.prepare("SELECT * FROM jobs WHERE id=?").get(r.lastInsertRowid));
});
app.get("/api/jobs/:id",(req,res)=>{
 const j=db.prepare("SELECT * FROM jobs WHERE id=?").get(req.params.id);
 if(!j)return res.status(404).json({error:"Job not found"});
 res.json(j);
});
app.put("/api/jobs/:id",(req,res)=>{
 const b=req.body||{};
 db.prepare(`UPDATE jobs SET contractor=?,job_no=?,activity=?,qc_engineer=?,status=?,
 contractor_signature=COALESCE(?,contractor_signature),qc_signature=COALESCE(?,qc_signature),
 updated_at=CURRENT_TIMESTAMP WHERE id=?`)
 .run(b.contractor||"",b.job_no||"",b.activity||"",b.qc_engineer||"",b.status||"IN PROGRESS",
 b.contractor_signature??null,b.qc_signature??null,req.params.id);
 res.json(db.prepare("SELECT * FROM jobs WHERE id=?").get(req.params.id));
});
app.delete("/api/jobs/:id",(req,res)=>{
 db.prepare("DELETE FROM checks WHERE job_id=?").run(req.params.id);
 db.prepare("DELETE FROM attachments WHERE job_id=?").run(req.params.id);
 db.prepare("DELETE FROM jobs WHERE id=?").run(req.params.id);
 res.json({ok:true});
});
app.get("/api/jobs/:id/checks",(req,res)=>res.json(db.prepare("SELECT section_no,item_no,completed FROM checks WHERE job_id=?").all(req.params.id)));
app.post("/api/jobs/:id/checks",(req,res)=>{
 const b=req.body||{};
 db.prepare(`INSERT INTO checks(job_id,section_no,item_no,completed) VALUES(?,?,?,?)
 ON CONFLICT(job_id,section_no,item_no) DO UPDATE SET completed=excluded.completed`)
 .run(req.params.id,b.section_no,b.item_no,b.completed?1:0);
 db.prepare("UPDATE jobs SET updated_at=CURRENT_TIMESTAMP WHERE id=?").run(req.params.id);
 res.json({ok:true});
});
app.post("/api/jobs/:id/attachments",upload.single("file"),(req,res)=>{
 if(!req.file)return res.status(400).json({error:"No file"});
 const r=db.prepare(`INSERT INTO attachments(job_id,section_no,item_no,filename,original_name,url)
 VALUES(?,?,?,?,?,?)`).run(req.params.id,req.body.section_no||0,req.body.item_no||0,req.file.filename,req.file.originalname,"/uploads/"+req.file.filename);
 res.json(db.prepare("SELECT * FROM attachments WHERE id=?").get(r.lastInsertRowid));
});
app.get("/api/jobs/:id/attachments",(req,res)=>res.json(db.prepare("SELECT * FROM attachments WHERE job_id=? ORDER BY uploaded_at DESC").all(req.params.id)));
app.get("*",(req,res)=>res.sendFile(path.join(__dirname,"public/index.html")));
app.listen(PORT,()=>console.log(`Relax QC V2 running at http://localhost:${PORT}`));
