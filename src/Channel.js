const axios = require("axios");
const MessageManager = require("./MessageManager.js");
//const PeerConnection = require('rtcpeerconnection');

class Channel {
    constructor(client, channel, team) {
        this.client = client;
        this.team = team;
        this.groupId = channel["groupId"];
        this.id = channel["id"];
        this.name = channel["name"];
        this.messages = new MessageManager(this.client, this);
    }

    async send(message) {
        var message = this.client.ToMessageData(message);

        console.log(message);

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

    async setName(name) {
        var data = JSON.stringify({name: name});

        var config = {
            method: 'put',
            url: 'https://api.guilded.gg/teams/'+ this.team.id +'/groups/'+ this.groupId +'/channels/'+ this.id +'/info',
            headers: {
                'Content-Type': 'application/json', 
                'Cookie': this.client.cookies
            },
            data: data
        };

        var self = this;

        return axios(config)
            .then(function (response) {
                //console.log(JSON.stringify(response.data));
                self.name = name;
                return self;
            })
            .catch(function (error) {
                console.log(error);
            });
    }

    connect() {
        this.GetVoiceInfo().then((info) => {
            //console.log(info);
            var data = JSON.stringify({"rtpCapabilities":{"codecs":[{"mimeType":"audio/opus","kind":"audio","preferredPayloadType":100,"clockRate":48000,"channels":2,"parameters":{"minptime":10,"useinbandfec":1},"rtcpFeedback":[{"type":"transport-cc","parameter":""}]},{"mimeType":"video/H264","kind":"video","preferredPayloadType":101,"clockRate":90000,"parameters":{"level-asymmetry-allowed":1,"packetization-mode":1,"profile-level-id":"42e01f"},"rtcpFeedback":[{"type":"goog-remb","parameter":""},{"type":"transport-cc","parameter":""},{"type":"ccm","parameter":"fir"},{"type":"nack","parameter":""},{"type":"nack","parameter":"pli"}]},{"mimeType":"video/rtx","kind":"video","preferredPayloadType":102,"clockRate":90000,"parameters":{"apt":101},"rtcpFeedback":[]}],"headerExtensions":[{"kind":"audio","uri":"urn:ietf:params:rtp-hdrext:sdes:mid","preferredId":1,"preferredEncrypt":false,"direction":"sendrecv"},{"kind":"video","uri":"urn:ietf:params:rtp-hdrext:sdes:mid","preferredId":1,"preferredEncrypt":false,"direction":"sendrecv"},{"kind":"audio","uri":"http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time","preferredId":4,"preferredEncrypt":false,"direction":"sendrecv"},{"kind":"video","uri":"http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time","preferredId":4,"preferredEncrypt":false,"direction":"sendrecv"},{"kind":"video","uri":"http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01","preferredId":5,"preferredEncrypt":false,"direction":"sendrecv"},{"kind":"video","uri":"http://tools.ietf.org/html/draft-ietf-avtext-framemarking-07","preferredId":6,"preferredEncrypt":false,"direction":"sendrecv"},{"kind":"audio","uri":"urn:ietf:params:rtp-hdrext:ssrc-audio-level","preferredId":10,"preferredEncrypt":false,"direction":"sendrecv"},{"kind":"video","uri":"urn:3gpp:video-orientation","preferredId":11,"preferredEncrypt":false,"direction":"sendrecv"},{"kind":"video","uri":"urn:ietf:params:rtp-hdrext:toffset","preferredId":12,"preferredEncrypt":false,"direction":"sendrecv"}]},"wasMoved":false,"supportsVideo":false,"appType":"Desktop App"});

            var config = {
                method: 'post',
                url: 'https://'+ info.endpoint +'/channels/'+ this.id +'/voicegroups/lobby/connect',
                headers: {
                    'Content-Type': 'application/json', 
                    'Cookie': this.client.cookies
                },
                data: data
            };

            axios(config)
                .then(function (response) {
                    //console.log(JSON.stringify(response.data));
                    console.log(response.data);

                    /*var iceServers = {
                        iceServers: response.data.recvTransportOptions.iceServers
                    };

                    var rtcPeerConnection = new PeerConnection(iceServers);*/

                })
                .catch(function (error) {
                    console.log(error);
                });
        })
    }

    GetVoiceInfo() {
        var config = {
            method: 'get',
            url: 'https://api.guilded.gg/channels/'+ this.id +'/connection',
            headers: { 
                'Content-Type': 'application/json', 
                'Cookie': this.client.cookies
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

module.exports = Channel;