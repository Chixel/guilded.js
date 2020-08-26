const BaseManager = require('./BaseManager.js');
const Role = require('./Role.js');

class RoleManager extends BaseManager {
    constructor(client, team, roles) {
        super(client);
        this.team = team;
        for (var [key, roleInfo] of Object.entries(roles)) {
            var role = new Role(this.client, roleInfo, team);
            this.cache.add(roleInfo.id, role);
        }
    }

    async fetch(roleId) {
        var existing = this.cache.get(roleId);
        return existing;
    }
}

module.exports = RoleManager;