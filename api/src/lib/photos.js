// Pure helpers for the bird-photo blob layout produced by the FamilyWebsite tooling
// (tools/rescale_images.py + tools/upload_bird_photos.py):
//
//   <family>/<commonName>/photos/<imageName>/<imageName>_thumbnail_200x200.jpg
//   <family>/<commonName>/photos/<imageName>/<imageName>_medium_800x600.jpg
//   <family>/<commonName>/photos/<imageName>/<imageName>_large_1920x1440.jpg
//   <family>/<commonName>/photos/<imageName>/<imageName>_original.jpg
//
// Table rows (table "birds"): PartitionKey "family-<family lowercased>",
// RowKey "<common name lowercased, spaces -> dashes>", plus family, commonName,
// optional scientificName and description ("TBD" when unset).

const VARIANT_RE = /_(thumbnail|medium|large)_\d+x\d+\.(jpe?g|png)$/i;

/**
 * Group a flat list of blob names (all under one species prefix) into photos,
 * one per source image, with the variants that exist for it.
 * Originals are ignored: they are too heavy to serve on the page.
 */
function groupVariants(blobNames) {
  const byImage = new Map();
  for (const name of blobNames) {
    const match = name.match(VARIANT_RE);
    if (!match) continue;
    const variant = match[1].toLowerCase();
    const imageKey = name.slice(0, match.index); // path up to the variant suffix
    if (!byImage.has(imageKey)) byImage.set(imageKey, { id: imageKey.split("/").pop() });
    byImage.get(imageKey)[variant] = name;
  }
  return [...byImage.values()]
    .filter((p) => p.medium || p.large)
    .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
}

function speciesPrefix(bird) {
  return `${bird.family}/${bird.commonName}/photos/`;
}

function slugify(text) {
  return String(text).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function cleanText(value) {
  if (value == null) return null;
  const text = String(value).trim();
  if (!text || /^tbd$/i.test(text)) return null;
  return text;
}

module.exports = { groupVariants, speciesPrefix, slugify, cleanText, VARIANT_RE };
