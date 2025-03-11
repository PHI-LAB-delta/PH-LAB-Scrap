const config = {
    areaFor: {
        area: "Gurgaon",
        targetOsmId: "10398244",
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
        sanityFor: "all"
    }
};

module.exports = { config };
