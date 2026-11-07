import type { DebugSnapshot } from "../../src/game/types";
import {
  bossTarget,
  cameraSettled,
  meleeTarget,
  movementKeys,
  type ClickWorldOptions,
  type WalkOptions,
} from "./game";

const DEFAULT_STOP = 28;
const DEFAULT_WALK_TIMEOUT = 15_000;
const DEFAULT_STATE_TIMEOUT = 10_000;
const DEFAULT_DEATH_TIMEOUT = 30_000;
const MOVE_STEP_MS = 120;

/**
 * Walks the player toward a target that may move between steps.
 *
 * The game only samples input on animation frames, so the key hold uses a
 * short real-time wait. That wait is the simulated input duration, not a
 * synchronization delay; all state checks go through `cy.gameSnapshot()`.
 */
function walkToTarget(
  getTarget: (snapshot: DebugSnapshot) => { x: number; y: number },
  options: WalkOptions,
): void {
  const stop = options.stop ?? DEFAULT_STOP;
  const timeout = options.timeout ?? DEFAULT_WALK_TIMEOUT;
  const deadline = Date.now() + timeout;

  const step = (): void => {
    cy.gameSnapshot().then((snapshot) => {
      if (snapshot.status !== "playing") {
        throw new Error(
          `walkTo stopped because the run is ${snapshot.status} at player ` +
            `(${snapshot.player.x.toFixed(1)}, ${snapshot.player.y.toFixed(1)})`,
        );
      }

      const target = getTarget(snapshot);
      const dx = target.x - snapshot.player.x;
      const dy = target.y - snapshot.player.y;

      if (Math.hypot(dx, dy) < stop) {
        // The aim pointer is stored in screen space, so let the camera stop
        // before the caller aims at a world position.
        if (cameraSettled(snapshot)) return;
        cy.waitForGame(
          cameraSettled,
          "the camera to settle",
          Math.max(1000, deadline - Date.now()),
        );
        return;
      }

      if (Date.now() >= deadline) {
        throw new Error(
          `walkTo timed out after ${timeout}ms at player ` +
            `(${snapshot.player.x.toFixed(1)}, ${snapshot.player.y.toFixed(1)}) ` +
            `targeting (${target.x}, ${target.y})`,
        );
      }

      const keys = movementKeys(dx, dy);
      if (keys.length === 0) return;

      keys.forEach((key) => cy.document().trigger("keydown", { key }));
      cy.wait(MOVE_STEP_MS).then(() => {
        keys.forEach((key) => cy.document().trigger("keyup", { key }));
        step();
      });
    });
  };

  step();
}

Cypress.Commands.add("gameSnapshot", () => {
  return cy
    .window()
    .should((win) => {
      expect(win.__gameDebug, "game debug hook").to.exist;
    })
    .then((win) => {
      if (!win.__gameDebug) {
        throw new Error("Game debug snapshot is unavailable.");
      }
      return win.__gameDebug.getSnapshot();
    });
});

Cypress.Commands.add(
  "waitForGame",
  (check, label, timeout = DEFAULT_STATE_TIMEOUT) => {
    return cy
      .window({ timeout })
      .should((win) => {
        const snapshot = win.__gameDebug?.getSnapshot();
        expect(snapshot, `game snapshot while waiting for ${label}`).to.exist;
        // The assertion message is what the timeout error shows.
        expect(check(snapshot!), `waiting for ${label}`).to.equal(true);
      })
      .then((win) => win.__gameDebug!.getSnapshot());
  },
);

Cypress.Commands.add("startGame", () => {
  cy.gameSnapshot().then((snapshot) => {
    if (snapshot.status === "playing") return;
    cy.document().trigger("keydown", { key: "Enter" });
    cy.document().trigger("keyup", { key: "Enter" });
    cy.waitForGame(
      (after) => after.status === "playing",
      "the title screen to start",
      5000,
    );
  });
});

Cypress.Commands.add("summonBoss", () => {
  cy.window().then((win) => {
    if (!win.__gameDebug) throw new Error("Game debug hook is unavailable.");
    win.__gameDebug.summonBoss();
  });
  return cy.waitForGame(
    (snapshot) => snapshot.bossAwake,
    "the Floor Warden to awaken",
    5000,
  );
});

Cypress.Commands.add("waitForDeath", (timeout = DEFAULT_DEATH_TIMEOUT) => {
  return cy.waitForGame(
    (snapshot) => snapshot.status === "dead",
    "the player to die",
    timeout,
  );
});

Cypress.Commands.add("walkTo", (worldX, worldY, options = {}) => {
  walkToTarget(() => ({ x: worldX, y: worldY }), options);
});

Cypress.Commands.add("approachMelee", (options = {}) => {
  walkToTarget((snapshot) => meleeTarget(snapshot), options);
});

Cypress.Commands.add("approachBoss", (options = {}) => {
  walkToTarget((snapshot) => bossTarget(snapshot), options);
});

Cypress.Commands.add("clickWorld", (worldX, worldY, options = {}) => {
  cy.gameSnapshot().then((snapshot) => {
    const clientX = (worldX - snapshot.camera.x) * snapshot.zoom;
    const clientY = (worldY - snapshot.camera.y) * snapshot.zoom;
    const button = options.button ?? 0;

    cy.get("canvas#game").trigger("mousemove", {
      clientX,
      clientY,
      force: true,
    });
    cy.get("canvas#game").trigger("mousedown", {
      button,
      clientX,
      clientY,
      force: true,
    });
    cy.get("canvas#game").trigger("mouseup", {
      button,
      clientX,
      clientY,
      force: true,
    });
  });
});

/**
 * Clicks a world position and retries only while no swing has been observed.
 *
 * The engine samples input before its hitstop gate, so a press that lands
 * during hitstop is consumed without starting an attack. A single click is
 * therefore not reliable. A retry is only safe while `comboStep`,
 * `comboResolved` and the enemies' health all prove that nothing resolved:
 * taking damage resets the combo, so `comboStep === 0` alone cannot
 * distinguish a dropped press from a swing that was cancelled.
 */
Cypress.Commands.add("attackWorld", (worldX, worldY, options = {}) => {
  const timeout = options.timeout ?? 5000;
  const deadline = Date.now() + timeout;
  const healthSignature = (snapshot: DebugSnapshot): string =>
    snapshot.enemies.map((enemy) => `${enemy.id}:${enemy.hp}`).join("|");

  const attempt = (): void => {
    cy.gameSnapshot().then((snapshot) => {
      if (snapshot.status !== "playing") {
        throw new Error(
          `attackWorld stopped because the run is ${snapshot.status}`,
        );
      }
      if (snapshot.player.comboStep > 0 || snapshot.player.comboResolved) {
        return;
      }
      if (Date.now() >= deadline) {
        throw new Error(
          `attackWorld timed out after ${timeout}ms without starting a swing`,
        );
      }

      const before = healthSignature(snapshot);
      cy.clickWorld(worldX, worldY);
      // Input duration: the engine samples queued input once per animation
      // frame, so give it a few frames to register the press.
      cy.wait(100).then(() => {
        cy.gameSnapshot().then((after) => {
          if (
            after.player.comboStep > 0 ||
            after.player.comboResolved ||
            healthSignature(after) !== before
          ) {
            return;
          }
          attempt();
        });
      });
    });
  };

  attempt();
});

// Keep the option types referenced so the declaration file stays in sync.
export type { ClickWorldOptions, WalkOptions };
