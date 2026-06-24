# Letterboxd-Profile-API

Letterboxd-Profile-API is a lightweight Node.js service that extracts public profile data from Letterboxd and exposes it through a simple RESTful interface.
Still in development
## Features

- Scrapes public Letterboxd profile pages
- Returns structured profile metadata
- Built with Express and Puppeteer
- Simple startup with `npm start`

## Installation

```bash
npm install
```

## Usage

Start the server:

```bash
npm start
```

Then send a request to the API endpoint. For example:

```bash
curl http://localhost:3000/<letterboxd-username>
```

Replace `<letterboxd-username>` with the target public Letterboxd username.

## Project Structure

- `index.js` — main application entry point
- `package.json` — project metadata and dependencies
- `.gitignore` — ignored files and folders

## Dependencies

- `express` — web framework
- `puppeteer` — headless browser scraping
- `nodemon` — development utility for auto-reloading

## License

This project is licensed under the ISC License.

