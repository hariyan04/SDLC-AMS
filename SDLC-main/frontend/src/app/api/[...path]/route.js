import { NextResponse } from 'next/server';
import {
  getUsers,
  createUser,
  authenticateUser,
  getUserById,
  ensureAdminUser,
  updateUserProfile,
  getAssessments,
  getAssessmentById,
  saveAssessment,
  getFeedback,
  saveFeedback,
  getQuestions,
  saveQuestion,
  deleteQuestion,
  getSettings,
  updateSettings
} from '@/lib/db';
import { signToken, getUserIdFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req, { params }) {
  const path = params.path || [];
  const route = path.join('/');

  try {
    // GET /api/auth/me
    if (route === 'auth/me') {
      const user = getUserIdFromRequest(req);
      if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
      const fullUser = await getUserById(user.id);
      if (!fullUser) return NextResponse.json({ message: 'User not found' }, { status: 404 });
      return NextResponse.json({ user: fullUser });
    }

    // GET /api/questions
    if (route === 'questions') {
      const url = new URL(req.url);
      const framework = url.searchParams.get('framework');
      const questions = await getQuestions(framework);
      return NextResponse.json({ questions });
    }

    // GET /api/assessments or GET /api/assessments/:id
    if (path[0] === 'assessments') {
      if (path.length > 1) {
        const id = path[1];
        const assessment = await getAssessmentById(id);
        if (!assessment) return NextResponse.json({ message: 'Assessment not found' }, { status: 404 });
        return NextResponse.json({ assessment });
      }
      const user = getUserIdFromRequest(req);
      const userId = user && user.role !== 'admin' ? user.id : null;
      const assessments = await getAssessments(userId);
      return NextResponse.json({ assessments });
    }

    // GET /api/users
    if (route === 'users') {
      const user = getUserIdFromRequest(req);
      if (!user || user.role !== 'admin') {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      }
      const users = await getUsers();
      return NextResponse.json({ users });
    }

    // GET /api/feedback
    if (route === 'feedback') {
      const feedback = await getFeedback();
      return NextResponse.json({ feedback });
    }

    // GET /api/settings
    if (route === 'settings') {
      const settings = await getSettings();
      return NextResponse.json({ settings });
    }

    return NextResponse.json({ message: 'Endpoint not found' }, { status: 404 });
  } catch (error) {
    console.error(`API GET /api/${route} error:`, error);
    return NextResponse.json({ message: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  const path = params.path || [];
  const route = path.join('/');

  try {
    let body = {};
    try {
      body = await req.json();
    } catch (_) {}

    // POST /api/auth/signup
    if (route === 'auth/signup') {
      const { email, password } = body;
      if (!email || !password) {
        return NextResponse.json({ success: false, message: 'Email and password are required' }, { status: 400 });
      }
      if (password.length < 6) {
        return NextResponse.json({ success: false, message: 'Password must be at least 6 characters' }, { status: 400 });
      }
      try {
        const user = await createUser(email, password);
        const token = signToken(user);
        const res = NextResponse.json({ success: true, user, token });
        res.cookies.set('token', token, { httpOnly: true, path: '/' });
        return res;
      } catch (err) {
        return NextResponse.json({ success: false, message: err.message }, { status: 400 });
      }
    }

    // POST /api/auth/login
    if (route === 'auth/login') {
      const { email, password } = body;
      if (!email || !password) {
        return NextResponse.json({ success: false, message: 'Email and password are required' }, { status: 400 });
      }
      const user = await authenticateUser(email, password);
      if (!user) {
        return NextResponse.json({ success: false, message: 'Invalid email or password' }, { status: 401 });
      }
      const token = signToken(user);
      const res = NextResponse.json({ success: true, user, token });
      res.cookies.set('token', token, { httpOnly: true, path: '/' });
      return res;
    }

    // POST /api/auth/logout
    if (route === 'auth/logout') {
      const res = NextResponse.json({ success: true, message: 'Logged out' });
      res.cookies.set('token', '', { expires: new Date(0), path: '/' });
      return res;
    }

    // POST /api/users/profile
    if (route === 'users/profile') {
      const user = getUserIdFromRequest(req);
      if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
      const { name, gender } = body;
      const updated = await updateUserProfile(user.id, name, gender);
      return NextResponse.json({ success: true, user: updated });
    }

    // POST /api/assessments
    if (route === 'assessments') {
      const user = getUserIdFromRequest(req);
      if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
      const assessmentData = {
        ...body,
        userId: user.id,
        userEmail: user.email
      };
      const assessment = await saveAssessment(assessmentData);
      return NextResponse.json({ success: true, assessment });
    }

    // POST /api/questions
    if (route === 'questions') {
      const user = getUserIdFromRequest(req);
      if (!user || user.role !== 'admin') return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      await saveQuestion(body);
      return NextResponse.json({ success: true });
    }

    // POST /api/feedback
    if (route === 'feedback') {
      const user = getUserIdFromRequest(req);
      const feedbackData = {
        ...body,
        userId: user ? user.id : 'anonymous',
        userEmail: user ? user.email : ''
      };
      const feedback = await saveFeedback(feedbackData);
      return NextResponse.json({ success: true, feedback });
    }

    // POST /api/settings
    if (route === 'settings') {
      const user = getUserIdFromRequest(req);
      if (!user || user.role !== 'admin') return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      const settings = await updateSettings(body);
      return NextResponse.json({ success: true, settings });
    }

    return NextResponse.json({ message: 'Endpoint not found' }, { status: 404 });
  } catch (error) {
    console.error(`API POST /api/${route} error:`, error);
    return NextResponse.json({ message: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  const path = params.path || [];
  const route = path.join('/');

  try {
    if (path[0] === 'questions' && path.length > 1) {
      const user = getUserIdFromRequest(req);
      if (!user || user.role !== 'admin') return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      const id = path[1];
      const deleted = await deleteQuestion(id);
      return NextResponse.json({ success: deleted });
    }
    return NextResponse.json({ message: 'Endpoint not found' }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ message: error.message || 'Internal server error' }, { status: 500 });
  }
}
