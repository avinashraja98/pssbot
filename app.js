'use strict';

var express = require('express');
var app = express();

var port = process.env.PORT || 8080;

app.get('/', function(req, res) {
    res.send("pssBot");
});

app.listen(port, function() {
    console.log('app is running on port:' + port);
});

const Discord = require('discord.js');
const client = new Discord.Client();
const config = require('./config')

var isReady = true;

const commands = {
    '!pss': 'pss.mp3',
    '!mala': 'mala.mp3',
    '!aamadmi': 'aamadmi.mp3',
    '!devily': 'devily.mp3',
    '!lady': 'lady.mp3',
    '!ladybye': 'ladybye.mp3'
};

console.log("Ready");

client.login(config.token);

function playclip(channel, clip) {

    const connection = channel.join().then(connection => {
        const dispatcher = connection.playFile('./Audio/' + clip);
        dispatcher.on("end", end => {
            channel.leave();
        });
    }).catch(err => console.log(err));
}

client.on('message', async message => {
    // Voice only works in guilds, if the message does not come from a guild,
    // we ignore it
    if (!message.guild) return;


    if (isReady && commands.hasOwnProperty(message.content)) {
        isReady = false;
        // Only try to join the sender's voice channel if they are in one themselves
        if (message.member.voiceChannel) {

            playclip(message.member.voiceChannel, commands[message.content]);


            isReady = true;
        } else {
            message.reply('You need to join a voice channel first!');
            isReady = true;
        }
    }
});
