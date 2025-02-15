const puppeteer = require('puppeteer-extra');
const stealthPlugin = require('puppeteer-extra-plugin-stealth');
const cheerio = require('cheerio');
const { URL } = require('url');

class MissingLatLngHandler {
    static extractroughLatLongFromUrl(url) {
        try {
            const parts = url.split('@');
            if (parts.length >= 2) {
                const coordinatesPart = parts[1];
                const coordinates = coordinatesPart.split(',');
                const latitude = parseFloat(coordinates[0]);
                const longitude = parseFloat(coordinates[1]);
                return { latitude, longitude };
            } else {
                throw new Error('Invalid Google Maps URL');
            }
        } catch (error) {
            console.error('Error extracting latitude and longitude:', error);
            return null;
        }
    }

    static extractLatLongFromUrl(url) {
        const parts = url.split('!3d');
        if (parts.length >= 2) {
            const latLongPart = parts[1].split('!4d');
            if (latLongPart.length >= 2) {
                const latitude = parseFloat(latLongPart[0]);
                const longitude = parseFloat(latLongPart[1]);
                return { latitude, longitude };
            }
        }
        return null;
    }

    static scrapCoordinates = async (name, address) => {
        let browser;
        try {
            puppeteer.use(stealthPlugin());
            browser = await puppeteer.launch({ headless: true });
            const page = await browser.newPage();
            const query = `${name} ${address}`;
            await page.goto(`https://www.google.com/maps/search/${query.split(" ").join("+")}`);
            await page.waitForNavigation({ waitUntil: 'networkidle0' });
            const html = await page.content();
            const $ = cheerio.load(html);
            const url = new URL(page.url());
            let domain = this.extractLatLongFromUrl(url.href);
            if (!domain) {
                domain = this.extractroughLatLongFromUrl(url.href);
            }
            await browser.close();
            console.log("Lat and Lng are adjusted", domain);
            return domain;
        } catch (error) {
            console.log("Something went wrong:", error);
            if (browser) await browser.close();
            return [];
        }
    }
}

module.exports = MissingLatLngHandler;
