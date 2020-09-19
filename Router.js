export default class Router {
  constructor() {
    this.routes = {};
    this.consumers = [];
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

    handlers.forEach(handler => handler.handle(evt));
  }
}
