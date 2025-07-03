"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addSpotToSchedule = void 0;
// src/services/schedulespot.service.ts
const db_1 = require("../config/db");
const addSpotToSchedule = async ({ schedule_id, day, place_id, contenttypeid, sequence }) => {
    // 1. course_id 찾거나 생성
    const [existing] = await db_1.pool.query('SELECT * FROM ScheduleCourse WHERE schedule_id = ? AND day = ?', [schedule_id, day]);
    let course_id;
    if (existing.length > 0) {
        course_id = existing[0].course_id;
    }
    else {
        const [result] = await db_1.pool.query('INSERT INTO ScheduleCourse (schedule_id, day) VALUES (?, ?)', [schedule_id, day]);
        course_id = result.insertId;
    }
    // 2. 장소 추가
    await db_1.pool.query('INSERT INTO ScheduleCourseSpot (course_id ,place_id, contenttypeid, sequence) VALUES (?, ?, ?, ?)', [course_id, place_id, contenttypeid, sequence]);
    return { message: '장소가 추가되었습니다.', course_id };
};
exports.addSpotToSchedule = addSpotToSchedule;
