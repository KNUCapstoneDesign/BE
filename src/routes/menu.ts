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

    // React 렌더링 대기 (3초로 증가)
    await new Promise(res => setTimeout(res, 3000));
    t('React 렌더링 대기 완료');

    // block selector를 DOM에서 바로 찾기 (cheerio 파싱 전 빠른 확인)
    const blockHandle = await page.$('a[id^="block"]');
    let rid: string | null = null;
    if (blockHandle) {
      // selector가 있으면 바로 id 추출
      const id = await blockHandle.evaluate((el) => el.id);
      const match = id.match(/^block(.+)/);
      if (match) rid = match[1];
      await browser.close();
    } else {
      // 기존 로직 (HTML 파싱 및 waitForSelector 등)
      let selectorFound = false;
      let html = '';
      try {
        html = await page.content();
        if (html.includes('id="block')) {
          console.warn('HTML에 a[id^="block"]이 존재합니다. 강제 진행.');
          selectorFound = true;
        } else {
          await page.waitForSelector('a[id^="block"]', { timeout: 1000 });
          t('waitForSelector 완료');
          selectorFound = true;
        }
      } catch (waitErr) {
        const bodyMatch = html.match(/<body[\s\S]*?<\/body>/i);
        const body = bodyMatch ? bodyMatch[0] : html;
        console.error('❌ waitForSelector 실패, 현재 BODY:', body.slice(0, 3000));
        await browser.close();
        throw waitErr;
      }
      if (!selectorFound) {
        await browser.close();
        throw new Error('a[id^="block"] selector를 찾지 못했습니다.');
      }
      // block 중 목록의 가장 상단에 있는 block의 rid 추출
      if (html) {
        const $ = cheerio.load(html);
        const block = $('a[id^="block"]').first();
        if (block.length) {
          const match = block.attr('id')?.match(/^block(.+)/);
          if (match) rid = match[1];
        }
      } else {
        rid = await page.evaluate(() => {
          const block = document.querySelector('a[id^="block"]');
          if (block && block.id) {
            return block.id.replace('block', '');
          }
          return null;
        });
      }
      await browser.close();
    }
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
