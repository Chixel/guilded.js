const events = require('events');
var util = require('util');
const axios = require("axios");
const uuid = require("uuid-random");
const WebSocket = require('ws');

const ChannelManager = require('./ChannelManager.js')
const TeamManager = require('./TeamManager.js')

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
                //console.log(response.data.user.id);

                response["headers"]["set-cookie"].forEach(function (element) {
                    self.cookies += element.split(" ")[0];
                });

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

    MessageReceived( message ) {
        if( message[0] == "ChatMessageCreated") {
            if( message[1].channelType == "Team" ) {
                this.teams.add(message[1]).then((team) => {
                    team.channels.add(message[1].channelId, team).then((channel) => {
                        channel.messages.add(message[1], channel);

                        this.channels.add(message[1].channelId, team).then((channel) => {
                            if(channel.originatingChannelId == null) {
                                this.emit('message', channel.messages.add(message[1], channel));
                            } else {
                                channel.getMessages(4).then((messageList) => {
                                    if(messageList.hasPastMessages) {
                                        console.log("hasPastMessages");
                                        this.emit('message', channel.messages.add(message[1], channel));
                                    }
                                })
                            }
                        });
                    });
                });
            } else if( message[1]. channelType == "DM" ) {
                this.channels.add(message[1].channelId, null).then((channel) => {
                    this.emit('message', channel.messages.add(message[1], channel));
                });
            }
        }

        if( message[0] == "ChatMessageUpdated") {
            this.teams.add(message[1]).then((team) => {
                team.channels.add(message[1].channelId, team).then((channel) => {
                    var msg = channel.messages.add(message[1], channel);
                    msg.message = message[1].message;
                });
                this.channels.add(message[1].channelId, team).then((channel) => {
                    var msg = channel.messages.add(message[1], channel);
                    msg.message = message[1].message;
                });
            });
        }

        if( message[0] == "ChatMessageReactionAdded") {
            this.emit('reactionAdded', message[1]);
        }

        if( message[0] == "TEAM_CHANNEL_ARCHIVED") {
            this.teams.add(message[1]).then((team) => {
                this.channels.add(message[1].channelId, team).then((channel) => {
                    channel.archived = true;
                });
            });
        }
    }

    ToMessageData( message ) {
        var parsedMessage = "";

        parsedMessage += '{"messageId":"'+ uuid() +'","content":{"object":"value","document":{"object":"document","data":{},"nodes":[';

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
  
}

util.inherits(GuildedClient, events.EventEmitter);

module.exports.Client = GuildedClient;