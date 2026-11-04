import type { DebugSnapshot } from "../../src/ui/debug";

function getSnapshot(): Cypress.Chainable<DebugSnapshot> {
  return cy
    .window()
    .should((win) => {
      const body = win.document.body.innerText.trim();
      expect(
        win.__gameDebug,
        `game debug hook (body text: ${JSON.stringify(body)})`,
      ).to.exist;
    })
    .then((win) => {
      if (!win.__gameDebug) {
        throw new Error("Game debug snapshot is unavailable.");
      }
      return win.__gameDebug.getSnapshot();
    });
}

/** The first living melee enemy, or the first enemy as a fallback. */
function meleeTarget(snapshot: DebugSnapshot) {
  return (
    snapshot.enemies.find(
      (enemy) => enemy.kind === "melee" && enemy.status === "alive",
    ) ?? snapshot.enemies[0]!
  );
}

function cameraSettled(snapshot: DebugSnapshot): boolean {
  const clamp = (value: number, min: number, max: number) =>
    Math.min(Math.max(value, min), max);
  const targetX = clamp(
    snapshot.player.x - snapshot.viewport.width / 2,
    0,
    640 - snapshot.viewport.width,
  );
  const targetY = clamp(
    snapshot.player.y - snapshot.viewport.height / 2,
    0,
    384 - snapshot.viewport.height,
  );
  return (
    Math.abs(snapshot.camera.x - targetX) < 1 &&
    Math.abs(snapshot.camera.y - targetY) < 1
  );
}

function approachEnemy(attempt = 0): void {
  getSnapshot().then((snapshot) => {
    const target = meleeTarget(snapshot);
    const dx = target.x - snapshot.player.x;
    const dy = target.y - snapshot.player.y;
    const distance = Math.hypot(dx, dy);

    if (distance < 28) {
      // The pointer is stored in screen space; let the camera stop first.
      if (cameraSettled(snapshot) || attempt >= 40) return;
      cy.wait(100);
      cy.then(() => approachEnemy(attempt + 1));
      return;
    }
    if (attempt >= 40) return;

    const keys: string[] = [];
    if (dy < -6) keys.push("w");
    else if (dy > 6) keys.push("s");
    if (dx < -6) keys.push("a");
    else if (dx > 6) keys.push("d");

    keys.forEach((key) => cy.document().trigger("keydown", { key }));
    cy.wait(120);
    keys.forEach((key) => cy.document().trigger("keyup", { key }));
    cy.then(() => approachEnemy(attempt + 1));
  });
}

function waitForDeath(attempt = 0): void {
  getSnapshot().then((snapshot) => {
    if (snapshot.status === "dead") return;
    expect(attempt).to.be.lessThan(60);
    cy.wait(500);
    cy.then(() => waitForDeath(attempt + 1));
  });
}

/** Clicks the canvas at a world position to aim and press attack once. */
function pressAt(worldX: number, worldY: number): void {
  getSnapshot().then((snapshot) => {
    const clientX = (worldX - snapshot.camera.x) * snapshot.zoom;
    const clientY = (worldY - snapshot.camera.y) * snapshot.zoom;

    cy.get("canvas#game").trigger("mousemove", {
      clientX,
      clientY,
      force: true,
    });
    cy.get("canvas#game").trigger("mousedown", {
      button: 0,
      clientX,
      clientY,
      force: true,
    });
    cy.get("canvas#game").trigger("mouseup", {
      button: 0,
      clientX,
      clientY,
      force: true,
    });
  });
}

describe("0.1.0 playable combat slice", () => {
  beforeEach(() => {
    cy.visit("/");
  });

  it("boots with a canvas, the player at full health and three enemies", () => {
    cy.get("canvas#game").should("be.visible");
    cy.get("pre.boot-error").should("not.exist");
    getSnapshot().then((snapshot) => {
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
    getSnapshot().then((before) => {
      cy.document().trigger("keydown", { key: "d" });
      cy.wait(400);
      cy.document().trigger("keyup", { key: "d" });
      getSnapshot().then((after) => {
        expect(after.player.x).to.be.greaterThan(before.player.x + 20);
      });
    });
  });

  it("damages a melee enemy with one press of the combo", () => {
    approachEnemy();
    getSnapshot().then((snapshot) => {
      const target = meleeTarget(snapshot);
      pressAt(target.x, target.y);
      cy.wait(600);

      getSnapshot().then((after) => {
        const hit = after.enemies.find((enemy) => enemy.id === target.id);
        expect(hit!.hp).to.be.lessThan(10);
      });
    });
  });

  it("dies to the enemies and restarts on R", () => {
    approachEnemy();
    waitForDeath();

    getSnapshot().then((dead) => {
      expect(dead.status).to.equal("dead");
      expect(dead.player.hp).to.equal(0);
    });

    cy.document().trigger("keydown", { key: "r" });
    cy.document().trigger("keyup", { key: "r" });

    cy.window().should((win) => {
      const restarted = win.__gameDebug?.getSnapshot();
      expect(restarted, "snapshot").to.exist;
      expect(restarted!.status).to.equal("playing");
      expect(restarted!.player.hp).to.equal(6);
      expect(restarted!.enemies).to.have.length(3);
      expect(restarted!.enemies.map((enemy) => enemy.hp)).to.deep.equal([
        10, 10, 6,
      ]);
      expect(restarted!.spirit).to.equal(0);
      expect(restarted!.floorPurified).to.equal(false);
      expect(
        restarted!.enemies.every((enemy) =>
          enemy.fragments.every((intact) => intact),
        ),
      ).to.equal(true);
      expect(restarted!.player.x).to.be.closeTo(320, 1);
      expect(restarted!.player.y).to.be.closeTo(320, 1);
    });
  });
});
