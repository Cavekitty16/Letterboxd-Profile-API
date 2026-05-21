const puppeteer = require('puppeteer')
const express = require('express')

const PORT = 8000
const app = express()

app.get('/:username', async (req, res) => {
    const username = req.params.username
    const url = `https://letterboxd.com/${username}/`

    let browser
    try {
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

        const nickname = await page.evaluate(() => {
            return document.querySelector('.displayname').textContent.trim() || null
        })

        const profileImg = await page.evaluate(() => {
            return document.querySelector('.profile-avatar img').src || null
        })

        const backdropImg = await page.evaluate(() => {
            return document.querySelector('#backdrop')?.getAttribute('data-backdrop') || null
        })

        const favoriteFilmsList = await page.evaluate(() => {
            const movies = []

            document.querySelectorAll('.favourite-production-poster-container')
                .forEach(el => {
                    const component = el.querySelector('.react-component')

                    movies.push({
                        title: component?.getAttribute('data-item-name'),
                        url: 'https://letterboxd.com' + component?.getAttribute('data-item-link'),
                        reviewUrl: 'https://letterboxd.com' + component?.getAttribute('data-target-link'),
                        imageUrl: component?.querySelector('img')?.src
                    })
                })

            return movies
        })

        const recentFilmsList = await page.evaluate(() => {
            const movies = []

            const section = document.querySelector('#recent-activity')

            section?.querySelectorAll('.viewing-poster-container')
                .forEach(el => {
                    const component = el.querySelector('.react-component')

                    movies.push({
                        title: component?.getAttribute('data-item-name'),
                        url: 'https://letterboxd.com' + component?.getAttribute('data-item-link'),
                        reviewUrl: 'https://letterboxd.com' + component?.getAttribute('data-target-link'),
                        imageUrl: component?.querySelector('img')?.src
                    })
                })

            return movies
        })

        const recentReviewsList = await page.evaluate(() => {
            const reviews = []

            document.querySelectorAll('.production-viewing')
                .forEach(el => {
                    const component = el.querySelector('.react-component')
                    const review = el.querySelector('.js-review')

                    reviews.push({
                        title: component?.getAttribute('data-item-name'),
                        url: 'https://letterboxd.com' + component?.getAttribute('data-item-link'),
                        reviewUrl: 'https://letterboxd.com' + el.querySelector('.primaryname a')?.getAttribute('href'),
                        imageUrl: component?.querySelector('img')?.src,
                        watchDate: el.querySelector('.date .timestamp')?.textContent.trim(),
                        comment: review?.querySelector('.body-text')?.textContent.trim(),
                        likes: review?.querySelector('.like-link-target')?.getAttribute('data-count')
                    })
                })

            return reviews
        })

        const followingList = await page.evaluate(() => {
            const users = []

            document.querySelectorAll('.avatar-list .avatar')
                .forEach(el => {
                    users.push({
                        username: el.getAttribute('data-original-title'),
                        url: 'https://letterboxd.com' + el.getAttribute('href'),
                        imageUrl: el.querySelector('img')?.src
                    })
                })

            return users
        })

        await browser.close()

        res.json({ 
            username,
            nickname, 
            url, 
            profileImg,
            backdropImg, 
            // subscription,
            // description,
            // bioLinks,
            // filmCount,
            // yearCount,
            // listCount,
            // followingCount,
            // followersCount,
            favoriteFilmsList, 
            recentFilmsList, 
            // pinnedReviewsList,
            recentReviewsList,
            // popularReviewsList,
            // tagList,
            followingList
        })

    } catch (error) {
        if (browser) await browser.close()
        console.error(error)
        res.status(500).json({ error: 'Failed to scrape data' })
    }
})

app.get('/', (req, res) => {
  res.send('Letterboxd API is running')
})

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
})