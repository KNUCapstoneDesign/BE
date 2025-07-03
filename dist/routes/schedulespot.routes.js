"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const schedulespot_service_1 = require("../services/schedulespot.service");
const router = express_1.default.Router();
// 장소 추가 (일차별 장소)
router.post('/', async (req, res) => {
    const { schedule_id, day, place_id, contenttypeid, sequence } = req.body;
    if (!schedule_id || !day || !place_id || !contenttypeid || sequence === undefined) {
        res.status(400).json({ error: 'Missing required fields' });
    }
    try {
        const result = await (0, schedulespot_service_1.addSpotToSchedule)({ schedule_id, day, place_id, contenttypeid, sequence });
        res.status(201).json(result);
    }
    catch (err) {
        console.error('POST /schedulespots error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
