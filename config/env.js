require('dotenv').config();

const dbCreds = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE
};
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