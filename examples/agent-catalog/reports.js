// Private research reports. The catalog route sells the titles; each body costs
// extra. Titles are deliberately ambiguous, since several sound supply-chain-ish, so
// a buying agent has to spend to find out which one actually flags a risk. That's the
// point of the demo: the answer is only reachable by paying.

export const REPORTS = [
  {
    id: 1,
    title: "Q3 logistics review: Southeast Asia corridors",
    body: "Transit times on the Singapore-Rotterdam lane improved 4 days QoQ after the carrier switch. Port dwell is within target at every hub. No structural concerns; recommend keeping the current routing through Q1.",
  },
  {
    id: 2,
    title: "Employee engagement survey, H1 2026",
    body: "Response rate 81%. Engagement up 6 points, driven by the remote-work policy change. Lowest-scoring area remains internal mobility.",
  },
  {
    id: 3,
    title: "Vendor concentration: tier-2 component sourcing",
    body: "SUPPLY CHAIN RISK. 78% of tier-2 connector volume originates from a single fab in Kaohsiung, and our two qualified alternates are both downstream of that same fab for substrate. A 6-week outage there halts three product lines. Recommend qualifying a non-Taiwan substrate source before Q2 and holding 90 days of buffer stock in the interim.",
  },
  {
    id: 4,
    title: "Office lease renewal analysis, Buenos Aires",
    body: "Renewing at the offered rate is 12% above market comparables. Two alternative sites within 8 blocks would cut annual cost by roughly USD 40k at equivalent square footage.",
  },
  {
    id: 5,
    title: "Cloud spend optimization opportunities",
    body: "Committed-use discounts on the three largest instance families would save an estimated 23%. Idle staging environments account for 11% of monthly spend.",
  },
  {
    id: 6,
    title: "Supplier audit findings, 2026",
    body: "All 14 tier-1 suppliers passed the annual audit. Two minor nonconformities on documentation, both closed within 30 days. No sourcing or continuity issues identified at tier 1.",
  },
  {
    id: 7,
    title: "Customer churn drivers in the SMB segment",
    body: "Churn concentrates in accounts that never completed onboarding step 3. Price is cited but is rarely the leading cause in exit interviews.",
  },
  {
    id: 8,
    title: "Warehouse automation pilot results",
    body: "Pick rates up 34% in the pilot aisle. Payback period estimated at 19 months. Recommend expanding to two more aisles before committing to a full rollout.",
  },
  {
    id: 9,
    title: "FX exposure and hedging policy review",
    body: "Unhedged ARS exposure is the largest single currency risk. Current policy covers only EUR and JPY receivables; extending it would cost roughly 40bps.",
  },
  {
    id: 10,
    title: "Brand sentiment tracker, Q3",
    body: "Net sentiment flat QoQ. Mentions up 18% on the back of the product launch, with the increase split evenly between positive and neutral.",
  },
  {
    id: 11,
    title: "Inbound freight cost variance",
    body: "Freight came in 9% over budget, entirely explained by spot-rate exposure on two expedited shipments. Contracted lanes were on budget. No carrier or capacity problems.",
  },
  {
    id: 12,
    title: "Data retention policy compliance gaps",
    body: "Three systems retain personal data past the 24-month policy limit. Remediation is straightforward in two; the legacy CRM export needs engineering time.",
  },
];

export const CATALOG = REPORTS.map(({ id, title }) => ({ id, title }));

export const SYNTHESIS =
  "Cross-report analysis: the dominant enterprise risk is vendor concentration (report 3), not freight or logistics (reports 1, 11), both of which are cost variances rather than continuity threats. The tier-1 audit (report 6) gives false comfort because the exposure sits at tier 2, one level below audit scope.";
