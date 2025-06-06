import { Request, Response } from 'express';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

export const postChatbot = async (req: Request, res: Response) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages 배열이 필요합니다.' });
    }

    const response = await axios.post(
      'https://clovastudio.stream.ntruss.com/testapp/v3/chat-completions/HCX-005',
      {
        messages,
        topP: 0.8,
        topK: 0,
        maxTokens: 256,
        temperature: 0.5,
        repetitionPenalty: 1.1,
        stop: [],
        includeAiFilters: true,
        seed: 0,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-NCP-CLOVASTUDIO-REQUEST-ID': uuidv4(),
          Authorization: 'Bearer nv-77d388d194b2416dafbe71dfdc2de975rwrr',
        },
      }
    );
    return res.json(response.data);
  } catch (error: any) {
    console.error(error?.response?.data || error.message);
    return res.status(500).json({ error: 'Clova Studio API 호출 실패', detail: error?.response?.data || error.message });
  }
};

