const fs = require('fs');

const jsonFilePath = "Data/Delhi/filtered_delhiOutletData.json";
const jsonDataSync = fs.readFileSync(jsonFilePath, 'utf8');
const jsonData = JSON.parse(jsonDataSync);
let data = Array.from(jsonData);

console.log(data.length);

let setdata = new Set();

data.forEach(val => {
    setdata.add(val.placeId)
})

// console.log(data.length, " :: ", setdata.size);


// data.forEach(single => {
//     Object.values(single).forEach((value, idx) => {
//         count += value.length;
//     })
// })