// db.js
const mysql = require('mysql2');
require('dotenv').config();  // 환경 변수 로드

// MariaDB 연결 설정
const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

// DB 연결 확인
connection.connect((err) => {
    if (err) {
        console.error('DB 연결 오류:', err.stack);
        return;
    }
    console.log('DB 연결 성공');
});

// 연결 종료 함수
const closeConnection = () => {
    connection.end((err) => {
        if (err) {
            console.error('DB 연결 종료 오류:', err);
            return;
        }
        console.log('DB 연결 종료');
    });
};

module.exports = {
    connection,
    closeConnection
};
