"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/fullschedule.route.ts
const express_1 = __importDefault(require("express"));
const fullschedule_service_1 = require("../services/fullschedule.service");
const router = express_1.default.Router();
router.get('/', async (req, res) => {
    const userId = parseInt(req.query.user_id);
    if (!userId)
        res.status(400).json({ error: 'Missing user_id' });
    try {
        const schedules = await (0, fullschedule_service_1.getFullScheduleByUserId)(userId);
        res.json(schedules);
    }
    catch (err) {
        console.error('GET /full-schedule error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
