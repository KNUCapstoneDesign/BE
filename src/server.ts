// src/server.ts
import express from 'express';
import authRoutes from './routes/auth.routes';
import cors from 'cors';

const app = express();

app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://port-0-planit-fe-mcmt59q6ef387a77.sel5.cloudtype.app',
    'https://capstonedesign-iota.vercel.app',
  ],
  credentials: true,
}));
app.use(express.json());
app.use('/api', authRoutes); // ← 여기서 /api/signup 이 완성됨

app.listen(5001, () => {
  console.log('Server is running on port 5001');
});
