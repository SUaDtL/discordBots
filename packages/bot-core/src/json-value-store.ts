// SPDX-License-Identifier: MIT
//
// Generic single-value JSON file store. A second bot (arbiter-self-assign) uses it to persist its
// role-menu message id per guild. Mirrors the reminded-store style (ADR-0004): versioned envelope on
// disk, tolerant of a missing or corrupt file, single writer (one OS process per bot — ADR-0003).
//
// Unlike RemindedStore, this is shape-agnostic: it persists whatever T it is given. The caller is
// responsible for not placing member PII in the stored value (security-controls.md / coding-standards.md).

import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

/** On-disk shape. A versioned envelope keeps room for a future format bump. */
interface FileShape<T> {
  version: 1;
  value: T;
}

/**
 * Flat-JSON store for a single arbitrary JSON value (object/array/primitive). Creates the file/dir on
 * first write; tolerates a missing or corrupt file by returning `undefined` from `read()` — `read()`
 * never throws. Whole-file read/write under a single writer.
 */
export class JsonValueStore<T> {
  private readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  /** Read the stored value; a missing or corrupt/unparseable file yields `undefined`. Never throws. */
  async read(): Promise<T | undefined> {
    let raw: string;
    try {
      raw = await readFile(this.filePath, 'utf8');
    } catch {
      return undefined;
    }
    try {
      const parsed = JSON.parse(raw) as Partial<FileShape<T>>;
      if (!parsed || typeof parsed !== 'object' || parsed.version !== 1 || !('value' in parsed)) {
        return undefined;
      }
      return parsed.value as T;
    } catch {
      return undefined;
    }
  }

  /** Persist the value, creating the parent directory if absent. Overwrites any existing value. */
  async write(value: T): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    const payload: FileShape<T> = { version: 1, value };
    await writeFile(this.filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  }

  /** Remove the stored value/file. A missing file is not an error. */
  async clear(): Promise<void> {
    await rm(this.filePath, { force: true });
  }
}
