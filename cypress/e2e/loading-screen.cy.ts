describe("0.6.0 boot loading screen", () => {
  it("paints the loading overlay and reports progress before the title", () => {
    // Hold one audio request so the overlay is observable even on a fast
    // local preview, then let the real boot finish normally.
    cy.intercept(
      { pathname: "/assets/audio/knifeSlice.ogg" },
      (request) => {
        request.on("response", (response) => {
          response.setDelay(400);
        });
      },
    );

    cy.visit("/");

    cy.get("#boot").should("be.visible");
    cy.get("#boot .boot__title").should("contain.text", "skill issue dg");
    cy.get("#boot .boot__tagline").should(
      "contain.text",
      "A dark-fantasy action roguelike",
    );
    cy.get('#boot .boot__status').should(
      "contain.text",
      "Preparing the descent",
    );
    cy.get('#boot [role="progressbar"]')
      .should("have.attr", "aria-valuemin", "0")
      .and("have.attr", "aria-valuemax", "100");
    cy.get('#boot [role="progressbar"]')
      .invoke("attr", "aria-valuenow")
      .should("match", /^\d+$/);
    cy.get("#boot .boot__percent")
      .invoke("text")
      .should("match", /^\d+%$/);

    cy.get("#boot").should("not.exist");
    cy.get("canvas#game").should("be.visible");
    cy.gameSnapshot().then((snapshot) => {
      expect(snapshot.status).to.equal("title");
      expect(snapshot.time).to.equal(0);
    });
  });

  it("settles images, audio and the display font before revealing the title", () => {
    cy.visitGame();

    cy.window().should((win) => {
      const boot = win.__bootDebug?.getState();
      expect(boot, "boot snapshot").to.exist;
      expect(boot!.phase).to.equal("done");
      expect(boot!.percent).to.equal(100);
      expect(boot!.images.settled).to.equal(boot!.images.total);
      expect(boot!.audio.settled).to.equal(boot!.audio.total);
      expect(boot!.font).to.equal("loaded");
      expect(boot!.error).to.be.null;
      expect(boot!.doneAt, "boot completion timestamp").to.be.a("number");
      expect(
        boot!.doneAt! - boot!.startedAt,
        "minimum display time",
      ).to.be.at.least(700);
    });

    cy.document().then((doc) => {
      expect(
        doc.fonts.check('600 56px "Grenze Gotisch"'),
        "display font is usable by the canvas",
      ).to.equal(true);
    });

    cy.window().should((win) => {
      const audio = win.__audioDebug?.getState();
      expect(audio, "audio snapshot").to.exist;
      expect(audio!.preloaded).to.equal(audio!.preloadTotal);
      expect(audio!.preloadTotal).to.be.greaterThan(0);
      expect(audio!.unlocked).to.equal(false);
    });
  });

  it("unlocks audio on the first gesture from the title", () => {
    cy.visitGame();

    cy.startGame();

    cy.window().should((win) => {
      const audio = win.__audioDebug?.getState();
      expect(audio, "audio snapshot").to.exist;
      expect(audio!.unlocked).to.equal(true);
      expect(audio!.ambient).to.equal(true);
    });
  });

  it("completes boot when an audio file fails and stays playable", () => {
    cy.intercept("**/assets/audio/knifeSlice.ogg", {
      statusCode: 404,
      body: "",
    });

    cy.visitGame();

    cy.window().should((win) => {
      const boot = win.__bootDebug!.getState();
      expect(boot.phase).to.equal("done");
      expect(boot.audio.settled).to.equal(boot.audio.total);
      const audio = win.__audioDebug!.getState();
      expect(audio.preloaded).to.equal(audio.preloadTotal - 1);
    });

    cy.startGame();
    cy.gameSnapshot().then((snapshot) => {
      expect(snapshot.status).to.equal("playing");
      expect(snapshot.player.hp).to.equal(6);
    });
  });

  it("completes boot and stays playable without AudioContext", () => {
    cy.on("window:before:load", (win) => {
      Object.defineProperty(win, "AudioContext", {
        configurable: true,
        value: undefined,
      });
    });

    cy.visitGame();

    cy.window().should((win) => {
      const boot = win.__bootDebug!.getState();
      expect(boot.phase).to.equal("done");
      expect(boot.audio.settled).to.equal(boot.audio.total);
    });

    cy.startGame();
    cy.window().should((win) => {
      const audio = win.__audioDebug!.getState();
      expect(audio.supported).to.equal(false);
      expect(audio.unlocked).to.equal(true);
      expect(audio.ambient).to.equal(false);
    });
    cy.gameSnapshot().then((snapshot) => {
      expect(snapshot.status).to.equal("playing");
    });
  });

  it("does not replay the loader after boot, pause or resume", () => {
    cy.visitGame();
    cy.startGame();

    cy.get("#boot").should("not.exist");

    cy.document().trigger("keydown", { key: "Escape" });
    cy.document().trigger("keyup", { key: "Escape" });
    cy.waitForGame(
      (snapshot) => snapshot.status === "paused",
      "the pause screen",
    );
    cy.get("#boot").should("not.exist");

    cy.document().trigger("keydown", { key: "Escape" });
    cy.document().trigger("keyup", { key: "Escape" });
    cy.waitForGame(
      (snapshot) => snapshot.status === "playing",
      "the game to resume",
    );
    cy.get("#boot").should("not.exist");

    cy.window().then((win) => {
      expect(win.__bootDebug?.getState().phase).to.equal("done");
    });
  });

  it("shows a readable error when a sprite cannot load", () => {
    cy.intercept(
      {
        pathname:
          "/assets/dungeon-tileset-ii/frames/knight_m_idle_anim_f0.png",
      },
      { statusCode: 404, body: "" },
    );

    cy.visit("/");

    cy.waitForBoot(
      (snapshot) => snapshot.phase === "error",
      "the boot error state",
      15_000,
    );

    cy.get("#boot").should("have.class", "boot--error");
    cy.get("#boot .boot__error").should("be.visible");
    cy.get("#boot .boot-error").should(
      "contain.text",
      "Failed to start the game",
    );
    cy.get("#boot .boot__progress").should("not.be.visible");
    cy.window().then((win) => {
      expect(win.__bootDebug?.getState().error).to.contain(
        "knight_m_idle_anim_f0.png",
      );
    });
  });
});
