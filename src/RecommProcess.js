const fs = require('fs');
const csv = require('csv-parser');
const { getConst } = require('../utils/consts');

const processRecommendation = (PJPloginOutletListMapping, similarity_cache, opportunityOutletsPath) => {
    const results = [];

    fs.createReadStream(opportunityOutletsPath)
        .pipe(csv())
        .on('data', (opportunityOutletsData) => {
            const sub_channel_opportunity = opportunityOutletsData["sub_channel"];
            const loginId = opportunityOutletsData["loginId"];


            if (!PJPloginOutletListMapping[loginId]) return;

            const threshold = getThresholdOfNumberOfSku(PJPloginOutletListMapping[loginId]);


            const skuToRec = getPotentialSkuCode(PJPloginOutletListMapping[loginId], sub_channel_opportunity, threshold, similarity_cache);

            opportunityOutletsData["skus"] = skuToRec;
            results.push(opportunityOutletsData);
        })
        .on('end', () => {
            console.log('CSV file successfully processed');
        })
        .on('error', (err) => {
            console.error('Error reading the CSV file:', err);
        });

    return results;
};

const getThresholdOfNumberOfSku = (outletdetails) => {
    let threshold = Number.MAX_SAFE_INTEGER;
    for (let outletdetailsData of outletdetails) {

        if (outletdetailsData.skuList && Array.isArray(outletdetailsData.skuList)) {
            threshold = Math.min(threshold, outletdetailsData.skuList.length);
        }
    }
    return Math.max(threshold, 3);
};

const getPotentialSkuCode = (outletdetails, sub_channel_opportunity, threshold, similarity_cache) => {
    let listOfSkuCode = [];

    for (let outletdetailsData of outletdetails) {
        let similarityChannel = `${outletdetailsData.sub_channel}${getConst.groupBy.joiner}${sub_channel_opportunity}`;
        let similarityChannel2 = `${sub_channel_opportunity}${getConst.groupBy.joiner}${outletdetailsData.sub_channel}`;

        if ((similarity_cache[similarityChannel] ?? 0) < 0.5 && (similarity_cache[similarityChannel2] ?? 0) < 0.5) {
            continue;
        }

        if (outletdetailsData.skuList && Array.isArray(outletdetailsData.skuList)) {
            listOfSkuCode.push(...outletdetailsData.skuList);
        }
    }
    listOfSkuCode.sort((a, b) => b.wgt - a.wgt);

    return listOfSkuCode.slice(0, Math.min(threshold, listOfSkuCode.length));
};

module.exports = { processRecommendation };