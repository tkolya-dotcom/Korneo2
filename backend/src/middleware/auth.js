import { supabase } from '../config/supabase.js';

const getTokenFromRequest = (req) => {
  const authHeader = req.headers.authorization;
  return authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
};

const resolveAuthenticatedUser = async (token) => {
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !authUser) {
    return { user: null, error: authError || new Error('User not found in Supabase Auth') };
  }

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single();

  if (userError || !user) {
    return { user: null, error: userError || new Error('User profile not found') };
  }

  return { user, error: null };
};

export const authenticateToken = async (req, res, next) => {
  const token = getTokenFromRequest(req);

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const { user, error } = await resolveAuthenticatedUser(token);
  if (error || !user) {
    return res.status(403).json({ error: 'Invalid or expired Supabase token' });
  }

  req.user = user;
  next();
};

export const requireManager = (req, res, next) => {
  if (req.user?.role !== 'manager') {
    return res.status(403).json({ error: 'Доступ запрещён. Только менеджер может создавать монтажи.' });
  }
  next();
};

export const requireWorker = (req, res, next) => {
  if (req.user?.role !== 'worker' && req.user?.role !== 'manager') {
    return res.status(403).json({ error: 'Access denied. Valid role required.' });
  }
  next();
};

export const optionalAuth = async (req, _res, next) => {
  const token = getTokenFromRequest(req);
  if (!token) {
    req.user = null;
    return next();
  }

  const { user } = await resolveAuthenticatedUser(token);
  req.user = user || null;
  next();
};
