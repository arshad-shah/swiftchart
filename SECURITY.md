# Security Policy

## Supported versions

| Version | Supported |
|---------|-----------|
| `1.x`   | Yes       |
| `< 1.0` | No        |

Only the latest minor of the current major receives security fixes. Older
majors stop receiving fixes when a new major is released.

## Reporting a vulnerability

**Please do not open a public GitHub issue for security problems.**

If you believe you have found a security vulnerability in SwiftChart, report
it privately so we can investigate and ship a fix before it becomes public.

Use one of the two channels below.

### 1. GitHub private vulnerability reporting (preferred)

Open a report at
<https://github.com/arshad-shah/swiftchart/security/advisories/new>.

GitHub will notify the maintainer privately and provide a private workspace
where we can collaborate on the fix.

### 2. Email

Send a description of the issue to **shaharshad57@gmail.com**. Include:

- A clear description of the issue.
- A minimal reproduction (data shape, config, repro steps).
- The affected version(s) of `@arshad-shah/swift-chart`.
- Your assessment of impact and any suggested mitigation.

## What to expect

- **Acknowledgement** within 48 hours.
- A **CVE-worthiness assessment** within 7 days.
- A **patch and coordinated disclosure** typically within 30 days, faster for
  high-severity issues.

After the fix ships, we publish a GitHub Security Advisory and credit the
reporter unless they prefer to remain anonymous.

## In scope

- Cross-site scripting (XSS) via labels, tooltips, themes, or data fields.
- Prototype pollution via the data resolver or theme registry.
- Denial of service via crafted data shapes that hang the renderer.
- Memory leaks in the streaming buffer or chart lifecycle.
- Type unsoundness that allows runtime injection.

## Out of scope

- Vulnerabilities in your application code that pass user input straight to
  HTML APIs (use `escapeHtml` from `@arshad-shah/swift-chart`).
- Vulnerabilities in transitive dev dependencies that don't ship in
  `dist/` (run `pnpm audit` on your own application instead).
- Issues that require a hostile build environment (e.g. compromised
  `node_modules`).
- Browser version regressions on browsers older than the documented
  support matrix.
