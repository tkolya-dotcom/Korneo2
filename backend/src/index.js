import express from 'express';
import cors from 'cors';
import authRouter from './routes/auth.js';
import projectsRouter from './routes/projects.js';
import tasksRouter from './routes/tasks.js';
import installationsRouter from './routes/installations.js';
import usersRouter from './routes/users.js';
import chatsRouter from './routes/chats.js';

// ⚠️ app должен быть объявлен ДО регистрации любых роутов
const app = express();

app.use(cors());
app.use(express.json());

// --- Основные роуты ---
app.use('/api/auth', authRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/installations', installationsRouter);
app.use('/api/users', usersRouter);
app.use('/api/chats', chatsRouter);

// --- Health check ---
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

export default app;
