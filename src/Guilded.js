const events = require('events');
var util = require('util');
const axios = require("axios");
const uuid = require("uuid-random");
const WebSocket = require('ws');

const ChannelManager = require('./ChannelManager.js')
const TeamManager = require('./TeamManager.js');
const Post = require('./Post.js');

class GuildedClient {
    constructor() {
        this.cookies = "";
        this.channels = new ChannelManager(this);
        this.teams = new TeamManager(this);
        this.id = "";
    }
  
    login(email, password) {

        var self = this;
        var data = JSON.stringify({"email":email,"password":password});

        var config = {
            method: 'post',
            url: 'https://api.guilded.gg/login',
            headers: { 
                'Content-Type': 'application/json'
            },
            data : data
        };
    
        axios(config)
            .then(function (response) {
                self.cookies = "";
                self.id = response.data.user.id;

                response["headers"]["set-cookie"].forEach(function (element) {
                    self.cookies += element.split(" ")[0];
                });

                self.cacheDMChannels();
                self.cacheTeams();

                self.ws = new WebSocket('wss://api.guilded.gg/socket.io/?jwt=undefined&EIO=3&transport=websocket', {headers:{cookie: self.cookies}});
                
                self.ws.on('open', function open() {
                    //console.log("websocket connected");
                    self.emit('ready', '');
                    heartbeat();
                });
            
                function heartbeat() {
                    if (!self.ws) return;
                    if (self.ws.readyState !== 1) return;
                    self.ws.send("2");
                    setTimeout(heartbeat, 10000);
                }

                self.ws.on('message', function incoming(data) {
                    var msg = data;

                    for(var i=0; i<data.length; i++) {
                        if( isNaN(msg.charAt(0)) ) break;
                        msg = msg.substr(1);
                    }

                    if(msg.length<3) return;

                    msg = JSON.parse(msg);
                    self.MessageReceived(msg);
                });

                self.ws.on('close', function close(data) {
                    console.log('disconnected',data);
                });
            
            })
            .catch(function (error) {
                console.log(error.message, "error");
            });;

    }

    cacheTeams() {
        var config = {
            method: 'get',
            url: 'https://api.guilded.gg/me',
            headers: { 
            'Content-Type': 'application/json', 
            'Cookie': this.cookies
            }
        };

        var self = this;

        axios(config)
            .then(function (response) {
                response.data.teams.forEach((teamInfo) => {
                    self.teams.add(teamInfo.id).then((team) => {
                        //self.cacheChannels(team);
                    });
                });
            })
            .catch(function (error) {
                console.log(error);
            });
    }

    /*cacheChannels(team) {
        var config = {
            method: 'get',
            url: 'https://api.guilded.gg/teams/'+ team.id +'/channels',
            headers: { 
                'Content-Type': 'application/json', 
                'Cookie': this.cookies
            }
        };

        var self = this;

        axios(config)
            .then(function (response) {
                response.data.channels.forEach((channel) => {
                    self.channels.addRaw(channel, team);
                    team.channels.addRaw(channel, team);
                });
            })
            .catch(function (error) {
                console.log(error);
            });
    }*/

    cacheDMChannels() {
        var config = {
            method: 'get',
            url: 'https://api.guilded.gg/users/'+ this.id +'/channels',
            headers: { 
                'Content-Type': 'application/json', 
                'Cookie': this.cookies
            }
        };

        var self = this;

        axios(config)
            .then(function (response) {
                response.data.channels.forEach((channel) => {
                    self.channels.addRaw(channel, null);
                });
            })
            .catch(function (error) {
                console.log(error);
            });
    }

