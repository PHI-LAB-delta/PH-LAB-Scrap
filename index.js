const { run } = require('./src/scrappingMap');
const { pincodeList } = require('./Data/Delhi/pincode')

let fileName = "gurgoan";
let pathName = "Data/Gurgoan";

function main() {
    const localContext = {
        "extractFrom3rdWeb": false
    }
    const type = "shops".charAt(0).toUpperCase() + "shops".slice(1);
    console.log(type);
    const localAreaList = pincodeList.map((val, ind) => { return val.pincode });
    fileName = `${fileName}${type}.json`;
    run(localAreaList, pathName, fileName, type, localContext);
}

main();
