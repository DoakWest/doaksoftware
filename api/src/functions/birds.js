const { app } = require("@azure/functions");
const { listEntities, listBlobNames, signedUrl } = require("../lib/storage");
const { groupVariants, speciesPrefix, slugify, cleanText } = require("../lib/photos");

const TABLE = process.env.AZURE_STORAGE_TABLE_BIRDS || "birds";
const CONTAINER = process.env.AZURE_STORAGE_CONTAINER_BIRDS || "bird-photos";

// SAS links live for 60 minutes; the assembled response is reused for 30,
// so any URL handed to a browser is good for at least 30 minutes.
const SAS_LIFETIME_MS = 60 * 60 * 1000;
const CACHE_TTL_MS = 30 * 60 * 1000;

let cache = null; // { body, expiresAt }

async function buildCatalog() {
  const expiresOn = new Date(Date.now() + SAS_LIFETIME_MS);
  const rows = await listEntities(TABLE);

  const species = await Promise.all(
    rows.map(async (row) => {
      if (!row.family || !row.commonName) return null;
      const photos = groupVariants(await listBlobNames(CONTAINER, speciesPrefix(row)));
      if (photos.length === 0) return null;
      const sign = (name) => (name ? signedUrl(CONTAINER, name, expiresOn) : null);
      return {
        id: slugify(`${row.family}-${row.commonName}`),
        commonName: row.commonName,
        scientificName: cleanText(row.scientificName),
        family: row.family,
        description: cleanText(row.description),
        photos: photos.map((p) => {
          const medium = sign(p.medium) || sign(p.large);
          return {
            id: p.id,
            thumb: sign(p.thumbnail) || medium,
            medium,
            large: sign(p.large) || medium,
          };
        }),
      };
    })
  );

  const found = species.filter(Boolean);
  const families = new Map();
  for (const s of found) {
    if (!families.has(s.family)) families.set(s.family, []);
    families.get(s.family).push(s);
  }

  return {
    generatedAt: new Date().toISOString(),
    speciesCount: found.length,
    photoCount: found.reduce((n, s) => n + s.photos.length, 0),
    families: [...families.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([family, list]) => ({
        family,
        species: list.sort((a, b) => a.commonName.localeCompare(b.commonName)),
      })),
  };
}

app.http("birds", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "birds",
  handler: async (request, context) => {
    try {
      if (!cache || cache.expiresAt <= Date.now()) {
        cache = { body: await buildCatalog(), expiresAt: Date.now() + CACHE_TTL_MS };
      }
      return {
        status: 200,
        jsonBody: cache.body,
        headers: { "Cache-Control": "public, max-age=600" },
      };
    } catch (error) {
      context.error("Failed to build bird catalog", error);
      return { status: 502, jsonBody: { error: "Bird photos are unavailable right now." } };
    }
  },
});
