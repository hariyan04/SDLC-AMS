import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, 'sdlc_local.db'));

const result = db.prepare("DELETE FROM assessment_reports WHERE generation_status IN ('fallback','pending')").run();
console.log('Cleared cached fallback/pending reports:', result.changes);

const remaining = db.prepare('SELECT id, assessment_id, generation_status FROM assessment_reports').all();
console.log('Remaining cached reports:', remaining.length);
db.close();
