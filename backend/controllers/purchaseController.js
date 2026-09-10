const kraService = require("../services/kraService");

async function getPurchases(req, res) {
    return kraService.purchases(req, res);
}

async function getStoredPurchases(req, res) {
    return kraService.getStoredPurchases(req, res);
}

module.exports = {
    getPurchases,
    getStoredPurchases
};
