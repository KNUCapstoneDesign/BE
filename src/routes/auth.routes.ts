import express, { RequestHandler } from 'express';
import { googleTokenLogin, signup, login } from '../controllers/auth.controller';

const router = express.Router();

// 회원가입
router.post('/signup', signup);

// 로그인
router.post('/login', login);

// 구글 로그인
router.post('/google', googleTokenLogin as RequestHandler);

export default router;