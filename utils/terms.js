// How long a published memorial stays online. The family chooses once and
// pays once; nothing renews by itself.
const TERMS = {
  "1y": { label: "1 year", years: 1 },
  "5y": { label: "5 years", years: 5 },
  permanent: { label: "Permanent", years: null },
};

const DAY = 24 * 60 * 60 * 1000;

exports.TERMS = TERMS;

exports.isTerm = (value) => typeof value === "string" && Object.hasOwn(TERMS, value);

// The date a term ends when it starts on `from`. Permanent has no end.
exports.endOfTerm = (term, from) => {
  const { years } = TERMS[term];
  if (years === null) return null;
  const end = new Date(from);
  end.setUTCFullYear(end.getUTCFullYear() + years);
  return end;
};

// No end date means permanent, which is also how memorials published before
// terms existed are treated.
exports.hasEnded = (memorial, now = new Date()) =>
  Boolean(memorial.expiresAt) && memorial.expiresAt <= now;

exports.daysLeft = (memorial, now = new Date()) =>
  memorial.expiresAt ? Math.ceil((memorial.expiresAt - now) / DAY) : null;

// Query condition for memorials whose time online hasn't ended
exports.stillOnline = (now = new Date()) => ({
  $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
});
