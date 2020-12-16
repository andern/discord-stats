import Subscriber from './Subscriber.js';
import {
  PRESENCE_UPDATE,
  MESSAGE_CREATE,
  MESSAGE_REACTION_ADD,
  MESSAGE_REACTION_REMOVE
} from '../event-types.js';

export default class MostUsed extends Subscriber {
  constructor() {
    super();
    this.users = {};
    this.name = 'MostUsed';

    this.wordRegexp = /(?:^|\s)(\w{4,})(?:[\.,]?\s)/gm;
    this.emojiRegexp = /.*<:([a-zA-Z0-9]+):[0-9]+>.*/g;

    this.words = {};
    this.on(MESSAGE_CREATE, evt => {
      let matches = (evt.d.content.match(this.wordRegexp) || []).map(e => e.replace(evt.d.content, '$1'));
      matches.forEach(word => {
        let lower = word.toLowerCase().trim();
        if (this.words[lower] == null) this.words[lower] = 0;
        this.words[lower]++;
      });
    });
  }

  getHTML() {
    const topWords =
      Object.keys(this.words)
      .sort((a, b) => this.words[b] - this.words[a])
      .slice(0, 5)
      .map(w => `
<div class="word">
  <span class="word">${w}</span>
  <span class="count">${this.words[w]}</span>
</div>
      `)
      .join('');

    return `
<div class="most-used">
  <div class="words">
    ${topWords}
  </div>
</div>
    `;
  }
}
