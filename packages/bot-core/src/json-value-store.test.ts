// SPDX-License-Identifier: MIT
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { JsonValueStore } from './json-value-store.js';

let dir: string;
let filePath: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'json-value-store-'));
  filePath = join(dir, 'value.json');
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

interface RoleMenu {
  guildId: string;
  messageId: string;
}

describe('JsonValueStore', () => {
  it('read() returns undefined for a missing file (no throw)', async () => {
    const store = new JsonValueStore<RoleMenu>(filePath);
    expect(await store.read()).toBeUndefined();
  });

  it('write then read round-trips an object value', async () => {
    const store = new JsonValueStore<RoleMenu>(filePath);
    const value: RoleMenu = { guildId: 'g-1', messageId: 'm-1' };
    await store.write(value);
    expect(await store.read()).toEqual(value);
  });

  it('persists across a fresh store instance at the same path (durability)', async () => {
    const first = new JsonValueStore<RoleMenu>(filePath);
    await first.write({ guildId: 'g-durable', messageId: 'm-durable' });

    const second = new JsonValueStore<RoleMenu>(filePath);
    expect(await second.read()).toEqual({ guildId: 'g-durable', messageId: 'm-durable' });
  });

  it('is generic over a primitive value', async () => {
    const store = new JsonValueStore<string>(filePath);
    await store.write('1234567890');
    expect(await store.read()).toBe('1234567890');

    const numStore = new JsonValueStore<number>(join(dir, 'num.json'));
    await numStore.write(42);
    expect(await numStore.read()).toBe(42);
  });

  it('write creates the parent directory if absent', async () => {
    const nested = join(dir, 'deep', 'nested', 'value.json');
    const store = new JsonValueStore<RoleMenu>(nested);
    await store.write({ guildId: 'g-1', messageId: 'm-1' });
    expect(existsSync(nested)).toBe(true);
    expect(await store.read()).toEqual({ guildId: 'g-1', messageId: 'm-1' });
  });

  it('read() returns undefined for a corrupt file (no throw)', async () => {
    writeFileSync(filePath, '{ this is not valid json ]');
    const store = new JsonValueStore<RoleMenu>(filePath);
    expect(await store.read()).toBeUndefined();
    // and can still write over it
    await store.write({ guildId: 'g-2', messageId: 'm-2' });
    expect(await store.read()).toEqual({ guildId: 'g-2', messageId: 'm-2' });
  });

  it('write overwrites a previously stored value', async () => {
    const store = new JsonValueStore<RoleMenu>(filePath);
    await store.write({ guildId: 'g-1', messageId: 'm-1' });
    await store.write({ guildId: 'g-1', messageId: 'm-2' });
    expect(await store.read()).toEqual({ guildId: 'g-1', messageId: 'm-2' });
  });

  it('clear removes the stored value/file', async () => {
    const store = new JsonValueStore<RoleMenu>(filePath);
    await store.write({ guildId: 'g-1', messageId: 'm-1' });
    expect(existsSync(filePath)).toBe(true);
    await store.clear();
    expect(existsSync(filePath)).toBe(false);
    expect(await store.read()).toBeUndefined();
  });

  it('clear on a missing file does not throw', async () => {
    const store = new JsonValueStore<RoleMenu>(filePath);
    await expect(store.clear()).resolves.toBeUndefined();
  });
});
