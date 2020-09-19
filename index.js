import dotenv from 'dotenv';
import fs from 'fs';
import es from 'event-stream';

import Router from './Router.js';
import UserTotal from './components/UserTotal.js';
import ChannelTotal from './components/ChannelTotal.js';

dotenv.config();

const router = new Router();
router.register(new UserTotal);
router.register(new ChannelTotal);

const file = process.env.LOG;
const rstream = fs.createReadStream(file);

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
  console.log(`Finished reading file ${file}`);
  writeHTML(router.consumers);
}));

async function writeHTML(consumers) {
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

