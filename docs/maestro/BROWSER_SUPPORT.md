# Browser Support Matrix

This document outlines the targeted browser and operating system configurations for Intelgraph Maestro, along with known limitations and specific considerations for "Tor mode."

## Targeted Browsers and Operating Systems

We target the following browser and operating system combinations for optimal performance and full feature compatibility.

| Browser | Version Range           | Operating Systems           |
| :------ | :---------------------- | :-------------------------- |
| Chrome  | [Specify Version Range] | macOS, Windows, Ubuntu      |
| Edge    | [Specify Version Range] | Windows, macOS, Ubuntu      |
| Safari  | [Specify Version Range] | macOS, iOS (for mobile web) |
| Firefox | [Specify Version Range] | macOS, Windows, Ubuntu      |

**Note on "Comet":** We are verifying "Comet" as a target browser. If it is not a real target, Edge will be considered the default alternative.

## Known Limitations

The following are general limitations that may affect user experience across various browsers or specific configurations:

- **Media Playback:** Certain media formats or DRM-protected content may have varying support or performance across browsers.
- **Third-Party Iframes:** Security policies and browser features may restrict functionality or content within third-party iframes.
- **Storage Limits:** Browser-imposed storage limits (e.g., for local storage, indexedDB) may affect offline capabilities or large data caching.

## Tor Mode Notes

When accessing Intelgraph Maestro via a Tor proxy, users should be aware of the following specific characteristics and limitations:

- **Reduced Performance:** Due to the nature of the Tor network, expect significantly reduced network performance and increased latency.
- **Blocked Third-Party Iframes/CSP:** Strict Content Security Policies (CSP) and browser security features, often enhanced in Tor environments, may block third-party iframes and other external resources.
- **Anonymity Considerations:** While Tor enhances anonymity, users should still follow best practices for secure browsing.

## Accessibility (A11y) Baseline

We aim to maintain a high standard of accessibility. An automated accessibility baseline is established through axe integration, with per-page violation summaries emitted to artifacts during CI runs. Our goal is to achieve 0 critical violations on core pages.
