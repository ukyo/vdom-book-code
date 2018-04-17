class LinkedListItem<T> {
  constructor(public value: T) {}
  next: LinkedListItem<T>;
}

export class LinkedList<T> {
  length = 0;
  first: LinkedListItem<T>;
  last: LinkedListItem<T>;
  constructor() {}

  push(v: T) {
    const item = new LinkedListItem(v);
    if (!this.first) {
      this.first = this.last = item;
    } else {
      this.last.next = item;
      this.last = this.last.next;
    }
    this.length++;
  }

  concat(list: LinkedList<T>) {
    if (!list.length) return this;
    if (!this.first) {
      this.first = this.last = list.first;
    } else {
      this.last.next = list.first;
      this.last = list.last;
    }
    this.length += list.length;
    return this;
  }

  *[Symbol.iterator]() {
    let current = this.first;
    while (current) {
      yield current.value;
      current = current.next;
    }
  }
}
