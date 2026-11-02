import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: "http://127.0.0.1:4173",
    specPattern: "cypress/e2e/**/*.cy.ts",
    supportFile: false,
    video: false,
    screenshotOnRunFailure: false,
    viewportWidth: 1440,
    viewportHeight: 810,
    defaultCommandTimeout: 20000,
  },
});
