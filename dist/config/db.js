"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeConnection = exports.connection = void 0;
const mysql2_1 = __importDefault(require("mysql2"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config(); // .env 파일 로드
// MariaDB 연결 설정
const connection = mysql2_1.default.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});
exports.connection = connection;
// DB 연결 확인
connection.connect((err) => {
    if (err) {
        console.error('DB 연결 오류:', err.stack);
        return;
    }
    console.log('✅ DB 연결 성공');
});
// 연결 종료 함수
const closeConnection = () => {
    connection.end((err) => {
        if (err) {
            console.error('DB 연결 종료 오류:', err);
            return;
        }
        console.log('🛑 DB 연결 종료');
    });
};
exports.closeConnection = closeConnection;
