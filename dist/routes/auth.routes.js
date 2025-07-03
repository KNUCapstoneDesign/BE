"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_controller_1 = require("../controllers/auth.controller");
const router = express_1.default.Router();
// 회원가입
router.post('/signup', auth_controller_1.signup);
// 로그인
router.post('/login', auth_controller_1.login);
// 구글 로그인
router.post('/google', auth_controller_1.googleTokenLogin);
exports.default = router;
