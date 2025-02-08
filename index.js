const { run } = require('./src/scrappingMap');
const { pincodeList } = require('./Data/Delhi/pincode')
const { promptList } = require('./config/prompts');
const { removeAttributes } = require("./src/sanity");
let area = 'delhi';
let fileName = `${area}OutletData.json`;
let pathName = "Data/delhi";


async function main() {

    // scrapping
    console.log("🚀 Starting web scraping...");
    await scrapping();
    console.log("✅ Web scraping completed.");

    // Code sanity check
    console.log("🔍 Running code sanity check...");
    sanity();
    console.log("✅ Code sanity check passed.");


}

const sanity = () => {
    removeAttributes(fileName, pathName);
}

async function scrapping() {
    const localContext = {
        "extractFrom3rdWeb": false,
        "area": area,
        "targetOsmId": "1942586",
        "targetOsmType": "R",
        "extractReviews": false
    }
    for (let i = 0; i < promptList.length; i++) {
        const localAreaList = pincodeList.map((val, ind) => { return val.pincode });
        await run(localAreaList, pathName, fileName, promptList[i], localContext);
    }
}

main();
