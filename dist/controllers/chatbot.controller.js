"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.postChatbot = void 0;
const axios_1 = __importDefault(require("axios"));
const uuid_1 = require("uuid");
const postChatbot = async (req, res) => {
    try {
        const { messages } = req.body;
        if (!messages || !Array.isArray(messages)) {
            res.status(400).json({ error: 'messages 배열이 필요합니다.' });
        }
        const response = await axios_1.default.post('https://clovastudio.stream.ntruss.com/testapp/v3/chat-completions/HCX-005', {
            messages,
            topP: 0.8,
            topK: 0,
            maxTokens: 256,
            temperature: 0.5,
            repetitionPenalty: 1.1,
            stop: [],
            includeAiFilters: true,
            seed: 0,
        }, {
            headers: {
                'Content-Type': 'application/json',
                'X-NCP-CLOVASTUDIO-REQUEST-ID': (0, uuid_1.v4)(),
                Authorization: 'Bearer nv-77d388d194b2416dafbe71dfdc2de975rwrr',
            },
        });
        res.json(response.data);
    }
    catch (error) {
        console.error(error?.response?.data || error.message);
        res.status(500).json({ error: 'Clova Studio API 호출 실패', detail: error?.response?.data || error.message });
    }
};
exports.postChatbot = postChatbot;
