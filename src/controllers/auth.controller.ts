import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { pool } from '../config/db'; // mysql2로 만든 커넥션 풀
import axios from 'axios';
import jwksClient, { SigningKey } from 'jwks-rsa'; // Google public keys를 확인할 수 있는 라이브러리

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const client = jwksClient({
  jwksUri: 'https://www.googleapis.com/oauth2/v3/certs',
});

// 공개 키를 가져오는 함수
const getGoogleKey = (kid: string) => {
  return new Promise<string>((resolve, reject) => {
    client.getSigningKey(kid, (err, key) => {
      if (err || !key) {
        return reject(err || new Error('Signing key not found'))
      }
      const signingKey = key as SigningKey; // 명시적 타입 단언
      resolve(key.getPublicKey());
    });
  });
};

export const googleLogin = async (req: Request, res: Response) => {
  const { token } = req.body; // 클라이언트에서 전달받은 구글 토큰

  try {
    // 구글 토큰 검증을 위해 구글의 공개 키를 사용하여 토큰을 검증
    const response = await axios.get(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
    const { email, name, picture } = response.data;

    // 이메일로 기존 사용자 확인
    const [rows] = await pool.query('SELECT * FROM user WHERE email = ?', [email]);
    let user = (rows as any)[0];

    if (!user) {
      // 기존 사용자가 없다면 새 사용자로 등록
      await pool.query('INSERT INTO user (name, email, password, phone, picture) VALUES (?, ?, ?, ?, ?)', [name, email, '', '', picture]);
      user = { name, email, picture };
    }

    // JWT 토큰 생성
    const newToken = jwt.sign({ email: user.email }, JWT_SECRET, { expiresIn: '1d' });

    // 로그인 성공 후 사용자 정보와 토큰을 반환
    res.json({
      token: newToken,
      name: user.name,
      email: user.email,
      picture: user.picture,
    });
  } catch (err) {
    console.error('구글 로그인 처리 에러:', err);
    res.status(500).json({ message: '서버 에러' });
  }
};

export const signup = async (req: Request, res: Response) => {
  const { name, email, password, phone } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query('INSERT INTO user (name, email, password, phone) VALUES (?, ?, ?, ?)', [name, email, hashedPassword, phone]);

    res.status(201).json({ message: '회원가입이 완료되었습니다.' });
  } catch (err) {
    console.error('회원가입 에러:', err);
    res.status(500).json({ message: '서버 에러' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const {email, password } = req.body;

  try {
    const [rows] = await pool.query('SELECT * FROM user WHERE email = ?', [email]);
    const user = (rows as any)[0];

    if (!user) {
       res.status(401).json({ message: '존재하지 않는 사용자입니다.' });
    }

    console.log('입력한 비밀번호:', password);
    console.log('DB 비밀번호 해시:', user.password);
    const isMatch = await bcrypt.compare(password, user.password);
    console.log('비밀번호 일치 여부:', isMatch);
    if (!isMatch) {
      res.status(401).json({ message: '비밀번호가 틀렸습니다.' });
    }

    const token = jwt.sign({ email: user.email }, JWT_SECRET, { expiresIn: '1d' });

     res.json({
      token,
      name: user.name,
      email: user.email,
      phone: user.phone,
    });
  } catch (err) {
    console.error('로그인 에러:', err);
     res.status(500).json({ message: '서버 에러' });
  }
};
