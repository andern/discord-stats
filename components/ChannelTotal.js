import Subscriber from './Subscriber.js';
import {
  MESSAGE_CREATE,
  GUILD_CREATE,
} from '../event-types.js';

export default class ChannelTotal extends Subscriber {
  constructor() {
    super();
    this.name = 'ChannelTotal';
    this.state.channels = {};
    this.state.users = {};

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
      evt.d.channels.forEach(channel => {
        this.state.channels[channel.id] = this.state.channels[channel.id] || { id: channel.id, usersMsgCount: {} };
        this.state.channels[channel.id].name = channel.name;
        this.state.channels[channel.id].topic = channel.topic;
      });
    });
  }

  getUser(id) {
    if (this.state.users[id] == null) {
      this.state.users[id] = { id };
    }
    return this.state.users[id];
  }

  getChannel(id) {
    if (this.state.channels[id] == null) {
      this.state.channels[id] = { id, usersMsgCount: {} };
    }
    return this.state.channels[id];
  }

  getMostActiveUser(channel) {
    let a = Object.keys(channel.usersMsgCount);
    let b = a.map(key => { return { userId: key, count: channel.usersMsgCount[key] } });
    let c = b.sort((a, b) => b.count - a.count);
    return this.state.users[c[0].userId];
  }

  getMostActiveHours(channel) {
    let a = Object.keys(channel.hourActivity);
    let b = a.map(key => { return { hour: key, count: channel.hourActivity[key] } });
    let c = b.sort((a, b) => b.count - a.count);
    return c.map(a => a.hour).slice(0, 3).join(', ');
  }

  getChannelHTML(channel) {
    const mostActive = this.getMostActiveUser(channel);
    const mostActiveHours = this.getMostActiveHours(channel);

    return `
<div class="channel-total">
  <div class="name">
    ${channel.name}
  </div>
  <div class="count">
    ${channel.msgCount}
  </div>
  <div class="most-active">
    ${mostActive.nick != null ? mostActive.nick : mostActive.username}
  </div>
  <div class="most-active-hour">
    ${mostActiveHours}
  </div>
  <div class="topic">
    ${channel.topic || '&nbsp;'}
  </div>
</div>
    `;
  }

  getHTML() {
    let html = '<div class="channel-totals"><div class="content">';
    html += '<div class="channel-total">';
    html += '<div>Channel</div>';
    html += '<div>Msgs</div>';
    html += '<div>Most active user</div>';
    html += '<div>Busiest hours</div>';
    html += '<div>Topic</div></div>';
    let arr =
      Object.keys(this.state.channels)
      .map(key => this.state.channels[key])
      .filter(channel => channel.msgCount != null);

    arr.sort((a, b) => { return b.msgCount - a.msgCount });
    arr.forEach(channel => {
      html += this.getChannelHTML(channel);
    });
    html += '</div></div>';
    return html;
  }
}
