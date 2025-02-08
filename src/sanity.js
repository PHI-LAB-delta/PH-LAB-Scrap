const fs = require('fs');
const path = require('path');
const { attributeToConsider } = require('../config/sanity');
const { parser } = require('stream-json');
const { streamArray } = require('stream-json/streamers/StreamArray');
const { stringify } = require('csv-stringify');

function calculateWeight(stars, numberOfReviews, websites) {
    const numReviews = parseInt(numberOfReviews) || 0;
    const reviewFactor = Math.log(numReviews + 1) / Math.log(30);

    let weight = (stars / 5) * reviewFactor;

    const hasWebsite = websites && websites.length > 0 && websites[0] !== "NA";

    if (hasWebsite) {
        weight *= 1.2;
    } else {
        weight *= 1.3;
    }

    return Math.min(weight * 100, 100).toFixed(2) + "%";
}

function removeAttributes(fileName, pathName) {
    const inputFilePath = path.join(pathName, fileName);
    const outputFilePath = path.join(pathName, `filtered_${fileName.replace('.json', '.csv')}`);

    const readStream = fs.createReadStream(inputFilePath, { encoding: 'utf8' });
    const writeStream = fs.createWriteStream(outputFilePath, { encoding: 'utf8' });

    let headersWritten = false;
    let csvStringifier;

    const pipeline = readStream.pipe(parser()).pipe(streamArray());

    pipeline.on('data', ({ value }) => {
        const numReviews = value["numberOfReviews"]
            ? parseInt(value["numberOfReviews"].replace(/,/g, ''), 10)
            : 0;

        if (
            value["numberOfReviews"] === "NA" ||
            (numReviews <= 10 && value["websites"] && value["websites"].includes("NA")) ||
            value["phone"] === "NA"
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

        if (!headersWritten) {
            const columns = Object.keys(filteredItem);
            csvStringifier = stringify({ header: true, columns });

            csvStringifier.pipe(writeStream);
            csvStringifier.write(filteredItem);

            headersWritten = true;
        } else {
            csvStringifier.write(filteredItem);
        }
    });

    pipeline.on('end', () => {
        csvStringifier.end();
        console.log('Filtered data written successfully to:', outputFilePath);
    });

    pipeline.on('error', (error) => {
        console.error('Error processing JSON:', error.message);
    });

    writeStream.on('error', (error) => {
        console.error('Error writing file:', error.message);
    });
}

module.exports = { removeAttributes };
