require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const mysql = require('mysql2');

const {connection, closeConnection} = require("./db");

const app = express();

// 미들웨어 설정
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

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
