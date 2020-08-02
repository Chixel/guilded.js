const BaseManager = require('./BaseManager.js');
const Team = require('./Team.js');
const axios = require('axios');

class TeamManager extends BaseManager {
    constructor(client) {
        super(client);
    }

    async add(data) {
        var existing = this.cache.get(data.teamId);
        if(existing) return existing;

        var config = {
            method: 'get',
            url: 'https://api.guilded.gg/teams/'+ data.teamId,
            headers: { 
            'Content-Type': 'application/json', 
            'Cookie': this.client.cookies
            }
        };

        var self = this;

        return axios(config)
            .then(function (response) {
                //console.log(JSON.stringify(response.data));
                var team = new Team(self.client, response.data.team);
                self.cache.add(data.teamId, team);
                return team;

            })
            .catch(function (error) {
                console.log(error);
            });
    }
}

module.exports = TeamManager;