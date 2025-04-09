// src/server.ts
import express from 'express';
import authRoutes from './routes/auth.routes';

const app = express();

app.use(express.json());
app.use('/api', authRoutes); // ← 여기서 /api/signup 이 완성됨

app.listen(5001, () => {
  console.log('Server is running on port 5001');
});
