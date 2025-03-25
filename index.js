require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const mysql = require('mysql2');
const bcrypt = require('bcrypt');

const {connection, closeConnection} = require("./db");

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

const app = express();

// 미들웨어 설정
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

app.post('/api/signup', async (req, res) => {
    const { username, email, password } = req.body;

    // 비밀번호 유효성 검사 (최소 8자 이상)
    if (password.length < 8) {
        return res.status(400).json({ message: '비밀번호는 최소 8자 이상이어야 합니다.' });
    }

    try {
        // 비밀번호 해싱
        const hashedPassword = await bcrypt.hash(password, 10);

        // 사용자 정보 DB에 삽입
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
app.get("/", (req, res) => {
    res.send("여행지 코스 추천 API 서버가 정상적으로 실행 중!");
});

// 쿼리 예시
app.get("/test-query", (req, res) => {
    connection.query('SELECT * FROM testtable', (err, results) => {
        if (err) {
            console.error('쿼리 실행 오류:', err);
            return res.status(500).send('쿼리 오류');
        }
        res.status(200).json(results);  // 결과를 클라이언트에 반환
    });
});

// 서버 실행
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 서버가 http://localhost:${PORT} 에서 실행 중`);
});

process.on('SIGINT', () => {
    closeConnection();
    process.exit();
});
