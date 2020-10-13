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
		this.team = channel.team;
		channel.team.members.fetch(message["createdBy"]).then((user) => {
			this.author = user;
		});

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
            var lineContent = {"lineType": line.type, "content": [], "text": ""};

            switch(line.type) {
                case "paragraph":
                    line.nodes.forEach((node) => {
                        switch(node.object) {
                            case "text":
								node.leaves.forEach((leaf) => {
									lineContent.content.push( { "type": "text", "text": leaf.text } );
                                	lineContent.text += leaf.text;
								});
                                
                                break;
                            case "inline":
								node.nodes[0].leaves.forEach((leaf) => {
									if(node.type == "mention") {
										this.mentions.push(node.data.mention);
										lineContent.content.push( { "type": "mention", "text": leaf.text, "mentionId": node.data.mention.id } );
										lineContent.text += leaf.text.text;
									}
									if(node.type == "reaction") {
										lineContent.content.push( { "type": "reaction", "text": leaf.text, "reactionId": node.data.reaction.id } );
										lineContent.text += leaf.text;
									}
									if(node.type == "channel") {
										this.mentions.push(node.data.channel);
										lineContent.content.push( { "type": "mention", "text": leaf.text, "mentionedChannelId": node.data.channel.id } );
										lineContent.text += leaf.text;
									}
								});

                                break;
                        }
                    });
                
                    break;
                case "block-quote-container":
                    line.nodes.forEach((node) => {
                        node.nodes.forEach((nodeLine) => {
                            switch(nodeLine.object) {
                                case "text":
                                    lineContent.content.push( { "type": "text", "text": nodeLine.leaves[0].text } );
                                    lineContent.text += nodeLine.leaves[0].text;
                                
                                    break;
                                case "inline":
                                    switch(nodeLine.type) {
                                        case "mention":
                                            this.mentions.push(nodeLine.data.mention);
                                            lineContent.content.push( { "type": "mention", "text": nodeLine.nodes[0].leaves[0].text, "mentionId": nodeLine.data.mention.id } );
                                            lineContent.text += nodeLine.nodes[0].leaves[0].text;
                                        
                                            break;
                                        case "reaction":
                                            lineContent.content.push( { "type": "reaction", "text": nodeLine.nodes[0].leaves[0].text, "reactionId": nodeLine.data.reaction.id } );
                                            lineContent.text += nodeLine.nodes[0].leaves[0].text;
                                        
                                            break;
                                        case "channel":
                                            this.mentions.push(nodeLine.data.channel);
                                            lineContent.content.push( { "type": "mention", "text": nodeLine.nodes[0].leaves[0].text, "mentionedChannelId": nodeLine.data.channel.id } );
                                            lineContent.text += nodeLine.nodes[0].leaves[0].text;
                                        
                                            break;
                                    }
                                
                                    break;
                            }
                        });
                    });
                
                    break;
                case "markdown-plain-text":
                    lineContent.content.push( { "type": "text", "text": line.nodes[0].leaves[0].text } );
                    lineContent.text += line.nodes[0].leaves[0].text;

                    break;
                case "webhookMessage":
                    lineContent.content.push( { "type": "embed", "content": line.data.embeds } );
                
                    break;
            }

            formattedMsg.push( lineContent );
        });

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

    async reply(message, threadName) {
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

        var data = '{"channelId":"'+channelId+'", "confirmed":false, "contentType":"chat", "initialThreadMessage":'+initalMessage+', "message":'+message+', "name":"'+threadName+'", "threadMessageId":"'+this.id+'"}';

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
            })
            .catch(function (error) {
                console.log(error);
            });


        var returnChannel;

        function onChannel(channel) {
            if(channel.id == channelId) {
                returnChannel = channel;
                self.client.removeListener("channelCreated", onChannel);
            }
        }

        this.client.on("channelCreated", onChannel);

        var promise = new Promise((resolve, reject) => {
            (function waitForChannel(){
                if (returnChannel != undefined) return resolve(returnChannel);
                setTimeout(waitForChannel, 30);
            })();
        })

        return await promise;
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