import type { DebugSnapshot } from "../../src/game/types";

function shopZone(snapshot: DebugSnapshot) {
  return {
    x:
      snapshot.floor.shop.interaction.x +
      snapshot.floor.shop.interaction.width / 2,
    y:
      snapshot.floor.shop.interaction.y +
      snapshot.floor.shop.interaction.height / 2,
  };
}

function altarCentre(snapshot: DebugSnapshot) {
  return {
    x: snapshot.floor.altar.x + snapshot.floor.altar.width / 2,
    y: snapshot.floor.altar.y + snapshot.floor.altar.height / 2,
  };
}

describe("0.7.0 reward loop", () => {
  beforeEach(() => {
    cy.visitGame();
    cy.startGame();
  });

  it("earns, buys, uses, summons, defeats, and descends through real actions", () => {
    // Real earn: prepare a one-hit rest, then land the killing blow normally.
    cy.gameSnapshot().then((snapshot) => {
      const first = snapshot.enemies.find((enemy) => enemy.kind === "melee")!;
      cy.prepareRest(first.id);
      cy.teleport(first.x - 28, first.y);
      cy.attackWorld(first.x, first.y);
      cy.waitForGame(
        (after) =>
          after.skillPoints === 1 &&
          after.enemies.some((enemy) => enemy.id === first.id && enemy.rested),
        "the first mob to rest and award a point",
        10_000,
      );
    });

    // The remaining rests and the extra points are deterministic setup.
    cy.restMobs();
    cy.giveSkillPoints(3);
    cy.waitForGame(
      (snapshot) => snapshot.skillPoints === 6 && snapshot.gateOpen,
      "the arena to open with six points",
    );

    cy.gameSnapshot().then((snapshot) => {
      const zone = shopZone(snapshot);
      cy.walkTo(zone.x, zone.y, { stop: 20, timeout: 30_000 });
    });

    cy.pressKey("e");
    cy.waitForGame((snapshot) => snapshot.shopOpen, "the shop to open");

    cy.pressKey("Enter");
    cy.waitForGame(
      (snapshot) => snapshot.draughtCarried && snapshot.skillPoints === 5,
      "the draught purchase",
    );

    cy.pressKey("s");
    cy.pressKey("Enter");
    cy.waitForGame(
      (snapshot) =>
        snapshot.vigorPurchased &&
        snapshot.player.maxHp === 7 &&
        snapshot.skillPoints === 2,
      "the Vigor purchase",
    );

    cy.pressKey("Escape");
    cy.waitForGame((snapshot) => !snapshot.shopOpen, "the shop to close");

    cy.setPlayerHp(4);
    cy.pressKey("q");
    cy.waitForGame(
      (snapshot) => !snapshot.draughtCarried && snapshot.player.hp === 6,
      "the draught to heal",
    );

    cy.gameSnapshot().then((snapshot) => {
      const altar = altarCentre(snapshot);
      cy.walkTo(altar.x, altar.y, { stop: 20, timeout: 30_000 });
    });

    cy.pressKey("e");
    cy.waitForGame((snapshot) => snapshot.bossAwake, "the Warden to rise");
    cy.waitForGame(
      (snapshot) => {
        const boss = snapshot.enemies.find((enemy) => enemy.kind === "boss");
        return boss !== undefined && boss.emerging === 0;
      },
      "the Warden to finish emerging",
    );

    cy.weakenBoss(1);
    cy.approachBoss({ stop: 24, timeout: 20_000 });
    cy.gameSnapshot().then((snapshot) => {
      const boss = snapshot.enemies.find((enemy) => enemy.kind === "boss")!;
      cy.attackWorld(boss.x, boss.y);
    });
    cy.waitForGame(
      (snapshot) => snapshot.exitOpen,
      "the Warden to fall and the stairs to open",
      15_000,
    );

    cy.gameSnapshot().then((snapshot) => {
      const stairs = snapshot.floor.stairs;
      cy.walkTo(stairs.x + stairs.width / 2, stairs.y + stairs.height / 2, {
        stop: 12,
        timeout: 30_000,
      });
    });

    cy.waitForGame(
      (snapshot) => snapshot.depth === 2,
      "the run to descend",
      20_000,
    ).then((snapshot) => {
      expect(snapshot.skillPoints).to.equal(5);
      expect(snapshot.draughtCarried).to.equal(false);
      expect(snapshot.vigorPurchased).to.equal(true);
      expect(snapshot.player.maxHp).to.equal(7);
      expect(snapshot.spirit).to.equal(0);
      expect(snapshot.floorPurified).to.equal(false);
      expect(snapshot.exitOpen).to.equal(false);
    });
  });

  it("keeps the arena sealed and blocks a premature summon", () => {
    cy.gameSnapshot().then((snapshot) => {
      const gate = snapshot.floor.gate;
      cy.teleport(gate.x - 24, gate.y + gate.height / 2);
      cy.pressKey("d");
      cy.wait(800);
      cy.gameSnapshot().then((after) => {
        expect(after.player.x).to.be.lessThan(gate.x);
        expect(after.gateOpen).to.equal(false);
        expect(after.summonAvailable).to.equal(false);
      });

      const altar = altarCentre(snapshot);
      cy.teleport(altar.x, altar.y);
      cy.pressKey("e");
      cy.wait(300);
      cy.gameSnapshot().then((after) => {
        expect(after.bossAwake).to.equal(false);
        expect(
          after.enemies.some((enemy) => enemy.kind === "boss"),
        ).to.equal(false);
      });
    });
  });

  it("blocks purchases without points and duplicate draughts", () => {
    cy.gameSnapshot().then((snapshot) => {
      const zone = shopZone(snapshot);
      cy.teleport(zone.x, zone.y);
    });
    cy.pressKey("e");
    cy.waitForGame((snapshot) => snapshot.shopOpen, "the shop to open");

    cy.pressKey("Enter");
    cy.waitForGame(
      (snapshot) =>
        snapshot.shopMessage === "Need 1 more skill point" &&
        snapshot.skillPoints === 0,
      "the insufficient-points block",
    );

    cy.giveSkillPoints(2);
    cy.pressKey("Enter");
    cy.waitForGame(
      (snapshot) => snapshot.draughtCarried && snapshot.skillPoints === 1,
      "the draught purchase",
    );

    cy.pressKey("Enter");
    cy.waitForGame(
      (snapshot) =>
        snapshot.shopMessage ===
        "You already carry a draught. Use Q first.",
      "the duplicate-draught block",
    );
    cy.gameSnapshot().then((snapshot) => {
      expect(snapshot.skillPoints).to.equal(1);
      expect(snapshot.draughtCarried).to.equal(true);
    });
  });

  it("offers Vigor once and keeps the shop closed after the summon", () => {
    cy.giveSkillPoints(3);
    cy.gameSnapshot().then((snapshot) => {
      const zone = shopZone(snapshot);
      cy.teleport(zone.x, zone.y);
    });
    cy.pressKey("e");
    cy.waitForGame((snapshot) => snapshot.shopOpen, "the shop to open");
    cy.pressKey("s");
    cy.pressKey("Enter");
    cy.waitForGame(
      (snapshot) => snapshot.vigorPurchased && snapshot.player.maxHp === 7,
      "the Vigor purchase",
    ).then((snapshot) => {
      expect(snapshot.shopRows.map((row) => row.id)).to.deep.equal([
        "draught",
      ]);
    });

    cy.pressKey("Escape");
    cy.waitForGame((snapshot) => !snapshot.shopOpen, "the shop to close");
    cy.prepareRite();
    cy.summonBoss();

    cy.gameSnapshot().then((snapshot) => {
      expect(snapshot.shopClosed).to.equal(true);
      expect(snapshot.shopOpen).to.equal(false);
      expect(snapshot.shopRows.map((row) => row.id)).to.deep.equal([
        "draught",
      ]);
      const zone = shopZone(snapshot);
      cy.teleport(zone.x, zone.y);
    });
    cy.pressKey("e");
    cy.wait(300);
    cy.gameSnapshot().then((snapshot) => {
      expect(snapshot.shopOpen).to.equal(false);
      expect(snapshot.shopClosed).to.equal(true);
    });
  });

  it("preserves rewards across descent and clears them on restart", () => {
    cy.giveSkillPoints(4);
    cy.gameSnapshot().then((snapshot) => {
      const zone = shopZone(snapshot);
      cy.teleport(zone.x, zone.y);
    });
    cy.pressKey("e");
    cy.waitForGame((snapshot) => snapshot.shopOpen, "the shop to open");
    cy.pressKey("Enter");
    cy.waitForGame(
      (snapshot) => snapshot.draughtCarried && snapshot.skillPoints === 3,
      "the draught purchase",
    );
    cy.pressKey("s");
    cy.pressKey("Enter");
    cy.waitForGame(
      (snapshot) => snapshot.vigorPurchased && snapshot.skillPoints === 0,
      "the Vigor purchase",
    );
    cy.pressKey("Escape");
    cy.waitForGame((snapshot) => !snapshot.shopOpen, "the shop to close");

    cy.giveSkillPoints(2);
    cy.descend();
    cy.waitForGame(
      (snapshot) => snapshot.depth === 2,
      "the debug descent",
    ).then((snapshot) => {
      expect(snapshot.skillPoints).to.equal(2);
      expect(snapshot.draughtCarried).to.equal(true);
      expect(snapshot.vigorPurchased).to.equal(true);
      expect(snapshot.player.maxHp).to.equal(7);
      expect(snapshot.shopClosed).to.equal(false);
    });

    cy.killPlayer();
    cy.waitForGame((snapshot) => snapshot.status === "dead", "the player to die");
    cy.pressKey("r");
    cy.waitForGame(
      (snapshot) => snapshot.status === "playing",
      "the run to restart",
    ).then((snapshot) => {
      expect(snapshot.skillPoints).to.equal(0);
      expect(snapshot.draughtCarried).to.equal(false);
      expect(snapshot.vigorPurchased).to.equal(false);
      expect(snapshot.player.maxHp).to.equal(6);
      expect(snapshot.depth).to.equal(1);
    });
  });
});
