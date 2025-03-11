const config = {
    areaFor: {
        area: "bhopal",
        targetOsmId: "1942586",
        targetOsmType: "R",
    },
    scrapping: {
        extractFrom3rdWeb: false,
        extractReviews: false,
        toConsiderDetails: true
    },
    companyData: {
        toExtractCordinate: false,
    },
    sanity: {
        sanityFor: "llmSimilarity"
    }
};

module.exports = { config };