    MessageReceived(message) {
        switch(message[0]) {
            case "ChatMessageCreated":
                switch(message[1].channelType) {
                    case "Team":
                        this.channels.fetch(message[1].channelId).then((channel) => {
                            if(channel == null) return;

                            channel.messages.add(message[1], channel).then((message) => {
                                this.emit('message', message);
                            });

                            this.teams.fetch(message[1].teamId).then((team) => {
                                team.channels.fetch(message[1].channelId).then((teamChannel) => {
                                    teamChannel.messages.add(message[1], teamChannel);
                                });
                            });
                        });

                        break;
                    case "DM":
                        this.channels.fetch(message[1].channelId).then((channel) => {
                            channel.messages.add(message[1], channel).then((message) => {
                                this.emit('message', message);
                            });
                        });

                        break;
                }

                break;
            case "ChatMessageUpdated":
                this.teams.fetch(message[1].teamId).then((team) => {
                    this.channels.fetch(message[1].channelId, team).then((channel) => {
                        channel.messages.add(message[1]).then((msg) => {
                            msg.message = message[1].message;
                            msg.content = msg.toMessageFormat();

                            this.emit('messageEdited', msg);
                        });
                    });

                    team.channels.fetch(message[1].channelId, team).then((channel) => {
                        channel.messages.add(message[1]).then((msg) => {
                            msg.message = message[1].message;
                            msg.content = msg.toMessageFormat();
                        });
                    });
                });

                break;
            case "ChatMessageReactionAdded":
                this.emit('reactionAdded', message[1]);
            
                break;
            case "TEAM_CHANNEL_ARCHIVED":
                this.teams.fetch(message[1].teamId).then((team) => {
                    this.channels.fetch(message[1].channelId, team).then((channel) => {
                        channel.archived = true;
                        this.emit('channelArchived', channel);
                    });
                });
            
                break;
            case "TemporalChannelCreated":
                this.teams.fetch(message[1].teamId).then((team) => {
                    this.channels.addRaw(message[1].channel, team).then((channel) => {
                        this.emit('channelCreated', channel);
                    });
                    team.channels.addRaw(message[1].channel, team);
                });

                break;
        }
    }

