// src/routes/fullschedule.routes.ts
import express from 'express'
import { getFullScheduleByUserId } from '../services/fullschedule.service'

const router = express.Router()

router.get('/', async (req, res) => {
  const userId = parseInt(req.query.user_id as string)
  if (!userId) return res.status(400).json({ error: 'Missing user_id' })

  try {
    const schedules = await getFullScheduleByUserId(userId)
    res.json(schedules)
  } catch (err) {
    console.error('GET /full-schedule error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router