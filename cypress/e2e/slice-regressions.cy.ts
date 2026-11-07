import { cameraTarget, fragmentPoint, meleeTarget } from "../support/game";

const exceptions: string[] = [];

describe("0.2.0 QA verification", () => {
  beforeEach(() => {
    exceptions.length = 0;
    cy.on("uncaught:exception", (error) => {
      exceptions.push(String(error.message));
      return false;
    });
    cy.visit("/");
    // The debug hook is exposed after assets load and the input listeners are
    // attached, so this also prevents interacting with a half-booted game.
    cy.startGame();
  });

  it("plays without uncaught exceptions or console errors", () => {
    cy.gameSnapshot().then((start) => {
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
      // Input duration: the game samples attack state on animation frames.
      cy.wait(200);
      cy.get("canvas#game").trigger("mouseup", { button: 0, force: true });
      cy.document().trigger("keydown", { key: "d" });
      // Input duration: hold movement long enough for a few frames.
      cy.wait(150);
      cy.document().trigger("keyup", { key: "d" });
      cy.document().trigger("keydown", { key: " " });
      cy.document().trigger("keyup", { key: " " });

      cy.waitForGame(
        (snapshot) => snapshot.time > start.time + 0.2,
        "the game to advance",
        5000,
      );
      cy.get("@consoleError").should("not.have.been.called");
      cy.then(() => expect(exceptions, "uncaught exceptions").to.deep.equal([]));
    });
  });

  it("keeps the canvas, viewport and camera correct across resizes", () => {
    cy.viewport(1024, 640);
    cy.waitForGame(
      (snapshot) =>
        Math.abs(snapshot.viewport.width - 1024 / 3) < 0.1 &&
        Math.abs(snapshot.viewport.height - 640 / 3) < 0.1,
      "the viewport to resize",
      5000,
    ).then((snapshot) => {
      expect(snapshot.viewport.width).to.be.closeTo(1024 / 3, 0.1);
      expect(snapshot.viewport.height).to.be.closeTo(640 / 3, 0.1);
      expect(snapshot.camera.x).to.be.at.least(0);
      expect(snapshot.camera.x).to.be.at.most(
        snapshot.floor.width - snapshot.viewport.width + 0.01,
      );
      expect(snapshot.camera.y).to.be.at.most(
        snapshot.floor.height - snapshot.viewport.height + 0.01,
      );
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
    // The input stores screen space; the next game frame converts it to world
    // space using the current camera.
    cy.waitForGame(
      (snapshot) =>
        Math.abs(snapshot.pointer.x - (snapshot.camera.x + 100)) < 0.5 &&
        Math.abs(snapshot.pointer.y - (snapshot.camera.y + 70)) < 0.5,
      "the pointer to aim at the clicked world position",
      5000,
    ).then((snapshot) => {
      expect(snapshot.pointer.x).to.be.closeTo(snapshot.camera.x + 100, 0.5);
      expect(snapshot.pointer.y).to.be.closeTo(snapshot.camera.y + 70, 0.5);
      expect(snapshot.zoom).to.equal(3);
    });

    cy.viewport(1440, 810);
    cy.waitForGame(
      (snapshot) => {
        const target = cameraTarget(snapshot);
        return (
          Math.abs(snapshot.camera.x - target.x) < 1 &&
          Math.abs(snapshot.camera.y - target.y) < 1
        );
      },
      "the camera to settle at the spawn framing",
    ).then((snapshot) => {
      const target = cameraTarget(snapshot);
      expect(snapshot.viewport.width).to.be.closeTo(480, 0.1);
      expect(snapshot.viewport.height).to.be.closeTo(270, 0.1);
      expect(snapshot.camera.x).to.be.closeTo(target.x, 1);
      expect(snapshot.camera.y).to.be.closeTo(target.y, 1);
    });
  });

  it("dodges the configured distance", () => {
    cy.document().trigger("keydown", { key: " " });
    cy.document().trigger("keyup", { key: " " });
    cy.gameSnapshot().then((start) => {
      const origin = { x: start.player.x, y: start.player.y };
      cy.waitForGame(
        (snapshot) =>
          Math.hypot(
            snapshot.player.x - origin.x,
            snapshot.player.y - origin.y,
          ) > 40,
        "the dodge to move the player",
        5000,
      );
      cy.waitForGame(
        (snapshot) => !snapshot.player.dodging,
        "the dodge to finish",
        5000,
      ).then((snapshot) => {
        const distance = Math.hypot(
          snapshot.player.x - origin.x,
          snapshot.player.y - origin.y,
        );
        expect(distance, "dodge distance").to.be.greaterThan(40);
        expect(distance).to.be.at.most(65);
      });
    });
  });

  it("damages a melee enemy exactly once per press", () => {
    cy.approachMelee();
    cy.gameSnapshot().then((snapshot) => {
      const target = meleeTarget(snapshot);
      const startTime = snapshot.time;
      cy.attackWorld(target.x, target.y);

      cy.waitForGame(
        (after) =>
          (after.enemies.find((enemy) => enemy.id === target.id)?.hp ?? 10) <
          10,
        "the first combo hit",
      ).then((after) => {
        const hp = after.enemies.find((enemy) => enemy.id === target.id)!.hp;
        expect(hp, "hp after one press").to.equal(8);
      });

      // Let the chain reset so a second, unintended hit would be visible.
      cy.waitForGame(
        (after) =>
          after.player.comboStep === 0 && after.time > startTime + 0.5,
        "the swing to finish",
        5000,
      ).then((after) => {
        const hp = after.enemies.find((enemy) => enemy.id === target.id)!.hp;
        expect(hp, "hp after the swing settles").to.equal(8);
      });
    });
  });

  it("does not damage a melee enemy when the swing aims away", () => {
    cy.approachMelee();
    cy.gameSnapshot().then((snapshot) => {
      const target = meleeTarget(snapshot);
      const startTime = snapshot.time;
      const length =
        Math.hypot(snapshot.player.x - target.x, snapshot.player.y - target.y) ||
        1;
      const awayX =
        snapshot.player.x + ((snapshot.player.x - target.x) / length) * 40;
      const awayY =
        snapshot.player.y + ((snapshot.player.y - target.y) / length) * 40;
      cy.attackWorld(awayX, awayY);

      // attackWorld already proved a swing started; let it finish.
      cy.waitForGame(
        (after) =>
          after.player.comboStep === 0 && after.time > startTime + 0.5,
        "the swing to finish",
        5000,
      ).then((after) => {
        const hp = after.enemies.find((enemy) => enemy.id === target.id)!.hp;
        expect(hp, "hp after aiming away").to.equal(10);
      });
    });
  });

  it("breaks a spirit fragment with the light attack", () => {
    cy.gameSnapshot().then((snapshot) => {
      const target = meleeTarget(snapshot);
      cy.walkTo(target.x, target.y, { stop: 16 });
    });

    cy.gameSnapshot().then((snapshot) => {
      const point = fragmentPoint(meleeTarget(snapshot));
      cy.attackWorld(point.x, point.y);
    });

    cy.waitForGame(
      (snapshot) => {
        const enemy = snapshot.enemies.find((entry) => entry.kind === "melee");
        return enemy !== undefined && enemy.fragments.includes(false);
      },
      "a spirit fragment to break",
    ).then((snapshot) => {
      const enemy = snapshot.enemies.find((entry) => entry.kind === "melee")!;
      expect(enemy.fragments.filter(Boolean).length).to.be.lessThan(2);
      expect(snapshot.spirit).to.equal(0);
    });
  });

  it("does not chain the combo while the attack is mashed", () => {
    cy.approachMelee();
    for (let click = 0; click < 30; click += 1) {
      cy.gameSnapshot().then((snapshot) => {
        const target = meleeTarget(snapshot);
        cy.clickWorld(target.x, target.y);
      });
      // Input cadence: mash faster than the combo reply window.
      cy.wait(40);
    }

    cy.gameSnapshot().then((snapshot) => {
      expect(
        snapshot.player.comboStep,
        "mashing never reaches the finisher",
      ).to.be.lessThan(3);
      expect(snapshot.spirit).to.equal(0);
    });
  });

  it("resets spirit and fragments on restart", () => {
    cy.gameSnapshot().then((snapshot) => {
      const target = meleeTarget(snapshot);
      cy.walkTo(target.x, target.y, { stop: 16 });
    });
    cy.gameSnapshot().then((snapshot) => {
      const point = fragmentPoint(meleeTarget(snapshot));
      cy.attackWorld(point.x, point.y);
    });
    cy.waitForGame(
      (snapshot) =>
        snapshot.enemies.some(
          (enemy) => enemy.kind === "melee" && enemy.fragments.includes(false),
        ),
      "a spirit fragment to break",
    );

    cy.waitForDeath();
    cy.document().trigger("keydown", { key: "r" });
    cy.document().trigger("keyup", { key: "r" });
    cy.waitForGame(
      (snapshot) => snapshot.status === "playing",
      "the run to restart",
      5000,
    ).then((snapshot) => {
      expect(snapshot.status).to.equal("playing");
      expect(snapshot.spirit).to.equal(0);
      expect(snapshot.floorPurified).to.equal(false);
      expect(snapshot.enemies).to.have.length(3);
      expect(
        snapshot.enemies.every((enemy) =>
          enemy.fragments.every((intact) => intact),
        ),
      ).to.equal(true);
    });
  });

  it("fires projectiles that can hit the player", () => {
    // Walk into the ranged enemy's aggro band without entering its retreat ring.
    cy.gameSnapshot().then((snapshot) => {
      const ranged = snapshot.enemies.find((enemy) => enemy.kind === "ranged");
      cy.walkTo(ranged!.x, ranged!.y, { stop: 200 });
    });

    cy.waitForGame(
      (snapshot) => snapshot.projectiles.length > 0,
      "a ranged projectile",
    );
    cy.waitForGame(
      (snapshot) => snapshot.player.hp < 6,
      "projectile damage",
      20000,
    ).then((snapshot) => {
      expect(snapshot.player.hp).to.be.lessThan(6);
    });
  });

  it("freezes after death and restores the initial state on repeated restarts", () => {
    cy.approachMelee();
    cy.waitForDeath();

    cy.gameSnapshot().then((dead) => {
      expect(dead.status).to.equal("dead");
      expect(dead.player.hp).to.equal(0);

      cy.document().trigger("keydown", { key: "d" });
      cy.get("canvas#game").trigger("mousedown", {
        button: 0,
        clientX: 700,
        clientY: 400,
        force: true,
      });
      // The wait is the assertion: a frozen run must not advance over time.
      cy.wait(300);
      cy.document().trigger("keyup", { key: "d" });
      cy.get("canvas#game").trigger("mouseup", { button: 0, force: true });

      cy.gameSnapshot().then((frozen) => {
        expect(frozen.player.x).to.equal(dead.player.x);
        expect(frozen.player.y).to.equal(dead.player.y);
        expect(frozen.enemies).to.deep.equal(dead.enemies);
        expect(frozen.status).to.equal("dead");
      });
    });

    for (let restart = 0; restart < 3; restart += 1) {
      cy.document().trigger("keydown", { key: "r" });
      cy.document().trigger("keyup", { key: "r" });
      cy.waitForGame(
        (snapshot) => snapshot.status === "playing",
        "the run to restart",
        5000,
      ).then((snapshot) => {
        expect(snapshot.status).to.equal("playing");
        expect(snapshot.player.hp).to.equal(6);
        expect(snapshot.player.x).to.be.closeTo(snapshot.floor.spawn.x, 1);
        expect(snapshot.player.y).to.be.closeTo(snapshot.floor.spawn.y, 1);
        expect(snapshot.depth).to.equal(1);
        expect(snapshot.exitOpen).to.equal(false);
        expect(snapshot.enemies.map((enemy) => enemy.hp)).to.deep.equal([
          10, 10, 6,
        ]);
        expect(snapshot.enemies.map((enemy) => enemy.status)).to.deep.equal([
          "alive",
          "alive",
          "alive",
        ]);
        expect(snapshot.spirit).to.equal(0);
        expect(snapshot.floorPurified).to.equal(false);
        expect(
          snapshot.enemies.every((enemy) =>
            enemy.fragments.every((intact) => intact),
          ),
        ).to.equal(true);
        expect(snapshot.projectiles).to.have.length(0);
      });
    }
  });
});
