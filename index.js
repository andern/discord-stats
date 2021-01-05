import dotenv from 'dotenv';
import fs from 'fs';
import zlib from 'zlib';
import es from 'event-stream';

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

readDir(process.env.LOGDIR);

function createReadStreamFromPossiblyGzippedFile(path) {
  let stream = fs.createReadStream(path);
  if (path.endsWith('.gz'))
    stream = stream.pipe(zlib.createGunzip());
  return stream;
}

async function readDir(dirpath) {
  const files = fs.readdirSync(dirpath);
  const snapshot = await readSnapshot();

  let i = 0;
  if (snapshot.files == null || snapshot.files.length === 0) {
    log(`Snapshot ${process.env.SNAPSHOT} not found or empty; ignoring`)
  } else if (snapshot.files.length > files.length) {
    log(`Snapshot ${process.env.SNAPSHOT} is inconsistent with input; ignoring`)
  } else {
    while (snapshot.files[i] === files[i]) i++;
  }

  delete snapshot.files;
  router.loadStates(snapshot);

  for (; i < files.length; i++) {
    if (i == files.length - 1) {
      const newSnapshot = router.getStates();
      newSnapshot.files = files.slice(0, files.length - 1);
      await fs.promises.writeFile(process.env.SNAPSHOT, JSON.stringify(newSnapshot, null, 4));
      log(`Writing snapshot ${process.env.SNAPSHOT}`);
    }

    await readFile(files[i]);
  }

  writeHTML(router.consumers);
}

function readFile(filename) {
  return new Promise(function(resolve, reject) {
    const stream = createReadStreamFromPossiblyGzippedFile(`${process.env.LOGDIR}/${filename}`)
    stream.pipe(es.split()).pipe(es.mapSync(line => {
      try {
        if (line.trim() !== '')
          router.route(JSON.parse(line));
      } catch (e) {
        log(`Failed to handle line: ${line}: ${e}`);
      }
    }).on('error', err => {
      log(`Error while reading file ${filename}`, err);
      reject();
    }).on('end', async () => {
      log(`Read file ${filename}`);
      resolve();
    }));
  });
}

function log(str) {
  if (process.env.VERBOSE === 'true')
    console.log(str);
}

async function writeHTML(consumers) {
  const indexFilePath = `${process.env.THEME}/index.html`;
  let html = await fs.promises.readFile(indexFilePath, 'utf8')

  consumers.forEach(consumer => {
    const tag = `<${consumer.name}></${consumer.name}>`;
    html = html.replace(tag, consumer.getHTML());
  });

  await fs.promises.writeFile(`${process.env.OUTPUT}/index.html`, html);
}

async function readSnapshot() {
  try {
    return JSON.parse(
      await fs.promises.readFile(process.env.SNAPSHOT)
    );
  } catch {
    return {};
  }
}
