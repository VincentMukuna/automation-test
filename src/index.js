require("dotenv").config();
const SitemapParser = require("./utils/sitemapParser");
const ContentScraper = require("./utils/contentScraper");
const OpenAIService = require("./utils/openaiService");
const SheetsService = require("./utils/sheetsService");

const websites = [
	"https://antelopepets.com",
	"https://theclearbrands.com",
	"https://packwoods.com",
	"https://pctl.com",
	"https://biohazardinc.com",
];

async function processWebsite(
	website,
	contentScraper,
	openaiService,
	sheetsService
) {
	try {
		console.log(`Processing ${website}...`);

		// First try sitemap
		const sitemapParser = new SitemapParser(website);
		let urls = {
			aboutPage: null,
			collectionsPage: null,
			productPage: null,
		};
		let sitemapUrlUsed = "";
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
				let urlList = [];
				if (result.sitemapindex && result.sitemapindex.sitemap) {
					for (const sitemap of result.sitemapindex.sitemap) {
						const subResponse = await require("axios").get(
							sitemap.loc[0]
						);
						const subResult = await parser.parseStringPromise(
							subResponse.data
						);
						if (subResult.urlset && subResult.urlset.url) {
							urlList.push(
								...subResult.urlset.url.map(
									(entry) => entry.loc[0]
								)
							);
						}
					}
				} else if (result.urlset && result.urlset.url) {
					urlList = result.urlset.url.map((entry) => entry.loc[0]);
				}
				urls = sitemapParser.categorizeUrls(urlList);
				sitemapUrlUsed = sitemapUrl;
				found = true;
				break;
			} catch (e) {
				console.log(`Sitemap not found at ${sitemapUrl}`);
			}
		}

		// If sitemap not found, analyze homepage
		if (!found) {
			console.log("No sitemap found, analyzing homepage...");
			sitemapUrlUsed = "(homepage analysis)";
			const homepageAnalysis = await contentScraper.analyzeHomepage(
				website
			);
			urls = homepageAnalysis.urls;

			// If we have homepage content but no about page, use homepage content for OpenAI
			if (!urls.aboutPage && homepageAnalysis.content) {
				urls.aboutPage = website;
			}
		}

		// Scrape content from each page in parallel
		const [aboutContent, collectionsContent, productContent] =
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
			]);

		// Determine if eCommerce
		const isEcommerce = contentScraper.isEcommerceStore(
			[urls.aboutPage, urls.collectionsPage, urls.productPage].filter(
				Boolean
			)
		);

		// Generate OpenAI response
		const openaiResponse = await openaiService.generateOneLiner(
			aboutContent
		);

		// Prepare data for Google Sheets
		const rowData = {
			website,
			sitemapUrl: sitemapUrlUsed,
			aboutPageUrl: urls.aboutPage || "",
			collectionsPageUrl: urls.collectionsPage || "",
			productPageUrl: urls.productPage || "",
			aboutPageContent: aboutContent || "",
			collectionsPageContent: collectionsContent || "",
			productPageContent: productContent || "",
			isEcommerce,
			openaiResponse,
		};

		// Append to Google Sheets
		await sheetsService.appendRow(rowData);
		console.log(`Completed processing ${website}`);
		return rowData;
	} catch (error) {
		console.error(`Error processing ${website}:`, error.message);
		throw error;
	}
}

async function main() {
	try {
		const contentScraper = new ContentScraper();
		const openaiService = new OpenAIService();
		const sheetsService = new SheetsService();

		// Initialize Google Sheet
		await sheetsService.initializeSheet();

		// Process all websites in parallel
		console.log("Starting parallel processing of all websites...");
		const results = await Promise.all(
			websites.map((website) =>
				processWebsite(
					website,
					contentScraper,
					openaiService,
					sheetsService
				).catch((error) => {
					console.error(
						`Failed to process ${website}:`,
						error.message
					);
					return null;
				})
			)
		);

		// Filter out failed results and log summary
		const successfulResults = results.filter((result) => result !== null);
		console.log(`\nProcessing complete!`);
		console.log(
			`Successfully processed: ${successfulResults.length} websites`
		);
		console.log(
			`Failed to process: ${
				websites.length - successfulResults.length
			} websites`
		);
	} catch (error) {
		console.error("Error in main process:", error.message);
	}
}

main();
