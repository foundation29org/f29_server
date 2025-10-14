'use strict'

const axios = require('axios');
const config = require('../config');

const AZURE_OPENAI_API_KEY = config.OPENAI_API_KEY2;
const OPENAI_API_VERSION = config.OPENAI_API_VERSION;
const OPENAI_API_BASE = config.OPENAI_API_BASE;

/**
 * Realiza una llamada a la API de Azure OpenAI
 */
async function callAzureOpenAI(messages, temperature = 0.3, maxTokens = 4096) {
  try {
    const response = await axios.post(
      `https://${OPENAI_API_BASE}.openai.azure.com`+`/openai/deployments/gpt-4o/chat/completions?api-version=${OPENAI_API_VERSION}`,
      {
        messages: messages,
        max_tokens: maxTokens,
        temperature: temperature,
        top_p: 1,
        model: "gpt-4o"
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AZURE_OPENAI_API_KEY}`
        }
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Error en llamada a Azure OpenAI:', error.response?.data || error.message);
    throw new Error(`Error en llamada a Azure OpenAI: ${error.response?.data?.error?.message || error.message}`);
  }
}


/**
 * Anonimiza un informe médico eliminando información personal
 */
async function anonymizeReport(reportContent) {
  try {
    const messages = [
      {
          role: "system",
          content: `You are a specialist in medical document anonymization. Your task is to remove or replace all personally identifiable information from the medical report while maintaining relevant clinical information.

INSTRUCTIONS:
1. Replace patient names with [PATIENT]
2. Replace doctor names with [DOCTOR]
3. Replace specific dates with [DATE]
4. Replace phone numbers with [PHONE]
5. Replace addresses with [ADDRESS]
6. Replace medical record numbers with [MEDICAL_RECORD]
7. Maintain all relevant medical information (diagnoses, treatments, medications, etc.)
8. Preserve the structure and format of the original document

IMPORTANT: Do not add information that is not in the original document.`
        },
        {
          role: "user",
          content: `Anonymize the following medical report:\n\n${reportContent}`
        }
      ];

    const result = await callAzureOpenAI(messages, 0.3);
    return result;
  } catch (error) {
    console.error('Error in report anonymization:', error);
    throw new Error(`Error in report anonymization: ${error.message}`);
  }
}

/**
 * Genera un informe de alta adaptado para el paciente
 */
async function generateAdaptedReport(originalReport, studyGroup = 'ia_estandar') {
  const startTime = Date.now();
  
  try {
     
    // Primero anonimizamos el informe
    const anonymizedReport = await anonymizeReport(originalReport);
    
    // Definimos el prompt según el grupo de estudio (en inglés para mejor rendimiento)
    let systemPrompt = '';
    
    if (studyGroup === 'ia_estandar') {
      systemPrompt = `You are a medical communication specialist. Your task is to adapt a hospital discharge report to make it more understandable for patients and their families, using clear and accessible language.

INSTRUCTIONS:
1. Use ONLY information from the original report - DO NOT invent or add data
2. Use simple language, avoiding complex medical jargon
3. Explain medical terms when necessary
4. Organize information in a logical and easy-to-follow manner
5. Include practical information about treatment and care (only what's in the report)
6. Maintain all important medical information from the original report
7. Use an empathetic and reassuring tone
8. Structure the document with clear headings
9. Include a "What to do if..." section based on discharge instructions from the report
10. Anonymize completely: use "the patient", "the treating physician", "the corresponding dates"
11. ADAPT LANGUAGE ACCORDING TO PATIENT AGE:
    - If patient is under 18: address "parents/caregivers" and use "your son/daughter"
    - If patient is 18 or older: address the "patient" and use "you" or "the patient"
12. Include contact information and service hours
13. Add a basic glossary of important medical terms that appear in the report
14. DO NOT anonymize public hospital information (emergency phones, service hours, etc.)
15. DO NOT add information not in the original report

OUTPUT FORMAT:
- Title: "Discharge Report - Patient Summary"
- Organized sections with clear headings
- Practical and actionable information
- Language understandable to the general public
- Medical terms glossary
- Only include contact section if present in original report
- Complete anonymization (no personal data)`;
    } else if (studyGroup === 'ia_personalizado') {
      systemPrompt = `You are a personalized medical communication specialist. Your task is to adapt a hospital discharge report in a personalized way, considering the specific characteristics of the patient and their family.

INSTRUCTIONS:
1. Use ONLY information from the original report - DO NOT invent or add data
2. Adapt language according to medical case complexity
3. Personalize explanations according to condition severity (based on the report)
4. Include specific information about necessary follow-up (only what's in the report)
5. Adapt recommendations according to patient profile (based on the report)
6. Use appropriate tone for clinical situation
7. Include detailed information about medications and side effects (only from the report)
8. Provide specific self-care guides (based on discharge instructions)
9. Include relevant emergency contacts
10. Anonymize completely: use "the patient", "the treating physician", "the corresponding dates"
11. ADAPT LANGUAGE ACCORDING TO PATIENT AGE:
    - If patient is under 18: address "parents/caregivers" and use "your son/daughter"
    - If patient is 18 or older: address the "patient" and use "you" or "the patient"
12. Include specific contact information and service hours
13. Add a personalized glossary according to the medical condition (only terms from the report)
14. Adapt the level of detail according to case complexity
15. DO NOT anonymize public hospital information (emergency phones, service hours, etc.)
16. DO NOT add information not in the original report

OUTPUT FORMAT:
- Title: "Personalized Discharge Report"
- Information adapted to specific case
- Personalized recommendations
- Detailed follow-up guides
- Personalized medical terms glossary
- Only include contact section if present in original report
- Complete anonymization (no personal data)`;
    }

    const messages = [
      {
        role: "system",
        content: systemPrompt
      },
      {
        role: "user",
        content: `Adapt the following discharge report for the patient and their family:

${anonymizedReport}

SPECIFIC INSTRUCTIONS:
- Anonymize completely: replace names, specific dates and personal data
- ADAPT LANGUAGE ACCORDING TO PATIENT AGE:
  * If patient is under 18: address "parents/caregivers" and use "your son/daughter"
  * If patient is 18 or older: address the "patient" and use "you" or "the patient"
- Include a "Contact Information" section with:
  * Hospital emergency phone
  * Corresponding service hours
  * Direct phone number of treating physician (if available)
- Add a "Medical Terms Glossary" explaining:
  * The most important medical terms from the report
  * Simple and understandable definitions
- Use warm and empathetic language appropriate for the patient's age
- Include practical advice for home care
- IMPORTANT: Generate the response in the same language as the original document`
      }
    ];

    const result = await callAzureOpenAI(messages, 0.3);
    
    const endTime = Date.now();
    const generationTime = endTime - startTime;
    
    return {
      adaptedContent: result,
      anonymizedOriginal: anonymizedReport,
      generationTime: generationTime
    };
  } catch (error) {
    console.error('Error en generación del informe adaptado:', error);
    throw new Error(`Error en generación del informe adaptado: ${error.message}`);
  }
}

module.exports = {
  anonymizeReport,
  generateAdaptedReport
};