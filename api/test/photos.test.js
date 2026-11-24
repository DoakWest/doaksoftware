const test = require("node:test");
const assert = require("node:assert");
const { groupVariants, cleanText, slugify } = require("../src/lib/photos");

test("groups rescaled variants per source image and drops originals", () => {
  const base = "Accipitridae/Bald Eagle/photos";
  const photos = groupVariants([
    `${base}/IMG_1900/IMG_1900_original.jpg`,
    `${base}/IMG_1900/IMG_1900_large_1920x1440.jpg`,
    `${base}/IMG_1900/IMG_1900_medium_800x600.jpg`,
    `${base}/IMG_1900/IMG_1900_thumbnail_200x200.jpg`,
    `${base}/IMG_1896/IMG_1896_medium_800x600.jpg`,
    `${base}/stray.jpg`,
  ]);
  assert.deepStrictEqual(photos.map((p) => p.id), ["IMG_1896", "IMG_1900"]);
  assert.strictEqual(photos[1].large, `${base}/IMG_1900/IMG_1900_large_1920x1440.jpg`);
  assert.strictEqual(photos[1].original, undefined);
  assert.strictEqual(photos[0].large, undefined);
});

test("skips images with only a thumbnail", () => {
  assert.deepStrictEqual(groupVariants(["F/C/photos/a/a_thumbnail_200x200.jpg"]), []);
});

test("cleanText hides TBD placeholders", () => {
  assert.strictEqual(cleanText("TBD"), null);
  assert.strictEqual(cleanText("  "), null);
  assert.strictEqual(cleanText("Large raptor"), "Large raptor");
});

test("slugify", () => {
  assert.strictEqual(slugify("Ardeidae-Black-crowned Night-Heron"), "ardeidae-black-crowned-night-heron");
});
