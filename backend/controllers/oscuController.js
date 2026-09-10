const kraService = require("../services/kraService");

async function initialize(req, res) {
    return kraService.initialize(req, res);
}

async function status(req, res) {
    return kraService.status(req, res);
}

module.exports = {
    initialize,
    status
};
