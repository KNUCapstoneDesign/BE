"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeConnection = exports.pool = void 0;
const promise_1 = __importDefault(require("mysql2/promise"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config(); // .env 파일 로드
// 커넥션 풀 생성
const pool = promise_1.default.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10, // 동시에 최대 10개 연결 허용
    queueLimit: 0,
});
exports.pool = pool;
// DB 연결 확인 함수 (테스트용)
const testConnection = async () => {
    try {
        const connection = await pool.getConnection();
        console.log('✅ DB 연결 성공');
        connection.release(); // 커넥션 반환
    }
    catch (err) {
        console.error('DB 연결 오류:', err);
    }
};
testConnection();
const closeConnection = async () => {
    try {
        await pool.end();
        console.log('DB 커넥션 풀 종료');
    }
    catch (err) {
        console.error('DB 종료 오류:', err);
    }
};
exports.closeConnection = closeConnection;
