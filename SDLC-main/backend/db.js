/**
 * backend/db.js
 * Dual DB Layer: Uses Supabase when SUPABASE_URL & SUPABASE_ANON_KEY are present (e.g. Vercel / Production),
 * and falls back dynamically to better-sqlite3 for offline local development.
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const isSupabase = Boolean(supabaseUrl && supabaseKey);

export let supabase = null;
if (isSupabase) {
  supabase = createClient(supabaseUrl, supabaseKey);
  console.log('⚡ Connected to Supabase DB at:', supabaseUrl);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH   = path.join(__dirname, 'sdlc_local.db');

let _db = null;
async function getDb() {
  if (!_db) {
    const { default: Database } = await import('better-sqlite3');
    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
    initSchema(_db);
  }
  return _db;
}

function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id          TEXT PRIMARY KEY,
      email       TEXT UNIQUE NOT NULL,
      password    TEXT NOT NULL,
      role        TEXT NOT NULL DEFAULT 'user',
      name        TEXT DEFAULT NULL,
      gender      TEXT DEFAULT NULL,
      created_at  TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS questions (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      framework     TEXT NOT NULL DEFAULT 'SDLC',
      area          TEXT NOT NULL,
      sub_area      TEXT NOT NULL,
      practice      TEXT NOT NULL,
      type          TEXT NOT NULL DEFAULT 'extent',
      question_text TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_questions_framework ON questions(framework);
    CREATE INDEX IF NOT EXISTS idx_questions_area      ON questions(area);

    CREATE TABLE IF NOT EXISTS assessments (
      id               TEXT PRIMARY KEY,
      user_id          TEXT NOT NULL,
      user_email       TEXT,
      project_name     TEXT NOT NULL,
      framework        TEXT NOT NULL DEFAULT 'SDLC',
      answers          TEXT,
      scores           TEXT,
      overall_score    INTEGER DEFAULT 0,
      remarks          TEXT,
      remarks_provider TEXT,
      feedback         TEXT,
      created_at       TEXT DEFAULT (datetime('now')),
      updated_at       TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_assessments_user_id    ON assessments(user_id);
    CREATE INDEX IF NOT EXISTS idx_assessments_framework  ON assessments(framework);
    CREATE INDEX IF NOT EXISTS idx_assessments_created_at ON assessments(created_at);

    CREATE TABLE IF NOT EXISTS feedback (
      id            TEXT PRIMARY KEY,
      assessment_id TEXT NOT NULL,
      user_id       TEXT NOT NULL,
      user_email    TEXT,
      rating        INTEGER NOT NULL,
      comments      TEXT,
      created_at    TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS assessment_reports (
      id                TEXT PRIMARY KEY,
      assessment_id     TEXT NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
      provider          TEXT,
      model             TEXT,
      prompt_version    TEXT DEFAULT 'v1.0',
      report_json       TEXT,
      generation_status TEXT DEFAULT 'pending',
      created_at        TEXT DEFAULT (datetime('now')),
      updated_at        TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_reports_assessment_id ON assessment_reports(assessment_id);

    CREATE TABLE IF NOT EXISTS settings (
      id                  INTEGER PRIMARY KEY DEFAULT 1,
      active_ai_provider  TEXT NOT NULL DEFAULT 'ollama',
      api_keys            TEXT,
      ollama_url          TEXT DEFAULT 'http://localhost:11434',
      ollama_model        TEXT DEFAULT 'llama3',
      api_endpoints       TEXT DEFAULT NULL
    );
  `);

  const adminExists = db.prepare("SELECT id FROM users WHERE id = 'admin_user'").get();
  if (!adminExists) {
    db.prepare(`
      INSERT INTO users (id, email, password, role)
      VALUES ('admin_user','admin@sdlc.com','$2a$10$e3lC5nLrQEWCmu15W69ux./xMB45aDURPA3skiFXmcmmySIWCAD.G','admin')
    `).run();
  }

  const settingsExist = db.prepare("SELECT id FROM settings WHERE id = 1").get();
  if (!settingsExist) {
    db.prepare(`
      INSERT INTO settings (id, active_ai_provider, api_keys, ollama_url, ollama_model, api_endpoints)
      VALUES (1,'ollama','{"openai":"","gemini":"","claude":""}','http://localhost:11434','llama3','{"openai":"","gemini":"","claude":"","ollama":""}')
    `).run();
  }
}

// ─────────────────────────────────────────────────────────
// USER METHODS
// ─────────────────────────────────────────────────────────
export async function getUsers() {
  if (isSupabase) {
    const { data, error } = await supabase.from('users').select('id, email, role, name, gender, created_at');
    if (error) console.error('Supabase getUsers error:', error);
    return data || [];
  }
  const db = await getDb();
  return db.prepare('SELECT id, email, role, name, gender, created_at FROM users').all();
}

export async function createUser(email, password) {
  const bcrypt = await import('bcryptjs');
  if (isSupabase) {
    const { data: existing } = await supabase.from('users').select('id').ilike('email', email).maybeSingle();
    if (existing) throw new Error('User already exists');

    const salt = await bcrypt.default.genSalt(10);
    const hashedPassword = await bcrypt.default.hash(password, salt);
    const id = 'user_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12);

    const { error } = await supabase.from('users').insert({
      id,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: 'user'
    });
    if (error) throw new Error(error.message || 'Error creating user in Supabase');
    return { id, email: email.toLowerCase() };
  }

  const db = await getDb();
  const existing = db.prepare('SELECT id FROM users WHERE email = ? COLLATE NOCASE').get(email);
  if (existing) throw new Error('User already exists');

  const salt = await bcrypt.default.genSalt(10);
  const hashedPassword = await bcrypt.default.hash(password, salt);
  const id = 'user_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12);

  db.prepare('INSERT INTO users (id, email, password, role) VALUES (?, ?, ?, ?)').run(
    id, email.toLowerCase(), hashedPassword, 'user'
  );
  return { id, email: email.toLowerCase() };
}

export async function authenticateUser(email, password) {
  const bcrypt = await import('bcryptjs');
  if (isSupabase) {
    const { data: user, error } = await supabase.from('users').select('*').ilike('email', email).maybeSingle();
    if (error || !user) return null;

    const valid = await bcrypt.default.compare(password, user.password);
    if (!valid) return null;

    return { id: user.id, email: user.email, role: user.role, name: user.name || '', gender: user.gender || '' };
  }

  const db = await getDb();
  const user = db.prepare('SELECT * FROM users WHERE email = ? COLLATE NOCASE').get(email);
  if (!user) return null;

  const valid = await bcrypt.default.compare(password, user.password);
  if (!valid) return null;

  return { id: user.id, email: user.email, role: user.role, name: user.name || '', gender: user.gender || '' };
}

export async function getUserById(id) {
  if (isSupabase) {
    const { data } = await supabase.from('users').select('id, email, role, name, gender, created_at').eq('id', id).maybeSingle();
    return data || null;
  }
  const db = await getDb();
  return db.prepare('SELECT id, email, role, name, gender, created_at FROM users WHERE id = ?').get(id) || null;
}

export async function ensureAdminUser(passwordHash) {
  if (isSupabase) {
    const { data: row } = await supabase.from('users').select('*').eq('email', 'admin@sdlc.com').maybeSingle();
    if (!row) {
      await supabase.from('users').insert({
        id: 'admin_user',
        email: 'admin@sdlc.com',
        password: passwordHash,
        role: 'admin'
      });
      return { id: 'admin_user', email: 'admin@sdlc.com', role: 'admin', name: '', gender: '' };
    }
    return { id: row.id, email: row.email, role: row.role, name: row.name || '', gender: row.gender || '' };
  }

  const db = await getDb();
  const row = db.prepare("SELECT * FROM users WHERE email = 'admin@sdlc.com'").get();
  if (!row) {
    db.prepare("INSERT INTO users (id, email, password, role) VALUES (?, ?, ?, ?)").run(
      'admin_user', 'admin@sdlc.com', passwordHash, 'admin'
    );
    return { id: 'admin_user', email: 'admin@sdlc.com', role: 'admin', name: '', gender: '' };
  }
  return { id: row.id, email: row.email, role: row.role, name: row.name || '', gender: row.gender || '' };
}

export async function updateUserProfile(userId, name, gender) {
  if (isSupabase) {
    await supabase.from('users').update({ name, gender }).eq('id', userId);
    return getUserById(userId);
  }
  const db = await getDb();
  db.prepare('UPDATE users SET name = ?, gender = ? WHERE id = ?').run(name, gender, userId);
  return getUserById(userId);
}

// ─────────────────────────────────────────────────────────
// ASSESSMENT METHODS
// ─────────────────────────────────────────────────────────
export async function getAssessments(userId = null) {
  if (isSupabase) {
    let query = supabase.from('assessments').select('*').order('created_at', { ascending: false });
    if (userId) query = query.eq('user_id', userId);
    const { data, error } = await query;
    if (error) console.error('Supabase getAssessments error:', error);
    return (data || []).map(parseAssessmentRow);
  }
  const db = await getDb();
  const rows = userId
    ? db.prepare('SELECT * FROM assessments WHERE user_id = ? ORDER BY created_at DESC').all(userId)
    : db.prepare('SELECT * FROM assessments ORDER BY created_at DESC').all();
  return rows.map(parseAssessmentRow);
}

export async function getAssessmentById(id) {
  if (isSupabase) {
    const { data, error } = await supabase.from('assessments').select('*').eq('id', id).maybeSingle();
    if (error || !data) return null;
    return parseAssessmentRow(data);
  }
  const db = await getDb();
  const row = db.prepare('SELECT * FROM assessments WHERE id = ?').get(id);
  if (!row) return null;
  return parseAssessmentRow(row);
}

export async function saveAssessment(assessmentData) {
  const id = assessmentData.id || 'asm_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12);
  const framework = assessmentData.framework || 'SDLC';
  const answers   = typeof assessmentData.answers  === 'string' ? assessmentData.answers  : JSON.stringify(assessmentData.answers  || {});
  const scores    = typeof assessmentData.scores   === 'string' ? assessmentData.scores   : JSON.stringify(assessmentData.scores   || {});
  const feedback  = typeof assessmentData.feedback === 'string' ? assessmentData.feedback : JSON.stringify(assessmentData.feedback || null);
  const overallScore = parseInt(assessmentData.overallScore || 0);

  if (isSupabase) {
    const record = {
      id,
      user_id: assessmentData.userId || assessmentData.user_id,
      user_email: assessmentData.userEmail || assessmentData.user_email || '',
      project_name: assessmentData.projectName || assessmentData.project_name || '',
      framework,
      answers,
      scores,
      overall_score: overallScore,
      remarks: assessmentData.remarks || null,
      remarks_provider: assessmentData.remarksProvider || assessmentData.remarks_provider || null,
      feedback
    };
    const { error } = await supabase.from('assessments').upsert(record);
    if (error) console.error('Supabase saveAssessment error:', error);
    return getAssessmentById(id);
  }

  const db = await getDb();
  const existing = db.prepare('SELECT id FROM assessments WHERE id = ?').get(id);
  if (existing) {
    db.prepare(`
      UPDATE assessments
      SET user_id=?, user_email=?, project_name=?, framework=?, answers=?, scores=?, overall_score=?,
          remarks=?, remarks_provider=?, feedback=?, updated_at=datetime('now')
      WHERE id=?
    `).run(
      assessmentData.userId || assessmentData.user_id,
      assessmentData.userEmail || assessmentData.user_email || '',
      assessmentData.projectName || assessmentData.project_name || '',
      framework, answers, scores, overallScore,
      assessmentData.remarks || null,
      assessmentData.remarksProvider || assessmentData.remarks_provider || null,
      feedback, id
    );
  } else {
    db.prepare(`
      INSERT INTO assessments
        (id, user_id, user_email, project_name, framework, answers, scores, overall_score,
         remarks, remarks_provider, feedback)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      assessmentData.userId || assessmentData.user_id,
      assessmentData.userEmail || assessmentData.user_email || '',
      assessmentData.projectName || assessmentData.project_name || '',
      framework, answers, scores, overallScore,
      assessmentData.remarks || null,
      assessmentData.remarksProvider || assessmentData.remarks_provider || null,
      feedback
    );
  }
  return getAssessmentById(id);
}

function parseAssessmentRow(row) {
  const scores = typeof row.scores === 'string' ? JSON.parse(row.scores || '{}') : (row.scores || {});
  let overallScore = row.overall_score != null ? parseInt(row.overall_score) : null;
  if (overallScore == null) {
    const vals = Object.values(scores);
    const avg  = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    overallScore = Math.round((avg / 5) * 100);
  }
  return {
    id:              row.id,
    userId:          row.user_id,
    userEmail:       row.user_email,
    projectName:     row.project_name,
    framework:       row.framework || 'SDLC',
    answers:         typeof row.answers  === 'string' ? JSON.parse(row.answers  || '{}') : (row.answers  || {}),
    scores,
    overallScore,
    remarks:         row.remarks,
    remarksProvider: row.remarks_provider,
    feedback:        typeof row.feedback === 'string' ? JSON.parse(row.feedback || 'null') : (row.feedback || null),
    createdAt:       row.created_at,
    updatedAt:       row.updated_at
  };
}

// ─────────────────────────────────────────────────────────
// FEEDBACK METHODS
// ─────────────────────────────────────────────────────────
export async function getFeedback() {
  if (isSupabase) {
    const { data, error } = await supabase.from('feedback').select('*').order('created_at', { ascending: false });
    if (error) console.error('Supabase getFeedback error:', error);
    return data || [];
  }
  const db = await getDb();
  return db.prepare('SELECT * FROM feedback ORDER BY created_at DESC').all();
}

export async function saveFeedback(feedbackData) {
  const id = 'fb_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12);
  if (isSupabase) {
    const record = {
      id,
      assessment_id: feedbackData.assessmentId,
      user_id: feedbackData.userId,
      user_email: feedbackData.userEmail || '',
      rating: feedbackData.rating,
      comments: feedbackData.comments || ''
    };
    const { error } = await supabase.from('feedback').insert(record);
    if (error) console.error('Supabase saveFeedback error:', error);
    return { id, assessmentId: feedbackData.assessmentId, userId: feedbackData.userId,
             userEmail: feedbackData.userEmail, rating: feedbackData.rating,
             comments: feedbackData.comments, createdAt: new Date().toISOString() };
  }
  const db = await getDb();
  db.prepare(
    'INSERT INTO feedback (id, assessment_id, user_id, user_email, rating, comments) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, feedbackData.assessmentId, feedbackData.userId, feedbackData.userEmail || '',
        feedbackData.rating, feedbackData.comments || '');
  return { id, assessmentId: feedbackData.assessmentId, userId: feedbackData.userId,
           userEmail: feedbackData.userEmail, rating: feedbackData.rating,
           comments: feedbackData.comments, createdAt: new Date().toISOString() };
}

// ─────────────────────────────────────────────────────────
// QUESTION METHODS
// ─────────────────────────────────────────────────────────
export async function getQuestions(framework = null) {
  if (isSupabase) {
    let query = supabase.from('questions').select('*').order('id', { ascending: true });
    if (framework) query = query.eq('framework', framework.toUpperCase());
    const { data, error } = await query;
    if (error) console.error('Supabase getQuestions error:', error);
    return (data || []).map(row => ({
      id:           row.id,
      framework:    row.framework || 'SDLC',
      area:         row.area,
      subArea:      row.sub_area,
      practice:     row.practice,
      type:         row.type,
      questionText: row.question_text
    }));
  }
  const db = await getDb();
  const rows = framework
    ? db.prepare('SELECT * FROM questions WHERE framework = ? ORDER BY id ASC').all(framework.toUpperCase())
    : db.prepare('SELECT * FROM questions ORDER BY id ASC').all();
  return rows.map(row => ({
    id:           row.id,
    framework:    row.framework || 'SDLC',
    area:         row.area,
    subArea:      row.sub_area,
    practice:     row.practice,
    type:         row.type,
    questionText: row.question_text
  }));
}

export async function saveQuestion(questionData) {
  if (isSupabase) {
    const record = {
      framework: questionData.framework || 'SDLC',
      area: questionData.area,
      sub_area: questionData.subArea,
      practice: questionData.practice,
      type: questionData.type || 'extent',
      question_text: questionData.questionText
    };
    if (questionData.id) {
      record.id = questionData.id;
      const { error } = await supabase.from('questions').upsert(record);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('questions').insert(record);
      if (error) throw error;
    }
    return true;
  }

  const db = await getDb();
  if (questionData.id) {
    const existing = db.prepare('SELECT id FROM questions WHERE id = ?').get(questionData.id);
    if (existing) {
      db.prepare(
        'UPDATE questions SET area=?, sub_area=?, practice=?, type=?, question_text=? WHERE id=?'
      ).run(questionData.area, questionData.subArea, questionData.practice,
            questionData.type || 'extent', questionData.questionText, questionData.id);
      return true;
    }
  } else {
    const duplicate = db.prepare(
      'SELECT id FROM questions WHERE area = ? AND sub_area = ? AND practice = ?'
    ).get(questionData.area, questionData.subArea, questionData.practice);
    if (duplicate) {
      const err = new Error('Duplicate entry for unique practice');
      err.code = '23505';
      throw err;
    }
  }
  db.prepare(
    'INSERT INTO questions (area, sub_area, practice, type, question_text) VALUES (?, ?, ?, ?, ?)'
  ).run(questionData.area, questionData.subArea, questionData.practice,
        questionData.type || 'extent', questionData.questionText);
  return true;
}

export async function deleteQuestion(id) {
  if (isSupabase) {
    const { error } = await supabase.from('questions').delete().eq('id', parseInt(id));
    return !error;
  }
  const db = await getDb();
  const info = db.prepare('DELETE FROM questions WHERE id = ?').run(parseInt(id));
  return info.changes > 0;
}

// ─────────────────────────────────────────────────────────
// SETTINGS METHODS
// ─────────────────────────────────────────────────────────
export async function getSettings() {
  if (isSupabase) {
    const { data: row } = await supabase.from('settings').select('*').eq('id', 1).maybeSingle();
    const apiKeys      = row ? (typeof row.api_keys      === 'string' ? JSON.parse(row.api_keys      || '{}') : (row.api_keys      || {})) : { openai: '', gemini: '', claude: '' };
    const apiEndpoints = row ? (typeof row.api_endpoints === 'string' ? JSON.parse(row.api_endpoints || '{}') : (row.api_endpoints || {})) : { openai: '', gemini: '', claude: '', ollama: '' };
    const activeAIProvider = process.env.ACTIVE_AI_PROVIDER || (row ? row.active_ai_provider : null) || 'expert';

    if (process.env.OPENAI_API_KEY) apiKeys.openai = process.env.OPENAI_API_KEY;
    if (process.env.GEMINI_API_KEY) apiKeys.gemini = process.env.GEMINI_API_KEY;
    if (process.env.CLAUDE_API_KEY) apiKeys.claude = process.env.CLAUDE_API_KEY;

    return {
      activeAIProvider,
      apiKeys,
      ollamaUrl:   (row ? row.ollama_url   : null) || process.env.OLLAMA_URL   || 'http://localhost:11434',
      ollamaModel: (row ? row.ollama_model : null) || process.env.OLLAMA_MODEL || 'llama3',
      apiEndpoints,
    };
  }

  const db = await getDb();
  const row = db.prepare('SELECT * FROM settings WHERE id = 1').get();
  const apiKeys      = row ? (typeof row.api_keys      === 'string' ? JSON.parse(row.api_keys      || '{}') : (row.api_keys      || {})) : { openai: '', gemini: '', claude: '' };
  const apiEndpoints = row ? (typeof row.api_endpoints === 'string' ? JSON.parse(row.api_endpoints || '{}') : (row.api_endpoints || {})) : { openai: '', gemini: '', claude: '', ollama: '' };
  const activeAIProvider = process.env.ACTIVE_AI_PROVIDER || (row ? row.active_ai_provider : null) || 'expert';

  if (process.env.OPENAI_API_KEY) apiKeys.openai = process.env.OPENAI_API_KEY;
  if (process.env.GEMINI_API_KEY) apiKeys.gemini = process.env.GEMINI_API_KEY;
  if (process.env.CLAUDE_API_KEY) apiKeys.claude = process.env.CLAUDE_API_KEY;

  return {
    activeAIProvider,
    apiKeys,
    ollamaUrl:   (row ? row.ollama_url   : null) || process.env.OLLAMA_URL   || 'http://localhost:11434',
    ollamaModel: (row ? row.ollama_model : null) || process.env.OLLAMA_MODEL || 'llama3',
    apiEndpoints,
  };
}

export async function updateSettings(settingsData) {
  const current = await getSettings();
  const merged  = { ...current, ...settingsData };
  const apiKeys      = JSON.stringify(merged.apiKeys      || { openai: '', gemini: '', claude: '' });
  const apiEndpoints = JSON.stringify(merged.apiEndpoints || { openai: '', gemini: '', claude: '', ollama: '' });

  if (isSupabase) {
    const record = {
      id: 1,
      active_ai_provider: merged.activeAIProvider || 'ollama',
      api_keys: apiKeys,
      ollama_url: merged.ollamaUrl || 'http://localhost:11434',
      ollama_model: merged.ollamaModel || 'llama3',
      api_endpoints: apiEndpoints
    };
    await supabase.from('settings').upsert(record);
    return getSettings();
  }

  const db = await getDb();
  db.prepare(`
    INSERT INTO settings (id, active_ai_provider, api_keys, ollama_url, ollama_model, api_endpoints)
    VALUES (1, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      active_ai_provider = excluded.active_ai_provider,
      api_keys           = excluded.api_keys,
      ollama_url         = excluded.ollama_url,
      ollama_model       = excluded.ollama_model,
      api_endpoints      = excluded.api_endpoints
  `).run(merged.activeAIProvider || 'ollama', apiKeys,
         merged.ollamaUrl || 'http://localhost:11434', merged.ollamaModel || 'llama3',
         apiEndpoints);
  return getSettings();
}

export async function updateAssessmentRemarks(id, remarks, provider) {
  if (isSupabase) {
    await supabase.from('assessments').update({
      remarks,
      remarks_provider: provider || 'AI'
    }).eq('id', id);
    return getAssessmentById(id);
  }
  const db = await getDb();
  db.prepare("UPDATE assessments SET remarks = ?, remarks_provider = ? WHERE id = ?")
    .run(remarks, provider || 'AI', id);
  return getAssessmentById(id);
}

// ─────────────────────────────────────────────────────────
// ASSESSMENT REPORT METHODS
// ─────────────────────────────────────────────────────────
export async function createReport(assessmentId, promptVersion = 'v1.0') {
  const id = crypto.randomUUID();
  if (isSupabase) {
    await supabase.from('assessment_reports').insert({
      id,
      assessment_id: assessmentId,
      generation_status: 'pending',
      prompt_version: promptVersion
    });
    return getReportById(id);
  }
  const db = await getDb();
  db.prepare(`
    INSERT INTO assessment_reports (id, assessment_id, generation_status, prompt_version)
    VALUES (?, ?, 'pending', ?)
  `).run(id, assessmentId, promptVersion);
  return getReportById(id);
}

export async function updateReport(reportId, updates) {
  const allowed = ['generation_status', 'report_json', 'provider', 'model', 'prompt_version'];
  const fields  = Object.keys(updates).filter(k => allowed.includes(k));
  if (fields.length === 0) return getReportById(reportId);

  const payload = {};
  fields.forEach(f => {
    const v = updates[f];
    payload[f] = (f === 'report_json' && typeof v === 'object') ? JSON.stringify(v) : v;
  });

  if (isSupabase) {
    await supabase.from('assessment_reports').update(payload).eq('id', reportId);
    return getReportById(reportId);
  }

  const db = await getDb();
  const setClauses = fields.map(f => `${f} = ?`).join(', ');
  const values = fields.map(f => payload[f]);
  values.push(reportId);

  db.prepare(`UPDATE assessment_reports SET ${setClauses}, updated_at = datetime('now') WHERE id = ?`).run(values);
  return getReportById(reportId);
}

export async function getLatestReport(assessmentId) {
  if (isSupabase) {
    const { data } = await supabase.from('assessment_reports')
      .select('*')
      .eq('assessment_id', assessmentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data) return null;
    return parseReportRow(data);
  }
  const db = await getDb();
  const row = db.prepare(`
    SELECT * FROM assessment_reports
    WHERE assessment_id = ?
    ORDER BY created_at DESC
    LIMIT 1
  `).get(assessmentId);
  if (!row) return null;
  return parseReportRow(row);
}

export async function getReportById(reportId) {
  if (isSupabase) {
    const { data } = await supabase.from('assessment_reports').select('*').eq('id', reportId).maybeSingle();
    if (!data) return null;
    return parseReportRow(data);
  }
  const db = await getDb();
  const row = db.prepare('SELECT * FROM assessment_reports WHERE id = ?').get(reportId);
  if (!row) return null;
  return parseReportRow(row);
}

function parseReportRow(row) {
  return {
    id:               row.id,
    assessmentId:     row.assessment_id,
    provider:         row.provider,
    model:            row.model,
    promptVersion:    row.prompt_version,
    reportJson:       typeof row.report_json === 'string' ? JSON.parse(row.report_json || 'null') : (row.report_json || null),
    generationStatus: row.generation_status,
    createdAt:        row.created_at,
    updatedAt:        row.updated_at,
  };
}