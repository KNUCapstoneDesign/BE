import express from 'express'
import * as cheerio from 'cheerio'
import puppeteer from 'puppeteer'

const router = express.Router()

router.get('/', async (req, res): Promise<any> => {
  const { name } = req.query

  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid name parameter' })
  }

  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
      ],
    })
    const page = await browser.newPage()
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36')
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
    })
    await page.setViewport({ width: 1280, height: 800 })

    const startAll = Date.now();
    const t = (label: string) => {
      const now = Date.now();
      console.log(`[크롤링 타이밍] ${label}: ${(now - startAll) / 1000}s 경과`);
      return now;
    };
    t('시작');

    // 검색 페이지 접속 및 로딩 대기 (waitUntil: 'domcontentloaded'로 변경, 더 빠른 진행)
    const searchUrl = `https://www.diningcode.com/list.php?query=${encodeURIComponent(name)}`
    let loaded = false;
    let lastError = null;
    for (let i = 0; i < 2; i++) { // 최대 2회 재시도
      try {
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
        t('page.goto 완료');
        loaded = true;
        break;
      } catch (err) {
        lastError = err;
        // detached frame 에러 발생 시 page 새로고침 후 재시도
        if (err instanceof Error && err.message && err.message.includes('detached')) {
          try {
            await page.reload({ waitUntil: 'domcontentloaded', timeout: 20000 });
            t('page.reload 완료');
            loaded = true;
            break;
          } catch (reloadErr) {
            lastError = reloadErr;
          }
        }
      }
    }
    if (!loaded) {
      await browser.close();
      throw lastError;
    }

    // 불필요한 리소스 차단
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const type = req.resourceType();
      if (["image", "stylesheet", "font", "media"].includes(type)) req.abort();
      else req.continue();
    });

    // 페이지 진입 후 2.5초만 대기 (React 렌더링)
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 20000 });
    await new Promise(res => setTimeout(res, 2500));

    // HTML 파싱 (cheerio로 block/title id 추출)
    const html = await page.content();
    const $ = cheerio.load(html);
    let rid: string | null = null;
    const block = $('a[id^="block"]').first();
    if (block.length) {
      const match = block.attr('id')?.match(/^block(.+)/);
      if (match) rid = match[1];
    }
    if (!rid) {
      const h2 = $('h2[id^="title"]').first();
      const match = h2.attr('id')?.match(/^title(.+)/);
      if (match) rid = match[1];
    }

    await browser.close();

    if (!rid) {
      // 디버깅용: 실패 시 HTML 저장
      try { require('fs').writeFileSync('debug_diningcode.html', html); } catch(e) {}
      return res.status(404).json({ error: 'No matching restaurant title found' });
    }

    // fetch를 동적으로 import
    const fetch = (await import('node-fetch')).default;
    // 상세 페이지 메뉴 크롤링
    const detailUrl = `https://www.diningcode.com/profile.php?rid=${rid}`
    const detailResponse = await fetch(detailUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })
    const detailHtml = await detailResponse.text()
    const $$ = cheerio.load(detailHtml)

    const menus = $$('.list.Restaurant_MenuList > li').map((_, el) => ({
      name: $$(el).find('.Restaurant_Menu').text().trim(),
      price: $$(el).find('.Restaurant_MenuPrice').text().trim(),
    })).get()

    return res.json({ menus })
  } catch (err) {
    console.error('❌ 크롤링 실패:', err)
    return res.status(500).json({ error: 'Server error' })
  }
})

export default router
