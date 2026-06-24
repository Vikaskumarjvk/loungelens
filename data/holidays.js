/*
 * TripLens — India FIXED-date national holidays only.
 *
 * HONESTY: every holiday here has a date that NEVER moves year to year, so the
 * weekday is pure math for any year — we can ship it safely. Movable festivals
 * (Diwali, Holi, Eid, Dussehra, etc.) shift every year and differ by state, so
 * they are NOT here — the app lets you add those yourself from your official
 * company/state holiday list, and the same long-weekend math runs on them.
 *
 * `md` is MM-DD; the engine prepends the year you're planning for.
 */
window.LL_HOLIDAYS = {
  fixed: [
    { md: "01-01", name: "New Year's Day" },
    { md: "01-26", name: "Republic Day" },
    { md: "05-01", name: "May Day / Labour Day" },
    { md: "08-15", name: "Independence Day" },
    { md: "10-02", name: "Gandhi Jayanti" },
    { md: "12-25", name: "Christmas" },
  ],
  note: "Fixed-date national holidays only. Add movable festivals (Diwali, Holi, Eid, etc.) yourself from your official holiday list — they change every year and by state, so I won't guess them.",
  lastReviewed: "2026-06-24",
};
