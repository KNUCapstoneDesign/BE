import { pool } from '../config/db'
import { Schedule } from '../models/schedule.model'

// 일정 추가
export const createSchedule = async (schedule: Omit<Schedule, 'schedule_id' | 'created_at'>) => {
  const { user_id, title, start_date, end_date } = schedule
  const [result] = await pool.query(
    `INSERT INTO UserSchedule (user_id, title, start_date, end_date)
     VALUES (?, ?, ?, ?)`,
    [user_id, title, start_date, end_date]
  )

  const insertId = (result as any).insertId

  const [rows] = await pool.query('SELECT * FROM UserSchedule WHERE schedule_id = ?', [insertId])
  return (rows as Schedule[])[0]
}

// 특정 사용자 일정 목록 가져오기
export const getSchedulesByUserId = async (user_id: number): Promise<Schedule[]> => {
  const [rows] = await pool.query('SELECT * FROM UserSchedule WHERE user_id = ?', [user_id])
  return (rows as Schedule[]).map((schedule) => ({
    ...schedule,
    start_date: new Date(schedule.start_date).toISOString().split('T')[0],
    end_date: new Date(schedule.end_date).toISOString().split('T')[0],
  }))
}