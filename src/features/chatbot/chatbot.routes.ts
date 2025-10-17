import { Hono } from 'hono';
import { streamChat } from './chatbot.controller';

const router = new Hono();

// Public route - streams answer as Server-Sent Events
router.post('/stream', streamChat);

export default router;
