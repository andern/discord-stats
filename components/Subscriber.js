export default class Subscriber {
  constructor() {
    this.handlers = {};
    this.state = {};
  }

  on(eventType, handlerFunc) {
    this.handlers[eventType] = handlerFunc;
  }

  handle(evt) {
    this.handlers[evt.t](evt);
  }
}
