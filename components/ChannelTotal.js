import Subscriber from './Subscriber.js';
import {
  MESSAGE_CREATE,
  GUILD_CREATE,
} from '../event-types.js';

export default class ChannelTotal extends Subscriber {
  constructor() {
    super();
    this.channels = {};
    this.users = {};
    this.name = 'ChannelTotal';

    this.on(MESSAGE_CREATE, evt => {
      const user = this.getUser(evt.d.author.id);

      user.username = evt.d.author.username;
      user.avatarId = evt.d.author.avatar;
      user.nick = evt.d.member.nick;

      const channel = this.getChannel(evt.d.channel_id);

      if (channel.msgCount == null)     channel.msgCount     = 0;
      if (channel.hourActivity == null) channel.hourActivity = new Array(24).fill(0);
      if (channel.usersMsgCount[user.id] == null) channel.usersMsgCount[user.id] = 0;

      channel.msgCount++;
      channel.usersMsgCount[user.id]++;
      channel.hourActivity[new Date(evt.d.timestamp).getHours()] += 1
    });

    this.on(GUILD_CREATE, evt => {
      const channel = this.getChannel(evt.d.channel_id);
      evt.d.channels.forEach(channel => {
        this.channels[channel.id] = this.channels[channel.id] || {};
        this.channels[channel.id].name = channel.name;
        this.channels[channel.id].topic = channel.topic;
      });
    });
  }

  getUser(id) {
    if (this.users[id] == null) {
      this.users[id] = { id };
    }
    return this.users[id];
  }

  getChannel(id) {
    if (this.channels[id] == null) {
      this.channels[id] = { id, usersMsgCount: {} };
    }
    return this.channels[id];
  }

  getChannelHTML(channel) {
    let a = Object.keys(channel.usersMsgCount);
    let b = a.map(key => { return { userId: key, count: channel.usersMsgCount[key] } });
    let c = b.sort((a, b) => b.count - a.count);
    let mostActive = this.users[c[0].userId];

    return `
<div class="channel-total">
  <div class="name">
    ${channel.name}
  </div>
  <div class="count">
    ${channel.msgCount}
  </div>
  <div class="mostActive">
    ${mostActive.nick != null ? mostActive.nick : mostActive.username}
  </div>
  <div class="topic">
    ${channel.topic || '&nbsp;'}
  </div>
  <div class="activity">
    <canvas id="${channel.id}-chart"></canvas>
    <script>
      var ctx = document.getElementById('${channel.id}-chart').getContext('2d');
      var myChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: [${Array.from(Array(24).keys())}],
          datasets: [{ data: [${channel.hourActivity}] }]
        },
        options: {
          title: { text: 'Activity at hour', display: true },
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
    let html = '<div>';
    let arr =
      Object.keys(this.channels)
      .map(key => this.channels[key])
      .filter(channel => channel.msgCount != null);

    arr.sort((a, b) => { return b.msgCount - a.msgCount });
    arr.forEach(channel => {
      html += this.getChannelHTML(channel);
    });
    html += '</div>';
    return html;
  }
}
