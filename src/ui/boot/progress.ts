/**
 * Tracks settled boot units without ever reporting backwards progress.
 * A unit settles when it has loaded, failed, or been skipped; the caller
 * decides whether a failure should abort boot.
 */
export class BootProgress {
  private settledCount = 0;

  constructor(readonly total: number) {}

  get settled(): number {
    return this.settledCount;
  }

  get remaining(): number {
    return Math.max(0, this.total - this.settledCount);
  }

  get done(): boolean {
    return this.total <= 0 || this.settledCount >= this.total;
  }

  get percent(): number {
    if (this.total <= 0 || this.settledCount >= this.total) return 100;
    return Math.min(
      99,
      Math.floor((this.settledCount / this.total) * 100),
    );
  }

  complete(count = 1): void {
    this.settledCount = Math.min(
      this.total,
      this.settledCount + Math.max(0, count),
    );
  }
}
