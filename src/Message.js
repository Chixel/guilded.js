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

        this.content = this.toMessageFormat();
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

    toMessageFormat() {
        var formattedMsg = [];
        var content = this.message.content;

        content.document.nodes.forEach((line) => {
            //console.log(line.type);

            var lineContent = {"lineType": line.type, "content": [], "text": ""};

            if(line.type == "paragraph") {
                line.nodes.forEach((node) => {
                    if(node.object == "text") {
                        lineContent.content.push( { "type": "text", "text": node.leaves[0].text } );
                        lineContent.text += node.leaves[0].text;
                    }
                    if(node.object == "inline") {
                        if(node.type == "mention") {
                            this.mentions.push(node.data.mention);
                            lineContent.content.push( { "type": "mention", "text": node.nodes[0].leaves[0].text, "mentionId": node.data.mention.id } );
                            lineContent.text += node.nodes[0].leaves[0].text;
                        }
                        if(node.type == "reaction") {
                            lineContent.content.push( { "type": "reaction", "text": node.nodes[0].leaves[0].text, "reactionId": node.data.reaction.id } );
                            lineContent.text += node.nodes[0].leaves[0].text;
                        }
                    }
                });
            }

            if(line.type == "block-quote-container") {
                line.nodes.forEach((node) => {
                    node.nodes.forEach((nodeLine) => {
                        if(nodeLine.object == "text") {
                            lineContent.content.push( { "type": "text", "text": nodeLine.leaves[0].text } );
                            lineContent.text += nodeLine.leaves[0].text;
                        }
                        if(nodeLine.object == "inline") {
                            if(nodeLine.type == "mention") {
                                this.mentions.push(nodeLine.data.mention);
                                lineContent.content.push( { "type": "mention", "text": nodeLine.nodes[0].leaves[0].text, "mentionId": nodeLine.data.mention.id } );
                                lineContent.text += nodeLine.nodes[0].leaves[0].text;
                            }
                            if(nodeLine.type == "reaction") {
                                lineContent.content.push( { "type": "reaction", "text": nodeLine.nodes[0].leaves[0].text, "reactionId": nodeLine.data.reaction.id } );
                                lineContent.text += nodeLine.nodes[0].leaves[0].text;
                            }
                        }
                    });
                });
            }

            if(line.type == "markdown-plain-text") {
                lineContent.content.push( { "type": "text", "text": line.nodes[0].leaves[0].text } );
                lineContent.text += line.nodes[0].leaves[0].text;
            }

            if(line.type == "webhookMessage") {
                lineContent.content.push( { "type": "embed", "content": line.data.embeds } );
            }

            formattedMsg.push( lineContent );
        })

        //console.log("----");
        return formattedMsg;
    }

    /*getLineContent(n) {
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
    }*/

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
        var message = this.client.ToMessageData(message);

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
                self.content = self.toMessageFormat();
            })
            .catch(function (error) {
                console.log(error);
            });
    }
}

module.exports = Message;