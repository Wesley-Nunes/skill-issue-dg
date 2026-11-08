import { describe, expect, it } from "vitest";
import { BootProgress } from "./progress";

describe("BootProgress", () => {
  it("never reports 100 before every unit settles", () => {
    const progress = new BootProgress(4);

    expect(progress.percent).to.equal(0);
    progress.complete();
    expect(progress.percent).to.equal(25);
    progress.complete();
    progress.complete();
    expect(progress.percent).to.equal(75);
    progress.complete();
    expect(progress.percent).to.equal(100);
    expect(progress.done).to.equal(true);
  });

  it("never decreases and clamps after completion", () => {
    const progress = new BootProgress(2);

    progress.complete();
    const settled = progress.percent;
    progress.complete();
    progress.complete(10);

    expect(progress.percent).to.equal(100);
    expect(progress.settled).to.equal(2);
    expect(progress.percent).to.be.greaterThanOrEqual(settled);
  });

  it("treats an empty boot as complete", () => {
    const progress = new BootProgress(0);

    expect(progress.done).to.equal(true);
    expect(progress.percent).to.equal(100);
  });
});
