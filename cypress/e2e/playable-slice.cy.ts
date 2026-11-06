import { meleeTarget } from "../support/game";

describe("0.1.0 playable combat slice", () => {
  beforeEach(() => {
    cy.visit("/");
    // The debug hook is exposed after assets load and the input listeners are
    // attached, so this also prevents interacting with a half-booted game.
    cy.gameSnapshot();
  });

  it("boots with a canvas, the player at full health and three enemies", () => {
    cy.get("canvas#game").should("be.visible");
    cy.get("pre.boot-error").should("not.exist");
    cy.gameSnapshot().then((snapshot) => {
      expect(snapshot.status).to.equal("playing");
      expect(snapshot.viewport.width).to.be.greaterThan(0);
      expect(snapshot.viewport.height).to.be.greaterThan(0);
      expect(snapshot.player.hp).to.equal(6);
      expect(snapshot.enemies.map((enemy) => enemy.kind)).to.deep.equal([
        "melee",
        "melee",
        "ranged",
      ]);
      expect(snapshot.enemies.map((enemy) => enemy.hp)).to.deep.equal([
        10, 10, 6,
      ]);
      expect(
        snapshot.enemies.every((enemy) => enemy.status === "alive"),
      ).to.equal(true);
      expect(
        snapshot.enemies.every((enemy) =>
          enemy.fragments.every((intact) => intact),
        ),
      ).to.equal(true);
      expect(snapshot.spirit).to.equal(0);
      expect(snapshot.floorPurified).to.equal(false);
    });
  });

  it("paints the room and the heart HUD on the canvas", () => {
    cy.get("canvas#game").should(($canvas) => {
      const canvas = $canvas[0] as HTMLCanvasElement;
      const context = canvas.getContext("2d");
      expect(context, "2d context").to.not.be.null;
      const scale = canvas.width / canvas.clientWidth;

      // The room floor must cover the area around the player, not the void fill.
      const floor = context!.getImageData(
        Math.round(canvas.width / 2 + 200),
        Math.round(canvas.height / 2 + 100),
        40,
        40,
      ).data;
      let lit = 0;
      for (let index = 0; index < floor.length; index += 4) {
        if (floor[index + 3] > 0 && floor[index] > 40) lit += 1;
      }
      expect(lit, "lit floor pixels").to.be.greaterThan(400);

      // Three full hearts sit at the 24px HUD inset.
      const hearts = context!.getImageData(
        Math.round(24 * scale),
        Math.round(24 * scale),
        Math.round(39 * scale),
        Math.round(36 * scale),
      ).data;
      let bright = 0;
      for (let index = 0; index < hearts.length; index += 4) {
        if (hearts[index] > 150 && hearts[index + 3] > 200) bright += 1;
      }
      expect(bright, "heart pixels").to.be.greaterThan(50);
    });
  });

  it("moves the player with WASD", () => {
    cy.gameSnapshot().then((before) => {
      cy.document().trigger("keydown", { key: "d" });
      cy.waitForGame(
        (after) => after.player.x > before.player.x + 20,
        "the player to move right",
        5000,
      ).then((after) => {
        cy.document().trigger("keyup", { key: "d" });
        expect(after.player.x).to.be.greaterThan(before.player.x + 20);
      });
    });
  });

  it("damages a melee enemy with one press of the combo", () => {
    cy.approachMelee();
    cy.gameSnapshot().then((snapshot) => {
      const target = meleeTarget(snapshot);
      cy.attackWorld(target.x, target.y);
      cy.waitForGame(
        (after) =>
          (after.enemies.find((enemy) => enemy.id === target.id)?.hp ?? 10) <
          10,
        "the combo hit to land",
      ).then((after) => {
        const hit = after.enemies.find((enemy) => enemy.id === target.id);
        expect(hit!.hp).to.be.lessThan(10);
      });
    });
  });

  it("dies to the enemies and restarts on R", () => {
    cy.approachMelee();
    cy.waitForDeath();

    cy.gameSnapshot().then((dead) => {
      expect(dead.status).to.equal("dead");
      expect(dead.player.hp).to.equal(0);
    });

    cy.document().trigger("keydown", { key: "r" });
    cy.document().trigger("keyup", { key: "r" });

    cy.waitForGame(
      (snapshot) => snapshot.status === "playing",
      "the run to restart",
      5000,
    ).then((restarted) => {
      expect(restarted.status).to.equal("playing");
      expect(restarted.player.hp).to.equal(6);
      expect(restarted.enemies).to.have.length(3);
      expect(restarted.enemies.map((enemy) => enemy.hp)).to.deep.equal([
        10, 10, 6,
      ]);
      expect(restarted.spirit).to.equal(0);
      expect(restarted.floorPurified).to.equal(false);
      expect(
        restarted.enemies.every((enemy) =>
          enemy.fragments.every((intact) => intact),
        ),
      ).to.equal(true);
      expect(restarted.player.x).to.be.closeTo(320, 1);
      expect(restarted.player.y).to.be.closeTo(320, 1);
    });
  });
});
