import Subscriber from './Subscriber.js';
import {
  PRESENCE_UPDATE,
  MESSAGE_CREATE,
  MESSAGE_REACTION_ADD,
  MESSAGE_REACTION_REMOVE
} from '../event-types.js';

export default class UserTotal extends Subscriber {
  constructor() {
    super();
    this.users = {};
    this.messageAuthors = {};
    this.name = 'UserTotal';

    this.quoteRegexp = /^[\w.,!;:'"%-+? ]{10,30}$/gu

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
      if (this.quoteRegexp.test(evt.d.content)) user.quote = evt.d.content;

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
    this.messageAuthors = this.messageAuthors || {};
    this.messageAuthors[messageId] = authorId;

    this.messagesToDelete = this.messagesToDelete || [];
    this.messagesToDelete.push(messageId);

    if (this.messagesToDelete.length > 200000) {
      this.messagesToDelete.splice(0, 100000);
    }
  }

  getAuthorId(messageId) {
    return this.messageAuthors[messageId];
  }

  getUser(id) {
    if (this.users[id] == null) {
      this.users[id] = { id };
    }
    return this.users[id];
  }

  getAvatarUrl(id) {
    const u = this.users[id];
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
    <canvas id="${user.id}-chart" height="120"></canvas>
    <script>
      var ctx = document.getElementById('${user.id}-chart').getContext('2d');
      var myChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: [${Array.from(Array(24).keys())}],
          datasets: [{ data: [${user.hourActivity}] }]
        },
        options: {
          title: { text: 'Activity at hour', display: false },
          events: [],
          legend: { display: false },
          scales: {
            y: { display: false },
            xAxes: {
              gridLines: { display: false }
            },
          }
        }
      });
    </script>
  </div>
</div>
    `;
  }

  getHTML() {
    let html = '<div class="user-totals"><div class="content">';
    let arr =
      Object.keys(this.users)
      .map(key => this.users[key])
      .filter(user => user.username != null);

    arr.sort((a, b) => { return b.msgCount - a.msgCount });
    arr.forEach(user => {
      html += this.getUserHTML(user);
    });
    html += '</div></div>';
    return html;
  }
}
