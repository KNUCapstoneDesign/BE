import express from 'express'
import { addSpotToSchedule } from '../services/schedulespot.service'

const router = express.Router()

// 장소 추가 (일차별 장소)
router.post('/', async (req, res): Promise<void> => {
  const { schedule_id, day, place_id, contenttypeid, sequence } = req.body

  if (!schedule_id || !day || !place_id || !contenttypeid || sequence === undefined) {
    res.status(400).json({ error: 'Missing required fields' })
  }

  try {
    const result = await addSpotToSchedule({ schedule_id, day, place_id, contenttypeid, sequence })
    res.status(201).json(result)
  } catch (err) {
    console.error('POST /schedulespots error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
