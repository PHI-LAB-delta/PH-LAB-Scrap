const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
require('dotenv').config();
const fs = require("fs");

const AwsUtils = {
    s3Client: new S3Client({
        region: process.env.AWS_REGION,
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
    }),
    uploadFile: async function (bucketName, fileNameKey, filePath) {
        console.log(`Saving the .csv file to AWS S3 bucket: ${bucketName}`);

        const fileStream = fs.createReadStream(filePath);
        fileStream.on("error", (err) => {
            console.error("File error:", err);
        });

        try {
            const response = await this.s3Client.send(
                new PutObjectCommand({
                    Bucket: bucketName,
                    Key: fileNameKey,
                    Body: fileStream,
                })
            );

            console.log(`File successfully uploaded to S3:
            - Bucket: ${bucketName}
            - Key: ${fileNameKey}
            - ETag: ${response.ETag}
            - Version ID: ${response.VersionId || "N/A"}
            - Server-side encryption: ${response.ServerSideEncryption || "None"}
            `);
        } catch (err) {
            console.error("Unable to upload the file:", err);
        }
    },
    readFile: async function (bucketName, fileNameKey, downloadPath) {
        console.log(`Reading file from AWS S3 bucket: ${bucketName}`);

        try {
            const response = await this.s3Client.send(
                new GetObjectCommand({
                    Bucket: bucketName,
                    Key: fileNameKey,
                })
            );

            const fileStream = fs.createWriteStream(downloadPath);
            response.Body.pipe(fileStream);

            return new Promise((resolve, reject) => {
                fileStream.on("finish", () => {
                    console.log(`File successfully downloaded to: ${downloadPath}`);
                    resolve(downloadPath);
                });

                fileStream.on("error", (err) => {
                    console.error("File write error:", err);
                    reject(err);
                });
            });
        } catch (err) {
            console.error("Unable to read the file:", err);
        }
    }
};

module.exports = AwsUtils;