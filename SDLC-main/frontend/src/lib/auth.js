import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'gJ02eFMIhiWadL7CXxTEAUcBQpOD6q9VYkv53rswbNz1f4KtGSum8RjnlZoHPy';

export function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role || (user.email === 'admin@sdlc.com' ? 'admin' : 'user') },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

export function getUserIdFromRequest(req) {
  try {
    let token = null;

    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    if (!token) {
      const cookieHeader = req.headers.get('cookie') || '';
      const match = cookieHeader.match(/token=([^;]+)/);
      if (match) token = match[1];
    }

    if (!token) return null;

    const decoded = verifyToken(token);
    return decoded || null;
  } catch (err) {
    return null;
  }
}
