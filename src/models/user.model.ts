import { pool } from '../config/db'; // MySQL 연결

// 사용자 모델 정의
export class User {
  id: number;
  name: string;
  email: string;
  password?: string; // 비밀번호는 로그인 시에만 사용
  phone: string;
  picture?: string; // 구글 로그인 시에 사진이 있을 수 있음

  constructor(id: number, name: string, email: string, phone: string, picture?: string, password?: string) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.phone = phone;
    this.picture = picture;
    this.password = password;
  }

  // 사용자 조회
  static async findByEmail(email: string) {
    const [rows] = await pool.query('SELECT * FROM user WHERE email = ?', [email]);
    const user = (rows as any)[0];
    return user ? new User(user.id, user.name, user.email, user.phone, user.picture, user.password) : null;
  }

  // 사용자 생성
  static async create(name: string, email: string, phone: string, picture?: string) {
    const query = 'INSERT INTO user (name, email, phone, picture) VALUES (?, ?, ?, ?)';
    const [result] = await pool.query(query, [name, email, phone, picture]);

    // `result`를 `ResultSetHeader` 타입으로 처리
    const insertId = (result as any).insertId;
    const newUser = new User(insertId, name, email, phone, picture);
    return newUser;
  }
}
