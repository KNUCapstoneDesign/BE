import 'express';

declare module 'express' {
  export interface Request {
    user?: {
      email: string;
      // 필요하다면 여기에 더 추가
    };
  }
}

