/**
 * A single character of the L-system's alphabet.
 */
type SingleChar = string

// The Nature of Code
// Daniel Shiffman
// http://natureofcode.com

// An LSystem has a starting sentence
// An a ruleset
// Each generation recursively replaces characters in the sentence
// Based on the ruleset

// Construct an LSystem with a starting sentence and a ruleset
/**
 * A Lindenmayer system, which rewrites a sentence by applying a set of
 * replacement rules, one generation at a time.
 *
 * Each generation replaces every character of the current sentence by the
 * text associated with it in the ruleset. Characters without a rule are kept
 * as they are.
 */
export class LSystem {
  /** The current sentence, i.e. the result of the last generated generation. */
  sentence: string = ''

  /**
   * Creates an L-system from a starting sentence and a set of replacement
   * rules.
   *
   * The rules are normalized by removing every whitespace character from
   * them, so that rules can be written across multiple lines.
   *
   * @param axiom - The starting sentence of the system.
   * @param ruleset - The replacement rules, indexed by the character they
   *   replace.
   */
  constructor(
    public axiom: string,
    public ruleset: Record<SingleChar, string>,
  ) {
    this.reset()

    Object.keys(this.ruleset).forEach(key => {
      this.ruleset[key] = this.ruleset[key].replace(/\s/g, '')
    })
  }

  /**
   * Rewinds the system back to its starting sentence.
   *
   * @returns Nothing; the function resets the current sentence in place.
   */
  reset() {
    this.sentence = this.axiom
  }

  // Generate the next generation
  /**
   * Generates the next generation of the sentence.
   *
   * Every character of the current sentence is replaced by the text
   * associated with it in the ruleset, or kept unchanged when no rule
   * applies. The new sentence becomes the current one.
   *
   * @returns The newly generated sentence.
   */
  generate() {
    // An empty string that we will fill
    let nextgen = ''

    // For every character in the sentence
    for (const character of this.sentence) {
      // Replace it with itself unless it matches one of our rules
      nextgen += this.ruleset[character] ?? character
    }

    // Replace sentence
    return (this.sentence = nextgen)
  }
}
