const BaseManager = require('./BaseManager.js');
const Channel = require('./Channel');

class ChannelManager extends BaseManager {
    constructor(client) {
        super(client);
    }

    add(data) {
        var existing = this.cache.get(data.channelId);
        if(existing) return existing;

        var channel = new Channel(this.client, data.channelId);
        this.cache.add(data.channelId, channel);
        return channel;
    }
}

module.exports = ChannelManager;