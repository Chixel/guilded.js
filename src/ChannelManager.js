const BaseManager = require('./BaseManager.js');
const Channel = require('./Channel.js');
const axios = require("axios");

class ChannelManager extends BaseManager {
    constructor(client) {
        super(client);
    }

    async add(channelId, team) {
        var existing = this.cache.get(channelId);
        if(existing) return existing;

        var config = {
            method: 'get',
            url: 'https://api.guilded.gg/content/route/metadata?route=//channels/'+ channelId +'/chat',
            headers: { 
            'Content-Type': 'application/json', 
            'Cookie': this.client.cookies
            }
        };

        var self = this;

        return axios(config)
            .then(function (response) {
                //console.log(JSON.stringify(response.data));
                var channel = new Channel(self.client, response.data.metadata.channel, team);
                self.cache.add(channelId, channel);
                return channel;

            })
            .catch(function (error) {
                console.log(error);
            });
    }

    async fetch(channelId) {
        var existing = this.cache.get(channelId);
        return existing;
    }
}

module.exports = ChannelManager;