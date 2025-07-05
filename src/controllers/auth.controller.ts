import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import { pool } from '../config/db';
import qs from 'qs'; // 👈 설치 필요: npm install qs

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const googleTokenLogin = async (req: Request, res: Response): Promise<void> => {
  const { code } = req.body;

  if (!code) {
    res.status(400).json({ message: '코드가 없습니다.' });
    return;
  }

  try {
    const redirectUris = (process.env.GOOGLE_REDIRECT_URI || '').split(',');
    // 실제 요청의 origin과 일치하는 redirect_uri 사용
    const reqOrigin = req.headers.origin;
    let redirect_uri = redirectUris[0]; // 기본값
    if (reqOrigin && redirectUris.includes(reqOrigin)) {
      redirect_uri = reqOrigin;
    }
    // 1. code로 access_token 요청
    const tokenRes = await axios.post(
      'https://oauth2.googleapis.com/token',
      qs.stringify({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri,
        grant_type: 'authorization_code',
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const { access_token } = tokenRes.data;

    // 2. 유저 정보 요청
    const userInfoRes = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const { email, name, id: googleId } = userInfoRes.data;

    // 3. DB 사용자 확인 또는 생성
    let user;
    const [rowsByGoogleId] = await pool.query('SELECT * FROM user WHERE googleId = ?', [googleId]);
    user = (rowsByGoogleId as any)[0];

    if (!user) {
      // 구글 ID 기준으로는 없지만 이메일로 이미 가입된 사용자일 수도 있음
      const [rowsByEmail] = await pool.query('SELECT * FROM user WHERE email = ?', [email]);
      const existingUser = (rowsByEmail as any)[0];

      if (existingUser) {
        // 이미 이메일로 가입된 사용자라면 googleId만 업데이트
        await pool.query('UPDATE user SET googleId = ? WHERE email = ?', [googleId, email]);
        user = existingUser; // 기존 유저로 사용
      } else {
        // 완전히 새로운 사용자 → INSERT
        const [result] = await pool.query(
          'INSERT INTO user (name, email, googleId) VALUES (?, ?, ?)',
          [name, email, googleId]
        )
        const insertId = (result as any).insertId
        const [newUserRows] = await pool.query('SELECT * FROM user WHERE user_id = ?', [insertId])
        user = (newUserRows as any)[0] // ✅ 여기서 user_id 포함된 진짜 유저 정보 가져옴
      }
    }

    // 4. JWT 발급 및 응답
    const token = jwt.sign({ email, googleId }, JWT_SECRET, { expiresIn: '1d' });

    res.json({
      user_id: user.user_id,
      token,
      name,
      email,
      isExistingMember : !!user,
      phone: user?.phone || ''
    });
  } catch (err) {
    console.error('Google 로그인 처리 오류:', err);
    res.status(500).json({ message: 'Google 로그인 중 서버 오류 발생' });
  }
};

import bcrypt from 'bcryptjs';

// 회원가입
export const signup = async (req: Request, res: Response): Promise<void> => {
  const { name, email, password, phone } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query('INSERT INTO user (name, email, password, phone) VALUES (?, ?, ?, ?)', [
      name,
      email,
      hashedPassword,
      phone,
    ]);

    res.status(201).json({ message: '회원가입이 완료되었습니다.' });
  } catch (err) {
    console.error('회원가입 에러:', err);
    res.status(500).json({ message: '서버 에러' });
  }
};

// 로그인
export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  try {
    const [rows] = await pool.query('SELECT * FROM user WHERE email = ?', [email]);
    const user = (rows as any)[0];

    if (!user) {
      res.status(401).json({ message: '존재하지 않는 사용자입니다.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({ message: '비밀번호가 틀렸습니다.' });
      return;
    }

    const token = jwt.sign({ email: user.email }, JWT_SECRET, { expiresIn: '1d' });

    res.json({
      token,
      name: user.name,
      email: user.email,
      phone: user.phone,
      user_id: user.user_id,

    });
  } catch (err) {
    console.error('로그인 에러:', err);
    res.status(500).json({ message: '서버 에러' });
  }
};