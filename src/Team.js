const axios = require('axios');
const ChannelManager = require('./ChannelManager.js');
const WebSocket = require('ws');
const RoleManager = require('./RoleManager.js');
const UserManager = require('./UserManager.js');

class Team {
    constructor(client, team) {
        this.client = client;
        this.id = team["id"];
        this.ownerId = team["ownerId"];
        this.name = team["name"];
        this.subdomain = team["subdomain"];
        this.profilePicture = team["profilePicture"];
        this.socialInfo = team["socialInfo"];
        this.timezone = team["timezone"];
        this.description = team["description"];
        this.type = team["type"];
        this.measurements = team["measurements"];
        this.channels = new ChannelManager(this.client);
        this.roles = new RoleManager(this.client, this, team["rolesById"]);
        this.members = new UserManager(this.client);
        
        team["members"].forEach(user => {
            this.members.addRaw(user);
        });

        //manage websocket
        this.ws = new WebSocket('wss://api.guilded.gg/socket.io/?teamId='+ this.id +'&EIO=3&transport=websocket', {headers:{cookie: this.client.cookies}});

        var self = this;
                
        this.ws.on('open', function open() {
            //console.log("team websocket connected");
            heartbeat();
        });
    
        function heartbeat() {
            if (!self.ws) return;
            if (self.ws.readyState !== 1) return;
            self.ws.send("2");
            setTimeout(heartbeat, 10000);
        }

        this.ws.on('message', function incoming(data) {
            var msg = data;

            for(var i=0; i<data.length; i++) {
                if( isNaN(msg.charAt(0)) ) break;
                msg = msg.substr(1);
            }

            if(msg.length<3) return;

            msg = JSON.parse(msg);
            self.MessageReceived(msg);
        });
    }

    MessageReceived( message ) {
        if( message[0] == "TeamChannelUpdated" ) {
            this.channels.add(message[1].channel.id, this.id).then((channel) => {
                channel.name = message[1].channel.name;
                channel.description = message[1].channel.description;

                this.client.emit('channelUpdated', channel);
            });
        }

        if( message[0] == "TeamChannelCreated") {
            this.channels.add(message[1].channel.id, this.id).then((channel) => {
                this.client.emit('channelCreated', channel);
            });
        }

        if( message[0] == "TeamChannelDeleted") {
            this.channels.fetch(message[1].channelId).then((channel) => {
                this.client.emit('channelDeleted', channel);
            });
        }

        if( message[0] == "TeamMemberJoined") {
            this.client.emit('memberJoined', message[1]);
        }

        if( message[0] == "TeamMemberRemoved") {
            this.client.emit('memberRemoved', message[1]);
        }
    }

    async getChannels() {
        var config = {
            method: 'get',
            url: 'https://api.guilded.gg/teams/'+ this.id +'/channels',
            headers: {
                'Content-Type': 'application/json', 
                'Cookie': this.client.cookies
            }
        };

        var self = this;

        return axios(config)
            .then(function (response) {
                //console.log(JSON.stringify(response.data));
                return response.data.channels;
            })
            .catch(function (error) {
                console.log(error);
            });
    }    
}

module.exports = Team;