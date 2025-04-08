import mysql from 'mysql2';
import dotenv from 'dotenv';

dotenv.config();  // .env 파일 로드

// MariaDB 연결 설정
const connection = mysql.createConnection({
  host: process.env.DB_HOST as string,
  user: process.env.DB_USER as string,
  password: process.env.DB_PASSWORD as string,
  database: process.env.DB_NAME as string
});

// DB 연결 확인
connection.connect((err) => {
  if (err) {
    console.error('DB 연결 오류:', err.stack);
    return;
  }
  console.log('✅ DB 연결 성공');
});

// 연결 종료 함수
const closeConnection = (): void => {
  connection.end((err) => {
    if (err) {
      console.error('DB 연결 종료 오류:', err);
      return;
    }
    console.log('🛑 DB 연결 종료');
  });
};

export { connection, closeConnection };
