import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.post('/login', (_req, res) => {
  res.status(410).json({
    error: 'Deprecated endpoint. Use Supabase Auth (supabase.auth.signInWithPassword) from the client.',
  });
});

router.post('/register', (_req, res) => {
  res.status(410).json({
    error: 'Deprecated endpoint. Use Supabase Auth (supabase.auth.signUp) from the client.',
  });
});

router.get('/me', authenticateToken, async (req, res) => {
  res.json({ user: req.user });
});

router.get('/users', authenticateToken, async (req, res) => {
  try {
    const { role } = req.query;
    let query = supabase.from('users').select('id, email, name, role, created_at');

    if (role) {
      query = query.eq('role', role);
    }

    const { data: users, error } = await query;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
