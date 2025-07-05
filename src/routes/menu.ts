import express from 'express'
import * as cheerio from 'cheerio'
import puppeteer from 'puppeteer'

const router = express.Router()

router.get('/', async (req, res): Promise<any> => {
  const { name } = req.query

  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid name parameter' })
  }

  let browser: puppeteer.Browser | null = null;
  try {
    browser = await puppeteer.launch({
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

    const searchUrl = `https://www.diningcode.com/list.php?query=${encodeURIComponent(name)}`
    let loaded = false;
    let lastError = null;
    for (let i = 0; i < 2; i++) {
      try {
        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 60000 })
        loaded = true;
        break;
      } catch (err) {
        lastError = err;
      }
    }
    if (!loaded) {
      throw lastError;
    }

    await new Promise(res => setTimeout(res, 2000));

    try {
      await page.waitForSelector('a[id^="block"]', { timeout: 10000 })
    } catch (waitErr) {
      const html = await page.content();
      const bodyMatch = html.match(/<body[\s\S]*?<\/body>/i);
      const body = bodyMatch ? bodyMatch[0] : html;
      console.error('❌ waitForSelector 실패, 현재 BODY:', body.slice(0, 3000));
      throw waitErr;
    }

    const rid = await page.evaluate((targetName) => {
      const blocks = Array.from(document.querySelectorAll('a[id^="block"]'));
      const normalize = (s: string) => s.replace(/\s/g, '').toLowerCase();
      let bestRid = null;
      let bestScore = -1;
      for (const block of blocks) {
        const h2 = block.querySelector('h2[id^="title"]');
        const text = h2 ? h2.textContent : '';
        if (!text) continue;
        const score = normalize(text).includes(normalize(targetName)) ? 100 - Math.abs(normalize(text).length - normalize(targetName).length) : 0;
        if (score > bestScore) {
          bestScore = score;
          bestRid = block.id.replace('block', '');
        }
      }
      return bestRid;
    }, name)

    if (!rid) {
      return res.status(404).json({ error: 'No matching restaurant title found' })
    }

    const fetch = (await import('node-fetch')).default;
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
  } finally {
    if (browser) await browser.close();
  }
})

export default router