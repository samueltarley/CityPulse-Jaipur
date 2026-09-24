/**
 * Seeded Random Generator using Mulberry32 PRNG.
 * Ensures repeatable, deterministic simulated feeds and Poisson bursts.
 */

export class SeededRandom {
  private state: number;

  constructor(seed: number = 20260924) {
    this.state = seed;
  }

  /**
   * Generates a pseudorandom number between 0 (inclusive) and 1 (exclusive).
   */
  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Generates a random integer between min and max (inclusive).
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Generates a random float between min and max.
   */
  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  /**
   * Selects a random element from an array.
   */
  choice<T>(array: readonly T[] | T[]): T {
    const idx = Math.floor(this.next() * array.length);
    return array[idx];
  }

  /**
   * Generates a random sample from a Poisson distribution with parameter lambda.
   * Knuth's algorithm.
   */
  poisson(lambda: number): number {
    const L = Math.exp(-lambda);
    let k = 0;
    let p = 1.0;
    do {
      k++;
      p *= this.next();
    } while (p > L);
    return k - 1;
  }

  /**
   * Returns true with probability p (0 <= p <= 1).
   */
  chance(p: number): boolean {
    return this.next() < p;
  }
}

export const defaultPRNG = new SeededRandom(20260924);
