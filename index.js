import dotenv from 'dotenv';
import fs from 'fs';
import zlib from 'zlib';
import es from 'event-stream';
import MultiStream from 'multistream';

import Router from './Router.js';
import UserTotal from './components/UserTotal.js';
import ChannelTotal from './components/ChannelTotal.js';
import ServerTotal from './components/ServerTotal.js';
import MostUsed from './components/MostUsed.js';

dotenv.config();

const router = new Router();
router.register(new UserTotal);
router.register(new ChannelTotal);
router.register(new ServerTotal);
router.register(new MostUsed);

function createReadStreamFromOptionallyGzippedFile(path) {
  let stream = fs.createReadStream(path);
  if (path.endsWith('.gz'))
    stream = stream.pipe(zlib.createGunzip());
  return stream;
}

fs.readdir(process.env.LOGDIR, function (err, files) {
  if (err != null) {
    console.log(`Failed to read log dir ${process.env.LOGDIR}: ${err}`);
    return;
  }

  const rstream = new MultiStream(
    files.map(file => createReadStreamFromOptionallyGzippedFile(`${process.env.LOGDIR}${file}`))
  );
  rstream.pipe(es.split()).pipe(es.mapSync(line => {
    try {
      if (line.trim() !== '')
        router.route(JSON.parse(line));
    } catch (e) {
      console.log(`Failed to handle line: ${line}: ${e}`);
    }
  }).on('error', err => {
    console.log(`Error while reading file ${file}`, err);
  }).on('end', () => {
    // console.log(`Finished reading file ${file}`);
    writeHTML(router.consumers);
    printRuntimeStats(router);
  }));
});

function writeHTML(consumers) {
  const indexFilePath = `${process.env.THEME}/index.html`;
  let html = fs.readFileSync(indexFilePath, 'utf8')

  consumers.forEach(consumer => {
    const tag = `<${consumer.name}></${consumer.name}>`;
    html = html.replace(tag, consumer.getHTML());
  });

  const wstream = fs.createWriteStream(`${process.env.OUTPUT}/index.html`, { flags: 'a' })
  wstream.write(html);
  wstream.end();
}

function printRuntimeStats(router) {
  console.log(router.timeSpent);
}
