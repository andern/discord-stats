import Subscriber from './Subscriber.js';
import {
  GUILD_CREATE,
  PRESENCE_UPDATE,
  MESSAGE_CREATE,
  MESSAGE_REACTION_ADD
} from '../event-types.js';

export default class ServerTotal extends Subscriber {
  constructor() {
    super();
    this.day = 0;
    this.name = 'ServerTotal';
    this.emojiRegexp = /.*<:([a-zA-Z0-9]+):[0-9]+>.*/g;

    this.on(PRESENCE_UPDATE, evt => {
      this.statusUpdates = this.statusUpdates || 0;
      this.statusUpdates++;
    });

    this.on(MESSAGE_CREATE, evt => {
      let day = parseInt(new Date(evt.d.timestamp).getTime() / 86400000);
      if (day > this.day) {
        this.day = day;
        this.days = this.days || 0;
        this.days++;
      }

      this.words = this.words || 0;
      this.words += evt.d.content.split(' ').filter(s => s !== '').length;

      this.messages = this.messages || 0;
      this.messages++;

      this.emojiUses = this.emojiUses || 0;
      if (this.emojiRegexp.test(evt.d.content)) {
        this.emojiUses++;
      }
    });

    this.on(MESSAGE_REACTION_ADD, evt => {
      this.reactions = this.reactions || 0;
      this.reactions++;
    });

    this.on(GUILD_CREATE, evt => {
      this.emojiUrl = this.getEmojiUrl(evt.d.emojis[0].id);
      this.emojis = evt.d.emojis.length;
      this.members = evt.d.member_count;
      this.channels = evt.d.channels.length;
      this.guildName = evt.d.name;
      this.guildIconId = evt.d.icon;
      this.guildId = evt.d.id;
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
  <h3>Discord Stats for ${this.guildName}</h3>
  <div class="content">
    Generated at ${new Date().toISOString().substring(0, 19).replace('T', ' ')}
    <div class="icon">
      <img
        src="${this.getGuildIconUrl(this.guildId, this.guildIconId)}"
        alt="${this.guildName}"
      ></img>
    </div>

    <div class="sums">
      <div class="messages">
        ${this.messages} msgs &bull; ${this.words} words
      </div>
      <!-- <div class="statusUpdates">
        ${this.statusUpdates} status updates
      </div> -->
      <div class="reactions">
        ${this.reactions == null ? 0 : this.reactions} <span alt="Reactions">&#128077;</span>
        &bull;
        ${this.emojiUses == null ? 0 : this.emojiUses} <span alt="Emoji Uses"><img src="${this.emojiUrl}" style="width: 1em; height: 1em; vertical-align:middle;"></img></span>
      </div>
    </div>
    <div class="causes">
      By ${this.members} members on ${this.channels} channels over ${this.days} days
    </div>
  </div>
<!--  <div class="emojis">
    ${this.emojis} emojis
  </div> -->
</div>
    `;
  }
}
