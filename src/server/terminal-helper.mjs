/**
 * a set of functions for prettifying terminal output.
 * this is entirely unnecessary, but I like pretty terminal output :)
 *
 * @module server/terminal-helper
 */

/**
 * enum for color codes.
 */
export const COLORS = {
  BLACK: 0,
  RED: 1,
  GREEN: 2,
  YELLOW: 3,
  BLUE: 4,
  MAGENTA: 5,
  CYAN: 6,
  WHITE: 7,
  DEFAULT: 9,
};

/**
 * use ANSI codes to alter the color of a string for printing to the terminal.
 * for a list of codes, see https://gist.github.com/ConnerWill/d4b6c776b509add763e17f9f113fd25b
 * @param {string} s - string to apply color to
 * @param {Object} [options] - colors to apply
 * @returns {string}
 */
export function color(s, options = {}) {
  let { fg, bg, bold } = options;
  if (fg === undefined) fg = 9;
  if (bg === undefined) bg = 9;
  if (bold === undefined) bold = true;
  return `\x1b[${2 - bold};${fg + 30};${bg + 40}m${s}\x1b[0m`;
}

/**
 * hides the cursor.
 */
export function hideCursor() {
  process.stdout.write("\x1b[?25l");
}

/**
 * shows the cursor.
 */
export function showCursor() {
  process.stdout.write("\x1b[?25h");
}

/**
 * reset to the start of the line, and move up {lines} lines.
 * @param {number} lines
 */
export function moveUp(lines) {
  process.stdout.write(`\x1b[${lines}F`);
}
