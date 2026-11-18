---
name: financial-dashboard-qa
description: Audit consistency of financial movements, KPI calculations, monthly aggregates, and dashboard states across the FastAPI and React/TypeScript layers. Use when changing or reviewing financial data, dates, calculations, empty/error/loading states, or dashboard charts.
---

# Financial Dashboard QA

## Objective

Prevent financially misleading or inconsistent results when the same movement data passes from FastAPI through TypeScript calculations into KPI cards and monthly charts. This skill documents the current repository behavior; it does not define new business rules.

## Inputs

Before reviewing, inspect only the paths relevant to the change:

- `backend/app/routes.py` for Pydantic response models, endpoint filters, and generated mock data.
- `frontend/src/lib/financial-types.ts` for the TypeScript movement and metric shapes.
- `frontend/src/App.tsx` for `/api/metrics`, state transitions, and wiring into the dashboard.
- `frontend/src/lib/financial-utils.ts` for KPI totals, monthly grouping, date labels, and formatters.
- `frontend/src/components/dashboard/kpi-row.tsx` and `kpi-card.tsx` for KPI presentation.
- `frontend/src/components/dashboard/income-outcome-chart.tsx` and `profit-percent-chart.tsx` for chart visibility and data rendering.
- `frontend/src/lib/financial-utils.test.ts` and `backend/tests/test_routes.py` for existing behavioral coverage.
- `frontend/package.json`, `backend/requirements.txt`, and applicable `.agents/rules/` to verify available commands and local constraints.

Use `memory-bank/` for the latest recorded project facts, but confirm relevant behavior in source before relying on it.

## Procedure

1. **Trace the actual path.** Start at the endpoint consumed by `App.tsx`, confirm its response model and parameters in `routes.py`, then trace the returned fields through the TypeScript types, utility functions, KPI cards, and charts. Do not treat an implemented endpoint as a UI consumer unless the frontend calls it.
2. **Keep the data states distinct.** Identify how the current code represents not-yet-loaded data, request failure, a loaded empty array, and a loaded non-empty array. Check all of the period label, status/error message, KPI values, and chart fallback for consistency. In JavaScript an empty array is truthy; do not infer that it means loading or missing data.
3. **Check financial values without inventing policy.** Follow the existing formulas for income, outcome, profit, and profit percentage. A calculated zero can be a valid result for existing movements; it is not evidence that data are absent. A zero denominator is a separate case. If the desired display or business meaning is unspecified, report the ambiguity and ask for a decision rather than defining a new rule.
4. **Check calendar semantics.** Backend `create_date` is a calendar date serialized as ISO text and the TypeScript field is a string. Verify monthly grouping uses the `YYYY-MM` calendar portion, chronological ordering is preserved, and a first-of-month date stays in its month in a negative-offset timezone. Do not convert a date-only value to a UTC instant and then group with local getters.
5. **Compare aggregate consistency.** For representative movements, independently check that KPI income/outcome totals, net profit, and margin follow the existing formulas, and that monthly chart points aggregate the same movements by month. Record whether tests check values or only response shape.
6. **Check request states and response emptiness.** Verify `response.ok`, network/HTTP error handling, and completion of the loading state. Inspect the actual endpoint defaults and filters before claiming an empty result is a normal runtime path. In this repository the default metrics route generates seeded mock movements; filters or future consumers may still produce an empty list.
7. **Choose verification proportional to the change.** Use current test and lint/build scripts. For UI-only behavior not covered by the utility tests, report that gap and use an available running-app/browser check; do not claim a component or browser test from a pure utility test. Do not add testing dependencies without approval.
8. **Separate finding from fix.** State evidence, affected functions/components, user/data impact, and a minimal proposed correction. Do not change API contracts, financial semantics, or empty-versus-zero behavior without authorization.

## Outputs

Deliver a concise report containing:

- The endpoint-to-UI data path and the exact behavior observed.
- Findings with file/function locations and concrete input/output examples where possible.
- Which tests or runtime checks were run, their results, and what they do not cover.
- Proposed correction or explicit product decision required; distinguish audit-only work from implemented work.

## Acceptance Criteria

A review is complete only when:

- The API response shape and the frontend fields/consumers have been traced from source.
- Loading, error, empty-list, and non-empty-list states have been checked separately.
- Empty movements, non-empty zero-profit movements, and zero-denominator cases have been checked separately. If the implementation conflates any of them, record it as a finding; do not require or make a fix during an audit-only task.
- Any ambiguity in the business meaning of a zero denominator is explicit and referred for a product decision rather than resolved by the agent.
- Monthly grouping and date-only timezone behavior are checked or clearly marked unverified.
- Existing test coverage is assessed by assertions made, not inferred from a passing suite.
- Every conclusion is backed by a source location or an executed check, and no new business rule or API contract is assumed.

## Repository Verification Commands

These commands were confirmed in the repository scripts/files:

```bash
cd frontend && npm test -- src/lib/financial-utils.test.ts
cd frontend && npm run lint
cd frontend && npm run build
cd backend && pytest tests/test_routes.py
```

Use the local commands when the frontend or backend dependencies are installed in the host environment. Use the Docker Compose equivalents when validating inside the project's service containers; `docker compose exec` requires those services to be running.

```bash
docker compose exec -T frontend npm run lint
docker compose exec -T frontend npm run build
docker compose exec -T frontend npm test
docker compose exec -T backend pytest tests/test_routes.py
```

Run only checks relevant to the touched layer. For the date-boundary test, execute Vitest with a negative-offset timezone, for example:

```bash
cd frontend && TZ=America/Los_Angeles npm test -- src/lib/financial-utils.test.ts
```

The full local stack is documented as `docker compose up --build`; frontend and backend are published on ports 5173 and 8000 respectively. Use the actual environment's available browser tools for runtime verification.

## Limitations

- Backend movements are generated mock data; do not describe them as persisted or real financial records.
- The default `/api/metrics` route generates a seeded full-year set of 360 movements; the frontend currently calls it without filters. Do not claim that an empty response is the default endpoint behavior.
- The backend also has summary and filter endpoints that the current dashboard may not consume. Confirm call sites before comparing them to displayed values.
- `computeKPIs([])` returns zero totals, while `computeMonthlyData([])` returns no monthly points. Chart components also use value-based visibility checks. Treat these as implementation facts, not approved product semantics.
- With income absent, `computeKPIs` returns a zero profit percentage. Do not reinterpret that as a mathematically defined margin unless product requirements say so.
- Do not change schemas, API parameters, formulas, or empty/zero presentation during an audit-only task. Escalate unclear business choices and obtain authorization before implementing them.
