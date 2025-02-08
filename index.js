const { run } = require('./src/scrappingMap');
const { pincodeList } = require('./Data/Delhi/pincode')
const { promptList } = require('./config/prompts');
const { removeAttributes } = require("./src/sanity");
let area = 'delhi';
let fileName = `${area}OutletData.json`;
let pathName = "Data/delhi";


async function main() {

    // scrapping
    await scrapping();
    // code sanity
    sanity();

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
