
const mysql = require("mysql2");
const { dbCreds } = require("../config/env");
const path = require('path');
const { isAlphabetic, isValidCoordinate } = require("../utils/commonUtils");


const getBoundaryData = async (cordinates) => {
    const myPool = mysql.createPool(db).promise();
    const { min_lat, min_lon, max_lat, max_lon } = cordinates;
    try {
        const data = await myPool.query(`SELECT * FROM outletlbpl WHERE ST_Contains(ST_GeomFromText('POLYGON((${min_lat} ${min_lon}, ${min_lat} ${max_lon}, ${max_lat} ${max_lon}, ${max_lat} ${min_lon}, ${min_lat} ${min_lon}))'), position)`);
        return data[0];
    } catch (error) {
        throw new Error('Error retrieving boundary data');
    }
};

const getOutletData = async (lob, companyPJPOutletDetails = null) => {
    dbCreds.database = `db_${lob}`;
    const tableName = "ck_outlet_details";
    console.log("creating db connection ... ");
    console.log(dbCreds);

    let myPool = mysql.createPool(dbCreds).promise();
    let companyOutletDetails = [];
    try {

        const mQuery = `
        SELECT outletcode, outlet_name, location_hierarchy, sub_channel, coordinate, latitude, longitude, address
        FROM ${tableName} 
        ${companyPJPOutletDetails ? `WHERE outletcode IN (${companyPJPOutletDetails.map(code => `'${code}'`).join(", ")})` : ""}
        `;

        console.log("Query for Outlets : ", mQuery);

        const [rows] = await myPool.query(mQuery);


        for (const oldOutlet of rows) {
            let newOutlet = {
                outlet_name: oldOutlet.outlet_name || null,
                outletcode: oldOutlet.outletcode || null,
                location_hierarchy: oldOutlet.location_hierarchy || null,
                sub_channel: oldOutlet.sub_channel || null,
                coordinate: oldOutlet.coordinate || null,
                latitude: null,
                longitude: null,
                address: oldOutlet.address || null,
            };

            if (!oldOutlet.latitude || !oldOutlet.longitude || oldOutlet.latitude === "0.00000000" || oldOutlet.longitude === "0.00000000") {
                if (!oldOutlet.outlet_name || !oldOutlet.address || !isAlphabetic(oldOutlet.outlet_name) || !isAlphabetic(oldOutlet.address)) {
                    continue;
                }
                if (isValidCoordinate(oldOutlet.coordinate?.x, oldOutlet.coordinate?.y)) {
                    newOutlet.latitude = parseFloat(oldOutlet.coordinate.x);
                    newOutlet.longitude = parseFloat(oldOutlet.coordinate.y);
                } else {
                    continue;
                }
                // console.log("Cannot find lat and lng", oldOutlet.latitude, oldOutlet.longitude);

                // const { latitude, longitude } = await MissingLatLngHandler.scrapCoordinates(oldOutlet.outlet_name, oldOutlet.address);
                // newOutlet.latitude = parseFloat(latitude);
                // newOutlet.longitude = parseFloat(longitude);
                // newOutlet.isLatLngChanged = true;
            } else {
                newOutlet.latitude = parseFloat(oldOutlet.latitude);
                newOutlet.longitude = parseFloat(oldOutlet.longitude);
            }

            companyOutletDetails.push(newOutlet);
        }

        return companyOutletDetails;
    } catch (error) {
        console.error("Error fetching outlet data:", error);
    } finally {
        await myPool.end();
        console.log("Database pool closed");
    }
};


module.exports = { getBoundaryData, getOutletData };