const axios = require("axios");
const { getConst } = require('./consts');
const { getServerURL } = require('../config/env');

// const apiHost = "https://api.sellinademo.io";
const apiToken = "ckt-fcqozdAyCAvIJFFMW_zzSsCf4pjubQZBowRuOxN_XGzXpjMo-CmzBMtOoygSv5UQuTU2tzupsQYUASqg1PJjLqrgfjon1YQR8JY2rSKDj54bCz02-kFcIvNcElnSX4-qkt82jwtMMfS_uLXnw5sZGV7XRcLYIU0-3saGPZyuMQrIZ_figM7J4CjnFuMlPw9hDq-YZrwUCPDrQRmtNUOZPCEqc2G1p1a6uriWtVaiyVQoykE5nEZYoe11EHoKp7UQiqmR33mKH0pP4PR2YJXcbSHKRF1MqzPD0_Vkdm3JQ-TpQJz0uRT3BQAewtPAHAIazQNVQaE7MKsSmHZOGHMLe8LtDWpiXx1sUQWw0mQsP1ict6h9tysbXposYGlQS9WEt_b85GOqycq-rUwf7oj6A3jgvGYtQeNMr0wLC7R7P7AzrXtMTO9tccTh17gIlWZgsPuzbbkIfTMGRft8UQCK_NGgEQDz0wA3w_csLqlPPFvaQYfxh-V2E9H96uhLr6FqGgMD1YFjbvqf6wT-pIm_5sDF40rvuLFaADZx4I82Iot_iYk-PESAhTEPPr6JkLsScSxIBmfHZWvNGcGvFF2oexWlnR1bwVUofl4J8-VemFYNpzpJUa1PbznNANDcQIc9yOHBQ_Elu6ryQkBBJCZnyhhqJSbf0Bg9fukNegBYO1A0QOmRJxyeBuH3hlXo5LpKvAIfVZkB9ZrKU-yHtdpBP9cI9FIUXgAfbWmIsw7iVarj5gpDhaOlSszZH4a9rVuo1m0co5BRk-Mlo5wPWWw6H3qYM98H0NI2lW6lDIB4noBhbvlfHPqLjfrQhbfVZrp3S7_lfFRRPfjIIKgn0CEq5I5Z8ZXXpyTeJq5bzxikDu7xbZkq2jFY26GztmdhV4V6gUk2erDlhi0ISeVQbs8lCpieNgOuVizXwS8wVrelPni3Rqz7eAj15ppGx10I5BnZsTOgrqjcbei7cIwdVbDY4UcSdH2n699ZeJxGOfTMNacbOQsLHcgR-So11XuhZxt9N2XXvvp-qMu0dyJxoTVRTdzULRpkC4GSsQONwQxtStjh-qoi3O__tKhxJsjKTEB6258y5AZcKsxKCUdcMNpU4x4Pz8anQVvUyGztRgyRwABlhNgyK7pQc9EH2uAo8PHaL_PIRRXwx39i9q_YXUy56hsgu2hD3SuwnNY5Ou5YSC8AslASzDBBxVtbSE3eFyM4rZFnZ_cre7Y7HuSu4WpEY-NAuaQmg6S6aEf5xvf8G_GPxZQJHHmL6mipVFcLwXK1d7EUy5A1BGyFLWMSr5m1RF6revhHYZiORSE7IGCrPXbmIc1Xj6E1VznsmcrMZJu5o8NxkEXz0Xf-fqkGNBkeww==";

async function extractPJPForADay(apiHost, apiToken, lobName) {
    try {
        console.log("Calling the PJP API...");


        const currentDate = new Date().toISOString().split('T')[0];
        const [yyyy, mm, dd] = currentDate.split("-");
        const formattedDate = `${dd}-${mm}-${yyyy}`;

        let apiUrl = `${apiHost}/v1/deliveryPJP/${formattedDate}?access_token=${apiToken}&size=20000&page=0&activeStatus=true&lob=${lobName}`;
        console.log("pjp url : ", apiUrl);


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




async function getPJPForDay(lob, env) {
    const apiHost = getServerURL(env);
    const pjp = await extractPJPForADay(apiHost, apiToken, lob);
    return [...pjp];
}

module.exports = { getPJPForDay };
