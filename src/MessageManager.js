const BaseManager = require('./BaseManager.js');
const Message = require('./Message.js');

class MessageManager extends BaseManager {
    constructor(client, channel) {
        super(client);
        this.channel = channel
    }

    async add(data) {
        var existing = this.cache.get(data.channelId);
        if(existing) return existing;

        var message = new Message(this.client, data, this.channel);
        this.cache.add(data.id, message);
        return message;
    }

    async fetch(messageId) {
        var message = this.cache.get(messageId);
        return message;
    }
}

module.exports = MessageManager;