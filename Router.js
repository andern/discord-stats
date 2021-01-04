export default class Router {
  constructor() {
    this.routes = {};
    this.consumers = [];
  }

  register(consumer) {
    this.consumers.push(consumer);
    Object.keys(consumer.handlers).forEach(eventType => {
      this.routes[eventType] = this.routes[eventType] || [];
      this.routes[eventType].push(consumer);
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
    handler.handle(evt);
  }

  getStates() {
    return Object.fromEntries(
      this.consumers.map(c => [c.name, c.state])
    );
  }

  loadStates(states) {
    for (const [consumerName, state] of Object.entries(states)) {
      this.consumers.find(c => c.name === consumerName).state = state;
    }
  }
}
