import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: "http://127.0.0.1:4173",
    specPattern: "cypress/e2e/**/*.cy.ts",
    supportFile: "cypress/support/e2e.ts",
    video: Boolean(process.env.CI),
    screenshotOnRunFailure: true,
    viewportWidth: 1440,
    viewportHeight: 810,
    defaultCommandTimeout: 10000,
  },
});
