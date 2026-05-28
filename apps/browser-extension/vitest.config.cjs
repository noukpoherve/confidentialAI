const { defineConfig } = require("vitest/config");

module.exports = defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.mjs"],
    coverage: {
      // Fail the build if line coverage drops below 70% (mirrors backend gate)
      thresholds: {
        lines: 70,
      },
    },
  },
});
