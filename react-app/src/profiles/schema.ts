import { z } from 'zod';

const text = z.string().trim().min(1);
const references = z.array(text).min(1);
const sourceSchema = z.object({
  id: text, label: text, title: text, publisher: text,
  url: z.url().refine(value => {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  }, 'Sources must use HTTPS without embedded credentials'),
  publishedDate: z.iso.date().nullable(), checkedDate: z.iso.date(),
  note: text.optional(),
});
const metricSchema = z.object({
  id: text, label: text, unit: text.optional(),
  status: z.enum(['verified', 'unavailable', 'unverified']),
  value: z.union([z.number().nonnegative().finite(), text]).nullable(),
  referenceDate: z.iso.date().nullable(), sourceIds: z.array(text),
  approximate: z.boolean().optional(), note: text.optional(),
}).superRefine((metric, ctx) => {
  if (metric.status === 'verified' && (metric.value === null || !metric.referenceDate || !metric.sourceIds.length)) {
    ctx.addIssue({ code: 'custom', message: 'Verified statistics need a value, reference date and source' });
  }
  if (metric.status !== 'verified' && (metric.value !== null || !metric.note)) {
    ctx.addIssue({ code: 'custom', message: 'Unavailable/unverified statistics must withhold the value and explain why' });
  }
});
const proseSchema = z.object({ text, sourceIds: references });
export const geographicProfileSchema = z.object({
  key: text,
  level: z.enum(['national', 'region']), psgc: z.string().regex(/^\d{10}$/).nullable(),
  name: text, levelLabel: text, subtitle: text, coverage: text,
  checkedDate: z.iso.date(), metrics: z.array(metricSchema).min(1),
  sections: z.array(z.object({
    title: z.enum(['Geography and Location', 'History and Administration', 'Economy and Culture']),
    paragraphs: z.array(proseSchema).min(1),
  })).length(3),
  notices: z.array(z.object({ title: text, text, sourceIds: references })),
  notes: z.array(proseSchema).min(1),
}).superRefine((profile, ctx) => {
  const expected = profile.level === 'national' ? 'national' : `region:${profile.psgc}`;
  if (profile.key !== expected || (profile.level === 'region' && !profile.psgc) || (profile.level === 'national' && profile.psgc !== null)) {
    ctx.addIssue({ code: 'custom', message: 'Profile key must agree with its level and stable PSGC' });
  }
  if (new Set(profile.sections.map(section => section.title)).size !== 3) ctx.addIssue({ code: 'custom', message: 'Each named section is required once' });
  if (new Set(profile.metrics.map(metric => metric.id)).size !== profile.metrics.length) ctx.addIssue({ code: 'custom', message: 'Duplicate statistic ID' });
});

export type GeographicProfileData = z.infer<typeof geographicProfileSchema>;
export type GeographicSource = z.infer<typeof sourceSchema>;
export interface ProfileCatalog { profiles: Map<string, GeographicProfileData>; sources: Map<string, GeographicSource> }

export function parseProfileCatalog(profilesInput: unknown, sourcesInput: unknown): ProfileCatalog {
  const profiles = z.array(geographicProfileSchema).parse(profilesInput);
  const sources = z.array(sourceSchema).parse(sourcesInput);
  const catalog = { profiles: new Map(profiles.map(profile => [profile.key, profile])), sources: new Map(sources.map(source => [source.id, source])) };
  if (catalog.profiles.size !== profiles.length || catalog.sources.size !== sources.length) throw new Error('Duplicate profile or source ID');
  for (const profile of profiles) {
    const ids = [
      ...profile.metrics.flatMap(metric => metric.sourceIds),
      ...profile.sections.flatMap(section => section.paragraphs.flatMap(paragraph => paragraph.sourceIds)),
      ...profile.notices.flatMap(notice => notice.sourceIds), ...profile.notes.flatMap(note => note.sourceIds),
    ];
    if (ids.some(id => !catalog.sources.has(id))) throw new Error('Profile references an unknown source');
  }
  return catalog;
}

export function loadProfileCatalog(profilesInput: unknown, sourcesInput: unknown) {
  try { return { status: 'ready', catalog: parseProfileCatalog(profilesInput, sourcesInput) } as const; }
  catch { return { status: 'error', message: 'Geographic profile unavailable. Showing existing location details.' } as const; }
}
