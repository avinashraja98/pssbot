'use strict';

const Discord = require('discord.js');
const client = new Discord.Client();
const config = require('./config');

var express = require('express');
var app = express();

var formidable = require('formidable');

var bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

var port = process.env.PORT || 8080;

var mongoose = require("mongoose");
mongoose.Promise = global.Promise;
mongoose.connect(config.mongodb).catch(err => {
    console.log(err);
});

var commandSchema = new mongoose.Schema({
    Commandname: {
        type: String,
        unique: true
    },
    Filename: String
});

var command = mongoose.model("command", commandSchema);

var isReady = true;
var sizeLimitBytes = 1 * 1000 * 1000; //1MB
var commands = {};

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

app.post("/addcommand", (req, res) => {

    var form = new formidable.IncomingForm();
    form.parse(req);

    form.on('fileBegin', function (name, file) {
        file.path = __dirname + '/Audio/' + file.name;
    });

    form.on('progress', function (bytesReceived, bytesExpected) {
        if (bytesReceived > sizeLimitBytes) {
            form._error(new Error("File size is too big!"));
            return false;
        }
    });

    form.on('file', function (name, file) {

        console.log('Uploaded ' + file.name);
        var formData = {
            "Commandname": '!' + file.name.slice(0, file.name.indexOf(".")),
            "Filename": file.name
        };
        var myData = new command(formData);
        myData.save()
            .then(item => {
                res.send("clip saved to database");
            })
            .catch(err => {
                console.log(err);
                console.log(err.toJSON().code == 11000);
                if (err.toJSON().code == 11000) {
                    res.status(400).send("Command exists!");
                } else {
                    res.status(400).send("Unknown error!");
                }
            });
        setCommands();
    });

    form.on('error', function (err) {
        res.status(400).send(err.toString());
    });
});

app.listen(port, function () {
    console.log('app is running on port:' + port);
});

console.log("Ready");

client.login(config.token);

client.on('ready', () => {
    setCommands();
    client.user.setActivity('!<command>');
});

function setCommands() {
    command.find({}, function (err, res) {
        if (err) return handleError(err);
        commands = res;
    });
}

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
    var clientCommand = commands.find(command => command.Commandname == message.content)

    if (isReady && clientCommand) {
        isReady = false;
        // Only try to join the sender's voice channel if they are in one themselves
        if (message.member.voiceChannel) {

            playclip(message.member.voiceChannel, clientCommand.Filename);

            isReady = true;
        } else {
            message.reply('You need to join a voice channel first!');
            isReady = true;
        }
    }
});
