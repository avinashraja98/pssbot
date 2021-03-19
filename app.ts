import Discord, { Message } from 'discord.js';
import express, { Request, Response } from 'express';
import multer, { FileFilterCallback, MulterError } from 'multer';

require('dotenv').config();

const client = new Discord.Client();

const app = express();
const bodyParser = require('body-parser');
const fs = require('fs');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true,
}));

const port = process.env.PORT || 8080;
const token = process.env.BOT_TOKEN || undefined;
const clipsFolder = process.env.CLIPS_FOLDER || './audio';
const prefix = process.env.PREFIX || '+';

let isReady = false;
const sizeLimitBytes = 1 * 1000 * 1000; // 1MB
const allowedFiles = ['.mp3'];
const regex = new RegExp(`([a-zA-Z0-9_.])+(${allowedFiles.join('|')})$`);
const commands: String[] = [];

const storage = multer.diskStorage({
  destination(req: Request, file: any, cb: Function) {
    cb(null, `${__dirname}/${clipsFolder}`);
  },

  // By default, multer removes file extensions so let's add them back
  filename(req: Request, file: any, cb: Function) {
    cb(null, file.originalname);
  },
});

const setCommands = () => {
  fs.readdir(clipsFolder, (err: Error, files: String[]) => {
    files.forEach((file: String) => {
      commands.push(file.slice(0, file.indexOf('.')));
    });
    console.log(commands);
    isReady = true;
    console.log('Ready!');
  });
};

const audioFileFilter = (req: any, file: any, cb: FileFilterCallback): void => {
  if (!regex.test(file.originalname)) {
    console.log(file);
    cb(new Error('File not mp3 or name has unsupported characters'));
    return;
  }
  if (file.originalname.length >= 25) {
    console.log(file);
    cb(new Error('Command name too long, please rename to under 25 characters'));
    return;
  }
  const commandName = file.originalname.slice(0, file.originalname.indexOf('.'));
  if (commands.includes(commandName)) {
    cb(new Error('Command exists!'));
    return;
  }
  cb(null, true);
};

app.get('/', (req: Request, res: Response): void => {
  res.send('PSSbot API Online!');
});

app.listen(port, () => {
  setCommands();
  console.log(`app is running on port:${port}`);
});

const upload = multer({
  storage,
  fileFilter: audioFileFilter,
  limits: {
    fileSize: sizeLimitBytes,
  },
}).single('file');

app.post('/addcommand', (req: Request, res: Response) => {
  upload(req, res, (err: any): void => {
    if (err instanceof MulterError) {
      res.status(400).send(err.message);
      return;
    }
    if (err) {
      res.status(400).send(err.toString());
      return;
    }
    if (!req.file) {
      res.status(400).send('Please select an audio clip to upload');
      return;
    }
    const commandName = req.file.originalname.slice(0, req.file.originalname.indexOf('.'));
    commands.push(commandName);
    res.send(`Uploaded ${req.file.originalname}`);
  });
});

// Discord Bot
client.login(token);

client.on('ready', () => {
  if (client.user) { client.user.setActivity(`${prefix}help`); }
});

// const playclip = (channel, clip) => {
//   const connection = channel.join().then((connection) => {
//     const dispatcher = connection.playFile(`./Audio/${clip}`);
//     dispatcher.on('end', (end) => {
//       channel.leave();
//     });
//   }).catch((err) => console.log(err));
// };

client.on('message', async (message: Message) => {
  // Voice only works in guilds, if the message does not come from a guild,
  // we ignore it
  if (!message.guild) return;

  if (message.content === (`${prefix}help`)) {
    message.reply(`Join a voice channel and try any of these commands: \n\n ${commands.map((command) => `${prefix + command}\n`).join('')}`);
  } else if (message.content.substr(0, 1) === prefix) {
    message.reply('Nigga bot is still in development');
  }

  // const clientCommand = commands.find((command) => command === message.content.substring(1));
  // if (isReady && clientCommand) {
  //   isReady = false;
  //   // Only try to join the sender's voice channel if they are in one themselves
  //   if (message.member.voiceChannel) {
  //     playclip(message.member.voiceChannel, clientCommand.Filename);

  //     isReady = true;
  //   } else {
  //     message.reply('You need to join a voice channel first!');
  //     isReady = true;
  //   }
  // }
});
