const { run } = require('./src/scrappingMap');
const { pincodeList } = require('./Data/Delhi/pincode')
const { promptList } = require('./config/prompts');
const { removeAttributes } = require("./src/sanity");
const { getAttributeToConsider } = require("./config/sanity");
const { config } = require('./config/main');
const { getOutletData } = require("./Db/db");
const { getPJPForDay } = require('./utils/PJPUtils');
const { getConst } = require("./utils/consts");
const { checkCoordinates } = require("./src/boundaryCheck");
const { saveToCSV } = require('./utils/commonUtils');
const fs = require('fs').promises;
let area = 'delhi';
let fileName = `${area}OutletData.json`;
let pathName = "Data/delhi";
let pathNameCompany = `${pathName}/companyData`;

let lob = "";
async function main() {

    const args = process.argv;
    lob = args[2]
    const handleExecution = {
        toScrapData: args[3],
        toDoSanityForLLMSimilarity: args[4],
        toGetPJPData: args[5],
    }
    if (lob || lob.length) {
        console.log("Please enter the lob to proceed");
        return;
    }


    // scrapping
    if (handleExecution.toScrapData) {
        console.log("🚀 Starting web scraping...");
        await scrapping();
        console.log("✅ Web scraping completed.");
    }

    // Code sanity check
    if (handleExecution.toDoSanityForLLMSimilarity) {
        console.log("🔍 Running code sanity check...");
        const sanityFor = "llmSimalarity";
        sanity(sanityFor);
        console.log("✅ Code sanity check passed.");
    }

    // PJP - company data

    if (handleExecution.toGetPJPData) {
        const companyPJPDetails = await getPJPForDay();
        await getOutletDataAndStoreinCSV(companyPJPDetails, lob);
    }
    // simar code -






    // Reac match -> 



    // DB/S3 store ->

    // -- RAG ->

}

const getOutletDataAndStoreinCSV = async (companyPJPDetails, lob) => {
    let lc = config.areaFor;

    const companyOutletPJPList = [...new Set(
        companyPJPDetails.map(val => val.split(getConst.groupBy.joiner)[1])
    )];

    const pjpOutletDetails = await getOutletData(lob, companyOutletPJPList);

    console.log(`Total number of outlet today in PJP with correct data and in ${lc.area}: `, pjpOutletDetails.length);

    const withinBoundaryData = await checkCoordinates(
        lc.targetOsmType,
        lc.targetOsmId,
        pjpOutletDetails
    );


    saveToCSV(pathNameCompany, fileName, withinBoundaryData)

    console.log(`LOB Data saved successfully in ${pathName}/${fileName}`);
};

const sanity = (sanityFor) => {
    const attributeToConsider = getAttributeToConsider(sanityFor);
    removeAttributes(`${sanityFor}_${fileName}`, fileName, pathName, attributeToConsider);
}

async function scrapping() {
    const localContext = { ...config.areaFor, ...config.scrapping };
    for (let i = promptList.length - 1; i < promptList.length; i++) {
        console.log("Scrapping for type -> ", promptList[i]);

        const localAreaList = pincodeList.map((val, ind) => { return val.Pincode });
        await run(localAreaList, pathName, fileName, promptList[i], localContext);
    }
}

main();
