// src/routes/auth.routes.ts
import express from 'express';
import { login } from '../controllers/auth.controller';
import {signup} from '../controllers/auth.controller'

const router = express.Router();

router.post('/login', login);
router.post('/signup', signup);

export default router;
