"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const cheerio = __importStar(require("cheerio"));
const puppeteer_1 = __importDefault(require("puppeteer"));
const router = express_1.default.Router();
router.get('/', async (req, res) => {
    const { name } = req.query;
    if (!name || typeof name !== 'string') {
        return res.status(400).json({ error: 'Missing or invalid name parameter' });
    }
    try {
        const browser = await puppeteer_1.default.launch({ headless: true });
        const page = await browser.newPage();
        // User-Agent 설정 (봇 차단 대비)
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36');
        // 검색 페이지 접속 및 로딩 대기
        const searchUrl = `https://www.diningcode.com/list.php?query=${encodeURIComponent(name)}`;
        await page.goto(searchUrl, { waitUntil: 'networkidle2' });
        // h2[id^="title"] 로딩 대기 (최대 10초)
        await page.waitForSelector('h2[id^="title"]', { timeout: 10000 });
        // rid 추출
        const rid = await page.evaluate((targetName) => {
            const titles = Array.from(document.querySelectorAll('h2[id^="title"]'));
            const normalize = (s) => s.replace(/\s/g, '').toLowerCase();
            const target = titles.find(el => normalize(el.textContent || '').includes(normalize(targetName)));
            return target?.id.replace('title', '') || null;
        }, name);
        await browser.close();
        if (!rid) {
            return res.status(404).json({ error: 'No matching restaurant title found' });
        }
        // 상세 페이지 메뉴 크롤링
        const detailUrl = `https://www.diningcode.com/profile.php?rid=${rid}`;
        const detailResponse = await (0, node_fetch_1.default)(detailUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
        });
        const detailHtml = await detailResponse.text();
        const $ = cheerio.load(detailHtml);
        const menus = $('.list.Restaurant_MenuList > li').map((_, el) => ({
            name: $(el).find('.Restaurant_Menu').text().trim(),
            price: $(el).find('.Restaurant_MenuPrice').text().trim(),
        })).get();
        return res.json({ menus });
    }
    catch (err) {
        console.error('❌ 크롤링 실패:', err);
        return res.status(500).json({ error: 'Server error' });
    }
});
exports.default = router;
