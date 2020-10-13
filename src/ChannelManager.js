const BaseManager = require('./BaseManager.js');
const Channel = require('./Channel.js');
const axios = require("axios");

class ChannelManager extends BaseManager {
    constructor(client) {
        super(client);
    }

    /*async add(channelId, team) {
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
                var channel = new Channel(self.client, response.data.metadata.channel, team);
                self.cache.add(channelId, channel);
                return channel;
            })
            .catch(function (error) {
                console.log(error);
            });
    }*/

    async addRaw(channelInfo, team) {
        var existing = this.cache.get(channelInfo.id);
        if(existing) return existing;

        var channel = new Channel(this.client, channelInfo, team);
        this.cache.add(channelInfo.id, channel);
        return channel;
    }

    async fetch(channelId) {
        var channel = this.cache.get(channelId);
        return channel;
    }
}

module.exports = ChannelManager;