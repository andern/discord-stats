import Subscriber from './Subscriber.js';
import {
  GUILD_CREATE,
  MESSAGE_CREATE,
  MESSAGE_REACTION_ADD
} from '../event-types.js';

const EMOJI_REGEXP = /.*<:([a-zA-Z0-9]+):[0-9]+>.*/g;

export default class ServerTotal extends Subscriber {
  constructor() {
    super();
    this.name = 'ServerTotal';
    this.state.day = 0;

    this.on(MESSAGE_CREATE, evt => {
      let day = parseInt(new Date(evt.d.timestamp).getTime() / 86400000);
      if (day > this.state.day) {
        this.state.day = day;
        this.state.days = this.state.days || 0;
        this.state.days++;
      }

      this.state.words = this.state.words || 0;
      this.state.words += evt.d.content.split(' ').filter(s => s !== '').length;

      this.state.messages = this.state.messages || 0;
      this.state.messages++;

      this.state.emojiUses = this.state.emojiUses || 0;
      if (EMOJI_REGEXP.test(evt.d.content)) {
        this.state.emojiUses++;
      }
    });

    this.on(MESSAGE_REACTION_ADD, evt => {
      this.state.reactions = this.state.reactions || 0;
      this.state.reactions++;
    });

    this.on(GUILD_CREATE, evt => {
      this.state.emojiUrl = this.getEmojiUrl(evt.d.emojis[0].id);
      this.state.emojis = evt.d.emojis.length;
      this.state.members = evt.d.member_count;
      this.state.channels = evt.d.channels.length;
      this.state.guildName = evt.d.name;
      this.state.guildIconId = evt.d.icon;
      this.state.guildId = evt.d.id;
    });
  }

  getEmojiUrl(id) {
    return `https://cdn.discordapp.com/emojis/${id}.png`
  }

  getGuildIconUrl(guildId, guildIconId) {
    return `https://cdn.discordapp.com/icons/${guildId}/${guildIconId}.png`
  }

  getHTML() {
    return `
<div class="server-total">
  <h3>Discord Stats for ${this.state.guildName}</h3>
  <div class="content">
    Generated at ${new Date().toISOString().substring(0, 19).replace('T', ' ')}
    <div class="icon">
      <img
        src="${this.getGuildIconUrl(this.state.guildId, this.state.guildIconId)}"
        alt="${this.state.guildName}"
      ></img>
    </div>

    <div class="sums">
      <div class="messages">
        ${this.state.messages} msgs &bull; ${this.state.words} words
      </div>
      <div class="reactions">
        ${this.state.reactions == null ? 0 : this.state.reactions} <span alt="Reactions">&#128077;</span>
        &bull;
        ${this.state.emojiUses == null ? 0 : this.state.emojiUses} <span alt="Emoji Uses"><img src="${this.state.emojiUrl}" style="width: 1em; height: 1em; vertical-align:middle;"></img></span>
      </div>
    </div>
    <div class="causes">
      By ${this.state.members} members on ${this.state.channels} channels over ${this.state.days} days
    </div>
  </div>
<!--  <div class="emojis">
    ${this.state.emojis} emojis
  </div> -->
</div>
    `;
  }
}
