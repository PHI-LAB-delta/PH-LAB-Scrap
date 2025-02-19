
const mysql = require("mysql2");
const { MLDBCreds } = require("../config/env");


const getDataFromResponseG = async (lob, listOfOutletCode = null) => {
    const tableName = "ml_responseG";
    console.log("Creating DB connection ... ");

    let myPool = mysql.createPool(MLDBCreds).promise();

    try {
        let query = `
        SELECT outletCode, loginId, JSON_UNQUOTE(JSON_EXTRACT(payload, '$')) AS payload
        FROM ${tableName} WHERE lob = '${lob}' ${listOfOutletCode ? `and outletCode IN (${listOfOutletCode.map(code => `'${code}'`).join(", ")})` : ""}`;

        console.log("Query for ml ResponseG:", query);

        const [rows] = await myPool.query(query);
        return rows;
    } catch (error) {
        console.error("Error fetching outlet data:", error);
        return null;
    } finally {
        await myPool.end();
        console.log("Database pool closed");
    }
};


module.exports = { getDataFromResponseG };