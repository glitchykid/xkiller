# Development and testing

Use small end-to-end tracer bullets: define one observable behavior, test it, implement it through the required layers, then verify it in the desktop application. Keep the architecture explicit before changing boundaries, while avoiding speculative features. Apply DRY, KISS, SOLID and YAGNI to the smallest useful design.

## TDD workflow

For new behavior and bug fixes, write a focused test first. Run it and confirm that it fails for the intended reason. Implement the smallest change that makes it pass, then refactor with the test still passing. A test that already passes records an existing invariant; it is not evidence of a reproduced defect. Add meaningful boundary and failure cases rather than tests that merely repeat the implementation.

Use the C# checks for research, accounting and validation rules, and the client checks for pure presentation logic, preferences, translations and the Electron boundary. Exercise browser and packaged-desktop integration when the behavior depends on rendering, process startup or IPC. Visual-only spacing changes need visual verification rather than assertions of CSS constants.

## Boundary checklist

Choose cases that apply to the change:

- Empty, single-record, exact-page and partial-page collections; first/last pages; filtering and resizing while viewing a later page; repeated state polling.
- Minimum/maximum accepted settings, values just outside the range, nonfinite numbers and invalid combinations.
- Missing or malformed state, legacy preferences, dataset/model mismatches and preservation of the last committed workspace on failure or cancellation.
- Chronological boundaries, unfinished candles, label horizons and prevention of future-data leakage.
- Both trade directions, simultaneous stop/take hits, zero trades, fees, funding, drawdown limits and cash/ledger reconciliation.
- All six languages, longer translations, keyboard navigation, the minimum desktop area, empty results and in-progress states.

No finite checklist establishes correctness for every possible input. Record the tested cases and remaining limitations accurately in [VERIFICATION.md](VERIFICATION.md).

## Completion

Run `npm run test`, `npm run check` and the checks appropriate to the changed behavior. Build with `npm run package`, launch the actual portable executable against an isolated research workspace, and verify persistence and the affected flow. Update the English README, documentation and release notes. Commit and push the changes, publish a matching version tag, and confirm that GitHub Actions published the executable and checksum.
