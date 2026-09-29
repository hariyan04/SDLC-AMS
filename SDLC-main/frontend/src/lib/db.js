/**
 * frontend/src/lib/db.js
 * Supabase / Database Driver for Next.js App Router API Routes
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qorpmcegnudwtfafgjqd.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_wXy1ZrlSQtNo24UH1a2ssA_5RiDBj_H';

export const isSupabase = Boolean(supabaseUrl && supabaseKey);
export const supabase = createClient(supabaseUrl, supabaseKey);

// ─────────────────────────────────────────────────────────
// USER METHODS
// ─────────────────────────────────────────────────────────
export async function getUsers() {
  const { data, error } = await supabase.from('users').select('id, email, role, name, gender, created_at');
  if (error) console.error('Supabase getUsers error:', error);
  return data || [];
}

export async function createUser(email, password) {
  const bcrypt = await import('bcryptjs');
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

export async function authenticateUser(email, password) {
  const bcrypt = await import('bcryptjs');
  const { data: user, error } = await supabase.from('users').select('*').ilike('email', email).maybeSingle();
  if (error || !user) return null;

  const valid = await bcrypt.default.compare(password, user.password);
  if (!valid) return null;

  return { id: user.id, email: user.email, role: user.role, name: user.name || '', gender: user.gender || '' };
}

export async function getUserById(id) {
  const { data } = await supabase.from('users').select('id, email, role, name, gender, created_at').eq('id', id).maybeSingle();
  return data || null;
}

export async function ensureAdminUser(passwordHash) {
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

export async function updateUserProfile(userId, name, gender) {
  await supabase.from('users').update({ name, gender }).eq('id', userId);
  return getUserById(userId);
}

// ─────────────────────────────────────────────────────────
// ASSESSMENT METHODS
// ─────────────────────────────────────────────────────────
export async function getAssessments(userId = null) {
  let query = supabase.from('assessments').select('*').order('created_at', { ascending: false });
  if (userId) query = query.eq('user_id', userId);
  const { data, error } = await query;
  if (error) console.error('Supabase getAssessments error:', error);
  return (data || []).map(parseAssessmentRow);
}

export async function getAssessmentById(id) {
  const { data, error } = await supabase.from('assessments').select('*').eq('id', id).maybeSingle();
  if (error || !data) return null;
  return parseAssessmentRow(data);
}

export async function saveAssessment(assessmentData) {
  const id = assessmentData.id || 'asm_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12);
  const framework = assessmentData.framework || 'SDLC';
  const answers   = typeof assessmentData.answers  === 'string' ? assessmentData.answers  : JSON.stringify(assessmentData.answers  || {});
  const scores    = typeof assessmentData.scores   === 'string' ? assessmentData.scores   : JSON.stringify(assessmentData.scores   || {});
  const feedback  = typeof assessmentData.feedback === 'string' ? assessmentData.feedback : JSON.stringify(assessmentData.feedback || null);
  const overallScore = parseInt(assessmentData.overallScore || 0);

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
  const { data, error } = await supabase.from('feedback').select('*').order('created_at', { ascending: false });
  if (error) console.error('Supabase getFeedback error:', error);
  return data || [];
}

export async function saveFeedback(feedbackData) {
  const id = 'fb_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12);
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

// ─────────────────────────────────────────────────────────
// QUESTION METHODS
// ─────────────────────────────────────────────────────────
export async function getQuestions(framework = null) {
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

export async function saveQuestion(questionData) {
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

export async function deleteQuestion(id) {
  const { error } = await supabase.from('questions').delete().eq('id', parseInt(id));
  return !error;
}

// ─────────────────────────────────────────────────────────
// SETTINGS METHODS
// ─────────────────────────────────────────────────────────
export async function getSettings() {
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

export async function updateSettings(settingsData) {
  const current = await getSettings();
  const merged  = { ...current, ...settingsData };
  const apiKeys      = JSON.stringify(merged.apiKeys      || { openai: '', gemini: '', claude: '' });
  const apiEndpoints = JSON.stringify(merged.apiEndpoints || { openai: '', gemini: '', claude: '', ollama: '' });

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

export async function updateAssessmentRemarks(id, remarks, provider) {
  await supabase.from('assessments').update({
    remarks,
    remarks_provider: provider || 'AI'
  }).eq('id', id);
  return getAssessmentById(id);
}

// ─────────────────────────────────────────────────────────
// ASSESSMENT REPORT METHODS
// ─────────────────────────────────────────────────────────
export async function createReport(assessmentId, promptVersion = 'v1.0') {
  const id = crypto.randomUUID();
  await supabase.from('assessment_reports').insert({
    id,
    assessment_id: assessmentId,
    generation_status: 'pending',
    prompt_version: promptVersion
  });
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

  await supabase.from('assessment_reports').update(payload).eq('id', reportId);
  return getReportById(reportId);
}

export async function getLatestReport(assessmentId) {
  const { data } = await supabase.from('assessment_reports')
    .select('*')
    .eq('assessment_id', assessmentId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return parseReportRow(data);
}

export async function getReportById(reportId) {
  const { data } = await supabase.from('assessment_reports').select('*').eq('id', reportId).maybeSingle();
  if (!data) return null;
  return parseReportRow(data);
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