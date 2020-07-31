const Cache = require('./Cache.js');

class BaseManager {
    constructor(client) {
        this.client = client
        this.cache = new Cache();
    }
}

module.exports = BaseManager;