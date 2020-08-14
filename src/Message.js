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
            //content = this.message.content.document.nodes[n-1].nodes[0].leaves[0].text;
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

    reply(message) {
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

        //console.log(message);
        //console.log(initalMessage);

        console.log(this.id +" "+ this.message.id);

        var data = '{"channelId":"'+channelId+'", "confirmed":false, "contentType":"chat", "initialThreadMessage":'+initalMessage+', "message":'+message+', "name":"idk", "threadMessageId":"'+this.id+'"}';

        console.log(data);

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

        axios(config)
            .then(function (response) {
                //console.log(JSON.parse(message));
            })
            .catch(function (error) {
                console.log(error);
            });

        /*var returnMessage = [];

        function onMessage(msg) {
            if(msg.contentId == JSON.parse(message).messageId) {
                returnMessage = msg;
                self.client.removeListener("message", onMessage);
            }
        }

        this.client.on("message", onMessage);

        var promise = new Promise((resolve, reject) => {
            (function waitForMessage(){
                if (returnMessage["message"]) return resolve(returnMessage);
                setTimeout(waitForMessage, 30);
            })();
        })

        return await promise;*/
    }
}

module.exports = Message;