import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { pool } from '../config/db'; // mysql2로 만든 커넥션 풀

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

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
