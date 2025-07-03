"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteScheduleById = exports.getSchedulesByUserId = exports.createSchedule = void 0;
const db_1 = require("../config/db");
// 일정 추가
const createSchedule = async (schedule) => {
    const { user_id, title, start_date, end_date } = schedule;
    const [result] = await db_1.pool.query(`INSERT INTO UserSchedule (user_id, title, start_date, end_date)
     VALUES (?, ?, ?, ?)`, [user_id, title, start_date, end_date]);
    const insertId = result.insertId;
    const [rows] = await db_1.pool.query('SELECT * FROM UserSchedule WHERE schedule_id = ?', [insertId]);
    return rows[0];
};
exports.createSchedule = createSchedule;
// 특정 사용자 일정 목록 가져오기
const getSchedulesByUserId = async (user_id) => {
    const [rows] = await db_1.pool.query('SELECT * FROM UserSchedule WHERE user_id = ?', [user_id]);
    return rows.map((schedule) => ({
        ...schedule,
        start_date: new Date(schedule.start_date).toISOString().split('T')[0],
        end_date: new Date(schedule.end_date).toISOString().split('T')[0],
    }));
};
exports.getSchedulesByUserId = getSchedulesByUserId;
// 일정 삭제 (CASCADE로 하위 테이블 자동 삭제)
const deleteScheduleById = async (schedule_id) => {
    const [result] = await db_1.pool.query('DELETE FROM UserSchedule WHERE schedule_id = ?', [schedule_id]);
    return result.affectedRows || 0;
};
exports.deleteScheduleById = deleteScheduleById;
