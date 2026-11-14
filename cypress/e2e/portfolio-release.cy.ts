describe("0.5.0 portfolio release", () => {
  beforeEach(() => {
    cy.visitGame();
  });

  it("opens on the title screen and starts with Enter", () => {
    cy.gameSnapshot().then((title) => {
      expect(title.status).to.equal("title");
      expect(title.time).to.equal(0);
      expect(title.enemies).to.have.length(3);
    });

    cy.wait(300);
    cy.gameSnapshot().then((frozen) => {
      expect(frozen.status).to.equal("title");
      expect(frozen.time).to.equal(0);
    });

    cy.document().trigger("keydown", { key: "Enter" });
    cy.document().trigger("keyup", { key: "Enter" });
    cy.waitForGame(
      (snapshot) => snapshot.status === "playing",
      "the title screen to start",
      5000,
    );
  });

  it("pauses and resumes with Escape without advancing the world", () => {
    cy.startGame();

    cy.document().trigger("keydown", { key: "Escape" });
    cy.document().trigger("keyup", { key: "Escape" });
    cy.waitForGame(
      (snapshot) => snapshot.status === "paused",
      "the run to pause",
    ).then((paused) => {
      cy.wait(300);
      cy.gameSnapshot().then((frozen) => {
        expect(frozen.status).to.equal("paused");
        expect(frozen.time).to.equal(paused.time);
        expect(frozen.player.x).to.equal(paused.player.x);
      });
    });

    cy.document().trigger("keydown", { key: "Escape" });
    cy.document().trigger("keyup", { key: "Escape" });
    cy.waitForGame(
      (snapshot) => snapshot.status === "playing",
      "the run to resume",
    );
  });

  it("summons the Warden with the stairs still sealed", () => {
    cy.startGame();
    cy.summonBoss().then((snapshot) => {
      expect(snapshot.status).to.equal("playing");
      expect(snapshot.bossAwake).to.equal(true);
      expect(snapshot.floorPurified).to.equal(true);
      expect(snapshot.exitOpen).to.equal(false);

      const boss = snapshot.enemies.find((enemy) => enemy.kind === "boss");
      expect(boss, "Floor Warden").to.exist;
      expect(boss!.hp).to.equal(24);
      expect(boss!.x).to.equal(snapshot.floor.bossSpawn.x);
      expect(boss!.y).to.equal(snapshot.floor.bossSpawn.y);
    });
  });

  it("throws a fused bomb that explodes and damages the player", () => {
    cy.startGame();
    cy.summonBoss();
    // Stay outside the Warden's 40 px melee range so it chooses the bomb.
    cy.approachBoss({ stop: 180, timeout: 30_000 });

    cy.waitForGame(
      (snapshot) => snapshot.bombs.length > 0,
      "the Warden to throw a bomb",
      20_000,
    ).then((snapshot) => {
      const bomb = snapshot.bombs[0]!;
      expect(bomb.landed).to.be.a("boolean");
      expect(bomb.fuse).to.be.greaterThan(0);
      expect(bomb.targetX).to.be.a("number");
      expect(bomb.targetY).to.be.a("number");
    });

    cy.waitForGame(
      (snapshot) => snapshot.bombs.length === 0,
      "the bomb to explode",
      10_000,
    );
    cy.waitForGame(
      (snapshot) => snapshot.player.hp < 6,
      "the blast to damage the player",
      10_000,
    );
  });
});
