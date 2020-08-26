class User {
    constructor(client, user) {
        this.client = client;

        this.id = user.id;
        this.name = user.name;
        this.profilePictureSm = user.profilePictureSm;
        this.joinDate = user.joinDate;
        this.status = user.userStatus;
        this.subdomain = user.subdomain;
        this.aboutInfo = user.aboutInfo;
        this.lastOnline = user.lastOnline;
    }
}

module.exports = User;