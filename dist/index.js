"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/index.ts
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = require("./config/db");
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const menu_1 = __importDefault(require("./routes/menu"));
const schedule_route_1 = __importDefault(require("./routes/schedule.route"));
const schedulespot_routes_1 = __importDefault(require("./routes/schedulespot.routes"));
const fullschedule_route_1 = __importDefault(require("./routes/fullschedule.route"));
const chatbot_route_1 = __importDefault(require("./routes/chatbot.route"));
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use((0, morgan_1.default)('dev'));
app.use(express_1.default.json());
// 라우터 연결
app.use('/api/auth', auth_routes_1.default);
app.use('/api/menu', menu_1.default);
app.use('/api/schedules', schedule_route_1.default);
app.use('/api/schedulespots', schedulespot_routes_1.default);
app.use('/api/full-schedule', fullschedule_route_1.default);
app.use('/api/chatbot', chatbot_route_1.default);
// 기본 라우트
app.get('/', (req, res) => {
    res.send('🎉 여행지 코스 추천 API 서버가 실행 중입니다!');
});
// 서버 시작
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`🚀 서버가 http://localhost:${PORT} 에서 실행 중`);
});
// 종료 시 DB 연결 해제
process.on('SIGINT', () => {
    (0, db_1.closeConnection)();
    process.exit();
});
