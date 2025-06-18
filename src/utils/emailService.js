const axios = require("axios");

class EmailService {
	constructor() {
		this.apiKey = process.env.LEADMAGIC_API_KEY;
		this.baseUrl = "https://api.leadmagic.io";
	}

	async validateEmail(email) {
		if (!this.apiKey) {
			throw new Error("LeadMagic API key is not configured");
		}
		try {
			const response = await axios.post(
				`${this.baseUrl}/email-validate`,
				{ email },
				{
					headers: {
						"X-API-Key": this.apiKey,
						"Content-Type": "application/json"
					},
					timeout: 10000
				}
			);

			return {
				isValid: response.data.valid || false,
				status: response.data.status || "unknown",
				source: response.data.source || "leadmagic"
			};
		} catch (error) {
			console.error("LeadMagic Email Validation Error:");
			console.error("Status:", error.response?.status);
			console.error("Status Text:", error.response?.statusText);
			console.error("Response Data:", error.response?.data);
			console.error("Response Headers:", error.response?.headers);
			console.error("Request URL:", error.config?.url);
			console.error("Request Data:", error.config?.data);
			console.error("Request Headers:", error.config?.headers);
			throw error;
		}
	}

	async findEmail(firstName, lastName, domain) {
		if (!this.apiKey) {
			throw new Error("LeadMagic API key is not configured");
		}
		try {
			const response = await axios.post(
				`${this.baseUrl}/email-finder`,
				{
					first_name: firstName,
					last_name: lastName,
					domain
				},
				{
					headers: {
						"X-API-Key": this.apiKey,
						"Content-Type": "application/json"
					},
					timeout: 10000
				}
			);

			return {
				email: response.data.email || null,
				confidence: response.data.confidence || 0,
				source: response.data.source || "leadmagic"
			};
		} catch (error) {
			console.error("LeadMagic Email Finder Error:");
			console.error("Status:", error.response?.status);
			console.error("Status Text:", error.response?.statusText);
			console.error("Response Data:", error.response?.data);
			console.error("Response Headers:", error.response?.headers);
			console.error("Request URL:", error.config?.url);
			console.error("Request Data:", error.config?.data);
			console.error("Request Headers:", error.config?.headers);
			throw error;
		}
	}

	async processEmail(contactEmail, firstName, lastName, domain) {
		let email = contactEmail;
		let isValid = false;
		let validationStatus = "not_provided";
		let validationSource = "none";

		// If email is provided, validate it
		if (email) {
			try {
				const validation = await this.validateEmail(email);
				isValid = validation.isValid;
				validationStatus = validation.status;
				validationSource = validation.source;
			} catch (error) {
				isValid = false;
				validationStatus = "error";
				validationSource = "leadmagic";
			}
		}

		// If email is missing or invalid, try to find it
		if (!email || !isValid) {
			try {
				const foundEmail = await this.findEmail(firstName, lastName, domain);
				if (foundEmail.email) {
					email = foundEmail.email;
					// Validate the found email
					const validation = await this.validateEmail(email);
					isValid = validation.isValid;
					validationStatus = validation.status;
					validationSource = validation.source;
				}
			} catch (error) {
				isValid = false;
				validationStatus = "error";
				validationSource = "leadmagic";
			}
		}

		return {
			email,
			isValid,
			validationStatus,
			validationSource
		};
	}
}

module.exports = EmailService; 