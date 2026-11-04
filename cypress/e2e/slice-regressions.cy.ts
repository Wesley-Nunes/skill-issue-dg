import type { DebugSnapshot } from "../../src/ui/debug";

function snap(): Cypress.Chainable<DebugSnapshot> {
  return cy
    .window()
    .should((win) => {
      expect(win.__gameDebug, "game debug hook").to.exist;
    })
    .then((win) => win.__gameDebug!.getSnapshot());
}

/** The first living melee enemy, or the first enemy as a fallback. */
function meleeTarget(snapshot: DebugSnapshot) {
  return (
    snapshot.enemies.find(
      (enemy) => enemy.kind === "melee" && enemy.status === "alive",
    ) ?? snapshot.enemies[0]!
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** True once the smoothed camera has caught up with its clamped target. */
function cameraSettled(s: DebugSnapshot): boolean {
  const targetX = clamp(s.player.x - s.viewport.width / 2, 0, 640 - s.viewport.width);
  const targetY = clamp(
    s.player.y - s.viewport.height / 2,
    0,
    384 - s.viewport.height,
  );
  return Math.abs(s.camera.x - targetX) < 1 && Math.abs(s.camera.y - targetY) < 1;
}

function walkToward(
  worldX: number,
  worldY: number,
  stop: number,
  attempt = 0,
): void {
  snap().then((s) => {
    const dx = worldX - s.player.x;
    const dy = worldY - s.player.y;
    if (Math.hypot(dx, dy) < stop) {
      // The pointer is stored in screen space, so wait for the camera to stop
      // moving before the caller aims at a world position.
      if (cameraSettled(s) || attempt >= 40) return;
      cy.wait(100);
      cy.then(() => walkToward(worldX, worldY, stop, attempt + 1));
      return;
    }
    if (attempt >= 60) return;

    const keys: string[] = [];
    if (dy < -6) keys.push("w");
    else if (dy > 6) keys.push("s");
    if (dx < -6) keys.push("a");
    else if (dx > 6) keys.push("d");
    if (keys.length === 0) return;

    keys.forEach((key) => cy.document().trigger("keydown", { key }));
    cy.wait(120);
    keys.forEach((key) => cy.document().trigger("keyup", { key }));
    cy.then(() => walkToward(worldX, worldY, stop, attempt + 1));
  });
}

function approachMelee(): void {
  snap().then((s) => {
    const target = meleeTarget(s);
    walkToward(target.x, target.y, 28);
  });
}

function clickWorld(worldX: number, worldY: number): void {
  snap().then((s) => {
    const clientX = (worldX - s.camera.x) * s.zoom;
    const clientY = (worldY - s.camera.y) * s.zoom;
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

function waitForDeath(attempt = 0): void {
  snap().then((s) => {
    if (s.status === "dead") return;
    expect(attempt, "death attempts").to.be.lessThan(60);
    cy.wait(400);
    cy.then(() => waitForDeath(attempt + 1));
  });
}

/** Polls the snapshot because headless Cypress throttles animation frames. */
function pollUntil(
  check: (s: DebugSnapshot) => boolean,
  label: string,
  attempts = 40,
): void {
  snap().then((s) => {
    if (check(s)) return;
    if (attempts <= 0) {
      throw new Error(
        `timed out waiting for ${label}; last snapshot ${JSON.stringify(s.player)} time=${s.time}`,
      );
    }
    cy.wait(150);
    cy.then(() => pollUntil(check, label, attempts - 1));
  });
}

/**
 * Starts the chain, then presses only while the input window is open. Polls
 * are short because the window lasts 0.10 s.
 */
function playComboStep(attempts = 120): void {
  snap().then((s) => {
    if (s.skillPoints > 0) return;
    expect(attempts, "combo attempts").to.be.greaterThan(0);

    const target = meleeTarget(s);
    if (s.player.comboStep === 0 || s.player.comboWindowOpen) {
      clickWorld(target.x, target.y);
    }

    if (s.player.comboStep === 3) {
      // The finisher lands on its own and the award follows the connecting hit.
      pollUntil((after) => after.skillPoints > 0, "the combo skill point", 20);
      return;
    }

    cy.wait(25);
    cy.then(() => playComboStep(attempts - 1));
  });
}

const exceptions: string[] = [];

describe("0.2.0 QA verification", () => {
  beforeEach(() => {
    exceptions.length = 0;
    cy.on("uncaught:exception", (error) => {
      exceptions.push(String(error.message));
      return false;
    });
    cy.visit("/");
  });

  it("plays without uncaught exceptions or console errors", () => {
    snap().then(() => {
      cy.window().then((win) => {
        cy.spy(win.console, "error").as("consoleError");
      });

      cy.viewport(1440, 810);
      cy.get("canvas#game").trigger("mousemove", {
        clientX: 900,
        clientY: 300,
        force: true,
      });
      cy.get("canvas#game").trigger("mousedown", { button: 0, force: true });
      cy.wait(200);
      cy.get("canvas#game").trigger("mouseup", { button: 0, force: true });
      cy.document().trigger("keydown", { key: "d" });
      cy.wait(150);
      cy.document().trigger("keyup", { key: "d" });
      cy.document().trigger("keydown", { key: " " });
      cy.document().trigger("keyup", { key: " " });
      cy.wait(300);

      cy.get("@consoleError").should("not.have.been.called");
      cy.then(() => expect(exceptions, "uncaught exceptions").to.deep.equal([]));
    });
  });

  it("keeps the canvas, viewport and camera correct across resizes", () => {
    cy.viewport(1024, 640);
    cy.wait(300);

    snap().then((s) => {
      expect(s.viewport.width).to.be.closeTo(1024 / 3, 0.1);
      expect(s.viewport.height).to.be.closeTo(640 / 3, 0.1);
      expect(s.camera.x).to.be.at.least(0);
      expect(s.camera.y).to.be.at.most(384 - 640 / 3 + 0.01);
    });

    cy.get("canvas#game").then(($canvas) => {
      const canvas = $canvas[0] as HTMLCanvasElement;
      expect(canvas.clientWidth).to.equal(1024);
      expect(canvas.clientHeight).to.equal(640);
    });

    cy.get("canvas#game").trigger("mousemove", {
      clientX: 300,
      clientY: 210,
      force: true,
    });
    cy.wait(200);
    snap().then((s) => {
      expect(s.pointer.x).to.be.closeTo(s.camera.x + 100, 0.5);
      expect(s.pointer.y).to.be.closeTo(s.camera.y + 70, 0.5);
      expect(s.zoom).to.equal(3);
    });

    cy.viewport(1440, 810);
    pollUntil(
      (s) => Math.abs(s.camera.x - 80) < 1 && Math.abs(s.camera.y - 114) < 1,
      "camera to settle at the spawn framing",
    );
    snap().then((s) => {
      expect(s.viewport.width).to.be.closeTo(480, 0.1);
      expect(s.viewport.height).to.be.closeTo(270, 0.1);
      expect(s.camera.x).to.be.closeTo(80, 1);
      expect(s.camera.y).to.be.closeTo(114, 1);
    });
  });

  it("dodges the configured distance", () => {
    snap().then(() => {
      cy.document().trigger("keydown", { key: " " });
      cy.document().trigger("keyup", { key: " " });
    });
    pollUntil(
      (s) => Math.hypot(s.player.x - 320, s.player.y - 320) > 40,
      "the dodge to move the player",
      40,
    );
    pollUntil((s) => !s.player.dodging, "the dodge to finish", 40);
    snap().then((s) => {
      const distance = Math.hypot(s.player.x - 320, s.player.y - 320);
      expect(distance, "dodge distance").to.be.greaterThan(40);
      expect(distance).to.be.at.most(65);
    });
  });

  it("damages a melee enemy exactly once per press", () => {
    approachMelee();
    snap().then((s) => {
      const target = meleeTarget(s);
      clickWorld(target.x, target.y);

      pollUntil(
        (after) =>
          (after.enemies.find((enemy) => enemy.id === target.id)?.hp ?? 10) <
          10,
        "the first combo hit",
      );
      snap().then((after) => {
        const hp = after.enemies.find((enemy) => enemy.id === target.id)!.hp;
        expect(hp, "hp after one press").to.equal(8);
      });
    });
  });

  it("does not damage a melee enemy when the swing aims away", () => {
    approachMelee();
    snap().then((s) => {
      const target = meleeTarget(s);
      const length =
        Math.hypot(s.player.x - target.x, s.player.y - target.y) || 1;
      const awayX = s.player.x + ((s.player.x - target.x) / length) * 40;
      const awayY = s.player.y + ((s.player.y - target.y) / length) * 40;
      clickWorld(awayX, awayY);
      cy.wait(900);

      snap().then((after) => {
        const hp = after.enemies.find((enemy) => enemy.id === target.id)!.hp;
        expect(hp, "hp after aiming away").to.equal(10);
      });
    });
  });

  it("chains three connected hits and awards one skill point", () => {
    approachMelee();
    playComboStep();

    pollUntil(
      (s) => s.skillPoints === 1 && s.challengeEarned,
      "the combo challenge award",
      40,
    );
    snap().then((s) => {
      expect(s.skillPoints).to.equal(1);
      expect(s.challengeEarned).to.equal(true);
      const melee = s.enemies.find((enemy) => enemy.kind === "melee");
      expect(melee!.hp).to.be.lessThan(10);
    });
  });

  it("does not chain the combo while the attack is mashed", () => {
    approachMelee();
    for (let click = 0; click < 30; click += 1) {
      snap().then((s) => {
        const target = meleeTarget(s);
        clickWorld(target.x, target.y);
      });
      cy.wait(40);
    }

    snap().then((s) => {
      expect(s.skillPoints).to.equal(0);
      expect(s.challengeEarned).to.equal(false);
      expect(s.player.comboStep, "mashing never reaches the finisher").to.be.lessThan(
        3,
      );
    });
  });

  it("keeps the earned skill point until restart", () => {
    approachMelee();
    playComboStep();
    pollUntil((s) => s.skillPoints === 1, "the combo skill point", 60);

    // The once-per-run gate itself is covered by the engine unit test
    // (a second fully connected chain awards nothing).
    cy.wait(500);
    snap().then((s) => {
      expect(s.skillPoints).to.equal(1);
      expect(s.challengeEarned).to.equal(true);
    });

    // Restarting is only offered after death, so fall in combat first.
    waitForDeath();
    cy.document().trigger("keydown", { key: "r" });
    cy.document().trigger("keyup", { key: "r" });
    cy.wait(150);
    snap().then((s) => {
      expect(s.status).to.equal("playing");
      expect(s.skillPoints).to.equal(0);
      expect(s.challengeEarned).to.equal(false);
      expect(s.enemies).to.have.length(3);
    });
  });

  it("fires projectiles that can hit the player", () => {
    // Walk into the ranged enemy's aggro band without entering its retreat ring.
    walkToward(560, 96, 200);

    pollUntil(
      (s) => s.projectiles.length > 0,
      "a ranged projectile",
      60,
    );
    pollUntil(
      (s) => s.player.hp < 6,
      "projectile damage",
      80,
    );
    snap().then((s) => {
      expect(s.player.hp).to.be.lessThan(6);
    });
  });

  it("freezes after death and restores the initial state on repeated restarts", () => {
    approachMelee();
    waitForDeath();

    snap().then((dead) => {
      expect(dead.status).to.equal("dead");
      expect(dead.player.hp).to.equal(0);

      cy.document().trigger("keydown", { key: "d" });
      cy.get("canvas#game").trigger("mousedown", {
        button: 0,
        clientX: 700,
        clientY: 400,
        force: true,
      });
      cy.wait(300);
      cy.document().trigger("keyup", { key: "d" });
      cy.get("canvas#game").trigger("mouseup", { button: 0, force: true });

      snap().then((frozen) => {
        expect(frozen.player.x).to.equal(dead.player.x);
        expect(frozen.player.y).to.equal(dead.player.y);
        expect(frozen.enemies).to.deep.equal(dead.enemies);
        expect(frozen.status).to.equal("dead");
      });
    });

    for (let restart = 0; restart < 3; restart += 1) {
      cy.document().trigger("keydown", { key: "r" });
      cy.document().trigger("keyup", { key: "r" });
      cy.wait(150);
      cy.then(() => {
        snap().then((s) => {
          expect(s.status).to.equal("playing");
          expect(s.player.hp).to.equal(6);
          expect(s.player.x).to.be.closeTo(320, 1);
          expect(s.player.y).to.be.closeTo(320, 1);
          expect(s.enemies.map((enemy) => enemy.hp)).to.deep.equal([
            10, 10, 6,
          ]);
          expect(s.enemies.map((enemy) => enemy.status)).to.deep.equal([
            "alive",
            "alive",
            "alive",
          ]);
          expect(s.skillPoints).to.equal(0);
          expect(s.projectiles).to.have.length(0);
        });
      });
    }
  });
});
