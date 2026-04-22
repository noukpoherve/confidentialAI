// Runs server-side in Node.js — only active in production (when DSN is set)

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.GLITCHTIP_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.05,

    beforeSend(event) {
      // Never send request bodies (may contain sensitive data)
      if (event.request) {
        delete event.request.data;
      }
      return event;
    },
  });
}
