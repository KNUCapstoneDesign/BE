// src/index.ts
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { closeConnection } from './config/db';
import authRoutes from './routes/auth.routes';
import menuRouter from './routes/menu'
import scheduleRouter from './routes/schedule.route'
import schedulespotRoutes from './routes/schedulespot.routes'
import fullscheduleRouter from './routes/fullschedule.route'
import chatbotRouter from './routes/chatbot.route';
dotenv.config();

const app = express();

// app.options('*', cors({
//   origin: 'https://capstonedesign-iota.vercel.app',
//   credentials: true
// }));

app.use(cors({
  origin: [
    'https://capstonedesign-iota.vercel.app',
    'http://localhost:3000'
  ],
  credentials: true, // withCredentials 요청 허용 시 필요
}));

app.use(morgan('dev'));
app.use(express.json());

// 라우터 연결
app.use('/api/auth', authRoutes);

app.use('/api/menu', menuRouter)

app.use('/api/schedules', scheduleRouter)

app.use('/api/schedulespots', schedulespotRoutes)

app.use('/api/full-schedule', fullscheduleRouter)

app.use('/api/chatbot', chatbotRouter)
// 기본 라우트
app.get('/', (req, res) => {
  res.send('🎉 여행지 코스 추천 API 서버가 실행 중입니다!');
});

// 서버 시작
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`🚀 서버가 http://localhost:${PORT} 에서 실행 중`);
});

// 종료 시 DB 연결 해제
process.on('SIGINT', () => {
  closeConnection();
  process.exit();
});
