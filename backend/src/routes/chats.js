import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get members for a chat
router.get('/:chatId/members', authenticateToken, async (req, res) => {
  try {
    const { chatId } = req.params;

    const { data, error } = await supabase
      .from('chat_members')
      .select(`
        user_id,
        joined_at,
        role,
        users(id, name, email, role, is_online)
      `)
      .eq('chat_id', chatId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ members: data || [] });
  } catch (error) {
    console.error('Get chat members error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
