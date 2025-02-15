const dbCreds =
{
    host: 'localhost',
    port: 3350,
    user: "marssfaind",
    password: "MarsIndApplicateAug4#",
    database: "OutletData"
}

function getServerURL(env) {
    switch (env) {
        case "dev":
            return "https://dev.sellina.io";
        case "uat":
            return "https://uat.sellina.io";
        case "demo":
            return "https://api.sellinademo.io";
        case "prod-egtm":
            return "https://prod-egtm.sellina.io";
        case "prod-us-west":
            return "https://prod-us-west.salescode.ai";
        case "prod":
            return "https://prod.sellina.io";
        default:
            return "https://prod.sellina.io";
    }
}

module.exports = { dbCreds, getServerURL };