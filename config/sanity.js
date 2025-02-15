const attributeToConsider = {
    "placeId": true,
    "address": true,
    "sub_channel": true,
    "phone": true,
    "latitude": true,
    "longitude": true,
    "status": true,
    "type": true,
    "googleUrl": true,
    "outlet_name": true,
    "ratingText": true,
    "stars": true,
    "numberOfReviews": true,
    "websites": true,
    "emails": false,
    "customerReviews": false
}

const defaultAttributeToConsider = {
    "placeId": true,
    "address": true,
    "sub_channel": true,
    "phone": true,
    "latitude": true,
    "longitude": true,
    "status": true,
    "type": true,
    "googleUrl": true,
    "outlet_name": true,
    "ratingText": true,
    "stars": true,
    "numberOfReviews": true,
    "websites": true,
    "emails": true,
    "customerReviews": true
}

const attributeToConsiderForLLMSimlarity = {
    "placeId": true,
    "address": false,
    "sub_channel": true,
    "phone": false,
    "latitude": true,
    "longitude": true,
    "status": false,
    "type": true,
    "googleUrl": false,
    "outlet_name": true,
    "ratingText": false,
    "stars": false,
    "numberOfReviews": false,
    "websites": false,
    "emails": false,
    "customerReviews": false
}


const getAttributeToConsider = (val) => {
    if (val === "llmSimalarity") {
        return attributeToConsiderForLLMSimlarity;
    }
    if (val = "all") {
        return defaultAttributeToConsider;
    }
}

module.exports = { getAttributeToConsider }