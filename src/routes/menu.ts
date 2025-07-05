import express from 'express'
import * as cheerio from 'cheerio'
import axios from 'axios'

const router = express.Router()

router.get('/', async (req, res): Promise<any> => {
  const { name } = req.query

  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid name parameter' })
  }

  try {
    // diningcode 검색 결과 페이지 요청
    const searchUrl = `https://www.diningcode.com/list.php?query=${encodeURIComponent(name)}`
    const { data: html } = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      timeout: 15000,
    })
    const $ = cheerio.load(html)
    // a[id^="block"]에서 rid와 식당명 추출
    let bestRid: string | null = null
    let bestScore = -1
    const normalize = (s: string) => s.replace(/[^\w가-힣]/g, '').toLowerCase();
    $('a[id^="block"]').each((_, el) => {
      const block = $(el)
      const h2 = block.find('h2[id^="title"]')
      const text = h2.text()
      if (!text) return
      const score = normalize(text).includes(normalize(name)) ? 100 - Math.abs(normalize(text).length - normalize(name).length) : 0
      if (score > bestScore) {
        bestScore = score
        bestRid = block.attr('id')?.replace('block', '') || null
      }
    })
    // 검색 결과가 1개 이상이면 무조건 첫 번째 결과라도 반환
    if (!bestRid) {
      const firstBlock = $('a[id^="block"]').first()
      bestRid = firstBlock.attr('id')?.replace('block', '') || null
    }
    if (!bestRid) {
      return res.status(404).json({ error: 'No matching restaurant title found' })
    }
    // 상세 페이지 메뉴 크롤링
    const detailUrl = `https://www.diningcode.com/profile.php?rid=${bestRid}`
    const { data: detailHtml } = await axios.get(detailUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
      timeout: 15000,
    })
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