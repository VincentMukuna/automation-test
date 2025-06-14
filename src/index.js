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

		// Instantiate SitemapParser with the website URL
		const sitemapParser = new SitemapParser(website);

		// Parse sitemap and get URLs, and track which method was used
		let sitemapUrlUsed = "";
		let urls = {
			aboutPage: null,
			collectionsPage: null,
			productPage: null,
		};
		let triedSitemaps = sitemapParser.sitemapUrls;
		let found = false;
		for (const sitemapUrl of triedSitemaps) {
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
					// If sitemap index, process all sitemaps
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
				// Try next
			}
		}
		if (!found) {
			// Fallback: try robots.txt and homepage crawl
			sitemapUrlUsed = "(fallback)";
			urls = await sitemapParser.tryFallbackMethods();
		}

		// Scrape content from each page
		const aboutContent = urls.aboutPage
			? await contentScraper.scrapeContent(urls.aboutPage)
			: "";
		const collectionsContent = urls.collectionsPage
			? await contentScraper.scrapeContent(urls.collectionsPage)
			: "";
		const productContent = urls.productPage
			? await contentScraper.scrapeContent(urls.productPage)
			: "";

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
	} catch (error) {
		console.error(`Error processing ${website}:`, error.message);
	}
}

async function main() {
	try {
		const contentScraper = new ContentScraper();
		const openaiService = new OpenAIService();
		const sheetsService = new SheetsService();

		// Initialize Google Sheet
		await sheetsService.initializeSheet();

		// Process each website
		for (const website of websites) {
			await processWebsite(
				website,
				contentScraper,
				openaiService,
				sheetsService
			);
		}

		console.log("All websites processed successfully!");
	} catch (error) {
		console.error("Error in main process:", error.message);
	}
}

main();
