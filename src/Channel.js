const axios = require("axios");
const Message = require('./Message.js');

class Channel {
    constructor(client, channelId) {
        this.client = client;
        this.id = channelId;
    }

    async send(message) {
        var message = this.client.ToMessageData(message);

        var config = {
            method: 'post',
            url: 'https://api.guilded.gg/channels/'+ this.id +'/messages',
            headers: { 
                'Content-Type': 'application/json', 
                'Cookie': this.client.cookies
            },
            data : message
        };

        var self = this;

        axios(config)
            .then(function (response) {
                //console.log(JSON.parse(message));
            })
            .catch(function (error) {
                console.log(error);
            });

        var returnMessage = [];

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

        return await promise;
    }
}

module.exports = Channel;