// SPDX-License-Identifier: MIT
import { describe, it, expect, vi } from 'vitest';
import { nextSessionCommand, handleNextSession } from './nextsession.js';

const NOW = 1_000_000_000_000; // fixed reference instant

describe('handleNextSession', () => {
  it('replies with the soonest FUTURE event name and start time (AC-09)', async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const fetchEvents = vi.fn().mockResolvedValue([
      { name: 'Later Session', startTime: NOW + 5 * 86_400_000 },
      { name: 'Soonest Session', startTime: NOW + 86_400_000 },
      { name: 'Past Session', startTime: NOW - 86_400_000 },
    ]);

    await handleNextSession({ now: NOW, fetchEvents, reply });

    expect(reply).toHaveBeenCalledTimes(1);
    const msg = reply.mock.calls[0]![0] as string;
    expect(msg).toContain('Soonest Session');
    expect(msg).not.toContain('Later Session');
    expect(msg).not.toContain('Past Session');
    // Discord timestamp formatting for the start time.
    expect(msg).toContain(String(Math.floor((NOW + 86_400_000) / 1000)));
  });

  it('ignores events at or before now (boundary)', async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const fetchEvents = vi.fn().mockResolvedValue([{ name: 'Exactly Now', startTime: NOW }]);

    await handleNextSession({ now: NOW, fetchEvents, reply });

    const msg = reply.mock.calls[0]![0] as string;
    expect(msg).toMatch(/no sessions scheduled/i);
  });

  it('replies "no sessions scheduled" when there are none (AC-10)', async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const fetchEvents = vi.fn().mockResolvedValue([]);

    await handleNextSession({ now: NOW, fetchEvents, reply });

    const msg = reply.mock.calls[0]![0] as string;
    expect(msg).toMatch(/no sessions scheduled/i);
  });
});

describe('nextSessionCommand builder', () => {
  it('declares name "nextsession" with no options', () => {
    const json = nextSessionCommand.toJSON();
    expect(json.name).toBe('nextsession');
    expect(json.options ?? []).toHaveLength(0);
  });
});
