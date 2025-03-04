const puppeteer = require('puppeteer-extra');
const stealthPlugin = require('puppeteer-extra-plugin-stealth');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const { appendinArrayOfObject, isContactNumber, ensureFileExists, cleanText } = require('../utils/commonUtils');
const { autoScroll } = require('../utils/scraperUtils');
const { checkCoordinates } = require('./boundaryCheck')

let uniqueData = new Set();
const errorZip = new Map();

let localContext = {};

async function searchGoogleMaps(localArea, localAreaList, type) {
    let browser;
    try {
        puppeteer.use(stealthPlugin());

        browser = await puppeteer.launch({
            headless: true,
        });

        const page = await browser.newPage();

        const query = `${type} near ${localArea}`;

        await page.goto(`https://www.google.com/maps/search/${query.split(" ").join("+")}`);
        await page.waitForNavigation({ waitUntil: 'networkidle0' });

        await autoScroll(page, 'div[role="feed"]');

        const html = await page.content();

        const $ = cheerio.load(html);
        const businessData = [];

        $("a[href*='/maps/place/']").each((i, el) => {
            const url = $(el).attr("href");
            const parent = $(el).parent();
            const WrapperMain = parent.find("div.fontBodyMedium > div").eq(3);
            const outlet_name = parent.find("div.fontHeadlineSmall").text();
            const ratingText = parent.find("span.fontBodyMedium > span").attr("aria-label");
            const address = `${WrapperMain.children('div').eq(0).text().split("·")[1]?.trim()}`;
            const { latitude, longitude } = extractLatLongFromUrl(url);
            let status = "Available";
            let phone = '';
            let arr = WrapperMain.children('div').eq(1).text().split("·");
            if (arr[0] === "Temporarily closed" || arr[0] === "Permanently closed") {
                status = arr[0];
            }
            if (arr[1]) {
                phone = arr[1];
            } else {
                if (isContactNumber(arr[0])) {
                    phone = arr[0];
                }
            }

            const placeId = url.split("?")[0].split("ChI")[1];
            if (!uniqueData.has(placeId)) {
                uniqueData.add(placeId);

                businessData.push({
                    placeId: placeId ? placeId : "NA",
                    address: address ? address : "NA",
                    sub_channel: getCategory(WrapperMain) ? getCategory(WrapperMain) : "NA",
                    phone: phone ? phone : "NA",
                    latitude: latitude ? latitude : "NA",
                    longitude: longitude ? longitude : "NA",
                    status: status ? status : "NA",
                    type: getstoreType(parent) ? getstoreType(parent) : "NA",
                    googleUrl: url ? url : "NA",
                    outlet_name: outlet_name ? outlet_name : "NA",
                    ratingText: ratingText ? ratingText : "NA",
                    stars: ratingText?.split("stars")[0]?.trim() ? Number(ratingText.split("stars")[0].trim()) : null,
                    numberOfReviews: (() => {
                        if (!ratingText) return "NA";
                        const parts = ratingText.split(" ");
                        return parts.length === 4 && parts[3].toLowerCase() === "reviews" ? parts[2] : "NA";
                    })()
                });
            }
        });

        for (const business of businessData) {
            if (business.googleUrl) {
                // Business Data
                const detailedData = await scrapeDetailsFromWebsite(browser, business.googleUrl);
                for (const [key, value] of Object.entries(detailedData)) {
                    if (business.hasOwnProperty(key) && value != "NA")
                        business[key] = value;
                    else if (!business.hasOwnProperty(key)) {
                        business[key] = value;
                    }
                }
            }
        }

        await browser.close();

        return businessData;

    } catch (error) {
        if (errorZip.get(localArea) <= 1) {
            localAreaList.push(localArea);
            errorZip.set(localArea, (errorZip.get(localArea) || 0) + 1);
        }
        console.error("Error in searchGoogleMaps:", localArea, error);
        if (browser) {
            await browser.close();
        }
        return [];
    }
}
async function extractEmailsFromWebsite(browser, websitesArray) {
    const emailsArray = [];

    for (const website of websitesArray) {
        if (website) {
            let websitePage;
            try {

                websitePage = await browser.newPage();
                await websitePage.goto(website, { waitUntil: 'networkidle0', timeout: 30000 });

                try {
                    const mailtoLinks = await websitePage.$$eval('a[href^="mailto:"]', (elements) =>
                        elements.map((el) => el.href.replace('mailto:', '').trim())
                    );
                    if (mailtoLinks.length > 0) {
                        emailsArray.push(...mailtoLinks);
                    }
                } catch (error) {
                    console.warn(`No mailto links found on ${website}: ${error.message}`);
                }

                try {
                    const pageContent = await websitePage.content();
                    const emailPattern = /([a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6})/g;
                    const foundEmails = pageContent.match(emailPattern);
                    if (foundEmails) {
                        emailsArray.push(...foundEmails.map((email) => email.trim()));
                    }
                } catch (error) {
                    console.warn(`Failed to extract emails using regex from ${website}: ${error.message}`);
                }
            } catch (error) {
                console.warn(`Error while visiting ${website}: ${error.message}`);
            } finally {
                if (websitePage) {
                    await websitePage.close();
                }
            }
        }
    }

    const uniqueEmails = [...new Set(emailsArray)];
    return uniqueEmails.length > 0 ? uniqueEmails : ['NA'];
}


