const { run } = require('./src/scrappingMap');
const { pincodeList } = require('./Data/Delhi/pincode')
const { promptList } = require('./config/prompts');
const { removeAttributes } = require("./src/sanity");
const { getAttributeToConsider } = require("./config/sanity");
const { config } = require('./config/main');
const { getOutletData } = require("./Db/db");
const { getPJPForDay } = require('./utils/PJPUtils');
const { getConst } = require("./utils/consts");
let area = 'delhi';
let fileName = `${area}OutletData.json`;
let pathName = "Data/delhi";
let pathNameCompany = `${pathName}/companyData`;


let lob = "marsinddemo";
async function main() {
    // scrapping
    console.log("🚀 Starting web scraping...");
    await scrapping();
    console.log("✅ Web scraping completed.");

    // Code sanity check
    console.log("🔍 Running code sanity check...");
    const sanityFor = "llmSimalarity";
    sanity(sanityFor);
    console.log("✅ Code sanity check passed.");

    // PJP - company data
    // const companyPJPDetails = await getPJPForDay();
    const companyPJPDetails = [
        'DSR-MPC-374::MGH00234',
        'DSR-MPC-374::MGH00233',
        'DSR-RAJ-183::CL005113',
        'DSR-RAJ-183::PS022685',
        'DSR-RAJ-183::PH124137',
        'DSR-RAJ-183::PH122741',
        'DSR-RAJ-183::PH122526',
        'DSR-RAJ-183::PH122527',
        'DSR-RAJ-183::PH122740',
        'DSR-RAJ-183::PH113136',
        'DSR-RAJ-183::PH109781',
        'DSR-RAJ-183::PH105748',
        'DSR-RAJ-183::PH105761',
        'DSR-RAJ-183::PH105745',
        'DSR-RAJ-183::PH104909',
        'DSR-RAJ-183::PH104913',
        'DSR-RAJ-183::PH102513',
        'DSR-RAJ-183::PH102496',
        'DSR-RAJ-183::PH033737',
        'DSR-RAJ-183::DS012467',
        'DSR-RAJ-183::DS007287',
        'DSR-RAJ-183::DS010572',
        'DSR-RAJ-183::DS009182',
        'DSR-RAJ-183::MGS00846',
        'DSR-RAJ-183::PH016887',
        'DSR-RAJ-183::PH014772',
        'DSR-RAJ-183::PH008888',
        'DSR-RAJ-183::DS013077',
        'SS-CMN-MUM-064::MGH00211',
        'DSR-CMN-MPC-636::TG023912',
        'DSR-CMN-MPC-636::PH126855',
        'DSR-CMN-MPC-636::PH123682',
        'DSR-CMN-MPC-636::TG023632',
        'DSR-CMN-MPC-636::TG023306',
        'DSR-CMN-MPC-636::PH108207',
        'DSR-CMN-MPC-636::PH108204',
        'DSR-CMN-MPC-636::TS001307',
        'DSR-CMN-MPC-636::PH105529',
        'DSR-CMN-MPC-636::PH094973',
        'DSR-CMN-MPC-636::TG019774',
        'DSR-CMN-MPC-636::PH093286',
        'DSR-CMN-MPC-636::PH093284',
        'DSR-CMN-MPC-636::PH086597',
        'DSR-CMN-MPC-636::TG015661',
        'DSR-CMN-MPC-636::TG015659',
        'DSR-CMN-MPC-636::TG015213',
        'DSR-CMN-MPC-636::PH063017',
        'DSR-CMN-MPC-636::TG015251',
        'DSR-CMN-MPC-636::TG015211',
        'DSR-CMN-MPC-636::DS013171',
        'DSR-CMN-MPC-636::PH037489',
        'DSR-CMN-MPC-636::PH037481',
        'DSR-MUM-291::PH002449',
        'DSR-MUM-291::PH024347',
        'DSR-MUM-291::PH022181',
        'DSR-MUM-291::PH030304',
        'DSR-MUM-291::PH052578',
        'DSR-MUM-291::PH002463',
        'DSR-MUM-291::PH002469',
        'DSR-MUM-291::PH002466',
        'DSR-MUM-291::PH029370',
        'DSR-MUM-291::PH002468',
        'DSR-MUM-291::PH018976',
        'DSR-MUM-291::PH058923',
        'DSR-MUM-291::PH024344',
        'DSR-MUM-291::PH021865',
        'DSR-MUM-291::TG000746',
        'DSR-MUM-291::PH056626',
        'DSR-MUM-291::PH057880',
        'DSR-MUM-291::PH011767',
        'DSR-MUM-291::PH002470',
        'DSR-MUM-291::DS000863',
        'DSR-MUM-291::TG000745',
        'DSR-MUM-291::PH031071',
        'DSR-MUM-291::PH002467',
        'DSR-MUM-291::DS002164',
        'DSR-MUM-291::PH022182',
        'DSR-MUM-291::PH002465',
        'DSR-RAJ-183::DS010663',
        'DSR-RAJ-183::PH030378',
        'DSR-RAJ-183::PH030377',
        'DSR-RAJ-183::PH052651',
        'DSR-RAJ-183::MGS00850',
        'DSR-RAJ-183::DS011782',
        'DSR-RAJ-183::PH032134',
        'DSR-PUNE-141::DS1009483',
        'DSR-CMN-PUNJ-825::PH130877',
        'DSR-CMN-PUNJ-825::PH129258',
        'DSR-CMN-PUNJ-825::PH129256',
        'DSR-CMN-PUNJ-825::PH129255',
        'DSR-CMN-PUNJ-825::PH118524',
        'DSR-CMN-PUNJ-825::PH118521',
        'DSR-CMN-PUNJ-825::PH118520',
        'DSR-CMN-PUNJ-825::PH113353',
        'DSR-CMN-PUNJ-825::PH113352',
        'DSR-CMN-PUNJ-825::PH113351',
        'DSR-CMN-PUNJ-825::PH109595',
        'DSR-CMN-PUNJ-825::PH109593',
        'DSR-CMN-PUNJ-825::PH109594',
        'DSR-CMN-PUNJ-825::PH109194',
    ]
    console.log(companyPJPDetails);
    getOutletDataAndStoreinCSV(companyPJPDetails);
    // simar code -




    // Reac match -> 



    // DB/S3 store ->

    // -- RAG ->

}

const getOutletDataAndStoreinCSV = (companyPJPDetails) => {
    const companyOutletPJPList = [...new Set(
        companyPJPDetails.map(val => val.split(getConst.groupBy.joiner)[1])
    )];
    getOutletData(lob, pathNameCompany, fileName, companyOutletPJPList);
}

const sanity = (sanityFor) => {
    const attributeToConsider = getAttributeToConsider(sanityFor);
    removeAttributes(`${sanityFor}_${fileName}`, pathName, attributeToConsider);
}

async function scrapping() {
    const localContext = config["scrapping"];
    for (let i = promptList.length - 1; i < promptList.length; i++) {
        console.log(" scrapping for prompts -> ", promptList[i]);

        const localAreaList = pincodeList.map((val, ind) => { return val.Pincode });
        await run(localAreaList, pathName, fileName, promptList[i], localContext);
    }
}

main();
