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
				range: "A1:J1",
			});

			if (!response.data.values) {
				// Add headers if sheet is empty
				await this.sheets.spreadsheets.values.update({
					spreadsheetId: this.spreadsheetId,
					range: "A1:J1",
					valueInputOption: "RAW",
					resource: {
						values: [
							[
								"Website",
								"Sitemap URL",
								"About Page URL",
								"Collections Page URL",
								"Product Page URL",
								"About Page Content",
								"Collections Page Content",
								"Product Page Content",
								"Is eCommerce Store?",
								"OpenAI One-Liner Response",
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
				data.website,
				data.sitemapUrl,
				data.aboutPageUrl,
				data.collectionsPageUrl,
				data.productPageUrl,
				data.aboutPageContent,
				data.collectionsPageContent,
				data.productPageContent,
				data.isEcommerce ? "Yes" : "No",
				data.openaiResponse,
			];

			await this.sheets.spreadsheets.values.append({
				spreadsheetId: this.spreadsheetId,
				range: "A:J",
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