async function scrapeDetailsFromWebsite(browser, googleUrl) {
    try {
        const page = await browser.newPage();
        await page.goto(googleUrl, { waitUntil: 'networkidle0' });

        async function extractSelector(selector, defaultValue) {
            try {
                await page.waitForSelector(selector, { timeout: 3000 });
                return cleanText(await page.$eval(selector, (el) => el.innerText.trim()));
            } catch (error) {
                console.warn(`Selector ${selector} not found or timed out: ${error.message}`);
                return defaultValue;
            }
        }

        const address = await extractSelector('[data-item-id="address"]', 'NA');
        const locatedIn = await extractSelector('[data-item-id="locatedin"]', 'NA');
        const fullAddress = address !== 'NA' && locatedIn !== 'NA' ? `${address} ${locatedIn}` : address;

        // Extracting the websites
        const websitesArray = [];
        const $ = cheerio.load(await page.content());
        $("a[data-item-id='authority']").each((i, el) => {
            const websiteUrl = $(el).attr("href");
            if (websiteUrl) {
                websitesArray.push(websiteUrl);
            }
        });

        // Extracting Reviews from the Review part
        const reviews = [];
        if (localContext["extractReviews"]) {
            reviews = await scrapeGoogleReviews(page);
        }

        // Extracting emails from 3rd websites
        const emailsArray = "";
        if (localContext["extractFrom3rdWeb"]) {
            emailsArray = await extractEmailsFromWebsite(browser, websitesArray);
        }

        const phoneNumber = await extractSelector('[data-tooltip="Copy phone number"]', 'NA');

        await page.close();
        return {
            address: fullAddress,
            websites: websitesArray.length > 0 ? websitesArray : ['NA'],
            emails: emailsArray,
            phone: phoneNumber,
            customerReviews: reviews
        };
    } catch (error) {
        console.error('Error scraping website details:', error);
        return {
            address: 'NA',
            websites: ['NA'],
            emails: ['NA'],
            phone: 'NA',
        };
    }
}


async function scrapeGoogleReviews(page) {
    try {
        await page.waitForSelector('button[role="tab"]', { timeout: 5000 });
        const reviewButton = await page.$('button[aria-label*="Reviews"]');
        if (reviewButton) {
            await reviewButton.click();
            console.log("Review tab clicked successfully.");
        } else {
            console.warn("Review tab not found.");
            return [];
        }

        await page.waitForSelector('.jftiEf', { timeout: 5000 });

        const scrollFeedClass = '.m6QErb.DxyBCb.kA9KIf.dS8AEf.XiKgde';
        await autoScroll(page, scrollFeedClass);

        const reviews = await page.$$eval('.jftiEf', elements =>
            elements
                .filter(el => el.querySelector('.wiI7pd')?.innerText.trim())
                .map(el => ({
                    name: el.getAttribute('aria-label') || 'Anonymous',
                    review: el.querySelector('.wiI7pd')?.innerText.trim() || 'No review text'
                }))
        );


        console.log("Reviews extracted successfully.");
        return reviews;

    } catch (error) {
        console.error(`Error while scraping reviews: ${error.message}`);
    }
}

function getCategory(parent) {
    return parent.text().split('·')[0]?.trim();
}

function getstoreType(parent) {
    const openingHoursText = parent.find('div.fontBodyMedium').eq(1).text();
    return openingHoursText?.split('·')[0]?.trim();
}

function extractLatLongFromUrl(url) {
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

const run = async (locationAreaList, businessDataJsonPath, businessFileName, type, lc) => {
    localContext = lc;
    ensureFileExists(businessDataJsonPath, businessFileName);

    for (const locationArea of locationAreaList) {
        console.log("Scrapping for : ", locationArea);

        const results = await searchGoogleMaps(locationArea, locationAreaList, type);
        console.log("data process for boundary check ... ");
        // filter data with boundary
        const withinBoundaryData = await checkCoordinates(
            lc.targetOsmType,
            lc.targetOsmId,
            results
        );
        // append data 
        console.log("data process for saving ... ");
        appendinArrayOfObject(businessFileName, businessDataJsonPath, withinBoundaryData);
        console.log("data saved");
    }
    console.log("Data collection completed!");
};
module.exports = { run };
