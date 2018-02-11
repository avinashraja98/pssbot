'use strict';

const Discord = require('discord.js');
const client = new Discord.Client();

client.login('NDEyMDMwNDI1ODcyMjAzNzg3.DWH-JA.9kNiLRB5vr2EiJl51aqw0cg-oP0');

client.on('message', async message => {
    // Voice only works in guilds, if the message does not come from a guild,
    // we ignore it
    if (!message.guild) return;

    if (message.content === '!pss') {
        // Only try to join the sender's voice channel if they are in one themselves
        if (message.member.voiceChannel) {
            const connection = await message.member.voiceChannel.join().then(connection => {
                const dispatcher = connection.playFile('./Audio/clip.mp3');
                dispatcher.on("end", end => {
                    voiceChannel.leave();
                });
            }).catch(err => console.log(err));
            isReady = true;
        } else {
            message.reply('You need to join a voice channel first!');
        }
    }
});