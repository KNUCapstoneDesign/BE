// src/routes/auth.routes.ts
import express from 'express';
import { login, signup, googleLogin } from '../controllers/auth.controller';

const router = express.Router();

router.post('/login', login);
router.post('/signup', signup);

router.post('/google', googleLogin);
export default router;
