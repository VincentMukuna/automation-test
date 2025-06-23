require("dotenv").config();
const fs = require("fs");
const csv = require("csv-parser");
const SitemapParser = require("./utils/sitemapParser");
const ContentScraper = require("./utils/contentScraper");
const OpenAIService = require("./utils/openaiService");
const SheetsService = require("./utils/sheetsService");
const PlatformDetector = require("./utils/platformDetector");
const EmailService = require("./utils/emailService");
const ContactExtractor = require("./utils/contactExtractor");

// Configuration constants
const BATCH_SIZE = 2;
const DELAY_BETWEEN_BATCHES = 1000;
const DEFAULT_CSV_PATH = "leads.csv";

// Get CSV file path from command line arguments
const csvFilePath = process.argv[2] || DEFAULT_CSV_PATH;

// Helper function to delay execution
function delay(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

// Helper function to map CSV row to lead object using CSV data as source of truth
function mapCsvRowToLead(row) {
	return {
		firstName: row.first_name || "",
		lastName: row.last_name || "",
		domain: row["organization/primary_domain"] || "",
		email: row.email || "",
		title: row.title || "",
		headline: row.headline || "",
		linkedinUrl: row.linkedin_url || "",
		organizationCity: row["organization/city"] || "",
		organizationCountry: row["organization/country"] || "",
		organizationEmployees:
			row["organization/estimated_num_employees"] || "",
		organizationFounded: row["organization/founded_year"] || "",
		organizationFacebook: row["organization/facebook_url"] || "",
		organizationLinkedin: row["organization/linkedin_url"] || "",
		organizationAddress: row["organization/raw_address"] || "",
		personalEmail: row["personal_emails/0"] || "",
	};
}

// Helper function to validate lead data
function validateLead(lead) {
	if (!lead.domain || lead.domain.trim() === "") {
		return false;
	}

	// Basic domain validation
	const domainRegex =
		/^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
	if (!domainRegex.test(lead.domain.replace(/^https?:\/\//, ""))) {
		return false;
	}

	return true;
}

async function processLead(
	lead,
	contentScraper,
	openaiService,
	sheetsService,
	platformDetector,
	emailService,
	contactExtractor
) {
	try {
		console.log(
			`Processing lead: ${lead.firstName} ${lead.lastName} at ${lead.domain}...`
		);

		const domain = lead.domain.startsWith("http")
			? lead.domain
			: `https://${lead.domain}`;
		const domainName = lead.domain.replace(/^https?:\/\//, "");

		// Initialize data structure with CSV data as source of truth
		const rowData = {
			id: Date.now().toString(),
			domain: domainName,
			updated_at: new Date().toISOString(),
			contact_first_name: lead.firstName,
			contact_last_name: lead.lastName,
			contact_full_name: `${lead.firstName} ${lead.lastName}`,
			contact_email: lead.email || lead.personalEmail || "", // Use CSV email data
			contact_title: lead.title || "", // Use CSV title data
			contact_headline: lead.headline || "", // Use CSV headline data
			contact_linkedin_url: lead.linkedinUrl || "", // Use CSV LinkedIn data
			contact_is_valid_email: false,
			contact_validation_status: "",
			contact_validation_source: "",
			organization_primary_domain: domainName,
			organization_linkedin_url: lead.organizationLinkedin || "", // Use CSV organization LinkedIn
			organization_facebook_url: lead.organizationFacebook || "", // Use CSV organization Facebook
			organization_founded_year: lead.organizationFounded || "", // Use CSV founded year
			organization_city: lead.organizationCity || "", // Use CSV city data
			organization_country: lead.organizationCountry || "", // Use CSV country data
			organization_address: lead.organizationAddress || "", // Use CSV address data
			organization_estimated_num_employees:
				lead.organizationEmployees || "", // Use CSV employee count
			organization_platform: "",
			organization_is_ecommerce: false,
			pages_all: "",
			pages_about: "",
			pages_contact: "",
			pages_product: "",
			pages_collection: "",
			pages_blog: "",
			pages_is_ecommerce: false,
			pages_contact_page_url: "",
			pages_contact_page_email: "",
			pages_contact_page_social_links_youtube: "",
			pages_contact_page_social_links_instagram: "",
			pages_contact_page_social_links_tiktok: "",
			pages_about_copy: "",
			pages_product_copy: "",
			pages_blog_copy: "",
			email_candidates: "",
			integrations_klaviyo: false,
			integrations_meta: false,
			pages_contact_page_social_links_facebook: "",
			pages_contact_page_social_links_linkedin: "",
			pages_contact_page_social_links: "",
			pages_contact_page_social_links_twitter: "",
			personalized_icebreaker: "",
		};

		// Step 1: Parse sitemap and get URLs
		console.log(`  Step 1: Parsing sitemap for ${domainName}...`);
		const sitemapParser = new SitemapParser(domain);
		let urls = {
			aboutPage: null,
			collectionsPage: null,
			productPage: null,
			contactPage: null,
			blogPage: null,
		};
		let allUrls = [];
		let found = false;

		// Try all possible sitemap locations
		for (const sitemapUrl of sitemapParser.sitemapUrls) {
			try {
				const response = await require("axios").get(sitemapUrl, {
					headers: {
						"User-Agent":
							"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
					},
					timeout: 10000,
				});
				const xml2js = require("xml2js");
				const parser = new xml2js.Parser();
				const result = await parser.parseStringPromise(response.data);

				if (result.sitemapindex && result.sitemapindex.sitemap) {
					for (const sitemap of result.sitemapindex.sitemap) {
						const subResponse = await require("axios").get(
							sitemap.loc[0]
						);
						const subResult = await parser.parseStringPromise(
							subResponse.data
						);
						if (subResult.urlset && subResult.urlset.url) {
							allUrls.push(
								...subResult.urlset.url.map(
									(entry) => entry.loc[0]
								)
							);
						}
					}
				} else if (result.urlset && result.urlset.url) {
					allUrls = result.urlset.url.map((entry) => entry.loc[0]);
				}

				urls = sitemapParser.categorizeUrls(allUrls);
				found = true;
				break;
			} catch (e) {
				console.log(`Sitemap not found at ${sitemapUrl}`);
			}
		}

		// If sitemap not found, analyze homepage
		if (!found) {
			console.log("No sitemap found, analyzing homepage...");
			const homepageAnalysis = await contentScraper.analyzeHomepage(
				domain
			);
			urls = homepageAnalysis.urls;
			allUrls = homepageAnalysis.allUrls;
		}
		console.log(`  Step 1 complete: Found ${allUrls.length} URLs`);

		// Step 2: Detect platform and integrations
		console.log(
			`  Step 2: Detecting platform and integrations for ${domainName}...`
		);
		const platform = await platformDetector.detectPlatform(domainName);
		const integrations = await platformDetector.detectIntegrations(
			domainName
		);
		const isEcommerce = await platformDetector.detectEcommerce(allUrls);
		console.log(
			`  Step 2 complete: Platform=${platform}, Ecommerce=${isEcommerce}`
		);

		// Step 3: Process email (only if we don't have a valid email from CSV)
		console.log(
			`  Step 3: Processing email for ${lead.firstName} ${lead.lastName}...`
		);
		let emailResult = {
			email: lead.email || lead.personalEmail || "",
			isValid: false,
			validationStatus: "",
			validationSource: "",
			emailCandidates: [],
			companyInfo: null,
		};

		if (!lead.email && !lead.personalEmail) {
			emailResult = await emailService.processEmail(
				"",
				lead.firstName,
				lead.lastName,
				domainName
			);
		} else {
			// Validate existing email from CSV
			emailResult = await emailService.processEmail(
				lead.email || lead.personalEmail,
				lead.firstName,
				lead.lastName,
				domainName
			);
		}
		console.log(
			`  Step 3 complete: Email validation result = ${emailResult.isValid}`
		);

		// Step 4: Extract contact information
		console.log(`  Step 4: Extracting contact information...`);
		let contactInfo = {
			emails: [],
			socialLinks: {
				facebook: [],
				linkedin: [],
				twitter: [],
				instagram: [],
				youtube: [],
				tiktok: [],
			},
			address: "",
			phone: "",
		};

		if (urls.contactPage) {
			contactInfo = await contactExtractor.extractContactInfo(
				urls.contactPage
			);
		}
		console.log(
			`  Step 4 complete: Found ${contactInfo.emails.length} contact emails`
		);

		// Step 5: Scrape content from key pages
		console.log(`  Step 5: Scraping content from key pages...`);
		const [aboutContent, collectionsContent, productContent, blogContent] =
			await Promise.all([
				urls.aboutPage
					? contentScraper.scrapeContent(urls.aboutPage)
					: Promise.resolve(""),
				urls.collectionsPage
					? contentScraper.scrapeContent(urls.collectionsPage)
					: Promise.resolve(""),
				urls.productPage
					? contentScraper.scrapeContent(urls.productPage)
					: Promise.resolve(""),
				urls.blogPage
					? contentScraper.scrapeContent(urls.blogPage)
					: Promise.resolve(""),
			]);
		console.log(`  Step 5 complete: Content scraped`);

		// Step 6: Generate OpenAI responses
		console.log(`  Step 6: Generating OpenAI responses...`);
		const [personalizedIcebreaker, aboutSummary] = await Promise.all([
			openaiService.generateOneLiner(aboutContent, lead.firstName),
			openaiService.generateAboutSummary(aboutContent),
		]);
		console.log(`  Step 6 complete: OpenAI responses generated`);

		// Step 7: Update row data with all collected information
		console.log(`  Step 7: Updating row data...`);
		// Keep CSV data as priority, only override if we have better data from scraping
		rowData.contact_email =
			emailResult.email || lead.email || lead.personalEmail || "";
		rowData.contact_is_valid_email = emailResult.isValid ? "TRUE" : "FALSE";
		rowData.contact_validation_status = emailResult.validationStatus;
		rowData.contact_validation_source = emailResult.validationSource;
		rowData.organization_platform = platform;
		rowData.organization_is_ecommerce = isEcommerce;
		rowData.pages_all = JSON.stringify(allUrls);
		rowData.pages_about = urls.aboutPage || "";
		rowData.pages_contact = urls.contactPage || "";
		rowData.pages_product = urls.productPage || "";
		rowData.pages_collection = urls.collectionsPage || "";
		rowData.pages_blog = urls.blogPage || "";
		rowData.pages_is_ecommerce = isEcommerce;
		rowData.pages_contact_page_url = urls.contactPage || "";
		rowData.pages_contact_page_email = contactInfo.emails.join(", ");
		rowData.pages_about_copy = aboutSummary;
		rowData.pages_product_copy = productContent || "";
		rowData.pages_blog_copy = blogContent || "";
		rowData.integrations_klaviyo = integrations.klaviyo;
		rowData.integrations_meta = integrations.meta;
		rowData.personalized_icebreaker = personalizedIcebreaker;
		rowData.email_candidates = JSON.stringify(
			emailResult.emailCandidates || []
		);

		// Add LeadMagic company information (only if we don't have it from CSV)
		if (emailResult.companyInfo) {
			rowData.organization_linkedin_url =
				rowData.organization_linkedin_url ||
				emailResult.companyInfo.companyLinkedinUrl ||
				"";
			rowData.organization_facebook_url =
				rowData.organization_facebook_url ||
				emailResult.companyInfo.companyFacebookUrl ||
				"";
			rowData.organization_founded_year =
				rowData.organization_founded_year ||
				emailResult.companyInfo.companyFounded ||
				"";
			rowData.organization_estimated_num_employees =
				rowData.organization_estimated_num_employees ||
				emailResult.companyInfo.companySize ||
				"";
			// Add location data from LeadMagic (only if not in CSV)
			rowData.organization_city =
				rowData.organization_city ||
				emailResult.companyInfo.companyCity ||
				"";
			rowData.organization_country =
				rowData.organization_country ||
				emailResult.companyInfo.companyCountry ||
				"";
			rowData.organization_address =
				rowData.organization_address ||
				emailResult.companyInfo.companyAddress ||
				"";
		}

		// Add social media links from contact page
		const socialLinks = contactExtractor.formatSocialLinks(
			contactInfo.socialLinks
		);
		Object.assign(rowData, socialLinks);

		// Step 8: Append to Google Sheets
		console.log(`  Step 8: Appending to Google Sheets...`);
		await sheetsService.appendRow(rowData);
		console.log(
			`Completed processing lead: ${lead.firstName} ${lead.lastName}`
		);
		return rowData;
	} catch (error) {
		console.error(
			`Error processing lead ${lead.firstName} ${lead.lastName}:`,
			error.message
		);
		throw error;
	}
}

// Function to process leads in batches
async function processBatch(
	leads,
	contentScraper,
	openaiService,
	sheetsService,
	platformDetector,
	emailService,
	contactExtractor
) {
	console.log(`Processing batch of ${leads.length} leads...`);

	// Add timeout wrapper function
	const processLeadWithTimeout = async (lead) => {
		const timeout = 120000; // 2 minutes timeout per lead
		return Promise.race([
			processLead(
				lead,
				contentScraper,
				openaiService,
				sheetsService,
				platformDetector,
				emailService,
				contactExtractor
			),
			new Promise((_, reject) =>
				setTimeout(
					() => reject(new Error(`Timeout after ${timeout}ms`)),
					timeout
				)
			),
		]);
	};

	// Process leads sequentially to avoid OpenAI rate limits
	const results = [];
	for (let i = 0; i < leads.length; i++) {
		const lead = leads[i];
		console.log(
			`\nProcessing lead ${i + 1}/${leads.length}: ${lead.firstName} ${
				lead.lastName
			}`
		);

		try {
			const result = await processLeadWithTimeout(lead);
			results.push(result);
			console.log(
				`✓ Successfully processed: ${lead.firstName} ${lead.lastName}`
			);
		} catch (error) {
			console.error(
				`✗ Failed to process lead ${lead.firstName} ${lead.lastName}:`,
				error.message
			);
			// Continue with next lead instead of stopping the batch
		}
	}

	console.log(
		`Batch complete: ${results.length}/${leads.length} leads processed successfully`
	);

	return results;
}

// Function to read and process CSV file
async function processCsvFile() {
	return new Promise((resolve, reject) => {
		const leads = [];
		let processedCount = 0;
		let successfulCount = 0;
		let failedCount = 0;

		console.log(`Reading CSV file: ${csvFilePath}`);

		fs.createReadStream(csvFilePath)
			.pipe(csv())
			.on("data", (row) => {
				const lead = mapCsvRowToLead(row);
				leads.push(lead);
			})
			.on("end", async () => {
				console.log(
					`CSV file read complete. Found ${leads.length} valid leads.`
				);

				if (leads.length === 0) {
					console.log("No valid leads found in CSV file.");
					resolve({ processedCount, successfulCount, failedCount });
					return;
				}

				// Initialize services
				const contentScraper = new ContentScraper();
				const openaiService = new OpenAIService();
				const sheetsService = new SheetsService();
				const platformDetector = new PlatformDetector();
				const emailService = new EmailService();
				const contactExtractor = new ContactExtractor();

				// Initialize Google Sheet
				await sheetsService.initializeSheet();

				// Process leads in batches
				for (let i = 0; i < leads.length; i += BATCH_SIZE) {
					const batch = leads.slice(i, i + BATCH_SIZE);
					processedCount += batch.length;

					console.log(
						`\n--- Processing batch ${
							Math.floor(i / BATCH_SIZE) + 1
						}/${Math.ceil(leads.length / BATCH_SIZE)} ---`
					);

					try {
						const batchResults = await processBatch(
							batch,
							contentScraper,
							openaiService,
							sheetsService,
							platformDetector,
							emailService,
							contactExtractor
						);

						successfulCount += batchResults.length;
						failedCount += batch.length - batchResults.length;

						// Add delay between batches to avoid overwhelming APIs
						if (i + BATCH_SIZE < leads.length) {
							console.log(
								`Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...`
							);
							await delay(DELAY_BETWEEN_BATCHES);
						}
					} catch (error) {
						console.error(`Error processing batch:`, error.message);
						failedCount += batch.length;
					}
				}

				console.log(`\n=== Processing Complete ===`);
				console.log(`Total leads processed: ${processedCount}`);
				console.log(`Successfully processed: ${successfulCount}`);
				console.log(`Failed to process: ${failedCount}`);

				resolve({ processedCount, successfulCount, failedCount });
			})
			.on("error", (error) => {
				console.error("Error reading CSV file:", error.message);
				reject(error);
			});
	});
}

async function main() {
	try {
		console.log("Starting CSV lead processing...");
		console.log(`CSV File: ${csvFilePath}`);
		console.log(`Batch Size: ${BATCH_SIZE}`);
		console.log(`Delay between batches: ${DELAY_BETWEEN_BATCHES}ms`);

		// Check if CSV file exists
		if (!fs.existsSync(csvFilePath)) {
			console.error(`CSV file not found: ${csvFilePath}`);
			console.log(`Usage: node src/index.js [csv-file-path]`);
			console.log(`Default: ${DEFAULT_CSV_PATH}`);
			process.exit(1);
		}

		const results = await processCsvFile();

		console.log("\nFinal Summary:");
		console.log(`Total leads processed: ${results.processedCount}`);
		console.log(`Successfully processed: ${results.successfulCount}`);
		console.log(`Failed to process: ${results.failedCount}`);
	} catch (error) {
		console.error("Error in main process:", error.message);
		process.exit(1);
	}
}

main();
