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

fs.mkdirSync(process.env.SNAPSHOTDIR, { recursive: true });
readDir(process.env.LOGDIR);

function createReadStreamFromPossiblyGzippedFile(path) {
  let stream = fs.createReadStream(path);
  if (path.endsWith('.gz'))
    stream = stream.pipe(zlib.createGunzip());
  return stream;
}

async function readDir(dirpath) {
  const files = fs.readdirSync(dirpath);
  const snapshots = fs.readdirSync(process.env.SNAPSHOTDIR);

  let i = 0;
  while (snapshots[i] === `__${files[i]}`) i++;

  if (i > 0)
    router.loadStates(await readSnapshot(`__${files[i-1]}`));

  for (; i < files.length; i++) {
    await readFile(files[i]);

    if (i == files.length - 1) continue;
    await fs.promises.writeFile(
      `${process.env.SNAPSHOTDIR}/__${files[i]}`,
      JSON.stringify(router.getStates(), null, 4)
    );
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
        console.log(`Failed to handle line: ${line}: ${e}`);
      }
    }).on('error', err => {
      console.log(`Error while reading file ${filename}`, err);
      reject();
    }).on('end', async () => {
      // console.log(filename);
      resolve();
    }));
  });
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

async function readSnapshot(filename) {
  try {
    return JSON.parse(
      await fs.promises.readFile(`${process.env.SNAPSHOTDIR}/${filename}`)
    );
  } catch {
    return {};
  }
}
