const { run } = require('./src/scrappingMap');
const { pincodeList } = require('./Data/Delhi/pincode')

let fileName = "delhiOutletData.json";
let pathName = "Data/delhi";

const promptList = {
    "grocery_supermarkets": [
        "Grocery stores",
        "Supermarkets",
        "Convenience stores",
        "24-hour grocery stores",
        "Best supermarkets"
    ],
    "confectionery_snacks": [
        "Candy shops",
        "Chocolate stores",
        "Snack stores",
        "Where to buy chocolates",
        "Bulk candy stores"
    ],
    "pet_food_supplies": [
        "Pet stores",
        "Where to buy pet food",
        "Veterinary clinics with pet food supply",
        "Best pet supply stores",
        "Pet shops"
    ],
    "wholesale_bulk_purchases": [
        "Wholesale food suppliers",
        "Bulk snack stores",
        "Warehouse stores",
        "Wholesale candy suppliers",
        "Where to buy bulk chocolates"
    ]
}


async function main() {
    const localContext = {
        "extractFrom3rdWeb": false
    }
    for (let [key, prompt] of Object.entries(promptList)) {
        for (let i = 0; i < prompt.length; i++) {
            const localAreaList = pincodeList.map((val, ind) => { return val.pincode });
            await run(localAreaList, pathName, fileName, prompt[i], localContext);
        }
    }
}

main();
