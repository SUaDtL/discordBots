// SPDX-License-Identifier: MIT
//
// buildRoleMenu (AC-03, AC-08): the self-assign UI posted in #roles. One string-select for the 7
// colors (single-select: min 0 / max 1) and toggle buttons for the 5 ping/GameNight roles, laid out
// across action rows (Discord caps buttons at 5 per row).
//
// Custom IDs are STABLE and NAMESPACED (`selfassign:color`, `selfassign:ping:<key>`) so the
// interaction handlers re-bind to a menu message that was posted before the last restart (AC-08) —
// the bot does not need to remember per-component state, only the message id.

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  type MessageActionRowComponentBuilder,
} from 'discord.js';
import { COLOR_ROLES, PING_ROLES } from './roles.js';

/** Namespace prefix shared by all of this bot's component custom IDs. */
export const CUSTOM_ID_NAMESPACE = 'selfassign';

/** Custom id of the color string-select. */
export const COLOR_SELECT_CUSTOM_ID = `${CUSTOM_ID_NAMESPACE}:color`;

/** Prefix for ping toggle buttons: full id is `selfassign:ping:<key>`. */
export const PING_BUTTON_PREFIX = `${CUSTOM_ID_NAMESPACE}:ping:`;

/** Max buttons Discord allows per action row. */
const MAX_BUTTONS_PER_ROW = 5;

/** Build the custom id for a ping role's toggle button from its stable catalog key. */
export function pingButtonCustomId(key: string): string {
  return `${PING_BUTTON_PREFIX}${key}`;
}

/** Extract the ping role key from a ping-button custom id, or undefined if it is not one. */
export function parsePingButtonCustomId(customId: string): string | undefined {
  if (!customId.startsWith(PING_BUTTON_PREFIX)) {
    return undefined;
  }
  const key = customId.slice(PING_BUTTON_PREFIX.length);
  return key.length > 0 ? key : undefined;
}

/** Build the color single-select action row (7 options, min 0 / max 1). */
function buildColorSelectRow(): ActionRowBuilder<MessageActionRowComponentBuilder> {
  const select = new StringSelectMenuBuilder()
    .setCustomId(COLOR_SELECT_CUSTOM_ID)
    .setPlaceholder('Pick a color (or clear to remove)')
    .setMinValues(0)
    .setMaxValues(1)
    .addOptions(
      COLOR_ROLES.map((role) =>
        new StringSelectMenuOptionBuilder().setLabel(role.name).setValue(role.key),
      ),
    );
  return new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(select);
}

/** Build the ping toggle buttons, chunked into action rows of at most 5 buttons each. */
function buildPingButtonRows(): ActionRowBuilder<MessageActionRowComponentBuilder>[] {
  const buttons = PING_ROLES.map((role) =>
    new ButtonBuilder()
      .setCustomId(pingButtonCustomId(role.key))
      .setLabel(role.name)
      .setStyle(ButtonStyle.Secondary),
  );

  const rows: ActionRowBuilder<MessageActionRowComponentBuilder>[] = [];
  for (let i = 0; i < buttons.length; i += MAX_BUTTONS_PER_ROW) {
    const chunk = buttons.slice(i, i + MAX_BUTTONS_PER_ROW);
    rows.push(new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(...chunk));
  }
  return rows;
}

/**
 * Build the full set of message action rows for the self-assign menu: the color select row first,
 * then the ping toggle button row(s).
 */
export function buildRoleMenu(): ActionRowBuilder<MessageActionRowComponentBuilder>[] {
  return [buildColorSelectRow(), ...buildPingButtonRows()];
}
