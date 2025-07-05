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

    // 검색 페이지 접속 및 로딩 대기 (타임아웃 60초, domcontentloaded)
    const searchUrl = `https://www.diningcode.com/list.php?query=${encodeURIComponent(name)}`
    let loaded = false;
    let lastError = null;
    for (let i = 0; i < 2; i++) { // 최대 2회 재시도
      try {
        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 })
        loaded = true;
        break;
      } catch (err) {
        lastError = err;
      }
    }
    if (!loaded) {
      await browser.close();
      throw lastError;
    }

    // React 렌더링 대기 (1초)
    await new Promise(res => setTimeout(res, 1000));

    // a[id^="block"] 로딩 대기 (최대 5초)
    try {
      await page.waitForSelector('a[id^="block"]', { timeout: 5000 })
    } catch (waitErr) {
      const html = await page.content();
      const bodyMatch = html.match(/<body[\s\S]*?<\/body>/i);
      const body = bodyMatch ? bodyMatch[0] : html;
      console.error('❌ waitForSelector 실패, 현재 BODY:', body.slice(0, 3000));
      await browser.close();
      throw waitErr;
    }

    // rid 추출 (a[id^="block"]에서 rid와 식당명 추출)
    const rid = await page.evaluate((targetName) => {
      const blocks = Array.from(document.querySelectorAll('a[id^="block"]'));
      const normalize = (s: string) => s.replace(/\s/g, '').toLowerCase();
      let bestRid = null;
      let bestScore = -1;
      for (const block of blocks) {
        const h2 = block.querySelector('h2[id^="title"]');
        const text = h2 ? h2.textContent : '';
        if (!text) continue;
        // 유사도: 포함 여부 + 길이 차이로 단순 계산
        const score = normalize(text).includes(normalize(targetName)) ? 100 - Math.abs(normalize(text).length - normalize(targetName).length) : 0;
        if (score > bestScore) {
          bestScore = score;
          bestRid = block.id.replace('block', '');
        }
      }
      return bestRid;
    }, name)

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