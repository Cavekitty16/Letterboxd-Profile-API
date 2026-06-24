const puppeteer = require('puppeteer')

async function scrapeLetterboxd(username) {
    const url = `https://letterboxd.com/${username}/`

    browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            })
            
    const page = await browser.newPage()

    await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    )

    await page.goto(url, { waitUntil: 'networkidle2' })

    const data = await page.evaluate(() => {
        return {
            nickname: document.querySelector('.displayname')?.textContent
        }
    })

    await browser.close()

    return { username, url, data }
}

module.exports = scrapeLetterboxd