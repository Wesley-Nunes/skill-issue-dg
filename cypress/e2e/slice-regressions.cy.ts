import type { DebugSnapshot } from "../../src/ui/debug";

function snap(): Cypress.Chainable<DebugSnapshot> {
  return cy
    .window()
    .should((win) => {
      expect(win.__gameDebug, "game debug hook").to.exist;
    })
    .then((win) => win.__gameDebug!.getSnapshot());
}

function approach(attempt = 0): void {
  snap().then((s) => {
    const dx = s.enemy.x - s.player.x;
    const dy = s.enemy.y - s.player.y;
    if (Math.hypot(dx, dy) < 30 || attempt >= 60) return;
    const keys: string[] = [];
    if (dy < -6) keys.push("w");
    else if (dy > 6) keys.push("s");
    if (dx < -6) keys.push("a");
    else if (dx > 6) keys.push("d");
    keys.forEach((key) => cy.document().trigger("keydown", { key }));
    cy.wait(120);
    keys.forEach((key) => cy.document().trigger("keyup", { key }));
    cy.then(() => approach(attempt + 1));
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

const exceptions: string[] = [];

describe("0.1.0 QA verification", () => {
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

  it("damages the enemy exactly once per swing", () => {
    approach();
    snap().then((s) => {
      const x = (s.enemy.x - s.camera.x) * s.zoom;
      const y = (s.enemy.y - s.camera.y) * s.zoom;
      cy.get("canvas#game").trigger("mousemove", {
        clientX: x,
        clientY: y,
        force: true,
      });
      cy.get("canvas#game").trigger("mousedown", {
        button: 0,
        clientX: x,
        clientY: y,
        force: true,
      });
      cy.wait(100);
      cy.get("canvas#game").trigger("mouseup", { button: 0, force: true });
      cy.wait(900);

      snap().then((after) => {
        expect(after.enemy.hp, "hp after one swing").to.equal(4);
      });
    });
  });

  it("does not damage the enemy when the swing aims away", () => {
    approach();
    snap().then((s) => {
      const length = Math.hypot(s.player.x - s.enemy.x, s.player.y - s.enemy.y) || 1;
      const awayX = s.player.x + ((s.player.x - s.enemy.x) / length) * 40;
      const awayY = s.player.y + ((s.player.y - s.enemy.y) / length) * 40;
      const clientX = Math.min(
        Math.max((awayX - s.camera.x) * s.zoom, 1),
        1438,
      );
      const clientY = Math.min(
        Math.max((awayY - s.camera.y) * s.zoom, 1),
        808,
      );

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
      cy.wait(100);
      cy.get("canvas#game").trigger("mouseup", { button: 0, force: true });
      cy.wait(900);

      snap().then((after) => {
        expect(after.enemy.hp, "hp after aiming away").to.equal(6);
      });
    });
  });

  it("freezes after death and restores the initial state on repeated restarts", () => {
    approach();
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
        expect(frozen.enemy.hp).to.equal(dead.enemy.hp);
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
          expect(s.enemy.hp).to.equal(6);
          expect(s.enemy.status).to.equal("alive");
          expect(s.enemy.x).to.be.closeTo(448, 1);
          expect(s.enemy.y).to.be.closeTo(128, 1);
        });
      });
    }
  });
});
