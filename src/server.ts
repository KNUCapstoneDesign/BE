// src/server.ts
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { closeConnection } from './config/db';
import authRoutes from './routes/auth.routes';
import menuRouter from './routes/menu';
import scheduleRouter from './routes/schedule.route';
import schedulespotRoutes from './routes/schedulespot.routes';
import fullscheduleRouter from './routes/fullschedule.route';
import chatbotRouter from './routes/chatbot.route';
dotenv.config();

const app = express();

const allowedOrigins = [
  'https://capstonedesign-iota.vercel.app',
  'https://port-0-planit-mcmt59q6ef387a77.sel5.cloudtype.app',
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(morgan('dev'));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRouter);
app.use('/api/schedules', scheduleRouter);
app.use('/api/schedulespots', schedulespotRoutes);
app.use('/api/full-schedule', fullscheduleRouter);
app.use('/api/chatbot', chatbotRouter);

app.get('/', (req, res) => {
  res.send('🎉 여행지 코스 추천 API 서버가 실행 중입니다!');
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`🚀 서버가 http://localhost:${PORT} 에서 실행 중`);
});

process.on('SIGINT', () => {
  closeConnection();
  process.exit();
});
