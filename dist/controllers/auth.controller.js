"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = exports.signup = exports.googleTokenLogin = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const axios_1 = __importDefault(require("axios"));
const db_1 = require("../config/db");
const qs_1 = __importDefault(require("qs")); // 👈 설치 필요: npm install qs
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const googleTokenLogin = async (req, res) => {
    const { code } = req.body;
    if (!code) {
        res.status(400).json({ message: '코드가 없습니다.' });
        return;
    }
    try {
        // 1. code로 access_token 요청
        const tokenRes = await axios_1.default.post('https://oauth2.googleapis.com/token', qs_1.default.stringify({
            code,
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            redirect_uri: process.env.GOOGLE_REDIRECT_URI,
            grant_type: 'authorization_code',
        }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
        const { access_token } = tokenRes.data;
        // 2. 유저 정보 요청
        const userInfoRes = await axios_1.default.get('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${access_token}` },
        });
        const { email, name, id: googleId } = userInfoRes.data;
        // 3. DB 사용자 확인 또는 생성
        let user;
        const [rowsByGoogleId] = await db_1.pool.query('SELECT * FROM user WHERE googleId = ?', [googleId]);
        user = rowsByGoogleId[0];
        if (!user) {
            // 구글 ID 기준으로는 없지만 이메일로 이미 가입된 사용자일 수도 있음
            const [rowsByEmail] = await db_1.pool.query('SELECT * FROM user WHERE email = ?', [email]);
            const existingUser = rowsByEmail[0];
            if (existingUser) {
                // 이미 이메일로 가입된 사용자라면 googleId만 업데이트
                await db_1.pool.query('UPDATE user SET googleId = ? WHERE email = ?', [googleId, email]);
                user = existingUser; // 기존 유저로 사용
            }
            else {
                // 완전히 새로운 사용자 → INSERT
                const [result] = await db_1.pool.query('INSERT INTO user (name, email, googleId) VALUES (?, ?, ?)', [name, email, googleId]);
                const insertId = result.insertId;
                const [newUserRows] = await db_1.pool.query('SELECT * FROM user WHERE user_id = ?', [insertId]);
                user = newUserRows[0]; // ✅ 여기서 user_id 포함된 진짜 유저 정보 가져옴
            }
        }
        // 4. JWT 발급 및 응답
        const token = jsonwebtoken_1.default.sign({ email, googleId }, JWT_SECRET, { expiresIn: '1d' });
        res.json({
            user_id: user.user_id,
            token,
            name,
            email,
            isExistingMember: !!user,
            phone: user?.phone || ''
        });
    }
    catch (err) {
        console.error('Google 로그인 처리 오류:', err);
        res.status(500).json({ message: 'Google 로그인 중 서버 오류 발생' });
    }
};
exports.googleTokenLogin = googleTokenLogin;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
// 회원가입
const signup = async (req, res) => {
    const { name, email, password, phone } = req.body;
    try {
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        await db_1.pool.query('INSERT INTO user (name, email, password, phone) VALUES (?, ?, ?, ?)', [
            name,
            email,
            hashedPassword,
            phone,
        ]);
        res.status(201).json({ message: '회원가입이 완료되었습니다.' });
    }
    catch (err) {
        console.error('회원가입 에러:', err);
        res.status(500).json({ message: '서버 에러' });
    }
};
exports.signup = signup;
// 로그인
const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const [rows] = await db_1.pool.query('SELECT * FROM user WHERE email = ?', [email]);
        const user = rows[0];
        if (!user) {
            res.status(401).json({ message: '존재하지 않는 사용자입니다.' });
            return;
        }
        const isMatch = await bcryptjs_1.default.compare(password, user.password);
        if (!isMatch) {
            res.status(401).json({ message: '비밀번호가 틀렸습니다.' });
            return;
        }
        const token = jsonwebtoken_1.default.sign({ email: user.email }, JWT_SECRET, { expiresIn: '1d' });
        res.json({
            token,
            name: user.name,
            email: user.email,
            phone: user.phone,
            user_id: user.user_id,
        });
    }
    catch (err) {
        console.error('로그인 에러:', err);
        res.status(500).json({ message: '서버 에러' });
    }
};
exports.login = login;
