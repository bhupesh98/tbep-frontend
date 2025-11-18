class TrieNode<E> {
  children: Map<string, TrieNode<E>>;
  value: E | null;
  isEndOfKey: boolean;

  constructor() {
    this.children = new Map();
    this.value = null;
    this.isEndOfKey = false;
  }
}

export class Trie<E = string> {
  #root: TrieNode<E>;
  size: number;

  constructor() {
    this.#root = new TrieNode<E>();
    this.size = 0;
  }

  static fromArray<E>(array: E[], keyToIndex: string): Trie<E> {
    const trie = new Trie<E>();
    trie.addAll(array, keyToIndex);
    return trie;
  }

  add(input: E, keyToIndex?: string): void {
    if (typeof input === 'string' && keyToIndex === undefined) {
      // Handle direct string input
      this.#addString(input, input);
      this.size++;
    } else if (typeof input === 'object' && keyToIndex) {
      // Handle object input
      const key = this.#getValueByKey(input, keyToIndex);
      if (key) {
        this.#addString(key, input);
      }
      this.size++;
    }
  }

  #addString(key: string, value: E): void {
    key = key.toUpperCase();
    let current = this.#root;

    for (const char of key) {
      if (!current.children.has(char)) {
        current.children.set(char, new TrieNode());
      }
      const temp = current.children.get(char);
      if (temp) current = temp;
    }

    current.isEndOfKey = true;
    current.value = value;
  }

  #getValueByKey(obj: E, key: string): string | null {
    if (!obj) return null;

    // Handle nested keys (e.g., "user.id")
    const keys = key.split('.');
    let value: Record<string, string> | string = obj;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return null;
      }
    }

    return typeof value === 'string' ? value : null;
  }

  addAll(objects: E[], keyToIndex: string): void {
    if (!Array.isArray(objects)) {
      return;
    }

    for (const obj of objects) {
      this.add(obj, keyToIndex);
    }
  }

  get(searchTerm: string): E | null {
    let current = this.#root;

    for (const char of searchTerm) {
      if (!current.children.has(char)) {
        return null;
      }
      const temp = current.children.get(char);
      if (temp) current = temp;
    }

    return current.isEndOfKey ? current.value : null;
  }

  has(key: string): boolean {
    let current = this.#root;

    for (const char of key) {
      if (!current.children.has(char)) {
        return false;
      }
      const temp = current.children.get(char);
      if (temp) current = temp;
    }

    return current.isEndOfKey;
  }

  search(prefix: string): E[] {
    prefix = prefix.toUpperCase();
    let current = this.#root;
    for (const char of prefix) {
      if (!current.children.has(char)) {
        return [];
      }
      const temp = current.children.get(char);
      if (temp) current = temp;
    }
    return this.#collectAll(current, prefix);
  }

  #collectAll(node: TrieNode<E>, prefix: string): E[] {
    const result: E[] = [];
    if (node.isEndOfKey) {
      result.push(node.value as E);
    }

    for (const [char, child] of node.children) {
      result.push(...this.#collectAll(child, prefix + char));
    }

    return result;
  }

  remove(key: string): void {
    this.#remove(this.#root, key, 0);
  }

  #remove(node: TrieNode<E>, key: string, depth: number): boolean {
    if (depth === key.length) {
      if (!node.isEndOfKey) {
        return false;
      }
      node.isEndOfKey = false;
      node.value = null;
      return node.children.size === 0;
    }

    const char = key[depth];
    const child = node.children.get(char);
    if (!child) {
      return false;
    }

    const canDelete = this.#remove(child, key, depth + 1);
    if (canDelete) {
      node.children.delete(char);
      return node.children.size === 0;
    }

    return false;
  }
}
