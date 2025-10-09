'use strict'

const Support = require('../../models/support')
const serviceEmail = require('../../services/email')
const axios = require('axios');
const config = require('../../config');

// Función para verificar reCAPTCHA v3
async function verifyRecaptcha(token) {
    const secretKey = config.RECAPTCHA_SECRET_KEY;
    const url = 'https://www.google.com/recaptcha/api/siteverify';
    
    try {
        // Enviar los datos como form data (application/x-www-form-urlencoded)
        const response = await axios.post(url, new URLSearchParams({
            secret: secretKey,
            response: token
        }), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        
        console.log('reCAPTCHA response:', response.data);
        
        const { success, score, action, 'error-codes': errorCodes } = response.data;
        
        // Manejar errores específicos de reCAPTCHA
        if (!success && errorCodes) {
            console.log('reCAPTCHA error codes:', errorCodes);
            
            // Manejar errores específicos
            if (errorCodes.includes('browser-error')) {
                return { 
                    valid: false, 
                    score, 
                    reason: 'Browser error - check client-side reCAPTCHA configuration',
                    errorCodes: errorCodes
                };
            }
            
            if (errorCodes.includes('invalid-input-secret')) {
                return { 
                    valid: false, 
                    score, 
                    reason: 'Invalid secret key',
                    errorCodes: errorCodes
                };
            }
            
            if (errorCodes.includes('invalid-input-response')) {
                return { 
                    valid: false, 
                    score, 
                    reason: 'Invalid token - may be expired or already used',
                    errorCodes: errorCodes
                };
            }
        }
        
        // Verificar que sea exitoso y tenga buena puntuación
        if (success && score >= 0.5) {
            return { valid: true, score };
        } else {
            return { 
                valid: false, 
                score, 
                reason: 'Low score or failed verification',
                errorCodes: errorCodes
            };
        }
    } catch (error) {
        console.error('reCAPTCHA verification error:', error);
        return { valid: false, error: error.message };
    }
}

async function sendMsgLogoutSupport(req, res){

	// Verificar reCAPTCHA v3
    const recaptchaToken = req.body.recaptchaToken;
    
    if (!recaptchaToken) {
        return res.status(400).send({ message: 'reCAPTCHA token missing' });
    }
    
    const recaptchaResult = await verifyRecaptcha(recaptchaToken);
    
    if (!recaptchaResult.valid) {
        console.log('reCAPTCHA verification failed:', recaptchaResult);
        return res.status(400).send({ 
            message: 'reCAPTCHA verification failed',
            score: recaptchaResult.score,
            reason: recaptchaResult.reason,
            errorCodes: recaptchaResult.errorCodes
        });
    }
    
    console.log('reCAPTCHA verified successfully, score:', recaptchaResult.score);
    
    // Continuar con tu lógica existente
			let support = new Support()
			//support.type = 'Home form'
			support.subject = 'Foundation29 support'
			support.description = 'Name: '+req.body.userName+', Email: '+ req.body.email+ ', Description: ' +req.body.description
			//enviamos Email
			serviceEmail.sendMailSupport(req.body.email,'en', support)
					.then(response => {
						return res.status(200).send({ message: 'Email sent'})
					})
					.catch(response => {
						//create user, but Failed sending email.
						//res.status(200).send({ token: serviceAuth.createToken(user),  message: 'Fail sending email'})
						console.log(response);
						res.status(500).send({ message: 'Fail sending email'})
					})
}


module.exports = {
	sendMsgLogoutSupport
}
