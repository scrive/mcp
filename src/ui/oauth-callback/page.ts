import { scriveLogoDataUrl } from "./scrive-logo.js";

export type CallbackStatus = "success" | "denied";

interface PageContent {
  title: string;
  heading: string;
  body: string;
  icon: "check" | "cross";
  accent: "green" | "red";
}

const PAGES: Record<CallbackStatus, PageContent> = {
  success: {
    title: "Authorization successful — Scrive",
    heading: "Authorization successful",
    body: "You can close this tab and return to the terminal.",
    icon: "check",
    accent: "green",
  },
  denied: {
    title: "Authorization denied — Scrive",
    heading: "Authorization denied",
    body: "Return to the terminal to try again.",
    icon: "cross",
    accent: "red",
  },
};

const ICONS: Record<PageContent["icon"], string> = {
  check: '<path d="m5 12 5 5L20 7" />',
  cross: '<path d="M6 6l12 12" /><path d="M18 6 6 18" />',
};

export function renderCallbackPage(status: CallbackStatus): string {
  const page = PAGES[status];

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="light" />
    <title>${page.title}</title>
    <style>
      :root {
        --blue: #1a79cb;
        --black: #27282d;
        --brand: #3e494b;
        --grey1: #f2f6f9;
        --grey2: #d8e1eb;
        --grey4: #6a7281;
        --green: #20883e;
        --red: #e00040;
        --white: #ffffff;

        --radius: 8px;
        --font:
          system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      }

      * {
        box-sizing: border-box;
      }

      html,
      body {
        margin: 0;
        padding: 0;
      }

      body {
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: var(--black);
        color: var(--black);
        font-family: var(--font);
        font-size: 0.875rem;
        line-height: 1.5;
        -webkit-font-smoothing: antialiased;
      }

      .card {
        width: min(24rem, calc(100vw - 32px));
        padding: 40px 32px;
        background: var(--white);
        border-radius: var(--radius);
        box-shadow:
          0 1px 2px #00000040,
          0 8px 24px #00000033;
        text-align: center;
      }

      .logo {
        display: block;
        width: 132px;
        height: auto;
        margin: 0 auto 32px;
      }

      .icon-circle {
        width: 56px;
        height: 56px;
        border-radius: 999px;
        display: grid;
        place-items: center;
        margin: 0 auto 20px;
      }

      .icon-circle.green {
        background: #e8f5ec;
        color: var(--green);
      }

      .icon-circle.red {
        background: #fbe6ec;
        color: var(--red);
      }

      .icon-circle svg {
        width: 28px;
        height: 28px;
        stroke: currentColor;
        stroke-width: 2.5;
        stroke-linecap: round;
        stroke-linejoin: round;
        fill: none;
      }

      h1 {
        margin: 0 0 8px;
        font-size: 1.125rem;
        font-weight: 600;
        color: var(--black);
        letter-spacing: -0.01em;
      }

      p {
        margin: 0;
        font-size: 0.875rem;
        color: var(--grey4);
      }
    </style>
  </head>
  <body>
    <main class="card">
      <img class="logo" src="${scriveLogoDataUrl}" alt="Scrive" />
      <div class="icon-circle ${page.accent}" aria-hidden="true">
        <svg viewBox="0 0 24 24">${ICONS[page.icon]}</svg>
      </div>
      <h1>${page.heading}</h1>
      <p>${page.body}</p>
    </main>
  </body>
</html>
`;
}
