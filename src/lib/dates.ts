// ─── One date format ──────────────────────────────────────────────────────────
//
// Every date the console shows is written the same way as in the Brelo app, day first:
//
//   DD.MM.YY                 a day               08.10.26   (8 October 2026)
//   DD.MM.YY · HH:MM         a day and a time    08.10.26 · 14:20

type DateLike = Date | string | number | null | undefined;

const pad2 = (n: number) => String(n).padStart(2, '0');

// Reads whatever the pages hold: a Date, an ISO string, a bare "YYYY-MM-DD" (a calendar
// day, read as local so it never slips to the day before) or our own "DD.MM.YY".
export function parseDate(v: DateLike): Date | null {
  if (v === null || v === undefined || v === '') return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  if (typeof v === 'string') {
    const s = v.trim();
    const dotted = /^(\d{1,2})\.(\d{1,2})\.(\d{2}|\d{4})$/.exec(s);
    if (dotted) {
      const y = Number(dotted[3]);
      return new Date(y < 100 ? 2000 + y : y, Number(dotted[2]) - 1, Number(dotted[1]));
    }
    const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  }
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

// "08.10.26" — or "" when there's no (readable) date, so callers pick their own blank.
export function fmtDate(v: DateLike): string {
  const d = parseDate(v);
  return d ? `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${pad2(d.getFullYear() % 100)}` : '';
}

// "08.10.26 · 14:20"
export function fmtDateTime(v: DateLike): string {
  const d = parseDate(v);
  return d ? `${fmtDate(d)} · ${pad2(d.getHours())}:${pad2(d.getMinutes())}` : '';
}

// "05.10-11.10.26"; one day when both ends are the same.
export function fmtDateRange(from: DateLike, to: DateLike): string {
  const a = parseDate(from), b = parseDate(to);
  if (!a || !b) return fmtDate(a ?? b);
  const dm = (d: Date) => `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}`;
  if (a.getFullYear() !== b.getFullYear()) return `${fmtDate(a)}-${fmtDate(b)}`;
  if (a.getMonth() === b.getMonth() && a.getDate() === b.getDate()) return fmtDate(a);
  return `${dm(a)}-${dm(b)}.${pad2(b.getFullYear() % 100)}`;
}

// Calendar days travel as "YYYY-MM-DD". The API stores a day as midnight UTC, so the day
// is the first ten characters of its timestamp — never a local-time conversion, which
// would show the day before west of Greenwich.
export const isoDay = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
export const dayOf = (stamp: string | null | undefined) => (stamp ? stamp.slice(0, 10) : '');
export const dayToStamp = (day: string) => (day ? `${day}T00:00:00Z` : '');
export function addDays(day: string, n: number): string {
  const d = parseDate(day) ?? new Date();
  d.setDate(d.getDate() + n);
  return isoDay(d);
}

// Whether a timestamp's local day falls inside [from, to] (both "YYYY-MM-DD", either may be "").
export function inPeriod(stamp: string | null | undefined, from: string, to: string): boolean {
  if (!from && !to) return true;
  const d = parseDate(stamp);
  if (!d) return false;
  const day = isoDay(d);
  return (!from || day >= from) && (!to || day <= to);
}
