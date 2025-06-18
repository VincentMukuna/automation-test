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

			console.log("LeadMagic Email Validation Response for:", email, response.data);

			// Extract company information from validation response
			const companyInfo = {
				companyName: response.data.company_name || "",
				companyIndustry: response.data.company_industry || "",
				companySize: response.data.company_size || "",
				companyFounded: response.data.company_founded || "",
				companyLinkedinUrl: response.data.company_linkedin_url ? `https://${response.data.company_linkedin_url}` : "",
				companyLinkedinId: response.data.company_linkedin_id || "",
				companyFacebookUrl: response.data.company_facebook_url || "",
				companyTwitterUrl: response.data.company_twitter_url || "",
				companyType: response.data.company_type || "",
				mxProvider: response.data.mx_provider || "",
				isDomainCatchAll: response.data.is_domain_catch_all || false
			};

			return {
				isValid: response.data.email_status === 'valid' || response.data.email_status === 'valid_catch_all',
				status: response.data.email_status || "unknown",
				source: "leadmagic",
				companyInfo
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

			console.log("LeadMagic Email Finder Response for:", firstName, lastName, domain, response.data);

			// Extract company information from finder response
			const companyInfo = {
				companyName: response.data.company_name || "",
				companyIndustry: response.data.company_industry || "",
				companySize: response.data.company_size || "",
				companyFounded: response.data.company_founded || "",
				companyLinkedinUrl: response.data.company_linkedin_url ? `https://${response.data.company_linkedin_url}` : "",
				companyLinkedinId: response.data.company_linkedin_id || "",
				companyFacebookUrl: response.data.company_facebook_url || "",
				companyTwitterUrl: response.data.company_twitter_url || "",
				companyType: response.data.company_type || "",
				mxProvider: response.data.mx_provider || "",
				isDomainCatchAll: response.data.is_domain_catch_all || false
			};

			return {
				email: response.data.email || null,
				confidence: response.data.confidence || 0,
				source: "leadmagic",
				companyInfo
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
		let companyInfo = {};

		// If email is provided, validate it
		if (email) {
			try {
				const validation = await this.validateEmail(email);
				isValid = validation.isValid;
				validationStatus = validation.status;
				validationSource = validation.source;
				companyInfo = validation.companyInfo || {};
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
					companyInfo = validation.companyInfo || foundEmail.companyInfo || {};
				} else {
					// Use company info from finder even if no email found
					companyInfo = foundEmail.companyInfo || {};
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
			validationSource,
			companyInfo
		};
	}
}

module.exports = EmailService; 