export default class Subscriber {
  constructor() {
    this.handlers = {};
  }

  on(eventType, handlerFunc) {
    this.handlers[eventType] = handlerFunc;
  }

  handle(evt) {
    this.handlers[evt.t](evt);
  }
}
