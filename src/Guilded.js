const events = require('events');
var util = require('util');
const axios = require("axios");
const uuid = require("uuid-random");
const WebSocket = require('ws');

const Message = require('./Message.js');
const ChannelManager = require('./ChannelManager.js')

class GuildedClient {
    constructor() {
        this.cookies = "";
        this.channels = new ChannelManager(this);
    }
  
    login(email, password) {

        var self = this;
        var data = JSON.stringify({"email":"mneale72f71@gmail.com","password":"Gam9fr9ej7"});

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

                response["headers"]["set-cookie"].forEach(function (element) {
                    self.cookies += element.split(" ")[0];
                });

                self.ws = new WebSocket('wss://api.guilded.gg/socket.io/?jwt=undefined&EIO=3&transport=websocket', {headers:{cookie: self.cookies}});
                
                self.ws.on('open', function open() {
                    console.log("websocket connected");
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

                    if( msg[0] == "ChatMessageCreated") {
                        self.emit('message', new Message(self, msg[1]));
                    }
                    if( msg[0] == "ChatMessageReactionAdded") {
                        self.emit('reactionAdded', msg[1]);
                    }

                });

                self.ws.on('close', function close(data) {
                    console.log('disconnected',data);
                });
            
            })
            .catch(function (error) {
                console.log(error.message, "error");
            });;

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
            
            parsedMessage += ',';
            
        })

        parsedMessage = parsedMessage.slice(0, -1);
        parsedMessage += ']}}}';

        return parsedMessage;
    }
  
    SetPresence(status) {
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

    User(userId) {
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
  
}

util.inherits(GuildedClient, events.EventEmitter);

module.exports.Client = GuildedClient;