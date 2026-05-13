type SingleChar = string

// The Nature of Code
// Daniel Shiffman
// http://natureofcode.com

// An LSystem has a starting sentence
// An a ruleset
// Each generation recursively replaces characters in the sentence
// Based on the ruleset

// Construct an LSystem with a starting sentence and a ruleset
export class LSystem {
  sentence: string = ''

  constructor(
    public axiom: string,
    public ruleset: Record<SingleChar, string>,
  ) {
    this.reset()

    Object.keys(this.ruleset).forEach(key => {
      this.ruleset[key] = this.ruleset[key].replace(/\s/g, '')
    })
  }

  reset() {
    this.sentence = this.axiom
  }

  // Generate the next generation
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
