require('dotenv').config();
const AWS = require('aws-sdk');
const csv = require('csv-parser');
const fs = require('fs');

AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});

const s3 = new AWS.S3();
const bucketName = 'darksys';

async function getCSVFromS3(fileName) {
    return new Promise((resolve, reject) => {
        try {
            const objectKey = fileName;
            const params = { Bucket: bucketName, Key: objectKey };
            const s3Stream = s3.getObject(params).createReadStream();

            const results = [];
            s3Stream
                .pipe(csv())
                .on('data', (row) => results.push(row))
                .on('end', () => resolve(results))
                .on('error', (error) => reject(error));

        } catch (error) {
            reject(error);
        }
    });
}

module.exports = { getCSVFromS3 };
