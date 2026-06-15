// SPDX-License-Identifier: MIT
import { describe, it, expect, vi } from 'vitest';
import { rollCommand, handleRoll } from './roll.js';
import type { RollInteraction } from './roll.js';

function mockInteraction(dice: string): {
  interaction: RollInteraction;
  reply: ReturnType<typeof vi.fn>;
} {
  const reply = vi.fn().mockResolvedValue(undefined);
  const interaction: RollInteraction = {
    getDice: () => dice,
    reply,
  };
  return { interaction, reply };
}

describe('handleRoll', () => {
  it('replies with the rendered result for valid notation (AC-01)', async () => {
    const { interaction, reply } = mockInteraction('2d6+3');
    await handleRoll(interaction);
    expect(reply).toHaveBeenCalledTimes(1);
    const arg = reply.mock.calls[0]![0] as string;
    expect(typeof arg).toBe('string');
    expect(arg.length).toBeGreaterThan(0);
    // Render echoes the notation and a total.
    expect(arg).toContain('2d6+3');
  });

  it('replies ephemerally with a clear error for invalid notation (AC-06)', async () => {
    const { interaction, reply } = mockInteraction('abc');
    await handleRoll(interaction);
    expect(reply).toHaveBeenCalledTimes(1);
    const [msg, opts] = reply.mock.calls[0]! as [string, { ephemeral?: boolean } | undefined];
    expect(typeof msg).toBe('string');
    expect(msg.length).toBeGreaterThan(0);
    expect(opts?.ephemeral).toBe(true);
  });

  it('replies ephemerally with a friendly cap message for absurd input (AC-07)', async () => {
    const { interaction, reply } = mockInteraction('1000d1000');
    await handleRoll(interaction);
    expect(reply).toHaveBeenCalledTimes(1);
    const opts = reply.mock.calls[0]![1] as { ephemeral?: boolean } | undefined;
    expect(opts?.ephemeral).toBe(true);
  });

  it('never throws even on hostile input', async () => {
    const { interaction } = mockInteraction('2x6))){{{');
    await expect(handleRoll(interaction)).resolves.toBeUndefined();
  });
});

describe('rollCommand builder', () => {
  it('declares name "roll" with one required string option "dice"', () => {
    const json = rollCommand.toJSON();
    expect(json.name).toBe('roll');
    expect(json.options).toHaveLength(1);
    const opt = json.options![0]!;
    expect(opt.name).toBe('dice');
    expect(opt.required).toBe(true);
  });
});
