import Discord, { Message, VoiceChannel } from 'discord.js';
import express, { Request, Response } from 'express';
import multer, { FileFilterCallback, MulterError } from 'multer';
import low from 'lowdb';
import FileSync from 'lowdb/adapters/FileSync';

require('dotenv').config();

const client = new Discord.Client();

const app = express();
const bodyParser = require('body-parser');

interface ClipData {
  commandName: String,
  fileName: String,
}

interface Schema {
  clipData: ClipData[],
}

const adapter = new FileSync<Schema>('pssbotdb.json');
const db = low(adapter);

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
const regex = new RegExp('([a-zA-Z0-9_])$');

db.defaults({ clipData: [] })
  .write();

const storage = multer.diskStorage({
  destination(req: Request, file: any, cb: Function) {
    cb(null, `${__dirname}/${clipsFolder}`);
  },

  // By default, multer removes file extensions so let's add them back
  filename(req: Request, file: any, cb: Function) {
    cb(null, file.originalname);
  },
});

const audioFileFilter = (req: Request, file: any, cb: FileFilterCallback): void => {
  if (file.mimetype !== 'audio/mpeg') {
    cb(new Error('File not mp3'));
    return;
  }
  if (!req.body.commandName) {
    cb(new Error('Command name should be specifiecd first in the request'));
    return;
  }
  if (!regex.test(req.body.commandName)) {
    cb(new Error('Command name has unsupported characters'));
    return;
  }
  if (req.body.commandName.length >= 25) {
    cb(new Error('Command name too long, please rename to under 25 characters'));
    return;
  }
  if (db.get('clipData').find((clipData) => clipData.commandName === req.body.commandName).value()) {
    cb(new Error('Command exists!'));
    return;
  }
  cb(null, true);
};

app.get('/', (req: Request, res: Response): void => {
  res.json({ message: 'PSSbot API Online!' });
});

app.get('/commands', (req: Request, res: Response): void => {
  res.json(db.get('clipData').value());
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
      res.status(400).json({ error: err.message });
      return;
    }
    if (err) {
      res.status(400).json({ error: err.toString() });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: 'Please select an audio clip to upload' });
      return;
    }

    const clipData: ClipData = {
      commandName: req.body.commandName,
      fileName: req.file.originalname,
    };

    db.get('clipData')
      .push(clipData)
      .write();

    res.json({ message: `Uploaded ${req.file.originalname}` });
  });
});

app.listen(port, () => {
  console.log(`app is running on port:${port}`);
});

// Discord Bot
client.login(token);

client.on('ready', () => {
  if (client.user) { client.user.setActivity(`${prefix}help`); }
  isReady = true;
});

const playclip = (channel: VoiceChannel, clip: ClipData) => {
  channel.join().then((connection) => {
    const dispatcher = connection.play(`${clipsFolder}${'/'}${clip.fileName}`);
    dispatcher.on('finish', () => {
      isReady = true;
    });
  }).catch((err) => console.log(err));
};

client.on('message', async (message: Message) => {
  if (!message.guild) return;

  if (message.content.substr(0, 1) !== prefix) return;

  const command = message.content.substring(1);

  if (command === 'help') {
    message.reply(`Join a voice channel and try any of these commands: \n\n ${prefix}leave \n\n${db.get('clipData').value().map((clipData) => `${prefix + clipData.commandName}\n`).join('')}`);
    return;
  }
  if (command === 'leave') {
    if (message.member?.voice.channel) {
      message.reply('Bye!');
      message.member?.voice.channel.leave();
      return;
    }
    message.reply('You need to join a voice channel first!');
    return;
  }

  const clip = db.get('clipData').find((clipData) => clipData.commandName === command).value();
  if (isReady) {
    isReady = false;
    if (message?.member?.voice.channel) {
      playclip(message?.member?.voice.channel, clip);
    } else {
      message.reply('You need to join a voice channel first!');
      isReady = true;
    }
  }
});
