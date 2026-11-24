const {
  BlobServiceClient,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
  SASProtocol,
} = require("@azure/storage-blob");
const { TableClient } = require("@azure/data-tables");

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;

function parseConnectionString(cs) {
  const parts = {};
  for (const segment of (cs || "").split(";")) {
    const i = segment.indexOf("=");
    if (i > 0) parts[segment.slice(0, i)] = segment.slice(i + 1);
  }
  return parts;
}

const parsed = parseConnectionString(connectionString);
const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME || parsed.AccountName;
const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY || parsed.AccountKey;

let blobService;
function getBlobService() {
  if (!connectionString) throw new Error("AZURE_STORAGE_CONNECTION_STRING is not configured");
  if (!blobService) blobService = BlobServiceClient.fromConnectionString(connectionString);
  return blobService;
}

async function listEntities(tableName) {
  if (!connectionString) throw new Error("AZURE_STORAGE_CONNECTION_STRING is not configured");
  const client = TableClient.fromConnectionString(connectionString, tableName);
  const rows = [];
  for await (const entity of client.listEntities()) rows.push(entity);
  return rows;
}

async function listBlobNames(containerName, prefix) {
  const container = getBlobService().getContainerClient(containerName);
  const names = [];
  for await (const blob of container.listBlobsFlat({ prefix })) names.push(blob.name);
  return names;
}

/** Read-only, HTTPS-only SAS URL for one blob. */
function signedUrl(containerName, blobName, expiresOn) {
  const blobClient = getBlobService().getContainerClient(containerName).getBlobClient(blobName);
  if (!accountName || !accountKey) return blobClient.url; // e.g. container is public
  const credential = new StorageSharedKeyCredential(accountName, accountKey);
  const sas = generateBlobSASQueryParameters(
    {
      containerName,
      blobName,
      permissions: BlobSASPermissions.parse("r"),
      protocol: SASProtocol.Https,
      expiresOn,
    },
    credential
  );
  return `${blobClient.url}?${sas}`;
}

module.exports = { listEntities, listBlobNames, signedUrl, parseConnectionString };
