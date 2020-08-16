const axios = require("axios");
const uuid = require("uuid-random");

class Message {
    constructor(client, message, channel) {
        this.client = client;
        this.channel = channel;

        this.guildedClientId = message["guildedClientId"];
        this.id = message["contentId"];
        this.contentType = message["contentType"];
        this.message = message["message"];
        this.teamId = message["teamId"];
        this.authorId = message["createdBy"];

        this.mentions = [];
    }

    react(reaction) {
        var config = {
            method: 'post',
            url: 'https://api.guilded.gg/channels/'+ this.channel.id +'/messages/'+ this.id +'/reactions/'+reaction,
            headers: { 
                'Cookie': this.client.cookies
            }
        };

        return axios(config)
            .then(function (response) {
                //console.log(JSON.stringify(response.data));
            return;
            })
            .catch(function (error) {
                console.log(error);
            });
    }

    async awaitReactions(waitTime) {
        var self = this;

        var reactionList = [];

        function onReaction(msg) {
            if(msg["message"]["id"] == self.id) {
                reactionList.push(msg);
            }
        }

        this.client.on("reactionAdded", onReaction);

        var promise = new Promise((resolve, reject) => {
            setTimeout(waitForMessage, waitTime);
            function waitForMessage(){
                self.client.removeListener("reactionAdded", onReaction);
                return resolve(reactionList);
            }
        })

        return await promise;
    }

    getLineContent(n) {
        if(!this.message.content.document.nodes[n-1]) return;
        var lineType = this.message.content.document.nodes[n-1].type;

        var content = "";

        if(lineType == "paragraph") {
            this.message.content.document.nodes[n-1].nodes.forEach(element => {
                if(element.object == "text") {
                    content += element.leaves[0].text;
                }
                if(element.object == "inline") {
                    if(element.type == "mention") {
                        this.mentions.push(element.data.mention);
                        content += element.nodes[0].leaves[0].text;
                    }
                }
            });
        }
        if(lineType == "markdown-plain-text") {
            content = this.message.content.document.nodes[n-1].nodes[0].leaves[0].text;
        }
        if(lineType == "webhookMessage") {
            content = this.message.content.document.nodes[n-1].data.embeds.description;
        }
        if(lineType == "block-quote-container") {
            content = this.message.content.document.nodes[n-1].nodes[0].nodes[0].leaves[0].text;
        }

        return content;
    }

    async reply(message) {
        var channelId = uuid();

        var message = JSON.parse(this.client.ToMessageData(message));
        message.channelId = channelId;
        message.createdBy = this.client.id;
        message.id = uuid();
        message.type = "default";
        message.isOptimistic = true;

        message = JSON.stringify(message);

        var initalMessage = this.message;
        initalMessage.channelId = channelId;
        initalMessage.id = uuid();
        initalMessage.type = "default";
        initalMessage.isOptimistic = false;

        initalMessage = JSON.stringify(initalMessage);

        var data = '{"channelId":"'+channelId+'", "confirmed":false, "contentType":"chat", "initialThreadMessage":'+initalMessage+', "message":'+message+', "name":"idk", "threadMessageId":"'+this.id+'"}';

        //console.log(data);

        var config = {
            method: 'post',
            url: 'https://api.guilded.gg/channels/'+ this.channel.id +'/threads',
            headers: { 
                'Content-Type': 'application/json', 
                'Cookie': this.client.cookies
            },
            data : data
        };

        var self = this;

        return axios(config)
            .then(function (response) {
                return self.client.channels.add(response.data.thread.id, self.channel.team).then((channel) => {
                    //var message = new Message(self.client, response.data, channel);
                    //console.log(message);
                    return channel;
                    //console.log(channel)
                });
            })
            .catch(function (error) {
                console.log(error);
                console.log("error", self);
            });
    }

    editContent(message) {
        var message = JSON.stringify( JSON.parse( this.client.ToMessageData(message) ) );

        var config = {
            method: 'put',
            url: 'https://api.guilded.gg/channels/'+ this.channel.id +'/messages/'+ this.id,
            headers: { 
                'Content-Type': 'application/json', 
                'Cookie': this.client.cookies
            },
            data : message
        };

        var self = this;

        axios(config)
            .then(function (response) {
                self.message = JSON.parse(message);
            })
            .catch(function (error) {
                console.log(error);
            });
    }
}

module.exports = Message;