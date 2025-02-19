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
const util = require("util");
const { exec } = require("child_process");
const path = require("path");
const { getCSVFromS3 } = require("./src/s3");

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
        toProvideRecomm: args[7] === "true" ? true : false
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
        const fileNameToSaveCompanyData = `${sanityFor}_${fileName}`;
        const filterDarkOutlet = await sanity(sanityFor, fileNameToSaveCompanyData);
        console.log("✅ Code sanity check passed.");
        // // extracting all company outlets from DB
        const brightOutlets = await getOutletData(lob);
        await saveToCSV(pathNameCompany, fileName.replace('.json', '.csv'), brightOutlets);
        // simarlirity LLM code -
        const opportunitiesFile = path.join(__dirname, `${pathName}/${fileNameToSaveCompanyData.replace('.json', '.csv')}`);
        const companyOutletFile = path.join(__dirname, `${pathNameCompany}/${fileName.replace('.json', '.csv')}`);

        try {
            const execPromise = util.promisify(exec);
            const darkOutlets = await runPythonScript(opportunitiesFile, companyOutletFile, execPromise, "llmSimalirity.py");
            await saveToCSV(`${pathName}/DarkOutlet`, fileName.replace('.json', '.csv'), darkOutlets);
            console.log("✅ Dark Outlets Save in CSV :", `${pathName}/DarkOutlet/${fileName.replace('.json', '.csv')}`);
        } catch (error) {
            console.error("❌ Error in running Python script:", error);
        }
    }

    // PJP - company data
    if (handleExecution.toGetPJPData) {
        const companyPJPDetails = await getPJPForDay(lob, env);
        await getOutletDataAndStoreinCSV(companyPJPDetails, lob);
        try {
            const pjpOutletData = path.join(__dirname, `${pathNameCompany}/pjp_${fileName.replace('.json', '.csv')}`);
            const darkOutletData = path.join(__dirname, `${pathName}/DarkOutlet/${fileName.replace('.json', '.csv')}`);
            const execPromise = util.promisify(exec);
            const darkOutlets = await runPythonScript(pjpOutletData, darkOutletData, execPromise, "process_outlets.py");
            await saveToCSV(`${pathName}/DarkOutlet`, `pjp_${fileName.replace('.json', '.csv')}`, darkOutlets);
            console.log("✅ Dark Outlets Save in CSV :", darkOutlets.length);
        } catch (error) {
            console.error("❌ Error in running Python script:", error);
        }
    }

    // Add Recc for opportunity outlets
    if (handleExecution.toProvideRecomm) {
        try {
            const csvData = await getCSVFromS3('your-file.csv');
            console.log('CSV Data:', csvData);
        } catch (error) {
            console.error('Error:', error);
        }
    }

    // DB/S3 store ->

}

async function runPythonScript(file1, file2, execPromise, scriptFileName) {
    return new Promise(async (resolve, reject) => {
        const scriptPath = path.join(__dirname, "scripts", scriptFileName);
        const venvPath = path.join(__dirname, "scripts", "venv");
        const pythonExec = path.join(venvPath, "bin", "python3"); // Ensure correct Python environment
        const packageDependency = path.join(__dirname, "scripts", "requirements.txt");

        console.log(file1);
        console.log(file2);


        try {
            console.log("🚀 Setting up virtual environment...");
            await execPromise(`python3 -m venv ${venvPath}`);

            console.log("📦 Installing dependencies...");
            // Install dependencies from the requirements.txt file
            await execPromise(`${pythonExec} -m pip install --upgrade pip`);
            await execPromise(`${pythonExec} -m pip install -r ${packageDependency}`);

            console.log("🚀 Running Python script...");
            const { stdout, stderr } = await execPromise(`${pythonExec} ${scriptPath} ${file1} ${file2}`);

            if (stderr) {
                console.warn(`⚠️ Python Script Warning: ${stderr}`);
            }

            const darkOutlets = JSON.parse(stdout);
            resolve(darkOutlets);
        } catch (error) {
            reject(`❌ Error: ${error.message}`);
        }
    });
}
const getOutletDataAndStoreinCSV = async (companyPJPDetails, lob) => {
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
