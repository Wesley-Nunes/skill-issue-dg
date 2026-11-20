describe("0.9.1 combat integrity", () => {
  beforeEach(() => {
    cy.visitGame();
    cy.startGame();
  });

  it("resets fragments and HP when a mob lands a melee hit", () => {
    // Leave one mob at 1 HP with every fragment broken, then stand on it so its
    // telegraphed melee hit lands. The hit must restore the whole rite, not
    // leave the mob one swing from a free rest.
    cy.prepareRest("melee-1");
    cy.gameSnapshot().then((snapshot) => {
      const mob = snapshot.enemies.find((enemy) => enemy.id === "melee-1");
      expect(mob, "the prepared melee mob").to.exist;
      expect(mob!.fragments).to.deep.equal([false, false]);
      expect(mob!.hp).to.equal(1);
      cy.teleport(mob!.x, mob!.y);
    });

    cy.waitForGame(
      (snapshot) => snapshot.player.hp < snapshot.player.maxHp,
      "the mob's melee hit",
    );

    cy.gameSnapshot().then((snapshot) => {
      const mob = snapshot.enemies.find((enemy) => enemy.id === "melee-1");
      expect(mob, "the melee mob after the hit").to.exist;
      expect(mob!.fragments, "fragments after the hit").to.deep.equal([
        true,
        true,
      ]);
      expect(mob!.hp, "HP after the hit").to.equal(mob!.maxHp);
    });
  });
});
