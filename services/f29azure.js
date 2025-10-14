'use strict'

const config = require('../config')
const storage = require("@azure/storage-blob")
const accountname = config.BLOB.NAMEBLOB;
const key = config.BLOB.KEY;
const sharedKeyCredentialGenomics = new storage.StorageSharedKeyCredential(accountname, key);
const blobServiceClientGenomics = new storage.BlobServiceClient(
  `https://${accountname}.blob.core.windows.net`,
  sharedKeyCredentialGenomics
);


async function createContainers(containerName) {
  return new Promise(async (resolve, reject) => {
    const containerClient = blobServiceClientGenomics.getContainerClient(containerName);
    const createContainerResponse = await containerClient.createIfNotExists();
    if (createContainerResponse.succeeded) {
      resolve(true);
    } else {
      resolve(false);
    }
  });
}

async function createBlob(containerName, url, data) {
  return new Promise(async (resolve, reject) => {
    const containerClient = blobServiceClientGenomics.getContainerClient(containerName);
    let haveContainer = await containerClient.exists();
    if(!haveContainer){
      await createContainers(containerName);
    }
    const content = data;
    const blockBlobClient = containerClient.getBlockBlobClient(url);
    const uploadBlobResponse = await blockBlobClient.upload(content, content.length);
    resolve(true);
  });
}

async function downloadBlob(containerName, blobUrl) {
  return new Promise(async (resolve, reject) => {
    try {
      const containerClient = blobServiceClientGenomics.getContainerClient(containerName);
      const blockBlobClient = containerClient.getBlockBlobClient(blobUrl);
      
      // Verificar si el blob existe
      const exists = await blockBlobClient.exists();
      if (!exists) {
        reject(new Error('Archivo no encontrado'));
        return;
      }
      
      // Descargar el blob
      const downloadResponse = await blockBlobClient.download();
      const properties = await blockBlobClient.getProperties();
      
      // Convertir el stream a buffer
      const chunks = [];
      for await (const chunk of downloadResponse.readableStreamBody) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);
      
      resolve({
        buffer,
        contentType: properties.contentType || 'application/octet-stream',
        contentLength: properties.contentLength
      });
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = {
  createContainers,
  createBlob,
  downloadBlob
}
