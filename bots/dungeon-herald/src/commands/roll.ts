// SPDX-License-Identifier: MIT
//
// /roll handler (AC-01..AC-07). The dice string is untrusted text; `roll()` from @discord-bots/dice
// NEVER throws — malformed and over-cap input return { ok:false, error }. The handler maps that result
// to a reply and is itself defensive (never throws) so a surprise can't crash the interaction.

import { SlashCommandBuilder } from 'discord.js';
import { roll } from '@discord-bots/dice';

/** Slash-command shape: `/roll` with one required string option `dice`. */
export const rollCommand = new SlashCommandBuilder()
  .setName('roll')
  .setDescription('Roll dice using standard TTRPG notation, e.g. 2d6+3, 4d6kh3, 1d20 adv, 3d6!')
  .addStringOption((opt) =>
    opt.setName('dice').setDescription('Dice notation to roll').setRequired(true),
  );

/**
 * Narrow, testable interaction surface — NOT the full discord.js interaction, so unit tests pass a
 * tiny mock without touching the gateway.
 */
export interface RollInteraction {
  getDice(): string;
  reply(message: string, opts?: { ephemeral?: boolean }): Promise<void>;
}

/** Evaluate the dice and reply. Success → public render; failure → ephemeral error. Never throws. */
export async function handleRoll(interaction: RollInteraction): Promise<void> {
  try {
    const result = roll(interaction.getDice());
    if (result.ok) {
      await interaction.reply(result.render);
    } else {
      await interaction.reply(result.error, { ephemeral: true });
    }
  } catch {
    // The dice API is contracted never to throw; this is a defensive backstop only.
    await interaction.reply('Something went wrong evaluating that roll.', { ephemeral: true });
  }
}
