import express from 'express';
import { postChatbot } from '../controllers/chatbot.controller';

const router = express.Router();

// POST /api/chatbot
router.post('/', postChatbot);

export default router;

