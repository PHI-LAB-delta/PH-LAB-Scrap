const { run } = require('./src/scrappingMap');
const { pincodeList } = require('./config/pincode')
const { promptList } = require('./config/prompts');
const { removeAttributes } = require("./src/sanity");
const { getAttributeToConsider } = require("./config/sanity");
const { config } = require('./config/main');
const { getOutletData } = require("./Db/db");
const { getPJPForDay } = require('./utils/PJPUtils');
const { getConst } = require("./utils/consts");
const { checkCoordinates } = require("./src/boundaryCheck");
const { saveToCSV } = require('./utils/commonUtils');
const util = require("util");
const { exec } = require("child_process");
const path = require("path");
const AwsUtils = require("./src/s3");
const { getDataFromResponseG } = require("./Db/mlDb");
const { processRecommendation } = require('./src/RecommProcess');

let area = config.areaFor.area;
let fileName = `${area}OutletData.json`;
let pathName = `Data/${area}`;
let pathNameCompany = `${pathName}/companyData`;
let pathNameDark = `${pathName}/DarkOutlet`;
let pathNameSky = `Data/sky_reviews`;

let lob = "";
let env = "";
async function main() {
    const args = process.argv;
    console.log("ℹ️ Starting the process with arguments:", args.slice(2));

    lob = args[2];
    env = args[3];
    const handleExecution = {
        toScrapData: args[4] === "true",
        toFindOppournityOutlets: args[5] === "true",
        toGetPJPData: args[6] === "true",
        toProvideRecomm: args[7] === "true",
        toProceedWithReview: args[8] === "true"
    };

    if (!lob || !env) {
        console.error("❌ ERROR: Please provide both LOB and environment to proceed.");
        return;
    }

    console.log(`🔄 Processing for LOB: ${lob}, Environment: ${env}`);
    console.log("🔧 Execution flags:", handleExecution);

    // Web Scraping
    if (handleExecution.toScrapData) {
        console.log("🚀 Initiating web scraping...");
        await scrapping();
        console.log("✅ Web scraping completed successfully.");
    }

    // Finding Opportunity Outlets
    if (handleExecution.toFindOppournityOutlets) {
        console.log("🔍 Running code sanity check...");
        const sanityFor = "llmSimilarity";
        const fileNameToSaveCompanyData = `${sanityFor}_${fileName}`;

        try {
            const filterDarkOutlet = await sanity(sanityFor, fileNameToSaveCompanyData);
            console.log("✅ Code sanity check passed.");
        } catch (error) {
            console.error("❌ Error in code sanity check:", error);
            return;
        }

        console.log("📥 Fetching outlet data from database...");
        const brightOutlets = await getOutletData(lob);
        await saveToCSV(pathNameCompany, fileName.replace('.json', '.csv'), brightOutlets);
        console.log("📤 Outlet data saved successfully.");

        const opportunitiesFile = path.join(__dirname, `${pathName}/${fileNameToSaveCompanyData.replace('.json', '.csv')}`);
        const companyOutletFile = path.join(__dirname, `${pathNameCompany}/${fileName.replace('.json', '.csv')}`);

        try {
            console.log("⚙️ Running similarity analysis Python script...");
            const execPromise = util.promisify(exec);
            const darkOutlets = await runPythonScript(opportunitiesFile, companyOutletFile, execPromise, "llmSimilarity.py");
            await saveToCSV(`${pathNameDark}`, fileName.replace('.json', '.csv'), darkOutlets);
            console.log("✅ Similarity analysis completed.");
        } catch (error) {
            console.error("❌ Error in running Python script:", error);
        }
    }

    let similarity_cache = [];
    let PJPloginOutletListMapping = {};

    if (handleExecution.toGetPJPData) {
        console.log("📊 Extracting PJP data for the day...");
        const companyPJPDetails = await getPJPForDay(lob, env);
        await getOutletDataAndStoreinCSV(companyPJPDetails, lob, PJPloginOutletListMapping);
        console.log("✅ PJP data extraction completed.");

        try {
            console.log("⚙️ Processing PJP outlet data with Python script...");
            const pjpOutletData = path.join(__dirname, `${pathNameCompany}/pjp_${fileName.replace('.json', '.csv')}`);
            const darkOutletData = path.join(__dirname, `${pathNameDark}/${fileName.replace('.json', '.csv')}`);
            const execPromise = util.promisify(exec);
            const darkOutlets = await runPythonScript(pjpOutletData, darkOutletData, execPromise, "process_outlets.py");
            similarity_cache = darkOutlets.similarity_cache;
            let takeUniqueData = new Map();
            if (darkOutlets.filtered_dark_outlets && Array.isArray(darkOutlets.filtered_dark_outlets)) {
                darkOutlets.filtered_dark_outlets.forEach((val) => {
                    if (!takeUniqueData.has(val.placeId)) {
                        takeUniqueData.set(val.placeId, val);
                    }
                });
            }
            darkOutlets.filtered_dark_outlets = Array.from(takeUniqueData.values());
            await saveToCSV(`${pathNameDark}`, `pjp_${fileName.replace('.json', '.csv')}`, darkOutlets.filtered_dark_outlets);
            console.log("✅ PJP outlet processing completed.");
        } catch (error) {
            console.error("❌ Error in running Python script for PJP outlets:", error);
        }
    }

    if (handleExecution.toProvideRecomm) {
        console.log("📡 Initiating recommendations for opportunity outlets...");
        if (similarity_cache.length === 0 || Object.keys(PJPloginOutletListMapping).length === 0) {
            console.error("⚠️ ERROR: PJP data is missing or has not been extracted for the day. Please extract the PJP data before proceeding.");
            return;
        }

        let listOfOutletCode = [];
        for (const outlets of Object.values(PJPloginOutletListMapping)) {
            listOfOutletCode.push(...outlets.map(outlet => outlet.outletcode));
        }

        console.log("📥 Fetching additional outlet data for recommendations...");
        const dataResponseG = await getDataFromResponseG(lob, listOfOutletCode);

        for (const data of dataResponseG) {
            const loginId = data.loginId;
            const outletCode = data.outletCode;
            const payload = JSON.parse(data.payload);

            if (PJPloginOutletListMapping[loginId]) {
                for (const skuOutlet of PJPloginOutletListMapping[loginId]) {
                    if (skuOutlet.outletcode === outletCode) {
                        skuOutlet["skuList"] = getSKUList(payload);
                    }
                }
            }
        }

        console.log("🔎 Processing final recommendations...");
        const dataForOpportunityOutlets = await processRecommendation(PJPloginOutletListMapping, similarity_cache, `${pathNameDark}/pjp_${fileName.replace('.json', '.csv')}`);
        console.log("✅ Total opportunity outlets identified:", dataForOpportunityOutlets.length);

        const fileNameToSave = `final_${fileName.replace('.json', '.csv')}`;
        await saveToCSV(pathNameDark, fileNameToSave, dataForOpportunityOutlets);
        console.log("📤 Final recommendations saved.");

        console.log("☁️ Uploading final results to AWS...");
        await AwsUtils.uploadFile("darksysbucket", `harshprincegoogleparser/${lob}_PJP_opportunitiesOutlets.csv`, `${pathNameDark}/${fileNameToSave}`);
        console.log("✅ File successfully uploaded to AWS.");
    }
    if (handleExecution.toProceedWithReview) {
        console.log("🔎 Processing for Review ... ");
        let fileNameResult = `${lob}_review_result.csv`;
        let QAKeyName = `${lob}_QA.csv`;
        let FAQKeyName = `${lob}_FAQ.csv`;
        let FAQFileName = path.join(`${pathNameSky}/${FAQKeyName}`);
        let QAFileName = path.join(`${pathNameSky}/${QAKeyName}`);

        await AwsUtils.readFile("darksysbucket", `harshprincegoogleparser/${QAKeyName}`, QAFileName);
        const FAQ = path.join(__dirname, FAQFileName);
        const QA = path.join(__dirname, QAFileName);
        try {
            console.log("⚙️ Running similarity analysis Python script...");
            const execPromise = util.promisify(exec);
            const responseResult = await runPythonScript(FAQ, QA, execPromise, "sky_review.py");
            await saveToCSV(`${pathNameSky}`, fileNameResult, responseResult);
            await AwsUtils.uploadFile("darksysbucket", `harshprincegoogleparser/${fileNameResult}`, `${pathNameSky}/${fileNameResult}`);
            console.log("✅ Process done for Review/feedback");
        } catch (error) {
            console.error("❌ Error in running Python script:", error);
        }
    }
    console.log("🎉 Process completed successfully.");
}
const getSKUList = (payload) => {
    if (!payload?.pbs || !Array.isArray(payload.pbs)) {
        return [];
    }
    let outletCode = payload?.out
    return payload.pbs
        .filter(value => value.spr === 0)
        .map(value => ({
            skuCode: value.sku,
            qty: value.qty,
            wgt: value.wgt,
            outletCode: [outletCode]
        }));
};


