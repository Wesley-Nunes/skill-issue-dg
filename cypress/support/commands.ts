import type { DebugSnapshot } from "../../src/game/types";
import {
  bossTarget,
  cameraSettled,
  meleeTarget,
  movementKeys,
  planRoute,
  type ClickWorldOptions,
  type WalkOptions,
} from "./game";

const DEFAULT_STOP = 28;
const DEFAULT_WALK_TIMEOUT = 15_000;
const DEFAULT_STATE_TIMEOUT = 10_000;
const DEFAULT_BOOT_TIMEOUT = 30_000;
const DEFAULT_DEATH_TIMEOUT = 30_000;
const MOVE_STEP_MS = 120;

/**
 * Walks the player toward a target that may move between steps.
 *
 * The game only samples input on animation frames, so a one-shot key tap can
 * fall between frames when Cypress commands are slow. The tracked keys stay
 * held across polls and are only released when the direction changes, so the
 * player keeps moving while the next snapshot is fetched. All state checks go
 * through `cy.gameSnapshot()`.
 */
function walkToTarget(
  getTarget: (snapshot: DebugSnapshot) => { x: number; y: number },
  options: WalkOptions,
): void {
  const stop = options.stop ?? DEFAULT_STOP;
  const timeout = options.timeout ?? DEFAULT_WALK_TIMEOUT;
  const deadline = Date.now() + timeout;
  let held: string[] = [];
  let startDepth: number | null = null;

  const release = (): void => {
    held.forEach((key) => cy.document().trigger("keyup", { key }));
    held = [];
  };

  const step = (): void => {
    cy.gameSnapshot().then((snapshot) => {
      if (snapshot.status !== "playing") {
        release();
        throw new Error(
          `walkTo stopped because the run is ${snapshot.status} at player ` +
            `(${snapshot.player.x.toFixed(1)}, ${snapshot.player.y.toFixed(1)})`,
        );
      }

      // A walk belongs to one floor. Reaching the stairs mid-walk must not
      // make the player chase the old target on the next floor.
      if (startDepth === null) startDepth = snapshot.depth;
      else if (snapshot.depth !== startDepth) {
        release();
        return;
      }

      const target = getTarget(snapshot);
      const dx = target.x - snapshot.player.x;
      const dy = target.y - snapshot.player.y;

      if (Math.hypot(dx, dy) < stop) {
        // The aim pointer is stored in screen space, so let the camera stop
        // before the caller aims at a world position.
        release();
        if (cameraSettled(snapshot)) return;
        cy.waitForGame(
          cameraSettled,
          "the camera to settle",
          Math.max(1000, deadline - Date.now()),
        );
        return;
      }

      if (Date.now() >= deadline) {
        release();
        throw new Error(
          `walkTo timed out after ${timeout}ms at player ` +
            `(${snapshot.player.x.toFixed(1)}, ${snapshot.player.y.toFixed(1)}) ` +
            `targeting (${target.x}, ${target.y})`,
        );
      }

      const keys = movementKeys(dx, dy);
      if (keys.length === 0) {
        release();
        return;
      }

      held
        .filter((key) => !keys.includes(key))
        .forEach((key) => cy.document().trigger("keyup", { key }));
      keys
        .filter((key) => !held.includes(key))
        .forEach((key) => cy.document().trigger("keydown", { key }));
      held = keys;

      cy.wait(MOVE_STEP_MS).then(step);
    });
  };

  step();
}

/** Routes around the branch walls, then hands the final approach to walkToTarget. */
function walkRouteToTarget(
  getTarget: (snapshot: DebugSnapshot) => { x: number; y: number },
  options: WalkOptions,
): void {
  const stop = options.stop ?? DEFAULT_STOP;
  const timeout = options.timeout ?? DEFAULT_WALK_TIMEOUT;

  cy.gameSnapshot().then((snapshot) => {
    if (snapshot.status !== "playing") {
      walkToTarget(getTarget, options);
      return;
    }

    const startDepth = snapshot.depth;
    const route = planRoute(snapshot, getTarget(snapshot), stop);
    const step = (index: number): void => {
      cy.gameSnapshot().then((current) => {
        // Descending ends the walk; the route belongs to the old floor.
        if (current.depth !== startDepth) return;
        if (index >= route.length) {
          walkToTarget(getTarget, options);
          return;
        }
        const point = route[index]!;
        walkToTarget(() => point, { stop: 8, timeout });
        cy.then(() => step(index + 1));
      });
    };
    step(0);
  });
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
  "waitForBoot",
  (check, label, timeout = DEFAULT_BOOT_TIMEOUT) => {
    return cy
      .window({ timeout })
      .should((win) => {
        const snapshot = win.__bootDebug?.getState();
        expect(snapshot, `boot snapshot while waiting for ${label}`).to.exist;
        expect(check(snapshot!), `waiting for ${label}`).to.equal(true);
      })
      .then((win) => win.__bootDebug!.getState());
  },
);

