const config = require('./../config');
const axios = require('axios');
const f29azureService = require('../services/f29azure')
const { generateAdaptedReport } = require('../services/iaClaroService');


const sas = config.BLOB.SAS;
const accountname = config.BLOB.NAMEBLOB;
const form_recognizer_key = config.FORM_RECOGNIZER_KEY;
const form_recognizer_endpoint = config.FORM_RECOGNIZER_ENDPOINT;

/**
 * Sends a file from Azure Blob Storage to Form Recognizer to extract text.
 * @param {string} userId
 * @param {string} documentId
 * @param {string} containerName
 * @param {string} url
 * @returns {Promise<Object>}
 */


async function calliaClaro(req, res) {
	console.log('🔍 req.files:', req.files);
	console.log('🔍 req.body:', req.body);
	console.log('🔍 req.headers:', req.headers);
	
	if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).json({ error: 'No file provided.' })
      }
    
      const file = req.files.file
      const allowedMimeTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
      ]
    
      if (!allowedMimeTypes.includes(file.mimetype)) {
        return res.status(400).json({ error: 'Unsupported file type. Only PDF, DOCX and TXT are allowed.' })
      }
    
      try {
        console.log('🔄 Procesando archivo:', file.name, `(${file.size} bytes)`)
        
        // Generar nombre único para el archivo
        const timestamp = Date.now()
        const fileExtension = file.name.split('.').pop()
        const fileName = `temp_${timestamp}.${fileExtension}`
        
        // Subir archivo al blob de Azure temporalmente
        const containerName = config.BLOB.CONTAINER_PATIENTS
        const blobUrl = `temp/${fileName}`
        
        const savedOk = await saveBlob(containerName, blobUrl, file)
        if (!savedOk) {
          return res.status(500).json({
            error: 'Error saving file to storage'
          })
        }
    
        let extractedText = ''
    
        // Verificar si es un archivo de texto
        const isTextFile = file.mimetype === 'text/plain'
        
        if (isTextFile) {
          // Extraer texto directamente de archivos .txt
          extractedText = file.data.toString('utf8')
          console.log('📄 Texto extraído directamente de archivo TXT')
        } else {
          // Usar Form Recognizer para extraer texto de PDFs, imágenes, etc.
          try {
            const formResult = await form_recognizer(
              'system',
              `doc_${timestamp}`,
              containerName,
              blobUrl
            )
            extractedText = formResult.data || ''
            console.log('📄 Texto extraído con Form Recognizer:', extractedText.length, 'caracteres')
          } catch (formError) {
            console.error('Error en Form Recognizer:', formError)
            return res.status(500).json({
              error: 'Error extracting text from document with Form Recognizer'
            })
          }
        }
    
        if (!extractedText || extractedText.trim().length < 10) {
          return res.status(400).json({
            error: 'Could not extract text from document or content is too short'
          })
        }
    
        console.log('📄 Texto extraído:', extractedText.length, 'caracteres')
    
        // Obtener el tipo de informe del body (por defecto ia_estandar)
        const reportType = req.body.reportType || 'ia_estandar'
        console.log('📋 Tipo de informe seleccionado:', reportType)
        
        // Generar informe adaptado usando la función existente
        const result = await generateAdaptedReport(extractedText, reportType)
    
        console.log('✅ Informe adaptado generado exitosamente')
    
        res.status(200).json({
          success: true,
          message: 'Adapted report generated successfully',
          originalText: extractedText,
          anonymizedText: result.anonymizedOriginal,
          adaptedReport: result.adaptedContent,
          tokenCount: result.tokenCount,
          generationTime: result.generationTime
        })
    
      } catch (error) {
        console.error('❌ Error al procesar el informe:', error)
        res.status(500).json({ 
          error: 'Internal server error processing the report.', 
          details: error.message 
        })
      }
}

async function saveBlob(containerName, blobUrl, file) {
    try {
      const result = await f29azureService.createBlob(containerName, blobUrl, file.data);
      return result;
    } catch (error) {
      console.error('Error al guardar blob:', error);
      return false;
    }
  }

async function form_recognizer(userId, documentId, containerName, url) {
	return new Promise(async (resolve, reject) => {
	  const url2 = `https://${accountname}.blob.core.windows.net/${containerName}/${url}${sas}`;
	  const modelId = "prebuilt-layout";
	  const endpoint = form_recognizer_endpoint;
	  const apiVersion = "2023-10-31-preview";
	  const analyzeUrl =
		`${endpoint}/documentintelligence/documentModels/${modelId}:analyze` +
		`?_overload=analyzeDocument&api-version=${apiVersion}&outputContentFormat=markdown`;
  
	  const headers = { 'Ocp-Apim-Subscription-Key': form_recognizer_key };
	  const body = { urlSource: url2 };
  
	  axios.post(analyzeUrl, body, { headers })
		.then(async (resAnalyze) => {
		  const operationLocation = resAnalyze.headers['operation-location'];
		  let resultResponse;
		  do {
			resultResponse = await axios.get(operationLocation, { headers });
			if (resultResponse.data.status !== 'running') break;
			await new Promise(r => setTimeout(r, 1000));
		  } while (true);
  
		  const content = resultResponse.data.analyzeResult.content;
		  const responseObj = {
			msg: "done",
			data: content,
			summary: content,
			doc_id: documentId,
			status: 200
		  };
		  resolve(responseObj);
		})
		.catch(error => {
		  console.error("Error in analyzing document:", error);
		  reject(error);
		});
	});
  }

  module.exports = {
	calliaClaro
  };