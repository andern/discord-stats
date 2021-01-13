import Subscriber from './Subscriber.js';
import {
  PRESENCE_UPDATE,
  MESSAGE_CREATE,
  MESSAGE_REACTION_ADD,
  MESSAGE_REACTION_REMOVE
} from '../event-types.js';

const QUOTE_REGEXP = /^[\w.,!;:'"%-+? ]{10,30}$/gu;

export default class UserTotal extends Subscriber {
  constructor() {
    super();
    this.name = 'UserTotal';
    this.state.users = {};
    this.state.messageAuthors = {};

    this.on(PRESENCE_UPDATE, evt => {
      const user = this.getUser(evt.d.user.id);

      if (user.presenceCount == null)
        user.presenceCount = 0;

      user.presenceCount++;
    });

    this.on(MESSAGE_CREATE, evt => {
      this.addAuthor(evt.d.id, evt.d.author.id);

      const user = this.getUser(evt.d.author.id);
      user.username = evt.d.author.username;
      user.avatarId = evt.d.author.avatar;
      user.nick = evt.d.member.nick;
      user.lastSeen = evt.d.timestamp;
      if (user.charsPerMsg == null)  user.charsPerMsg  = 0;
      if (user.wordCount == null)    user.wordCount    = 0;
      if (user.msgCount == null)     user.msgCount     = 0;
      if (user.hourActivity == null) user.hourActivity = new Array(24).fill(0);
      if (QUOTE_REGEXP.test(evt.d.content)) user.quote = evt.d.content;

      user.msgCount++;
      user.wordCount += evt.d.content.split(' ').filter(s => s !== '').length;
      user.charsPerMsg += (evt.d.content.length - user.charsPerMsg) / user.msgCount;
      user.hourActivity[new Date(evt.d.timestamp).getHours()] += 1
    });

    this.on(MESSAGE_REACTION_ADD, evt => {
      const user = this.getUser(evt.d.user_id);
      if (user.reactedCount == null)
        user.reactedCount = 0;
      user.reactedCount++;

      const authorId = this.getAuthorId(evt.d.message_id);
      if (authorId == null) return;

      const author = this.getUser(authorId);
      if (author.reactionCount == null)
        author.reactionCount = 0;
      author.reactionCount++;
    });

    this.on(MESSAGE_REACTION_REMOVE, evt => {
      const user = this.getUser(evt.d.user_id);
      if (user.reactedCount != null)
        user.reactedCount--;

      const authorId = this.getAuthorId(evt.d.message_id);
      if (authorId == null) return;

      const author = this.getUser(authorId);
      if (author.reactionCount != null)
        author.reactionCount--;
    });
  }

  addAuthor(messageId, authorId) {
    this.state.messageAuthors = this.state.messageAuthors || {};
    this.state.messageAuthors[messageId] = authorId;

    this.state.messagesToDelete = this.state.messagesToDelete || [];
    this.state.messagesToDelete.push(messageId);

    if (this.state.messagesToDelete.length > 200000) {
      this.state.messagesToDelete.splice(0, 100000)
        .forEach(id => delete this.state.messageAuthors[id]);
    }
  }

  getAuthorId(messageId) {
    return this.state.messageAuthors[messageId];
  }

  getUser(id) {
    if (this.state.users[id] == null) {
      this.state.users[id] = { id };
    }
    return this.state.users[id];
  }

  getAvatarUrl(id) {
    const u = this.state.users[id];
    if (u == null || u.avatarId == null)
      return null;
    return `https://cdn.discordapp.com/avatars/${u.id}/${u.avatarId}.png`
  }

  getUserHTML(user) {
    return `
<div class="user-total">
  <div class="profile">
    <div class="profile-info">
      <div class="avatar">
        <img src="${this.getAvatarUrl(user.id)}" alt="${user.username}'s avatar">
        </img>
      </div>
      <div class="stats">
        <div class="count">
          ${user.msgCount} msgs &bull; ${user.wordCount} words
        </div>
        <div class="nick">
          ${user.nick != null ? user.nick : user.username}
        </div>
        <div class="username">
        ${user.nick == null ? '&nbsp;' : user.username}
        </div>
      </div>
    </div>
    <div class="reactions">
      ${user.reactedCount == null ? 0 : user.reactedCount} <span alt="Reacted count">&#128077;</span>
      &bull;
      ${user.reactionCount == null ? 0 : user.reactionCount} <span alt="Reaction count">❤️</span>
    </div>
    <div class="quote">
      "${user.quote}"
    </div>
  </div>
  <div class="activity">
    <div id="${user.id}-chart"></div>
    <script>
      const container${user.id} = document.getElementById('${user.id}-chart');
      const data${user.id} = [
        [${Array.from(Array(24).keys())}],
        [${user.hourActivity}]
      ];
      const options${user.id} = {
        width: 220,
        height: 140,
        class: 'spark',
				padding: [0,5,0,5],
        cursor: { show: false },
        legend: { show: false },
        scales: {
          x: { time: false },
        },
        axes: [
          {
            stroke: window.axesColor,
          },
          {
            show: false,
            stroke: window.axesColor,
          },
        ],
        series: [
          {},
          {
            stroke: window.axesColor,
            fill: window.plotColor
          }
        ],
      };
      new uPlot(options${user.id}, data${user.id}, container${user.id});
    </script>
  </div>
</div>
    `;
  }

  getHTML() {
    let html = '<div class="user-totals"><div class="content">';
    let arr =
      Object.keys(this.state.users)
      .map(key => this.state.users[key])
      .filter(user => user.username != null);

    arr.sort((a, b) => { return b.msgCount - a.msgCount });
    arr.forEach(user => {
      html += this.getUserHTML(user);
    });
    html += '</div></div>';
    return html;
  }
}
