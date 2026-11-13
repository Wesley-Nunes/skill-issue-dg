import type { DebugSnapshot } from "../../src/game/types";

function isInsideSafeZone(snapshot: DebugSnapshot): boolean {
  const safe = snapshot.floor.shop.safe;
  const player = snapshot.player;
  return (
    player.x >= safe.x &&
    player.x <= safe.x + safe.width &&
    player.y >= safe.y &&
    player.y <= safe.y + safe.height
  );
}

/** Holds a movement key long enough for the player to cross the threshold. */
function holdKey(key: string, milliseconds: number): void {
  cy.document().trigger("keydown", { key });
  cy.wait(milliseconds);
  cy.document().trigger("keyup", { key });
}

describe("0.9.0 safe-room ward", () => {
  beforeEach(() => {
    cy.visitGame();
    cy.startGame();
  });

  it("refuses a hunted entry and reopens when the hunt ends", () => {
    // Start within the second melee mob's aggro radius, let it close in, then
    // run west toward the ward while it follows. This is a real pursuit at the
    // threshold, not a synthetic flag left far from the door.
    cy.gameSnapshot().then((snapshot) => {
      const mob = snapshot.enemies.find(
        (enemy) => enemy.id === "melee-2" && enemy.status === "alive",
      );
      expect(mob, "the second melee mob").to.exist;
      cy.teleport(mob!.x - 120, mob!.y);
    });

    cy.waitForGame((snapshot) => snapshot.inCombat, "the mob to hunt");
    // Let the mob close the gap before the player runs for the ward.
    cy.wait(1200);

    // Walking at the ward while hunted must not cross into the safe zone.
    holdKey("a", 1500);

    cy.gameSnapshot().then((snapshot) => {
      expect(snapshot.inCombat).to.equal(true);
      expect(isInsideSafeZone(snapshot)).to.equal(false);
      expect(snapshot.player.x).to.be.at.least(
        snapshot.floor.shop.safe.x + snapshot.floor.shop.safe.width,
      );
    });

    // A dodge aimed at the threshold cannot slip through the sealed ward.
    cy.document().trigger("keydown", { key: "a" });
    cy.pressKey(" ");
    cy.wait(500);
    cy.document().trigger("keyup", { key: "a" });
    cy.gameSnapshot().then((snapshot) => {
      expect(isInsideSafeZone(snapshot)).to.equal(false);
    });

    // Ending the hunt reopens the ward without a reset or a timer.
    cy.restMobs();
    cy.waitForGame((snapshot) => !snapshot.inCombat, "the ward to reopen");

    holdKey("a", 1200);
    cy.gameSnapshot().then((snapshot) => {
      expect(snapshot.inCombat).to.equal(false);
      expect(isInsideSafeZone(snapshot)).to.equal(true);
    });
  });
});
