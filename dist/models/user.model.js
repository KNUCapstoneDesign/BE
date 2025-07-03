"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const db_1 = require("../config/db"); // MySQL 연결
// 사용자 모델 정의
class User {
    constructor(id, name, email, phone, picture, password) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.phone = phone;
        this.picture = picture;
        this.password = password;
    }
    // 사용자 조회
    static async findByEmail(email) {
        const [rows] = await db_1.pool.query('SELECT * FROM user WHERE email = ?', [email]);
        const user = rows[0];
        return user ? new User(user.id, user.name, user.email, user.phone, user.picture, user.password) : null;
    }
    // 사용자 생성
    static async create(name, email, phone, picture) {
        const query = 'INSERT INTO user (name, email, phone, picture) VALUES (?, ?, ?, ?)';
        const [result] = await db_1.pool.query(query, [name, email, phone, picture]);
        // `result`를 `ResultSetHeader` 타입으로 처리
        const insertId = result.insertId;
        const newUser = new User(insertId, name, email, phone, picture);
        return newUser;
    }
}
exports.User = User;
