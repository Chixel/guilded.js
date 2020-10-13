const User = require("./User");

class Post {
    constructor(client, post) {
        this.client = client;

        this.id = post.id;
        this.createdAt = post.createdAt;
        this.editedAt = post.editedAt;
        this.createdBy = new User(this.client, post.createdByInfo);
        this.title = post.title;
        this.message = post.message;
        this.content = this.toMessageFormat();
        this.url = post.publishUrl;
        this.reactions = post.reactions;
    }

    toMessageFormat() {
        var formattedMsg = [];

        this.message.document.nodes.forEach((line) => {
            var lineContent = {"lineType": line.type, "content": [], "text": ""};

            switch(line.type) {
                case "paragraph":
                    line.nodes.forEach((node) => {
                        switch(node.object) {
                            case "text":
                                lineContent.content.push( { "type": "text", "text": node.leaves[0].text } );
                                lineContent.text += node.leaves[0].text;

                                break;
                            case "inline":
                                if(node.type == "mention") {
                                    this.mentions.push(node.data.mention);
                                    lineContent.content.push( { "type": "mention", "text": node.nodes[0].leaves[0].text, "mentionId": node.data.mention.id } );
                                    lineContent.text += node.nodes[0].leaves[0].text;
                                }
                                if(node.type == "reaction") {
                                    lineContent.content.push( { "type": "reaction", "text": node.nodes[0].leaves[0].text, "reactionId": node.data.reaction.id } );
                                    lineContent.text += node.nodes[0].leaves[0].text;
                                }
                                if(node.type == "channel") {
                                    this.mentions.push(node.data.channel);
                                    lineContent.content.push( { "type": "mention", "text": node.nodes[0].leaves[0].text, "mentionedChannelId": node.data.channel.id } );
                                    lineContent.text += node.nodes[0].leaves[0].text;
                                }

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
}

module.exports = Post;