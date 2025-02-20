const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
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
        console.log("Saving the .csv file to AWS S3 darksysbucket");

        const fileStream = fs.createReadStream(filePath);
        fileStream.on("error", (err) => {
            console.log("File error", err);
        });

        try {
            const response = await this.s3Client.send(
                new PutObjectCommand({
                    Bucket: bucketName,
                    Key: fileNameKey,
                    Body: fileStream,
                })
            );
            console.log(response);
        } catch (err) {
            console.log("Unable to upload the file", err);
        }
    },
};

module.exports = AwsUtils;