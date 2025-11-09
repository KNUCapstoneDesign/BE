import express from 'express'
import * as cheerio from 'cheerio'
import puppeteer from 'puppeteer'
import axios from 'axios' // 1. axios 임포트

const router = express.Router()

router.get('/', async (req, res): Promise<any> => {
  const { name } = req.query
  const includeNoPrice = String(req.query.includeNoPrice) === 'true' // 2. 쿼리 변수 상단으로 이동

  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid name parameter' })
  }

  let browser; // 3. try/catch/finally에서 browser를 참조하기 위해 상단에 선언

  try {
    // --- 1. rid 추출 (Puppeteer) ---
    // (기존 코드와 동일)
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
      ],
    })
    const page = await browser.newPage()
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    const acceptLanguage = 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'

    await page.setUserAgent(userAgent)
    await page.setExtraHTTPHeaders({ 'Accept-Language': acceptLanguage })
    await page.setViewport({ width: 1280, height: 800 })

    const startAll = Date.now();
    const t = (label: string) => {
      const now = Date.now();
      console.log(`[크롤링 타이밍] ${label}: ${(now - startAll) / 1000}s 경과`);
      return now;
    };
    t('시작');

    const searchUrl = `https://www.diningcode.com/list.php?query=${encodeURIComponent(name)}`
    let loaded = false;
    let lastError = null;
    for (let i = 0; i < 2; i++) {
      try {
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
        t('page.goto 완료');
        loaded = true;
        break;
      } catch (err) {
        lastError = err;
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
      if (browser) await browser.close(); // 4. 실패 시 브라우저 종료
      throw lastError;
    }

    await new Promise(res => setTimeout(res, 3000));
    t('React 렌더링 대기 완료');

    await page.evaluate(() => {
      document.querySelectorAll('.close, .popup-close, .ad_close, [aria-label="닫기"], [aria-label="Close"]').forEach(btn => (btn as HTMLElement).click());
    });

    let selectorFound = false;
    let html = '';
    const maxWait = 20000;
    const pollInterval = 500;
    let waited = 0;
    while (waited < maxWait) {
      html = await page.content();
      if (html.includes('id="block')) {
        selectorFound = true;
        break;
      }
      try {
        await page.waitForSelector('a[id^="block"]', { timeout: pollInterval });
        selectorFound = true;
        break;
      } catch (e) { /* (polling) */ }
      await page.evaluate(() => {
        document.querySelectorAll('.close, .popup-close, .ad_close, [aria-label="닫기"], [aria-label="Close"]').forEach(btn => (btn as HTMLElement).click());
      });
      waited += pollInterval;
    }
    if (!selectorFound) {
      const bodyMatch = html.match(/<body[\s\S]*?<\/body>/i);
      const body = bodyMatch ? bodyMatch[0] : html;
      console.error('❌ waitForSelector polling 실패, 현재 BODY:', body.slice(0, 3000));
      if (browser) await browser.close(); // 4. 실패 시 브라우저 종료
      throw new Error('a[id^="block"] selector를 찾지 못했습니다.');
    }

    let rid: string | null = null;
    if (html) {
      const $ = cheerio.load(html);
      const block = $('a[id^="block"]').first();
      if (block.length) {
        const match = block.attr('id')?.match(/^block(.+)/);
        if (match) rid = match[1];
      }
    } else { /* (fallback) */
      rid = await page.evaluate(() => {
        const block = document.querySelector('a[id^="block"]');
        if (block && block.id) {
          return block.id.replace('block', '');
        }
        return null;
      });
    }

    if (!rid) {
      if (browser) await browser.close(); // 4. 실패 시 브라우저 종료
      return res.status(404).json({ error: 'No matching restaurant title found' })
    }

    // --- 5. rid 추출 완료, Puppeteer 종료 ---
    await browser.close()
    browser = undefined; // 닫혔음을 명시
    t('Puppeteer 종료 및 rid 획득: ' + rid);

    // --- 6. 상세 페이지 정적 크롤링 (Axios + Cheerio) ---
    const detailUrl = `https://www.diningcode.com/profile.php?rid=${rid}`

    const { data: detailHtml } = await axios.get(detailUrl, {
      headers: {
        'User-Agent': userAgent, // Puppeteer와 동일한 User-Agent 사용
        'Accept-Language': acceptLanguage, // 동일한 언어 설정
      }
    });
    t('Axios 상세 페이지 HTML 로드 완료');

    const $ = cheerio.load(detailHtml);

    // 평점 추출
    const rating = $('#lbl_review_point').text().trim() || null;

    // 메뉴 추출
    const menus: Array<{ name: string; price: string }> = [];
    $('ul.list.Restaurant-MenuList > li').each((i, el) => {
      const name = $(el).find('span.restaurant-menu').text().trim();
      const price = $(el).find('p.restaurant-price').text().trim();

      if (name && name !== '메뉴 모두 보기') {
        if (includeNoPrice) {
          menus.push({ name, price: price || '' });
        } else if (price) {
          menus.push({ name, price });
        }
      }
    });

    // 중복 제거 로직 (필요시)
    const seen = new Set<string>();
    const dedupedMenus = menus.filter(m => {
      const key = `${m.name}|${m.price}`;
      if (!seen.has(key)) {
        seen.add(key);
        return true;
      }
      return false;
    });

    console.log('Menus found:', dedupedMenus);
    t('Cheerio 파싱 완료');

    return res.json({ menus: dedupedMenus, rating })

  } catch (err) {
    console.error('❌ 크롤링 실패:', err)
    if (browser) {
      await browser.close(); // 7. 예외 발생 시 브라우저 종료
    }
    return res.status(500).json({ error: 'Server error' })
  }
})

export default router