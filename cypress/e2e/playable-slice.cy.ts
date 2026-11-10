import { meleeTarget } from "../support/game";

describe("0.1.0 playable combat slice", () => {
  beforeEach(() => {
    cy.visitGame();
    // visitGame waits for boot, the debug hook, and the input listeners, so
    // this also prevents interacting with a half-booted game.
    cy.startGame();
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
      expect(snapshot.exitOpen).to.equal(false);
      expect(snapshot.gateOpen).to.equal(false);
      expect(snapshot.summonAvailable).to.equal(false);
      expect(snapshot.skillPoints).to.equal(0);
      expect(snapshot.draughtCarried).to.equal(false);
      expect(snapshot.depth).to.equal(1);
      expect(snapshot.floor.rooms).to.have.length(6);
      expect(snapshot.floor.rooms.map((room) => room.role)).to.deep.equal([
        "start",
        "mob",
        "mob",
        "shop",
        "mob",
        "arena",
      ]);
      expect(snapshot.floor.seed).to.be.a("number");
      expect(snapshot.floor.width).to.be.greaterThan(snapshot.viewport.width);

      const inside = (
        point: { x: number; y: number },
        room: { x: number; y: number; width: number; height: number },
      ) =>
        point.x >= room.x &&
        point.x <= room.x + room.width &&
        point.y >= room.y &&
        point.y <= room.y + room.height;

      const start = snapshot.floor.rooms.find((room) => room.role === "start")!;
      const mobRooms = snapshot.floor.rooms.filter(
        (room) => room.role === "mob",
      );
      const arena = snapshot.floor.rooms.find((room) => room.role === "arena")!;

      expect(inside(snapshot.player, start)).to.equal(true);
      snapshot.enemies.forEach((enemy, index) => {
        expect(inside(enemy, mobRooms[index]!)).to.equal(true);
      });
      expect(
        inside(
          {
            x: snapshot.floor.stairs.x + snapshot.floor.stairs.width / 2,
            y: snapshot.floor.stairs.y + snapshot.floor.stairs.height / 2,
          },
          arena,
        ),
      ).to.equal(true);
    });
  });

  it("paints the room and the heart HUD on the canvas", () => {
    cy.gameSnapshot().then((snapshot) => {
      cy.get("canvas#game").should(($canvas) => {
        const canvas = $canvas[0] as HTMLCanvasElement;
        const context = canvas.getContext("2d");
        expect(context, "2d context").to.not.be.null;
        const scale = canvas.width / canvas.clientWidth;
        const playerX = (snapshot.player.x - snapshot.camera.x) * snapshot.zoom;
        const playerY = (snapshot.player.y - snapshot.camera.y) * snapshot.zoom;

        // The room floor must cover the area around the player, not the void
        // fill. Sample beside the sprite so its pixels do not skew the count.
        const floor = context!.getImageData(
          Math.round((playerX + 60) * scale),
          Math.round((playerY - 20) * scale),
          Math.round(40 * scale),
          Math.round(40 * scale),
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
  });

  it("paints the depth and stairs status in the top-right HUD", () => {
    cy.get("canvas#game").should(($canvas) => {
      const canvas = $canvas[0] as HTMLCanvasElement;
      const context = canvas.getContext("2d");
      expect(context, "2d context").to.not.be.null;
      const scale = canvas.width / canvas.clientWidth;
      const width = Math.round(150 * scale);
      const height = Math.round(56 * scale);

      const hud = context!.getImageData(
        canvas.width - Math.round(174 * scale),
        Math.round(16 * scale),
        width,
        height,
      ).data;
      let bright = 0;
      for (let index = 0; index < hud.length; index += 4) {
        if (
          hud[index]! > 200 &&
          hud[index + 1]! > 200 &&
          hud[index + 2]! > 200 &&
          hud[index + 3]! > 180
        ) {
          bright += 1;
        }
      }
      expect(bright, "depth HUD pixels").to.be.greaterThan(30);
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
      cy.get("#boot").should("not.exist");
      expect(restarted.status).to.equal("playing");
      expect(restarted.player.hp).to.equal(6);
      expect(restarted.enemies).to.have.length(3);
      expect(restarted.enemies.map((enemy) => enemy.hp)).to.deep.equal([
        10, 10, 6,
      ]);
      expect(restarted.spirit).to.equal(0);
      expect(restarted.floorPurified).to.equal(false);
      expect(restarted.exitOpen).to.equal(false);
      expect(restarted.depth).to.equal(1);
      expect(
        restarted.enemies.every((enemy) =>
          enemy.fragments.every((intact) => intact),
        ),
      ).to.equal(true);
      expect(restarted.player.x).to.be.closeTo(restarted.floor.spawn.x, 1);
      expect(restarted.player.y).to.be.closeTo(restarted.floor.spawn.y, 1);
    });
  });
});
