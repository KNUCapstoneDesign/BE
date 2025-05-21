import { pool } from '../config/db'

export const getFullScheduleByUserId = async (userId: number) => {
  const [schedules] = await pool.query('SELECT * FROM UserSchedule WHERE user_id = ?', [userId])

  const result = await Promise.all(
    (schedules as any[]).map(async (schedule) => {
      const [courses] = await pool.query(
        'SELECT * FROM ScheduleCourse WHERE schedule_id = ? ORDER BY day ASC',
        [schedule.schedule_id]
      )

      const courseWithSpots = await Promise.all(
        (courses as any[]).map(async (course) => {
          const [spots] = await pool.query(
            'SELECT * FROM ScheduleCourseSpot WHERE course_id = ? ORDER BY sequence ASC',
            [course.course_id]
          )
          return {
            day: course.day,
            spots: (spots as any[]).map((s: any) => ({
              place_id: s.place_id,
              sequence: s.sequence,
            })),
          }
        })
      )

      return {
        schedule_id: schedule.schedule_id,
        title: schedule.title,
        start_date: schedule.start_date.toISOString().split('T')[0],
        end_date: schedule.end_date.toISOString().split('T')[0],
        courses: courseWithSpots,
      }
    })
  )

  return result
}