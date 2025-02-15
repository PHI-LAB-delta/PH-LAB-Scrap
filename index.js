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
let area = 'delhi';
let fileName = `${area}OutletData.json`;
let pathName = "Data/delhi";
let pathNameCompany = `${pathName}/companyData`;

let lob = "";
let env = "";
async function main() {

    const args = process.argv;
    console.log(args[2]);

    lob = args[2]
    env = args[3]
    const handleExecution = {
        toScrapData: args[4] === "true" ? true : false,
        toFindOppournityOutlets: args[5] === "true" ? true : false,
        toGetPJPData: args[6] === "true" ? true : false,
    }
    if (!lob || !lob.length || !env || !env.length) {
        console.log("Please enter the lob to proceed");
        return;
    }

    // scrapping
    if (handleExecution.toScrapData) {
        console.log("🚀 Starting web scraping...");
        await scrapping();
        console.log("✅ Web scraping completed.");
    }

    // finding opportunity outlets:

    if (handleExecution.toFindOppournityOutlets) {
        // Code sanity check
        console.log("🔍 Running code sanity check...");
        const sanityFor = "llmSimalarity";
        const filterDarkOutlet = await sanity(sanityFor);
        console.log("✅ Code sanity check passed.");
        // extracting all company outlets from DB
        const brightOutlets = await getOutletData(lob);
        // simarlirity LLM code -
    }

    // PJP - company data
    if (handleExecution.toGetPJPData) {
        const companyPJPDetails = await getPJPForDay(lob, env);
        await getOutletDataAndStoreinCSV(companyPJPDetails, lob);
    }






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

    const fileNameTosave = fileName.replace('.json', '.csv');
    await saveToCSV(pathNameCompany, fileNameTosave, withinBoundaryData)

    console.log(`LOB Data saved successfully in ${pathNameCompany}/${fileNameTosave}`);
};

const sanity = async (sanityFor, toSaveInCSV = true) => {
    const attributeToConsider = getAttributeToConsider(sanityFor);
    return await removeAttributes(`${sanityFor}_${fileName}`, fileName, pathName, attributeToConsider, toSaveInCSV);
};

async function scrapping() {
    const localContext = { ...config.areaFor, ...config.scrapping };
    for (let i = promptList.length - 1; i < promptList.length; i++) {
        console.log("Scrapping for type -> ", promptList[i]);

        const localAreaList = pincodeList.map((val, ind) => { return val.Pincode });
        await run(localAreaList, pathName, fileName, promptList[i], localContext);
    }
}

main();
