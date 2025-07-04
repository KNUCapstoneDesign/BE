# Node.js 18 기반의 슬림 이미지 사용
FROM node:22

# puppeteer 및 크롬 실행에 필요한 패키지 설치
RUN apt-get update && apt-get install -y \
    wget \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# 작업 디렉토리 생성 및 이동
WORKDIR /app

# package.json, package-lock.json 복사
COPY package*.json ./

# puppeteer 설치 (full 버전)
RUN npm install
RUN npx puppeteer browsers install chrome

# 소스 복사 및 빌드
COPY . .
RUN npm run build

# 5001 포트 오픈
EXPOSE 5001

# 실행 명령
CMD ["node", "dist/index.js"]
