import Subscriber from './Subscriber.js';
import {
  MESSAGE_CREATE
} from '../event-types.js';

export default class RecentActivity extends Subscriber {
  constructor() {
    super();
    this.name = 'RecentActivity';
    this.state.dates = {};

    this.on(MESSAGE_CREATE, evt => {
      const time = new Date(evt.d.timestamp);
      const date = time.toISOString().substring(0, 10);
      this.state.dates[date] = this.state.dates[date] || 0;
      this.state.dates[date] += 1;
    });
  }

  getRecentMessagesHTML() {
    let arr =
      Object.keys(this.state.dates)
      .map(key => { return { date: key, count: this.state.dates[key] } })
      .filter(x => x.count > 0);

    arr.sort((a, b) => { return b.date - a.date })
    arr = arr.slice(arr.length - 90);

    return `
    <div id="recent-activity-chart"></div>
    <script>
      const container = document.getElementById('recent-activity-chart');
      const data = [
        [${arr.map(x => new Date(x.date).getTime() / 1000)}],
        [${arr.map(x => x.count)}]
      ];
      const options = {
        width: container.offsetWidth,
        height: 240,
        cursor: { show: false },
        legend: { show: false },
        axes: [
          {
            stroke: window.axesColor,
          },
          {
            stroke: window.axesColor,
            label: 'msgs'
          },
        ],
        series: [
          {},
          {
            stroke: window.plotColor
          }
        ],
      };
      let u = new uPlot(options, data, container);
      window.addEventListener("resize", e => {
        console.dir(container);
        u.setSize({
           width: container.offsetWidth,
          height: options.height
        });
      });
    </script>
    `;
  }

  getHTML() {
    return `
    <div class="recent-activity">
      <div class="content">
        <div class="recent-messages">
          ${this.getRecentMessagesHTML()}
        </div>
      </div>
    </div>
    `;
    return this.getRecentMessagesHTML();
  }

}
