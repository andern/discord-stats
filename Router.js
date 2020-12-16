import { performance } from 'perf_hooks';

export default class Router {
  constructor() {
    this.routes = {};
    this.consumers = [];

    this.timeSpent = {};
  }

  register(consumer) {
    this.consumers.push(consumer);
    Object.keys(consumer.handlers).forEach(type => {
      this.routes[type] = this.routes[type] || [];
      this.routes[type].push(consumer);
    });
  }

  route(evt) {
    const handlers = this.routes[evt.t];
    if (handlers == null || handlers.length == 0) return;
    if (
       evt.d != null &&
      (evt.d.author != null && evt.d.author.bot) ||
      (evt.d.user != null && evt.d.user.bot)
    ) return;

    handlers.forEach(handler => this.handle(handler, evt));
  }

  handle(handler, evt) {
    const t0 = performance.now();
    handler.handle(evt);
    const t1 = performance.now();

    this.timeSpent[handler.name] = (this.timeSpent[handler.name] || 0) + (t1 - t0);
    // this.timeSpent[evt.t] = (this.timeSpent[evt.t] || 0) + (t1 - t0);
  }
}
