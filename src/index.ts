import express, { Request, Response } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import mysql from 'mysql2';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { connection, closeConnection } from './config/db';

dotenv.config();

const db = mysql.createConnection({
  host: process.env.DB_HOST as string,
  user: process.env.DB_USER as string,
  password: process.env.DB_PASSWORD as string,
  database: process.env.DB_NAME as string,
});

const app = express();

// 미들웨어 설정
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());
interface SignupRequestBody {
  username: string;
  email: string;
  password: string;
}
// 회원가입 API
app.post('/api/signup', async (req: Request<{}, {}, SignupRequestBody>, res: Response): Promise<void> => {
  const { username, email, password } = req.body;

  if (password.length < 8) {
    res.status(400).json({ message: '비밀번호는 최소 8자 이상이어야 합니다.' });
    return;
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const query = 'INSERT INTO user (username, email, password) VALUES (?, ?, ?)';
    db.query(query, [username, email, hashedPassword], (err, result) => {
      if (err) {
        console.error('DB 저장 실패:', err);
        return res.status(500).json({ message: '회원가입에 실패했습니다.' });
      }
      return res.status(200).json({ message: '회원가입 성공!' });
    });
  } catch (err) {
    console.error('서버 오류:', err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 기본 라우트
app.get('/', (req: Request, res: Response) => {
  res.send("여행지 코스 추천 API 서버가 정상적으로 실행 중!");
});

// 테스트 쿼리
app.get('/test-query', (req: Request, res: Response) => {
  connection.query('SELECT * FROM testtable', (err, results) => {
    if (err) {
      console.error('쿼리 실행 오류:', err);
      return res.status(500).send('쿼리 오류');
    }
    res.status(200).json(results);
  });
});

// 서버 시작
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`🚀 서버가 http://localhost:${PORT} 에서 실행 중`);
});

process.on('SIGINT', () => {
  closeConnection();
  process.exit();
});
