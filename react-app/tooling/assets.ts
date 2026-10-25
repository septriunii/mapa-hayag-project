import { cp, mkdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';

const repo = fileURLToPath(new URL('../../', import.meta.url));
const geo = 'philippines-json-maps/2023/geojson';
export const assetPaths = [
  'data.json', 'huc-boundaries.json', 'geo-nir',
  'philippines-json-maps/LICENSE',
  `${geo}/country/lowres`, `${geo}/regions/lowres`, `${geo}/provdists/lowres`,
  ...[1303900000, 1307400000, 1307500000, 1307600000].map(code => `${geo}/provdists/medres/municities-provdist-${code}.0.01.json`),
];

/** Read-only dev mount; production output copies existing files without rewriting them.
 * No symlinks or external runtime URL dependency: dist is self-contained.
 */
export function migrationAssets(): Plugin {
  let outDir: string;
  return {
    name: 'mapahayag-existing-assets',
    configResolved(config) { outDir = path.resolve(config.root, config.build.outDir); },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        try {
          const relative = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname).slice(1);
          if (!assetPaths.some(asset => relative === asset || relative.startsWith(`${asset}/`))) return next();
          const filename = path.resolve(repo, relative);
          if (!filename.startsWith(repo) || !(await stat(filename)).isFile()) return next();
          res.setHeader('Content-Type', relative.endsWith('.json') ? 'application/json' : 'text/plain');
          res.end(await readFile(filename));
        } catch (error) { next(error); }
      });
    },
    async closeBundle() {
      for (const relative of assetPaths) {
        const destination = path.join(outDir, relative);
        await mkdir(path.dirname(destination), { recursive: true });
        // Throws if the pinned submodule isn't initialized. Never build a silently incomplete map.
        await cp(path.join(repo, relative), destination, { recursive: true });
      }
    },
  };
}
