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

        const headerData = await page.evaluate(() => {
            const data = {}

            data.nickname = document.querySelector('.displayname')?.textContent.trim() || null
            data.profileImg = document.querySelector('.profile-avatar img')?.src || null
            data.backdropImg = document.querySelector('#backdrop')?.getAttribute('data-backdrop') || null
            data.subscription = document.querySelector('.badge')?.textContent.trim() || 'free'
            data.description = document.querySelector('.bio p')?.textContent.trim() || null
            
            data.links = {}
            document.querySelectorAll('.profile-metadata .metadatum')
                .forEach(el => {
                    const label = el.querySelector('.label')?.textContent.trim()
                    const link = el.getAttribute('href')
                    
                    if (link) {
                        if (link.includes('instagram')) {
                            data.links.instagram = link
                        } else if (link.includes('twitter') || link.includes('x.com')) {
                            data.links.twitter = link
                        } else {
                            data.links.website = link
                        }
                    } else if (label) {
                        data.location = label
                    }
                })
            
            data.statistics = {}
            document.querySelectorAll('.profile-statistic')
                .forEach(stat => {
                    const value = stat.querySelector('.value')?.textContent.trim()
                    const label = stat.querySelector('.definition')?.textContent.trim().toLowerCase()
                    const link = stat.querySelector('a')?.getAttribute('href')

                    if (!value || !label) return

                    const fullLink = link ? 'https://letterboxd.com' + link : null

                    if (label.includes('films')) {
                        data.statistics.films = {}
                        data.statistics.films.count = value
                        data.statistics.films.url = fullLink
                    } else if (label.includes('this year') || label.includes('in ')) {
                        data.statistics.year = {}
                        data.statistics.year.count = value
                        data.statistics.year.url = fullLink
                    } else if (label.includes('lists')) {
                        data.statistics.lists = {}
                        data.statistics.lists.count = value
                        data.statistics.lists.url = fullLink
                    } else if (label.includes('following')) {
                        data.statistics.following = {}
                        data.statistics.following.count = value
                        data.statistics.following.url = fullLink
                    } else if (label.includes('followers')) {
                        data.statistics.followers = {}
                        data.statistics.followers.count = value
                        data.statistics.followers.url = fullLink
                    }
                })

            return data
        })
        
        const mainData = await page.evaluate(() => {
            const data = {}
            
            data.favoriteFilms = []
            document.querySelectorAll('.favourite-production-poster-container')
                .forEach(el => {
                    const component = el.querySelector('.react-component')

                    data.favoriteFilms.push({
                        title: component?.getAttribute('data-item-name'),
                        url: 'https://letterboxd.com' + component?.getAttribute('data-item-link'),
                        reviewUrl: 'https://letterboxd.com' + component?.getAttribute('data-target-link'),
                        imageUrl: component?.querySelector('img')?.src
                    })
                })
            
            data.recentFilms = {
                url: 'https://letterboxd.com' + document.querySelector('#recent-activity .section-heading a')?.getAttribute('href'),
                films: []
            }
            document.querySelector('#recent-activity')?.querySelectorAll('.viewing-poster-container')
                .forEach(el => {
                    const component = el.querySelector('.react-component')
                    const viewingData = el.querySelector('.poster-viewingdata')
                    data.recentFilms.films.push({
                        title: component?.getAttribute('data-item-name'),
                        url: 'https://letterboxd.com' + component?.getAttribute('data-item-link'),
                        reviewUrl: 'https://letterboxd.com' + component?.getAttribute('data-target-link'),
                        imageUrl: component?.querySelector('img')?.src,
                        rating: viewingData?.querySelector('.rating[class*="rated-"]') || null,
                        liked: viewingData?.querySelector('.liked') ? true : null,
                        rewatched: viewingData?.querySelector('.icon-rewatch')?.textContent.trim() || null,
                        reviewed: viewingData?.querySelector('.icon-review')?.textContent.trim() || null
                    })
                })

            data.reviews = {
                pinnedLink: null,
                pinned: [],
                recentLink: null,
                recent: [],
                popularLink: null,
                popular: []
            }
            document.querySelectorAll('.section').forEach(section => {
                const title = section.querySelector('h2')?.textContent.toLowerCase()
                const reviews = section.querySelectorAll('.production-viewing')
                const link = 'https://letterboxd.com' + section.querySelector('.section-heading a')?.getAttribute('href')

                reviews.forEach(el => {
                    const component = el.querySelector('.react-component')
                    const reviewEl = el.querySelector('.js-review')

                    const reviewData = {
                        title: component?.getAttribute('data-item-name'),
                        url: 'https://letterboxd.com' + component?.getAttribute('data-item-link'),
                        reviewUrl: 'https://letterboxd.com' + el.querySelector('.primaryname a')?.getAttribute('href'),
                        imageUrl: component?.querySelector('img')?.src,
                        rewatched: !!el.querySelector('.icon-rewatch'),
                        watchDate: el.querySelector('.date .timestamp')?.textContent.trim() || null,
                        comment: reviewEl?.querySelector('.body-text')?.textContent.trim() || null,
                        likes: parseInt(reviewEl?.querySelector('.like-link-target')?.getAttribute('data-count') || '0', 10),
                        // commentCount: reviewEl?.querySelector('.comment-link-target')?.getAttribute('data-count') || "0"
                    }

                    if (title.includes('pinned')) {
                        data.reviews.pinnedLink = link
                        data.reviews.pinned.push(reviewData)
                    } else if (title.includes('recent')) {
                        data.reviews.recentLink = link
                        data.reviews.recent.push(reviewData)
                    } else if (title.includes('popular')) {
                        data.reviews.popularLink = link
                        data.reviews.popular.push(reviewData)
                    }
                })
            })
            
            const tagSection = Array.from(document.querySelectorAll('.section')).find(section =>
                section.querySelector('h3')?.textContent.toLowerCase().includes('tags')
            )
            data.tagList = {
                url: 'https://letterboxd.com' + tagSection.querySelector('.section-heading a')?.getAttribute('href'),
                tagCount: tagSection.querySelector('.all-link')?.textContent.trim() || "0",
                tags: []
            }
            tagSection.querySelectorAll('.tags li a').forEach(el => {
                data.tagList.tags.push({
                name: el.textContent.trim(),
                url: 'https://letterboxd.com' + el.getAttribute('href')
                })
            })

            const followingSection = Array.from(document.querySelectorAll('.section')).find(section =>
                section.querySelector('h3')?.textContent.toLowerCase().includes('following')
            )
            data.followingList = {
                url: 'https://letterboxd.com' + followingSection.querySelector('.section-heading a')?.getAttribute('href'),
                followingCount: followingSection.querySelector('.all-link')?.textContent.trim() || "0",
                users: []
            }
            followingSection.querySelectorAll('.avatar-list .avatar')
                .forEach(el => {
                    data.followingList.users.push({
                        username: el.getAttribute('data-original-title'),
                        url: 'https://letterboxd.com' + el.getAttribute('href'),
                        imageUrl: el.querySelector('img')?.src
                    })
                })

            return data
        })

        await browser.close()

        res.json({ 
            username,
            url,
            headerData,
            mainData
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