"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const mysql2_1 = __importDefault(require("mysql2"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = require("./config/db");
dotenv_1.default.config();
const db = mysql2_1.default.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});
const app = (0, express_1.default)();
// 미들웨어 설정
app.use((0, cors_1.default)());
app.use((0, morgan_1.default)("dev"));
app.use(express_1.default.json());
// 회원가입 API
app.post('/api/signup', async (req, res) => {
    const { username, email, password } = req.body;
    if (password.length < 8) {
        res.status(400).json({ message: '비밀번호는 최소 8자 이상이어야 합니다.' });
        return;
    }
    try {
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const query = 'INSERT INTO user (username, email, password) VALUES (?, ?, ?)';
        db.query(query, [username, email, hashedPassword], (err, result) => {
            if (err) {
                console.error('DB 저장 실패:', err);
                return res.status(500).json({ message: '회원가입에 실패했습니다.' });
            }
            return res.status(200).json({ message: '회원가입 성공!' });
        });
    }
    catch (err) {
        console.error('서버 오류:', err);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});
// 기본 라우트
app.get('/', (req, res) => {
    res.send("여행지 코스 추천 API 서버가 정상적으로 실행 중!");
});
// 테스트 쿼리
app.get('/test-query', (req, res) => {
    db_1.connection.query('SELECT * FROM testtable', (err, results) => {
        if (err) {
            console.error('쿼리 실행 오류:', err);
            return res.status(500).send('쿼리 오류');
        }
        res.status(200).json(results);
    });
});
// 서버 시작
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 서버가 http://localhost:${PORT} 에서 실행 중`);
});
process.on('SIGINT', () => {
    (0, db_1.closeConnection)();
    process.exit();
});
