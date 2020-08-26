class Role {
    constructor(client, role, team) {
        this.client = client;
        this.team = team;

        this.id = role.id;
        this.name = role.name;
        this.color = role.color;
        this.isBase = role.isBase;
        this.priority = role.priority;
        this.createdAt = role.createdAt;
        this.updatedAt = role.updatedAt;
        this.permissions = role.permissions;
        this.isMentionable = role.isMentionable;
        this.isSelfAssignable = role.isSelfAssignable;
    }
}

module.exports = Role;