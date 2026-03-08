"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.default = RootLayout;
require("./globals.css");
require("@/styles/tokens.css");
const Header_1 = require("@/components/site/Header");
const Footer_1 = require("@/components/site/Footer");
const seo_1 = require("@/lib/seo");
exports.metadata = (0, seo_1.buildMetadata)({
    title: "Topicality",
    description: "Topicality builds, studies, and deploys complex systems—products, research, and initiatives designed for trust, clarity, and iteration.",
    path: "/"
});
function RootLayout({ children }) {
    return (<html lang="en">
      <body>
        <a className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-black focus:px-3 focus:py-2 focus:text-white" href="#content">
          Skip to content
        </a>
        <div className="min-h-dvh bg-[var(--bg)] text-[var(--fg)]">
          <Header_1.Header />
          <main id="content" className="mx-auto w-full max-w-6xl px-5 py-10">
            {children}
          </main>
          <Footer_1.Footer />
        </div>
      </body>
    </html>);
}
