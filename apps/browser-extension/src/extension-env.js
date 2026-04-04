/**
 * Build target for this extension package.
 *
 * - "development" (default in repo): options show Local + Production presets; default URL is Local.
 * - "production": options show Production preset only; default URL is Production.
 *
 * Set to "production" before packaging the Chrome Web Store / end-user build.
 */
(function setExtensionBuild(global) {
  /** @type {"development" | "production"} */
  const build = "development";
  global.__CONFIDENTIAL_AGENT_BUILD__ = build;
})(typeof self !== "undefined" ? self : window);