    ToMessageData( message ) {
        var parsedMessage = "";

        parsedMessage += '{"messageId":"'+ uuid() +'","content":{"object":"value","document":{"object":"document","data":{},"nodes":[';

        if(typeof message == "string") {

            parsedMessage += JSON.stringify(
                {
                    "object":"block",
                    "type":"markdown-plain-text",
                    "data":{
                        "isEmbedMessage":true
                    },
                    "nodes":[
                        {
                        "object":"text",
                        "leaves":[
                            {
                                "object":"leaf",
                                "text":message,
                                "marks":[]
                            }
                        ]
                        }
                    ]
                }
            );

            parsedMessage += ',';

        } else {

            message.forEach( msg => {
                
                if( msg["type"] == "markdown" ) {
                
                    parsedMessage += JSON.stringify(
                        {
                        "object":"block",
                        "type":"markdown-plain-text",
                        "data":{
                            "isEmbedMessage":true
                        },
                        "nodes":[
                            {
                            "object":"text",
                            "leaves":[
                                {
                                    "object":"leaf",
                                    "text":msg["content"]["text"],
                                    "marks":[]
                                }
                            ]
                            }
                        ]
                    });
                
                }
                
                if( msg["type"] == "paragraph" ) {
                
                    parsedMessage += JSON.stringify(
                        {
                        "object":"block",
                        "type":"paragraph",
                        "data":{
                            "isEmbedMessage":true
                        },
                        "nodes":[
                            {
                            "object":"text",
                            "leaves":[
                                {
                                "object":"leaf",
                                "text":msg["content"]["text"],
                                "marks":[]
                                }
                            ]
                            }
                        ]
                    });
                
                }
                
                if( msg["type"] == "embed" ) {
                
                    parsedMessage += JSON.stringify(
                        {
                        "object":"block",
                        "type":"webhookMessage",
                        "data":{
                            "embeds":[
                                msg["content"]
                            ]
                        },
                        "nodes":[]
                        });
                
                }

                if( msg["type"] == "quote" ) {
                
                    parsedMessage += JSON.stringify(
                        {
                        "object":"block",
                        "type":"block-quote-container",
                        "data":{},
                        "nodes":[
                            {
                                "object": "block",
                                "type": "block-quote-line",
                                "nodes": [
                                    {
                                        "object": "text",
                                        "leaves": [
                                            {
                                                "marks": [],
                                                "objects": "leaf",
                                                "text": "test"
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    });
                
                }
                
                parsedMessage += ',';
                
            })
        }

        parsedMessage = parsedMessage.slice(0, -1);
        parsedMessage += ']}}}';

        return parsedMessage;
    }
  
    setPresence(status) {
        var data = JSON.stringify({"status": status});

        var config = {
            method: 'post',
            url: 'https://api.guilded.gg/users/me/presence',
            headers: { 
            'Content-Type': 'application/json', 
            'Cookie': this.cookies
            },
            data : data
        };

        axios(config)
            .then(function (response) {
            //console.log(JSON.stringify(response.data));
            })
            .catch(function (error) {
            console.log(error);
            });
    }

    user(userId) {
        var config = {
            method: 'get',
            url: 'https://api.guilded.gg/users/'+ userId +'/profilev3',
            headers: { 
            'Content-Type': 'application/json', 
            'Cookie': this.cookies
            }
        };

        return axios(config)
            .then(function (response) {
            //console.log(JSON.stringify(response.data));
            return response.data;
            })
            .catch(function (error) {
            console.log(error);
            });
    }

    Team(teamId) {
        var config = {
            method: 'get',
            url: 'https://api.guilded.gg/teams/'+ teamId,
            headers: { 
            'Content-Type': 'application/json', 
            'Cookie': this.cookies
            }
        };

        return axios(config)
            .then(function (response) {
            //console.log(JSON.stringify(response.data));
            return response.data.team;
            })
            .catch(function (error) {
            console.log(error);
            });
    }

    self() {
        var config = {
            method: 'get',
            url: 'https://api.guilded.gg/me',
            headers: { 
            'Content-Type': 'application/json', 
            'Cookie': this.cookies
            }
        };

        return axios(config)
            .then(function (response) {
            //console.log(JSON.stringify(response.data));
            return response.data;
            })
            .catch(function (error) {
            console.log(error);
            });
    }

    acceptInvite( inviteId ) {
        var data = JSON.stringify({"type": "consume"});

        var config = {
            method: 'put',
            url: 'https://api.guilded.gg/invites/'+ inviteId,
            headers: { 
            'Content-Type': 'application/json', 
            'Cookie': this.cookies
            },
            data : data
        };

        var self = this;

        axios(config)
            .then(function (response) {
                self.teams.add(response.data.teamId);
            })
            .catch(function (error) {
                console.log(error);
            });
    }

    async getInviteTeam(inviteId) {
        var data = JSON.stringify({"type": "consume"});

        var config = {
            method: 'get',
            url: 'https://api.guilded.gg/invites/'+ inviteId +'/team',
            headers: { 
            'Content-Type': 'application/json', 
            'Cookie': this.cookies
            },
            data : data
        };

        return axios(config)
            .then(function (response) {
                //TODO: cache team and return cached team
                return response.data.team;
            })
            .catch(function (error) {
                console.log(error);
            });
    }

    getUserPosts(userId) {

        var config = {
            method: 'get',
            url: 'https://api.guilded.gg/users/'+ userId +'/posts',
            headers: { 
            'Content-Type': 'application/json', 
            'Cookie': this.cookies
            }
        };

        var self = this;

        return axios(config)
            .then(function (response) {
                var posts = [];
                response.data.forEach((post) => {
                    posts.push( new Post(self, post) );
                });
                return posts;
            })
            .catch(function (error) {
                console.log(error);
            });
    }
}

util.inherits(GuildedClient, events.EventEmitter);

module.exports.Client = GuildedClient;