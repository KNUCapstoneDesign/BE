import express from 'express'
import { createSchedule, getSchedulesByUserId, deleteScheduleById } from '../services/schedule.service'
import { NewSchedule } from '../models/schedule.model'

const router = express.Router()

router.post('/', async (req, res) => {
  try {
    const { user_id, title, start_date, end_date } = req.body
    if (!user_id || !title || !start_date || !end_date) {
      console.log('Received body:', req.body)
      return res.status(400).json({ error: 'Missing required fields' })
    }
    const data: NewSchedule = { user_id, title, start_date, end_date }
    const result = await createSchedule(data)
    res.status(201).json(result)
  } catch (err) {
    console.error('POST /schedules error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/', async (req, res) => {
  const userId = parseInt(req.query.user_id as string)
  if (!userId) return res.status(400).json({ error: 'Missing user_id' })

  try {
    const result = await getSchedulesByUserId(userId)
    res.json(result)
  } catch (err) {
    console.error('GET /schedules error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.delete('/:id', async (req, res) => {
  const scheduleId = parseInt(req.params.id)
  if (!scheduleId) return res.status(400).json({ error: 'Missing schedule_id' })
  try {

    console.log('[DELETE] 요청 scheduleId:', scheduleId)
    const deletedRows = await deleteScheduleById(scheduleId)
    console.log('[DELETE] 삭제된 row 수:', deletedRows)
    if (deletedRows === 0) {
      return res.status(404).json({ error: '일정이 존재하지 않거나 이미 삭제됨', scheduleId })
    }
    res.status(204).send()
  } catch (err) {
    console.error('DELETE /schedules/:id error:', err)
    res.status(500).json({ error: 'Internal server error', detail: err?.message })
  }
})

export default router

