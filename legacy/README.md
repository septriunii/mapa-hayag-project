# Runnable legacy references

These are the two applications from baseline commit `e1ad7e6`, with only relative data/geometry paths adapted to their new directory. Root production HTML remains untouched. Serve the repository root over HTTP and open `/legacy/` or `/legacy/index-no-nir.html`. The root data.json and pinned geographic submodule are required. No `<base>` element is used, so hash navigation stays on the legacy page.

The original D3 CDN dependency remains in these references. The automated baseline runner substitutes the same installed D3 7 distribution for reproducible offline tests; it does not rewrite these files.

Original application: https://github.com/tordecilla/ph-drilldown-map
Geographic source: https://github.com/faeldon/philippines-json-maps
