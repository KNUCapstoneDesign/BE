import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config(); // .env 파일 로드

// 커넥션 풀 생성
const pool = mysql.createPool({
  host: process.env.DB_HOST as string,
  user: process.env.DB_USER as string,
  password: process.env.DB_PASSWORD as string,
  database: process.env.DB_NAME as string,
  waitForConnections: true,
  connectionLimit: 10, // 동시에 최대 10개 연결 허용
  queueLimit: 0,
});

// DB 연결 확인 함수 (테스트용)
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ DB 연결 성공');
    connection.release(); // 커넥션 반환
  } catch (err) {
    console.error('DB 연결 오류:', err);
  }
};

testConnection();

const closeConnection = async () => {
  try {
    await pool.end();
    console.log('DB 커넥션 풀 종료');
  } catch (err) {
    console.error('DB 종료 오류:', err);
  }
};

export { pool, closeConnection};