async function runPythonScript(file1, file2, execPromise, scriptFileName) {
    return new Promise(async (resolve, reject) => {
        const scriptPath = path.join(__dirname, "scripts", scriptFileName);
        const venvPath = path.join(__dirname, "scripts", "venv");
        const pythonExec = path.join(venvPath, "bin", "python3"); // Ensure correct Python environment
        const packageDependency = path.join(__dirname, "scripts", "requirements.txt");

        console.log("📂 Input File 1:", file1);
        console.log("📂 Input File 2:", file2);


        try {
            console.log("🚀 Setting up virtual environment...");
            await execPromise(`python3 -m venv ${venvPath}`);

            console.log("📦 Installing dependencies...");
            // Install dependencies from the requirements.txt file
            await execPromise(`${pythonExec} -m pip install --upgrade pip`);
            await execPromise(`${pythonExec} -m pip install -r ${packageDependency}`);

            console.log("🚀 Running Python script:", scriptPath);
            const { stdout, stderr } = await execPromise(`${pythonExec} ${scriptPath} ${file1} ${file2}`);

            if (stderr) {
                console.warn(`⚠️ Python Script Warning: ${stderr}`);
            }

            console.log("✅ Python script executed successfully.");
            const darkOutlets = JSON.parse(stdout);
            resolve(darkOutlets);
        } catch (error) {
            console.error("❌ Error executing Python script:", error.message);
            reject(`❌ Error: ${error.message}`);
        }
    });
}
const getOutletDataAndStoreinCSV = async (companyPJPDetails, lob, PJPloginOutletListMapping) => {
    try {
        const { area, targetOsmType, targetOsmId } = config.areaFor;

        const companyOutletPJPList = Array.from(
            new Set(companyPJPDetails.map(val => val.split(getConst.groupBy.joiner)[1]))
        );

        const loginOutletListMapping = companyPJPDetails.reduce((acc, entry) => {
            const [loginId, outletCode] = entry.split(getConst.groupBy.joiner);
            acc[outletCode] = acc[outletCode] || [];
            acc[outletCode].push(loginId);
            return acc;
        }, {});

        const pjpOutletDetails = await getOutletData(lob, companyOutletPJPList);
        console.log(`Total number of outlets today in PJP with correct data and in ${area}: ${pjpOutletDetails.length}`);

        const withinBoundaryData = await checkCoordinates(targetOsmType, targetOsmId, pjpOutletDetails);

        withinBoundaryData.forEach(outlet => {
            outlet["loginId"] = loginOutletListMapping[outlet["outletcode"]] || [];
            let loginIdList = outlet["loginId"];

            loginIdList.forEach(loginId => {
                if (!PJPloginOutletListMapping[loginId]) {
                    PJPloginOutletListMapping[loginId] = [];
                }
                PJPloginOutletListMapping[loginId].push({
                    "sub_channel": outlet["sub_channel"],
                    "outletcode": outlet["outletcode"]
                });
            });
        });
        const fileNameToSave = fileName.replace('.json', '.csv');
        await saveToCSV(pathNameCompany, `pjp_${fileNameToSave}`, withinBoundaryData);

        console.log(`LOB Data saved successfully in ${pathNameCompany}/pjp_${fileNameToSave}`);
    } catch (error) {
        console.error("Error processing outlet data:", error);
    }
};


const sanity = async (sanityFor, fileNameTosave, toSaveInCSV = true) => {
    const attributeToConsider = getAttributeToConsider(sanityFor);
    return await removeAttributes(fileNameTosave, fileName, pathName, attributeToConsider, toSaveInCSV);
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
