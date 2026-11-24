# doaksoftware.ca

Static site on Azure Static Web Apps, with one managed Functions API for the birding page.

```
index.html               Home page
birding/index.html       Bird photography gallery (calls /api/birds)
Files/                   Résumé PDF and images
assets/nav.css, nav.js   Shared header nav (Home + Projects dropdown)
api/                     Azure Functions (Node 20, v4 model), deployed by the SWA workflow
staticwebapp.config.json Routes, API runtime, headers
```

## Adding a project page

Create `<name>/index.html`, link `../assets/nav.css` and `../assets/nav.js`, and copy the
`<nav class="site-nav">` block from an existing page. Then add a `<li>` for the new page to the
`menu-panel` list in **every** page's nav (currently `index.html` and `birding/index.html`).

## Birding page

Photos and species data come from the same Azure Storage account as FamilyWebsite
(`Documents\Workspace\AI\FamilyWebsite`), using its tooling and layout:

- **Table `birds`**: PartitionKey `family-<family lowercased>`, RowKey `<common-name-lowercased-dashed>`,
  fields `family`, `commonName`, optional `scientificName`, `description` (`TBD` is hidden).
- **Container `bird-photos`** (private):
  `<Family>/<Common Name>/photos/<image>/<image>_{thumbnail_200x200|medium_800x600|large_1920x1440|original}.jpg`

Adding photos (from FamilyWebsite/tools):

```bash
python identify_birds.py                         # sort LocalPhotos/Organize into Family/Common Name/photos
python rescale_images.py -c rescale_config.json  # writes LocalPhotos/ToUpload with size variants
python upload_bird_photos.py --source ../LocalPhotos/ToUpload   # uploads + creates table rows
```

`GET /api/birds` reads the table, lists each species' blobs, and returns read-only SAS URLs
(60 min) grouped by family. Responses are cached in memory for 30 minutes, so new uploads
appear within half an hour without a redeploy. Species with no rescaled photos are left out;
originals are never served.

### Configuration

In the Azure portal: Static Web App → Settings → Environment variables, add:

| Name | Value |
| --- | --- |
| `AZURE_STORAGE_CONNECTION_STRING` | same as FamilyWebsite `.env` |
| `AZURE_STORAGE_CONTAINER_BIRDS` | `bird-photos` (optional, default) |
| `AZURE_STORAGE_TABLE_BIRDS` | `birds` (optional, default) |

### Local development

```bash
cd api && npm install && npm test
cp local.settings.example.json local.settings.json   # fill in the connection string (gitignored)
npm i -g @azure/static-web-apps-cli azure-functions-core-tools@4
cd .. && swa start . --api-location api              # http://localhost:4280/birding
```
