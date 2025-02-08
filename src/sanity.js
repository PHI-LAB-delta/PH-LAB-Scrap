const fs = require('fs');
const path = require('path');
const { attributeToConsider } = require('../config/sanity');
const { parser } = require('stream-json');
const { streamArray } = require('stream-json/streamers/StreamArray');

function calculateWeight(stars, numberOfReviews, websites) {
    const numReviews = parseInt(numberOfReviews) || 0;
    const reviewFactor = Math.log(numReviews + 1) / Math.log(30);

    let weight = (stars / 5) * reviewFactor;

    const hasWebsite = websites && websites.length > 0 && websites[0] !== "NA";

    if (hasWebsite) {
        weight *= 1.2;  // Increase weight by 20% 
    } else {
        weight *= 1.3;  // Increase weight by 30% 
    }

    return Math.min(weight * 100, 100).toFixed(2) + "%";
}

function removeAttributes(fileName, pathName) {
    const inputFilePath = path.join(pathName, fileName);
    const outputFilePath = path.join(pathName, `filtered_${fileName}`);

    const readStream = fs.createReadStream(inputFilePath, { encoding: 'utf8' });
    const writeStream = fs.createWriteStream(outputFilePath, { encoding: 'utf8' });

    writeStream.write('[\n');
    let isFirst = true;

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

        if (!isFirst) {
            writeStream.write(',\n');
        }
        writeStream.write(JSON.stringify(filteredItem, null, 2));
        isFirst = false;
    });

    pipeline.on('end', () => {
        writeStream.write('\n]\n');
        writeStream.end();
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
