const axios = require("axios");
const { getConst } = require('./consts');

const apiHost = "https://api.sellinademo.io";
const apiToken = "yAPweVFMLf";
const lobName = "marsinddemo";

async function extractPJPForADay(apiHost, apiToken, lobName) {
    try {
        console.log("Calling the PJP API...");


        const currentDate = new Date().toISOString().split('T')[0];
        const [yyyy, mm, dd] = currentDate.split("-");
        const formattedDate = `${dd}-${mm}-${yyyy}`;

        let apiUrl = `${apiHost}/v1/deliveryPJP/${formattedDate}?access_token=${apiToken}&size=20000&page=0&activeStatus=true&lob=${lobName}`;

        const response = await axios.get(apiUrl);
        const data = response.data;

        if (!data || !data.features) {
            console.error("Invalid response format from API.");
            return new Set();
        }

        const pjpSet = new Set(
            data.features.map(feature => {
                const loginId = feature?.loginId || "UNKNOWN";
                const outletCode = feature?.outletCode || "UNKNOWN";
                return `${loginId}${getConst.groupBy.joiner}${outletCode}`;
            })
        );

        console.log(`Number of PJP for today: ${pjpSet.size}`);
        return pjpSet;
    } catch (error) {
        console.error("Error occurred while processing PJP data:", error.message);
        return new Set();
    }
}




async function getPJPForDay() {
    const pjp = await extractPJPForADay(apiHost, apiToken, lobName);
    return [...pjp];
}

module.exports = { getPJPForDay };
