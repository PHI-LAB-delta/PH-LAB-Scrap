const fs = require('fs');
const { createObjectCsvWriter } = require('csv-writer');
const readline = require('readline');

const extractTileId = (googleMapsUrl) => {
    const tileIdPattern = /16s%2F([^!]+)/;
    const match = googleMapsUrl.match(tileIdPattern);
    if (match && match[1]) {
        const tileId = decodeURIComponent(match[1]);
        return tileId;
    } else {
        return null;
    }
}
const ensureFileExists = (filePath) => {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify([]));
        console.log(`File created: ${filePath}`);
    } else {
        console.log(`File already exists: ${filePath}`);
    }
};

function cleanText(text) {
    return text.replace(/[\u200B-\u200D\uFEFF]/g, '')
        .replace(/\n/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/// india , lob based, UI-Represent

// It is Use to Read and Extract The data of JSON File
const extractJsonData = (path) => {
    const jsonFilePath = path;
    const jsonDataSync = fs.readFileSync(jsonFilePath, 'utf8');
    const jsonData = JSON.parse(jsonDataSync);
    let data = Array.from(jsonData);
    return data;
}

// This Function is use to append the new object in a array of Object which is store in JSON file.
const appendinArrayOfObject = (filename, pathname, finalData) => {
    let entireFilePath = `${pathname}/${filename}`;
    const fd = fs.openSync(entireFilePath, "a+");
    let fileSize = fs.statSync(entireFilePath).size;
    let isEmpty = false;
    if (fileSize === 0) {
        fs.appendFileSync(entireFilePath, "[]");
        fileSize = 2;
        isEmpty = true;
    }
    const buffer = Buffer.alloc(1);
    fs.readSync(fd, buffer, 0, 1, fs.statSync(entireFilePath).size - 1);
    const lastChar = buffer.toString("utf8");
    if (lastChar === "]") {
        fs.truncateSync(entireFilePath, fileSize - 1);
        if (!isEmpty && fileSize != 2) {
            console.log(fileSize);
            fs.appendFileSync(entireFilePath, ",");
        }
    }
    let result = finalData.reduce((accumulator, item, index) => {
        if (index === finalData.length - 1) {
            return accumulator + JSON.stringify(item);
        }
        return accumulator + JSON.stringify(item) + ",";
    }, "");
    fs.appendFileSync(entireFilePath, result);
    fs.appendFileSync(entireFilePath, "]");
    fs.closeSync(fd);
}

// To check wether it is contact no. or not i.e (if start with Number i.e(1,0,9..) or start with '+'). Note: This is Generic based on Scraping of Google Map only.
const isContactNumber = (string) => {
    const regex = /^[+\d]/;
    return regex.test(string);
}

// Create coordinates if coordinates are not present
const createCoordinatesFromBoundaryValues = (boundingBox) => {
    // First two are latitude and last two are longitude
    return [[
        [Math.min(boundingBox[2], boundingBox[3]), Math.min(boundingBox[0], boundingBox[1])],
        [Math.max(boundingBox[2], boundingBox[3]), Math.min(boundingBox[0], boundingBox[1])],
        [Math.max(boundingBox[2], boundingBox[3]), Math.max(boundingBox[0], boundingBox[1])],
        [Math.min(boundingBox[2], boundingBox[3]), Math.max(boundingBox[0], boundingBox[1])],
        // closing the boundary
        [Math.min(boundingBox[2], boundingBox[3]), Math.min(boundingBox[0], boundingBox[1])],
    ]];
}

// It is use to get the array cordinates for the bondery of any city.
const getDataCordinate = async (city) => {

    try {
        const osmResponse = await fetch(`https://nominatim.openstreetmap.org/search.php?q=${city}&polygon_geojson=1&format=jsonv2`);
        const osmData = await osmResponse.json();
        let idx = 0;
        if (osmData.length === 0) {
            throw new Error('Please enter the correct city name');
        }
        if (osmData.length > 1) {
            osmData.forEach((singleItem, index) => console.log(`${index} - ${singleItem.display_name}`));
            try {
                const readIdx = readline.createInterface({
                    input: process.stdin,
                    output: process.stdout
                });
                let enteredValue = await new Promise((resolve) => readIdx.question('What is your city idx? ', resolve));
                idx = parseInt(enteredValue);
                if (idx >= osmData.length) throw new Error('Idx out of bound');
                readIdx.close();
            } catch (error) {
                throw new Error('Something went wrong while taking the input');
            }
        }
        if (osmData[idx].geojson.type.toLocaleLowerCase().includes('polygon')) {
            const coordinates = osmData[idx].geojson.coordinates;
            return coordinates;
        }
        // Specific boundardies are not present
        return createCoordinatesFromBoundaryValues(osmData[idx].boundingbox);

    } catch (error) {
        console.log(error);
        throw new Error('Something went wrong in fetching the details about the city');
    }

}

const getZoomLevelFromUrl = (url) => {
    const zoomLevelRegex = /z=([\d]+)/;
    const match = zoomLevelRegex.exec(url);

    if (match) {
        return parseInt(match[1], 10); // Extract and convert the zoom level to a number
    } else {
        return 16; // No zoom level found in the URL
    }
}

function isAlphabetic(str) {
    // Regular expression to match alphabetic characters only (both uppercase and lowercase)
    const regex = /^[A-Za-z]+$/;
    return regex.test(str);
}

function isValidCoordinate(lat, lon) {
    return (
        typeof lat === "number" &&
        typeof lon === "number" &&
        !isNaN(lat) &&
        !isNaN(lon) &&
        lat >= -90 && lat <= 90 &&
        lon >= -180 && lon <= 180
    );
}


const saveToCSV = async (pathName, fileName, data) => {
    try {
        if (!data || data.length === 0) {
            console.log("No data to save.");
            return;
        }

        const filePath = `${pathName}/${fileName}`;

        await new Promise((resolve, reject) => {
            fs.mkdir(pathName, { recursive: true }, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        const csvWriter = createObjectCsvWriter({
            path: filePath,
            header: Object.keys(data[0]).map(key => ({ id: key, title: key }))
        });

        await csvWriter.writeRecords(data);
        console.log(`Data saved successfully in ${filePath}`);
    } catch (error) {
        console.error("Error saving CSV file:", error);
    }
};


module.exports = { saveToCSV, isValidCoordinate, isAlphabetic, extractTileId, extractJsonData, appendinArrayOfObject, isContactNumber, getDataCordinate, getZoomLevelFromUrl, ensureFileExists, cleanText }
