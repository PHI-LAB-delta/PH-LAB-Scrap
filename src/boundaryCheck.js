const {
    polygon,
    multiPolygon,
    point,
    booleanPointInPolygon,
} = require("@turf/turf");
const { extractJsonData } = require('../utils/commonUtils');

async function getCoordinatesData(targetOsmType, targetOsmId) {
    try {
        const osmResponse = await fetch(
            `https://nominatim.openstreetmap.org/details.php?osmtype=${targetOsmType}&osmid=${targetOsmId}&polygon_geojson=1&format=json`
        );
        const osmData = await osmResponse.json();
        const geojsonType = osmData.geometry.type.toLowerCase();

        if (geojsonType.includes("polygon")) {
            return osmData.geometry.coordinates;
        }

        const cityName = osmData.localname;
        return await createCoordinatesFromBoundaryValues(cityName, targetOsmType, targetOsmId);
    } catch (error) {
        throw new Error("Error fetching coordinates data: " + error.message);
    }
}

async function createCoordinatesFromBoundaryValues(cityName, osmType, osmId) {
    try {
        const osmResponse = await fetch(
            `https://nominatim.openstreetmap.org/search.php?q=${cityName}&polygon_geojson=1&format=jsonv2`
        );
        const osmData = await osmResponse.json();

        if (osmData.length === 0) {
            return [[]];
        }

        const boundingBox = osmData.find(
            (item) =>
                item.osm_type.toLowerCase()[0] === osmType.toLowerCase() &&
                item.osm_id === parseInt(osmId)
        ).boundingbox;

        return [
            [
                [Math.min(boundingBox[2], boundingBox[3]), Math.min(boundingBox[0], boundingBox[1])],
                [Math.max(boundingBox[2], boundingBox[3]), Math.min(boundingBox[0], boundingBox[1])],
                [Math.max(boundingBox[2], boundingBox[3]), Math.max(boundingBox[0], boundingBox[1])],
                [Math.min(boundingBox[2], boundingBox[3]), Math.max(boundingBox[0], boundingBox[1])],
                [Math.min(boundingBox[2], boundingBox[3]), Math.min(boundingBox[0], boundingBox[1])],
            ],
        ];
    } catch (err) {
        throw new Error("Something went wrong in fetching boundary box coordinates");
    }
}

async function getBoundaryData(coordinatesData, data) {
    const finalData = [];
    let count = 0;
    let polygonFigure = coordinatesData.length === 1 ? polygon(coordinatesData) : multiPolygon(coordinatesData);

    for (const value of data) {
        const pointCoords = [value.longitude, value.latitude];
        const point1 = point(pointCoords);
        const isPointInsidePolygon = booleanPointInPolygon(point1, polygonFigure);

        if (isPointInsidePolygon) {
            finalData.push(value);
        } else {
            count++;
        }
    }

    return { finalData, count };
}

async function checkCoordinates(targetOsmType, targetOsmId, businessData) {
    const coordinatesArray = await getCoordinatesData(targetOsmType, targetOsmId);
    // let filename = defaultFileName ? defaultFileName : `${targetOsmType}${targetOsmId}-${area}.json`;
    // const businessData = extractJsonData(filename, pathname);

    try {
        const { finalData, count } = await getBoundaryData(coordinatesArray, businessData);
        console.log("Count which is out of boundary --> ", count);
        return finalData;
    } catch (error) {
        console.error("Error in checkCoordinates:", error);
        return [];
    }
}

module.exports = { checkCoordinates };