// src/models/schedule.model.ts
export interface Schedule {
  schedule_id: number
  user_id: number
  title: string
  start_date: string
  end_date: string
  created_at: string
}

export type NewSchedule = Omit<Schedule, 'schedule_id' | 'created_at'>