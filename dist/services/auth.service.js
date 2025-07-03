"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.googleLoginService = void 0;
const db_1 = require("../config/db"); // MySQL 연결
const googleLoginService = async (email, name, picture) => {
    try {
        // 구글로부터 받은 이메일로 유저가 존재하는지 확인
        const [rows] = await db_1.pool.query('SELECT * FROM user WHERE email = ?', [email]);
        const user = rows[0];
        if (user) {
            // 이미 존재하는 사용자라면 로그인 처리를 해주고, 사용자 정보를 반환
            return {
                message: '로그인 성공',
                user,
            };
        }
        else {
            // 새로운 사용자라면 DB에 생성 후 반환
            const password = ''; // 비밀번호는 기본값으로 빈 문자열 처리
            const phone = ''; // 전화번호는 기본값으로 빈 문자열 처리
            const query = 'INSERT INTO user (name, email, password, phone, picture) VALUES (?, ?, ?, ?, ?)';
            const [result] = await db_1.pool.query(query, [name, email, password, phone, picture]);
            const insertId = result.insertId;
            // 새로 생성된 사용자의 정보 반환
            const newUser = {
                id: insertId,
                name,
                email,
                picture,
                phone,
            };
            return {
                message: '회원가입 후 로그인 성공',
                user: newUser,
            };
        }
    }
    catch (error) {
        console.error('구글 로그인 처리 중 에러 발생:', error);
        throw new Error('구글 로그인 처리 중 오류가 발생했습니다.');
    }
};
exports.googleLoginService = googleLoginService;
