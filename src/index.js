require("dotenv").config();
const SitemapParser = require("./utils/sitemapParser");
const ContentScraper = require("./utils/contentScraper");
const OpenAIService = require("./utils/openaiService");
const SheetsService = require("./utils/sheetsService");
const PlatformDetector = require("./utils/platformDetector");
const EmailService = require("./utils/emailService");
const ContactExtractor = require("./utils/contactExtractor");

// Sample lead data - in production this would come from input
const leads = [
	{
		firstName: "John",
		lastName: "Doe",
		domain: "antelopepets.com",
		email: "john@antelopepets.com"
	},
	{
		firstName: "Jane",
		lastName: "Smith",
		domain: "theclearbrands.com",
		email: ""
	},
	{
		firstName: "Mike",
		lastName: "Johnson",
		domain: "packwoods.com",
		email: "mike@packwoods.com"
	}
];

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
		console.log(`Processing lead: ${lead.firstName} ${lead.lastName} at ${lead.domain}...`);

		const domain = lead.domain.startsWith('http') ? lead.domain : `https://${lead.domain}`;
		const domainName = lead.domain.replace(/^https?:\/\//, '');

		// Initialize data structure
		const rowData = {
			id: Date.now().toString(),
			domain: domainName,
			updated_at: new Date().toISOString(),
			contact_first_name: lead.firstName,
			contact_last_name: lead.lastName,
			contact_full_name: `${lead.firstName} ${lead.lastName}`,
			contact_email: lead.email,
			contact_title: "",
			contact_headline: "",
			contact_linkedin_url: "",
			contact_is_valid_email: false,
			contact_validation_status: "",
			contact_validation_source: "",
			organization_primary_domain: domainName,
			organization_linkedin_url: "",
			organization_facebook_url: "",
			organization_founded_year: "",
			organization_city: "",
			organization_country: "",
			organization_address: "",
			organization_estimated_num_employees: "",
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
			personalized_icebreaker: ""
		};

		// Step 1: Parse sitemap and get URLs
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
						"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
					},
					timeout: 10000,
				});
				const xml2js = require("xml2js");
				const parser = new xml2js.Parser();
				const result = await parser.parseStringPromise(response.data);
				
				if (result.sitemapindex && result.sitemapindex.sitemap) {
					for (const sitemap of result.sitemapindex.sitemap) {
						const subResponse = await require("axios").get(sitemap.loc[0]);
						const subResult = await parser.parseStringPromise(subResponse.data);
						if (subResult.urlset && subResult.urlset.url) {
							allUrls.push(...subResult.urlset.url.map(entry => entry.loc[0]));
						}
					}
				} else if (result.urlset && result.urlset.url) {
					allUrls = result.urlset.url.map(entry => entry.loc[0]);
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
			const homepageAnalysis = await contentScraper.analyzeHomepage(domain);
			urls = homepageAnalysis.urls;
			allUrls = homepageAnalysis.allUrls;
		}

		// Step 2: Detect platform and integrations
		const platform = await platformDetector.detectPlatform(domainName);
		const integrations = await platformDetector.detectIntegrations(domainName);
		const isEcommerce = await platformDetector.detectEcommerce(allUrls);

		// Step 3: Process email
		const emailResult = await emailService.processEmail(
			lead.email,
			lead.firstName,
			lead.lastName,
			domainName
		);

		// Step 4: Extract contact information
		let contactInfo = {
			emails: [],
			socialLinks: {
				facebook: [],
				linkedin: [],
				twitter: [],
				instagram: [],
				youtube: [],
				tiktok: []
			},
			address: "",
			phone: ""
		};

		if (urls.contactPage) {
			contactInfo = await contactExtractor.extractContactInfo(urls.contactPage);
		}

		// Step 5: Scrape content from key pages
		const [aboutContent, collectionsContent, productContent, blogContent] = await Promise.all([
			urls.aboutPage ? contentScraper.scrapeContent(urls.aboutPage) : Promise.resolve(""),
			urls.collectionsPage ? contentScraper.scrapeContent(urls.collectionsPage) : Promise.resolve(""),
			urls.productPage ? contentScraper.scrapeContent(urls.productPage) : Promise.resolve(""),
			urls.blogPage ? contentScraper.scrapeContent(urls.blogPage) : Promise.resolve("")
		]);

		// Step 6: Generate OpenAI responses
		const [personalizedIcebreaker, aboutSummary] = await Promise.all([
			openaiService.generateOneLiner(aboutContent, lead.firstName),
			openaiService.generateAboutSummary(aboutContent)
		]);

		// Step 7: Update row data with all collected information
		rowData.contact_email = emailResult.email;
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
		rowData.pages_contact_page_email = contactInfo.emails.join(', ');
		rowData.pages_about_copy = aboutSummary;
		rowData.pages_product_copy = productContent || "";
		rowData.pages_blog_copy = blogContent || "";
		rowData.integrations_klaviyo = integrations.klaviyo;
		rowData.integrations_meta = integrations.meta;
		rowData.personalized_icebreaker = personalizedIcebreaker;
		rowData.email_candidates = JSON.stringify(emailResult.emailCandidates || []);

		// Add LeadMagic company information
		if (emailResult.companyInfo) {
			rowData.organization_linkedin_url = emailResult.companyInfo.companyLinkedinUrl || "";
			rowData.organization_facebook_url = emailResult.companyInfo.companyFacebookUrl || "";
			rowData.organization_founded_year = emailResult.companyInfo.companyFounded || "";
			rowData.organization_estimated_num_employees = emailResult.companyInfo.companySize || "";
			// Add location data from LeadMagic
			rowData.organization_city = emailResult.companyInfo.companyCity || "";
			rowData.organization_country = emailResult.companyInfo.companyCountry || "";
			rowData.organization_address = emailResult.companyInfo.companyAddress || "";
		}

		// Add social media links from contact page
		const socialLinks = contactExtractor.formatSocialLinks(contactInfo.socialLinks);
		Object.assign(rowData, socialLinks);

		// Step 8: Append to Google Sheets
		await sheetsService.appendRow(rowData);
		console.log(`Completed processing lead: ${lead.firstName} ${lead.lastName}`);
		return rowData;
	} catch (error) {
		console.error(`Error processing lead ${lead.firstName} ${lead.lastName}:`, error.message);
		throw error;
	}
}

async function main() {
	try {
		const contentScraper = new ContentScraper();
		const openaiService = new OpenAIService();
		const sheetsService = new SheetsService();
		const platformDetector = new PlatformDetector();
		const emailService = new EmailService();
		const contactExtractor = new ContactExtractor();

		// Initialize Google Sheet
		await sheetsService.initializeSheet();

		// Process all leads in parallel
		console.log("Starting parallel processing of all leads...");
		const results = await Promise.all(
			leads.map((lead) =>
				processLead(
					lead,
					contentScraper,
					openaiService,
					sheetsService,
					platformDetector,
					emailService,
					contactExtractor
				).catch((error) => {
					console.error(`Failed to process lead ${lead.firstName} ${lead.lastName}:`, error.message);
					return null;
				})
			)
		);

		// Filter out failed results and log summary
		const successfulResults = results.filter((result) => result !== null);
		console.log(`\nProcessing complete!`);
		console.log(`Successfully processed: ${successfulResults.length} leads`);
		console.log(`Failed to process: ${leads.length - successfulResults.length} leads`);
	} catch (error) {
		console.error("Error in main process:", error.message);
	}
}

main();
