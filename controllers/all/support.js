'use strict'

const Support = require('../../models/support')
const serviceEmail = require('../../services/email')


function sendMsgLogoutSupport(req, res){
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
