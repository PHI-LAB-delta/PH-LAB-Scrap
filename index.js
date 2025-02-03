const { run } = require('./src/scrappingMap');

let fileName = "gurgoan";
let pathName = "Data/Gurgoan";

function main() {
    const localContext = {
        "extractFrom3rdWeb": false
    }
    const type = "shops".charAt(0).toUpperCase() + "shops".slice(1);
    console.log(type);
    const localAreaList = ["me"];
    fileName = `${fileName}${type}.json`;
    run(localAreaList, pathName, fileName, type, localContext);
}

main();
