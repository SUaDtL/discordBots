// SPDX-License-Identifier: MIT
import { describe, it, expect } from 'vitest';
import { ComponentType } from 'discord.js';
import {
  buildRoleMenu,
  COLOR_SELECT_CUSTOM_ID,
  PING_BUTTON_PREFIX,
  pingButtonCustomId,
  parsePingButtonCustomId,
} from './menu.js';
import { COLOR_ROLES, PING_ROLES } from './roles.js';

describe('buildRoleMenu (AC-03, AC-08)', () => {
  it('returns at least the select row plus button row(s)', () => {
    const rows = buildRoleMenu();
    expect(rows.length).toBeGreaterThanOrEqual(2);
  });

  it('first row is a single string-select with customId selfassign:color, min 0 / max 1, 7 colors', () => {
    const json = buildRoleMenu().map((r) => r.toJSON());
    const select = json[0]?.components[0];
    expect(select?.type).toBe(ComponentType.StringSelect);
    if (select?.type !== ComponentType.StringSelect) throw new Error('expected select');
    expect(select.custom_id).toBe('selfassign:color');
    expect(COLOR_SELECT_CUSTOM_ID).toBe('selfassign:color');
    expect(select.min_values).toBe(0);
    expect(select.max_values).toBe(1);
    expect(select.options).toHaveLength(7);
    // Option values are the stable color keys so the handler can resolve the role after restart.
    const values = select.options.map((o) => o.value).sort();
    expect(values).toEqual(COLOR_ROLES.map((r) => r.key).sort());
    const labels = select.options.map((o) => o.label).sort();
    expect(labels).toEqual(COLOR_ROLES.map((r) => r.name).sort());
  });

  it('renders a toggle button for every ping/GameNight role with a stable namespaced custom id', () => {
    const json = buildRoleMenu().map((r) => r.toJSON());
    const buttonRows = json.slice(1);

    const buttonCustomIds: string[] = [];
    for (const row of buttonRows) {
      // Each row must hold no more than 5 buttons (Discord cap).
      expect(row.components.length).toBeLessThanOrEqual(5);
      for (const comp of row.components) {
        expect(comp.type).toBe(ComponentType.Button);
        if (comp.type === ComponentType.Button && 'custom_id' in comp) {
          buttonCustomIds.push(comp.custom_id as string);
        }
      }
    }

    const expectedIds = PING_ROLES.map((r) => `${PING_BUTTON_PREFIX}${r.key}`).sort();
    expect(buttonCustomIds.sort()).toEqual(expectedIds);
    // Namespaced + stable.
    for (const id of buttonCustomIds) {
      expect(id.startsWith('selfassign:ping:')).toBe(true);
    }
  });
});

describe('ping button custom-id helpers (stable re-binding after restart, AC-08)', () => {
  it('round-trips a key through the custom id', () => {
    for (const role of PING_ROLES) {
      const id = pingButtonCustomId(role.key);
      expect(id).toBe(`selfassign:ping:${role.key}`);
      expect(parsePingButtonCustomId(id)).toBe(role.key);
    }
  });

  it('returns undefined for a non-ping custom id', () => {
    expect(parsePingButtonCustomId('selfassign:color')).toBeUndefined();
    expect(parsePingButtonCustomId('something:else')).toBeUndefined();
    expect(parsePingButtonCustomId('')).toBeUndefined();
  });
});
