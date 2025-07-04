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
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })
    const page = await browser.newPage()

    // User-Agent 설정 (봇 차단 대비)
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36')

    // 검색 페이지 접속 및 로딩 대기
    const searchUrl = `https://www.diningcode.com/list.php?query=${encodeURIComponent(name)}`
    await page.goto(searchUrl, { waitUntil: 'networkidle2' })

    // h2[id^="title"] 로딩 대기 (최대 10초)
    await page.waitForSelector('h2[id^="title"]', { timeout: 10000 })

    // rid 추출
    const rid = await page.evaluate((targetName) => {
      const titles = Array.from(document.querySelectorAll('h2[id^="title"]'))

      const normalize = (s: string) => s.replace(/\s/g, '').toLowerCase()
      const target = titles.find(el =>
        normalize(el.textContent || '').includes(normalize(targetName)),
      )

      return target?.id.replace('title', '') || null
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