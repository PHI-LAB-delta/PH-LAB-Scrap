const fs = require('fs');
const path = require('path');
const { parser } = require('stream-json');
const { streamArray } = require('stream-json/streamers/StreamArray');
const { stringify } = require('csv-stringify');

function calculateWeight(stars, numberOfReviews, websites) {
    const reviews = typeof numberOfReviews === "string" ? parseInt(numberOfReviews, 10) : numberOfReviews;

    const normalizedStars = stars / 5;

    const normalizedReviews = reviews / (reviews + 100);

    const websiteExists = Array.isArray(websites) && websites.length > 0 && websites[0] !== "NA";
    const websiteFactor = websiteExists ? 0.4 : 0.6;

    const weight = (normalizedStars * 0.5) + (normalizedReviews * 0.3) + (websiteFactor * 0.2);

    return (weight * 100).toFixed(2) + "%";
}

function removeAttributes(fileNameTosave, fileName, pathName, attributeToConsider, toSaveInCSV = true) {
    const inputFilePath = path.join(pathName, fileName);
    const outputFilePath = path.join(pathName, `${fileNameTosave.replace('.json', '.csv')}`);

    const readStream = fs.createReadStream(inputFilePath, { encoding: 'utf8' });
    let writeStream;
    let csvStringifier;
    let headersWritten = false;
    const filteredResults = []; // Collect filtered data

    if (toSaveInCSV) {
        writeStream = fs.createWriteStream(outputFilePath, { encoding: 'utf8' });
    }

    const pipeline = readStream.pipe(parser()).pipe(streamArray());

    pipeline.on('data', ({ value }) => {
        const numReviews = value["numberOfReviews"]
            ? parseInt(value["numberOfReviews"].replace(/,/g, ''), 10)
            : 0;

        if (
            value["numberOfReviews"] === "NA" ||
            (numReviews <= 10 && value["websites"] && value["websites"].includes("NA")) ||
            value["phone"] === "NA" || value["status"] == "Temporarily closed" || value["status"] == "Permanently closed"
        ) {
            return;
        }

        const filteredItem = Object.keys(value)
            .filter(key => attributeToConsider[key])
            .reduce((acc, key) => {
                acc[key] = value[key];
                return acc;
            }, {});

        filteredItem["coldCallProbabilityWeight"] = calculateWeight(
            filteredItem["stars"],
            filteredItem["numberOfReviews"],
            filteredItem["websites"]
        );

        filteredResults.push(filteredItem);

        if (toSaveInCSV) {
            if (!headersWritten) {
                const columns = Object.keys(filteredItem);
                csvStringifier = stringify({ header: true, columns });

                csvStringifier.pipe(writeStream);
                csvStringifier.write(filteredItem);

                headersWritten = true;
            } else {
                csvStringifier.write(filteredItem);
            }
        }
    });

    return new Promise((resolve, reject) => {
        pipeline.on('end', () => {
            if (toSaveInCSV) {
                csvStringifier.end();
                console.log('Filtered data written successfully to:', outputFilePath);
            }
            resolve(filteredResults);
        });

        pipeline.on('error', (error) => {
            console.error('Error processing JSON:', error.message);
            reject(error);
        });

        if (toSaveInCSV) {
            writeStream.on('error', (error) => {
                console.error('Error writing file:', error.message);
                reject(error);
            });
        }
    });
}

module.exports = { removeAttributes };
