const BaseManager = require('./BaseManager.js');
const User = require('./User.js');
const axios = require("axios");

class UserManager extends BaseManager {
    constructor(client) {
        super(client);
    }

    async add(userId) {
        var existing = this.cache.get(userId);
        if(existing) return existing;

        var config = {
            method: 'get',
            url: 'https://api.guilded.gg/users/'+ userId,
            headers: { 
            'Content-Type': 'application/json', 
            'Cookie': this.client.cookies
            }
        };

        var self = this;

        return axios(config)
            .then(function (response) {
                var user = new User(self.client, response.data.user);
                self.cache.add(userId, user);
                return user;
            })
            .catch(function (error) {
                console.log(error);
            });
    }

    async addRaw(userInfo) {
        var existing = this.cache.get(userInfo.id);
        if(existing) return existing;

        var user = new User(this.client, userInfo);
        this.cache.add(user.id, user);
        return user;
    }

    async fetch(userId) {
        var existing = this.cache.get(userId);
        return existing;
    }
}

module.exports = UserManager;