Cypress.Commands.add("visitGame", () => {
  cy.visit("/");
  cy.window().should((win) => {
    expect(win.__bootDebug, "boot debug hook").to.exist;
  });
  cy.waitForBoot(
    (snapshot) => snapshot.phase === "done",
    "boot to finish",
    DEFAULT_BOOT_TIMEOUT,
  );
  cy.gameSnapshot();
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

Cypress.Commands.add("pressKey", (key: string) => {
  cy.document().trigger("keydown", { key });
  cy.document().trigger("keyup", { key });
});

Cypress.Commands.add("prepareRest", (id: string) => {
  cy.window().then((win) => {
    if (!win.__gameDebug) throw new Error("Game debug hook is unavailable.");
    win.__gameDebug.prepareRest(id);
  });
});

Cypress.Commands.add("restMobs", () => {
  cy.window().then((win) => {
    if (!win.__gameDebug) throw new Error("Game debug hook is unavailable.");
    win.__gameDebug.restMobs();
  });
});

Cypress.Commands.add("giveSkillPoints", (amount: number) => {
  cy.window().then((win) => {
    if (!win.__gameDebug) throw new Error("Game debug hook is unavailable.");
    win.__gameDebug.giveSkillPoints(amount);
  });
});

Cypress.Commands.add("teleport", (x: number, y: number) => {
  cy.window().then((win) => {
    if (!win.__gameDebug) throw new Error("Game debug hook is unavailable.");
    win.__gameDebug.teleport(x, y);
  });
});

Cypress.Commands.add(
  "setEnemyAggro",
  (id: string, aggro = true) => {
    cy.window().then((win) => {
      if (!win.__gameDebug) throw new Error("Game debug hook is unavailable.");
      win.__gameDebug.setEnemyAggro(id, aggro);
    });
  },
);

Cypress.Commands.add("prepareRite", () => {
  cy.window().then((win) => {
    if (!win.__gameDebug) throw new Error("Game debug hook is unavailable.");
    win.__gameDebug.prepareRite();
  });
});

Cypress.Commands.add("weakenBoss", (hp = 1) => {
  cy.window().then((win) => {
    if (!win.__gameDebug) throw new Error("Game debug hook is unavailable.");
    win.__gameDebug.weakenBoss(hp);
  });
});

Cypress.Commands.add("setPlayerHp", (hp: number) => {
  cy.window().then((win) => {
    if (!win.__gameDebug) throw new Error("Game debug hook is unavailable.");
    win.__gameDebug.setPlayerHp(hp);
  });
});

Cypress.Commands.add("killPlayer", () => {
  cy.window().then((win) => {
    if (!win.__gameDebug) throw new Error("Game debug hook is unavailable.");
    win.__gameDebug.killPlayer();
  });
});

Cypress.Commands.add("descend", () => {
  cy.window().then((win) => {
    if (!win.__gameDebug) throw new Error("Game debug hook is unavailable.");
    win.__gameDebug.descend();
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
  walkRouteToTarget(() => ({ x: worldX, y: worldY }), options);
});

Cypress.Commands.add("approachMelee", (options = {}) => {
  walkRouteToTarget((snapshot) => meleeTarget(snapshot), options);
});

Cypress.Commands.add("approachBoss", (options = {}) => {
  walkRouteToTarget((snapshot) => bossTarget(snapshot), options);
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
 * therefore not reliable. A retry is only safe while the player's attack state
 * and the enemies' health both prove that nothing started: `attacking` stays
 * true for the whole committed 0.41 s swing, so the 100 ms observation window
 * cannot miss a swing that began.
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
      if (snapshot.player.attacking) {
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
            after.player.attacking ||
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
