import type { GeographicProfileData, GeographicSource } from '../profiles/schema';

interface Props { profile: GeographicProfileData; sources: ReadonlyMap<string, GeographicSource> }
const number = new Intl.NumberFormat('en-PH');
const date = new Intl.DateTimeFormat('en-PH', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
export function referenceDate(value: string) {
  return date.format(new Date(`${value}T00:00:00Z`));
}
const linkClass = 'underline decoration-text-secondary/50 underline-offset-2 hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2';

function Citations({ ids, sources }: { ids: string[]; sources: Props['sources'] }) {
  return <span className="text-[11px] text-text-secondary">{ids.map((id, index) => {
    const source = sources.get(id)!;
    return <span key={id}>{index > 0 && ' · '}<a className={linkClass} href={source.url} target="_blank" rel="noopener noreferrer">{source.label}</a></span>;
  })}</span>;
}

/** Profile strings remain React text nodes, including all editorial content. */
export function GeographicProfile({ profile, sources }: Props) {
  const ids = new Set([
    ...profile.metrics.flatMap(metric => metric.sourceIds), ...profile.notices.flatMap(notice => notice.sourceIds),
    ...profile.sections.flatMap(section => section.paragraphs.flatMap(paragraph => paragraph.sourceIds)),
    ...profile.notes.flatMap(note => note.sourceIds),
  ]);
  return <article data-profile-key={profile.key} aria-label={`${profile.name} geographic profile`} className="space-y-5 text-[13px] leading-[1.65] [overflow-wrap:anywhere]">
    {profile.notices.map(notice => <aside key={notice.title} aria-label={notice.title} className="border-l-2 border-geographic-border bg-map px-3 py-2.5">
      <h2 className="mb-1 text-[13px] font-semibold">{notice.title}</h2>
      <p>{notice.text}</p><Citations ids={notice.sourceIds} sources={sources} />
    </aside>)}
    <section aria-label="At a Glance">
      <h2 className="mb-2.5 text-[14px] font-semibold">At a Glance</h2>
      <p className="mb-2.5 text-[11px] text-text-secondary">{profile.coverage}</p>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-3">
        {profile.metrics.map(metric => <div key={metric.id} data-metric={metric.id} className="min-w-0 border-b border-divider pb-2">
          <dt className="text-[11px] text-text-secondary">{metric.label}</dt>
          <dd>
            <div className={metric.status === 'verified' ? 'text-[18px] leading-[1.4] font-semibold tabular-nums' : 'text-[13px] font-medium'}>
              {metric.status === 'verified' ? <>{metric.approximate && '≈ '}{typeof metric.value === 'number' ? number.format(metric.value) : metric.value}</> : metric.status === 'unverified' ? 'Not verified' : 'Data unavailable'}
            </div>
            {metric.unit && metric.status === 'verified' && <div className="text-[11px] text-text-secondary">{metric.unit}</div>}
            {metric.referenceDate && <div className="text-[11px] text-text-secondary">As of <time dateTime={metric.referenceDate}>{referenceDate(metric.referenceDate)}</time></div>}
            {metric.note && <p className="mt-1 text-[11px] leading-[1.5] text-text-secondary">{metric.note}</p>}
            {metric.sourceIds.length > 0 && <Citations ids={metric.sourceIds} sources={sources} />}
          </dd>
        </div>)}
      </dl>
    </section>
    {profile.sections.map(section => <section key={section.title} aria-label={section.title} className="border-t border-divider pt-3">
      <h2 className="mb-2 text-[14px] font-semibold">{section.title}</h2>
      {section.paragraphs.map((paragraph, index) => <div key={index} className="mb-2 last:mb-0"><p>{paragraph.text}</p><Citations ids={paragraph.sourceIds} sources={sources} /></div>)}
    </section>)}
    <section aria-label="Sources and Data Notes" className="border-t border-divider pt-3">
      <h2 className="mb-2 text-[14px] font-semibold">Sources and Data Notes</h2>
      {profile.notes.map((note, index) => <div key={index} className="mb-3"><p>{note.text}</p><Citations ids={note.sourceIds} sources={sources} /></div>)}
      <p className="mb-3 text-[11px] text-text-secondary">Sources checked <time dateTime={profile.checkedDate}>{referenceDate(profile.checkedDate)}</time>. Reference dates differ by statistic.</p>
      <ul className="space-y-3 text-[11px] text-text-secondary">
        {[...ids].map(id => { const source = sources.get(id)!; return <li key={id}>
          <a href={source.url} className={linkClass} target="_blank" rel="noopener noreferrer">{source.title}</a>
          <p>{source.publisher}{source.publishedDate && <> · Published <time dateTime={source.publishedDate}>{referenceDate(source.publishedDate)}</time></>}</p>
          {source.note && <p>{source.note}</p>}
        </li>; })}
      </ul>
    </section>
  </article>;
}
