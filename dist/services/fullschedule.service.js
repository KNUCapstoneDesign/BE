"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFullScheduleByUserId = void 0;
const db_1 = require("../config/db");
const getFullScheduleByUserId = async (userId) => {
    const [schedules] = await db_1.pool.query('SELECT * FROM UserSchedule WHERE user_id = ?', [userId]);
    const result = await Promise.all(schedules.map(async (schedule) => {
        const [courses] = await db_1.pool.query('SELECT * FROM ScheduleCourse WHERE schedule_id = ? ORDER BY day ASC', [schedule.schedule_id]);
        const courseWithSpots = await Promise.all(courses.map(async (course) => {
            const [spots] = await db_1.pool.query('SELECT * FROM ScheduleCourseSpot WHERE course_id = ? ORDER BY sequence ASC', [course.course_id]);
            return {
                day: course.day,
                spots: spots.map((s) => ({
                    place_id: s.place_id,
                    contenttypeid: s.contenttypeid,
                    sequence: s.sequence,
                })),
            };
        }));
        return {
            schedule_id: schedule.schedule_id,
            title: schedule.title,
            start_date: schedule.start_date.toISOString().split('T')[0],
            end_date: schedule.end_date.toISOString().split('T')[0],
            courses: courseWithSpots,
        };
    }));
    return result;
};
exports.getFullScheduleByUserId = getFullScheduleByUserId;
