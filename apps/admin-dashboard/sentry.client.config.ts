// Runs client-side in the browser — only active in production (when DSN is set)

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_GLITCHTIP_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.05,

    beforeSend(event) {
      // Remove user data (GDPR)
      delete event.user;

      // Strip authorization headers from captured requests
      if (event.request?.headers) {
        delete event.request.headers["Authorization"];
        delete event.request.headers["authorization"];
      }

      return event;
    },

    ignoreErrors: [
      "ResizeObserver loop limit exceeded",
      "Non-Error promise rejection captured",
      /^NetworkError/,
      /^AbortError/,
    ],
  });
}
