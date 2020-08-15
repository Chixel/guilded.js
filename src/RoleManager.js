const BaseManager = require('./BaseManager.js');
const Role = require('./Role.js');

class RoleManager extends BaseManager {
    constructor(client, team, roles) {
        super(client);
        this.team = team;
        roles.forEach(roleInfo => {
            var role = new Role(this.client, roleInfo, team);
            this.cache.add(roleInfo.id, role);
        });
    }

    /*add(data) {
        var existing = this.cache.get(data.channelId);
        if(existing) return existing;

        var message = new Message(this.client, data);
        this.cache.add(data.id, message);
        return message;
    }*/

    async fetch(roleId) {
        var existing = this.cache.get(roleId);
        return existing;
    }
}

module.exports = RoleManager;