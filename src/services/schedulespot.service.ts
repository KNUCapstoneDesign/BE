// src/services/schedulespot.service.ts
import { pool } from '../config/db'

interface AddSpotParams {
  schedule_id: number
  day: number
  place_id: string
  sequence: number
}

export const addSpotToSchedule = async ({ schedule_id, day, place_id, sequence }: AddSpotParams) => {
  // 1. course_id 찾거나 생성
  const [existing] = await pool.query(
    'SELECT * FROM ScheduleCourse WHERE schedule_id = ? AND day = ?',
    [schedule_id, day]
  )

  let course_id: number
  if ((existing as any[]).length > 0) {
    course_id = (existing as any)[0].course_id
  } else {
    const [result] = await pool.query(
      'INSERT INTO ScheduleCourse (schedule_id, day) VALUES (?, ?)',
      [schedule_id, day]
    )
    course_id = (result as any).insertId
  }

  // 2. 장소 추가
  await pool.query(
    'INSERT INTO ScheduleCourseSpot (course_id, place_id, sequence) VALUES (?, ?, ?)',
    [course_id, place_id, sequence]
  )

  return { message: '장소가 추가되었습니다.', course_id }
}
