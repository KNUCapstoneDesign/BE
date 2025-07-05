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

    // React 렌더링 대기 (5초로 증가)
    await new Promise(res => setTimeout(res, 5000));
    t('React 렌더링 대기 완료');

    // a[id^="block"]가 나올 때까지 대기 후, 내부에서 h2[id^="title"]로 rid 추출
    let html: string;
    try {
      await page.waitForSelector('a[id^="block"]', { timeout: 15000 });
      html = await page.content();
    } catch (e) {
      html = await page.content();
      const bodyMatch = html.match(/<body[\s\S]*?<\/body>/i);
      const body = bodyMatch ? bodyMatch[0] : html;
      console.error('❌ a[id^="block"] selector를 찾지 못했습니다. 현재 BODY:', body.slice(0, 3000));
      await browser.close();
      return res.status(404).json({ error: '검색 결과가 없거나 사이트 구조가 변경되었습니다.' });
    }
    t('a[id^="block"] selector HTML에서 확인 완료');

    // rid 추출 (a[id^="block"] 내부의 h2[id^="title"]에서 장소코드 추출)
    const rid = await page.evaluate((targetName) => {
      const blocks = Array.from(document.querySelectorAll('a[id^="block"]'));
      const normalize = (s: string | null) => (s ?? '').replace(/\s/g, '').toLowerCase();
      let bestRid = null;
      let bestScore = -1;
      for (const block of blocks) {
        const h2 = block.querySelector('h2[id^="title"]');
        const text = h2 ? h2.textContent : '';
        const normTarget = normalize(targetName);
        const score = normalize(text).includes(normTarget) ? 100 - Math.abs(normalize(text).length - normTarget.length) : 0;
        if (score > bestScore) {
          bestScore = score;
          // a 태그의 id에서 rid 추출 (예: blockLMy6BQjFbE2W)
          const match = block.id.match(/^block(.+)/);
          if (match) bestRid = match[1];
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