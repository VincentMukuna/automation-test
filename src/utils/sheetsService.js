const { google } = require("googleapis");
require("dotenv").config();

class SheetsService {
	constructor() {
		this.auth = new google.auth.JWT(
			process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
			null,
			process.env.GOOGLE_SHEETS_PRIVATE_KEY,
			["https://www.googleapis.com/auth/spreadsheets"]
		);

		this.sheets = google.sheets({ version: "v4", auth: this.auth });
		this.spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
	}

	async initializeSheet() {
		try {
			// Check if headers exist
			const response = await this.sheets.spreadsheets.values.get({
				spreadsheetId: this.spreadsheetId,
				range: "A1:AU1",
			});

			if (!response.data.values) {
				// Add headers if sheet is empty - matching the exact CSV format
				await this.sheets.spreadsheets.values.update({
					spreadsheetId: this.spreadsheetId,
					range: "A1:AU1",
					valueInputOption: "RAW",
					resource: {
						values: [
							[
								"id",
								"domain",
								"updated_at",
								"contact_first_name",
								"contact_last_name",
								"contact_full_name",
								"contact_email",
								"contact_title",
								"contact_headline",
								"contact_linkedin_url",
								"contact_is_valid_email",
								"contact_validation_status",
								"contact_validation_source",
								"organization_primary_domain",
								"organization_linkedin_url",
								"organization_facebook_url",
								"organization_founded_year",
								"organization_city",
								"organization_country",
								"organization_address",
								"organization_estimated_num_employees",
								"organization_platform",
								"organization_is_ecommerce",
								"pages_all",
								"pages_about",
								"pages_contact",
								"pages_product",
								"pages_collection",
								"pages_blog",
								"pages_is_ecommerce",
								"pages_contact_page_url",
								"pages_contact_page_email",
								"pages_contact_page_social_links_youtube",
								"pages_contact_page_social_links_instagram",
								"pages_contact_page_social_links_tiktok",
								"pages_about_copy",
								"pages_product_copy",
								"pages_blog_copy",
								"email_candidates",
								"integrations_klaviyo",
								"integrations_meta",
								"pages_contact_page_social_links_facebook",
								"pages_contact_page_social_links_linkedin",
								"pages_contact_page_social_links",
								"pages_contact_page_social_links_twitter",
								"personalized_icebreaker"
							],
						],
					},
				});
			}
		} catch (error) {
			console.error("Error initializing sheet:", error.message);
			throw error;
		}
	}

	async appendRow(data) {
		try {
			const values = [
				data.id || "",
				data.domain || "",
				data.updated_at || new Date().toISOString(),
				data.contact_first_name || "",
				data.contact_last_name || "",
				data.contact_full_name || "",
				data.contact_email || "",
				data.contact_title || "",
				data.contact_headline || "",
				data.contact_linkedin_url || "",
				data.contact_is_valid_email || "",
				data.contact_validation_status || "",
				data.contact_validation_source || "",
				data.organization_primary_domain || "",
				data.organization_linkedin_url || "",
				data.organization_facebook_url || "",
				data.organization_founded_year || "",
				data.organization_city || "",
				data.organization_country || "",
				data.organization_address || "",
				data.organization_estimated_num_employees || "",
				data.organization_platform || "",
				data.organization_is_ecommerce ? "TRUE" : "FALSE",
				data.pages_all || "",
				data.pages_about || "",
				data.pages_contact || "",
				data.pages_product || "",
				data.pages_collection || "",
				data.pages_blog || "",
				data.pages_is_ecommerce ? "TRUE" : "FALSE",
				data.pages_contact_page_url || "",
				data.pages_contact_page_email || "",
				data.pages_contact_page_social_links_youtube || "",
				data.pages_contact_page_social_links_instagram || "",
				data.pages_contact_page_social_links_tiktok || "",
				data.pages_about_copy || "",
				data.pages_product_copy || "",
				data.pages_blog_copy || "",
				data.email_candidates || "",
				data.integrations_klaviyo ? "TRUE" : "FALSE",
				data.integrations_meta ? "TRUE" : "FALSE",
				data.pages_contact_page_social_links_facebook || "",
				data.pages_contact_page_social_links_linkedin || "",
				data.pages_contact_page_social_links || "",
				data.pages_contact_page_social_links_twitter || "",
				data.personalized_icebreaker || ""
			];

			await this.sheets.spreadsheets.values.append({
				spreadsheetId: this.spreadsheetId,
				range: "A:AU",
				valueInputOption: "RAW",
				resource: {
					values: [values],
				},
			});
		} catch (error) {
			console.error("Error appending row:", error.message);
			throw error;
		}
	}
}

module.exports = SheetsService;
