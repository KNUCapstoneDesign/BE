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

    // 불필요한 리소스(이미지, 폰트 등) 차단
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const resourceType = req.resourceType();
      if (["image", "stylesheet", "font", "media"].includes(resourceType)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    // 검색 페이지 접속 및 로딩 대기 (waitUntil: 'networkidle2'로 최적화)
    const searchUrl = `https://www.diningcode.com/list.php?query=${encodeURIComponent(name)}`
    let loaded = false;
    let lastError = null;
    for (let i = 0; i < 2; i++) { // 최대 2회 재시도
      try {
        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 20000 })
        t('page.goto 완료');
        loaded = true;
        break;
      } catch (err) {
        lastError = err;
        if (err instanceof Error && err.message && err.message.includes('detached')) {
          try {
            await page.reload({ waitUntil: 'networkidle2', timeout: 10000 });
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

    // waitForSelector로 a[id^="block"] 또는 h2[id^="title"]가 나올 때까지 대기 (최대 10초)
    let html: string;
    try {
      await page.waitForSelector('a[id^="block"], h2[id^="title"]', { timeout: 10000 });
      html = await page.content();
    } catch (e) {
      html = await page.content();
      const bodyMatch = html.match(/<body[\s\S]*?<\/body>/i);
      const body = bodyMatch ? bodyMatch[0] : html;
      console.error('❌ a[id^="block"] 또는 h2[id^="title"] selector를 찾지 못했습니다. 현재 BODY:', body.slice(0, 3000));
      await browser.close();
      return res.status(404).json({ error: '검색 결과가 없거나 사이트 구조가 변경되었습니다.' });
    }
    t('a[id^="block"] 또는 h2[id^="title"] selector HTML에서 확인 완료');

    // block 또는 title 중 하나만 존재해도 추출 (가장 첫번째로 뜨는 식당의 rid만 추출)
    const rid = await page.evaluate(() => {
      const block = document.querySelector('a[id^="block"]');
      if (block && block.id) {
        const match = block.id.match(/^block(.+)/);
        if (match) return match[1];
      }
      const h2 = document.querySelector('h2[id^="title"]');
      if (h2 && h2.id) {
        const match = h2.id.match(/^title(.+)/);
        if (match) return match[1];
      }
      return null;
    });

    await browser.close()

    if (!rid) {
      return res.status(404).json({ error: 'No matching restaurant title found' })
    }

    // fetch를 동적으로 import
    const fetch = (await import('node-fetch')).default;
    // 상세 페이지 메뉴 크롤링
    const detailUrl = `https://www.diningcode.com/profile.php?rid=${rid}`
    const detailResponse = await fetch(detailUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })
    const detailHtml = await detailResponse.text()
    const $ = cheerio.load(detailHtml)

    const menus = $('.list.Restaurant_MenuList > li').map((_, el) => ({
      name: $(el).find('.Restaurant_Menu').text().trim(),
      price: $(el).find('.Restaurant_MenuPrice').text().trim(),
    })).get()

    return res.json({ menus })
  } catch (err) {
    console.error('❌ 크롤링 실패:', err)
    return res.status(500).json({ error: 'Server error' })
  }
})

export default router