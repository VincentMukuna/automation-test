const SitemapParser = require("./utils/sitemapParser");
const ContentScraper = require("./utils/contentScraper");

const websites = [
	"https://antelopepets.com",
	"https://theclearbrands.com",
	"https://packwoods.com",
	"https://pctl.com",
	"https://biohazardinc.com",
];

async function testWebsite(url) {
	console.log(`\n=== Testing ${url} ===`);

	const sitemapParser = new SitemapParser(url);
	const contentScraper = new ContentScraper();

	try {
		// Test sitemap parsing
		console.log("\nParsing sitemap...");
		const urls = await sitemapParser.parseSitemap();
		console.log("Found URLs:", urls);

		// Test content scraping
		if (urls.aboutPage) {
			console.log("\nScraping about page...");
			const aboutContent = await contentScraper.scrapeContent(
				urls.aboutPage
			);
			console.log(
				"About page content preview:",
				aboutContent
					? aboutContent.substring(0, 200) + "..."
					: "No content"
			);
		}

		if (urls.collectionsPage) {
			console.log("\nScraping collections page...");
			const collectionsContent = await contentScraper.scrapeContent(
				urls.collectionsPage
			);
			console.log(
				"Collections page content preview:",
				collectionsContent
					? collectionsContent.substring(0, 200) + "..."
					: "No content"
			);
		}

		if (urls.productPage) {
			console.log("\nScraping product page...");
			const productContent = await contentScraper.scrapeContent(
				urls.productPage
			);
			console.log(
				"Product page content preview:",
				productContent
					? productContent.substring(0, 200) + "..."
					: "No content"
			);
		}

		// Test eCommerce detection
		const isEcommerce = contentScraper.isEcommerceStore(
			[urls.aboutPage, urls.collectionsPage, urls.productPage].filter(
				Boolean
			)
		);
		console.log("\nIs eCommerce store:", isEcommerce ? "Yes" : "No");
	} catch (error) {
		console.error("Error testing website:", error.message);
	}
}

async function main() {
	for (const website of websites) {
		await testWebsite(website);
	}
}

main();
