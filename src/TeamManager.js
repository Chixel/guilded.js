const BaseManager = require('./BaseManager.js');
const Team = require('./Team.js');
const axios = require('axios');

class TeamManager extends BaseManager {
    constructor(client) {
        super(client);
    }

    async add(teamId) {
        var existing = this.cache.get(teamId);
        if(existing) return existing;

        var config = {
            method: 'get',
            url: 'https://api.guilded.gg/teams/'+ teamId,
            headers: { 
            'Content-Type': 'application/json', 
            'Cookie': this.client.cookies
            }
        };

        var self = this;

        return axios(config)
            .then(function (response) {
                var team = new Team(self.client, response.data.team);
                self.cache.add(teamId, team);
                return team;
            })
            .catch(function (error) {
                console.log(error);
            });
    }

    addRaw(teamInfo) {
        var existing = this.cache.get(teamInfo.id);
        if(existing) return;

        var team = new Team(this.client, teamInfo);
        team.id = teamInfo.id;
        this.cache.add(teamInfo.id, team);
    }

    async fetch(teamId) {
        var team = this.cache.get(teamId);
        return team;
    }
}

module.exports = TeamManager;