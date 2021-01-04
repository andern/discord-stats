import Subscriber from './Subscriber.js';
import {
  PRESENCE_UPDATE,
  MESSAGE_CREATE,
  MESSAGE_REACTION_ADD,
  MESSAGE_REACTION_REMOVE
} from '../event-types.js';

const WORD_REGEXP = /(\w{5,})(?:,\s|\.\s|\s)/gm;

export default class MostUsed extends Subscriber {
  constructor() {
    super();
    this.name = 'MostUsed';
    this.state.users = {};
    this.state.words = {};

    this.on(MESSAGE_CREATE, evt => {
      let matches = (evt.d.content.match(WORD_REGEXP) || []).map(e => e.replace(evt.d.content, '$1'));
      matches.forEach(word => {
        let lower = word.toLowerCase().trim();
        if (this.state.words[lower] == null) this.state.words[lower] = 0;
        this.state.words[lower]++;
      });
    });
  }

  getHTML() {
    const topWords =
      Object.keys(this.state.words)
      .sort((a, b) => this.state.words[b] - this.state.words[a])
      .slice(0, 5)
      .map(w => `
<div class="word">
  <span class="word">${w}</span>
  <span class="count">${this.state.words[w]}</span>
</div>
      `)
      .join('');

    return `
<div class="most-used">
  <div class="content">
    <div class="words">
      ${topWords}
    </div>
  </div>
</div>
    `;
  }
}
