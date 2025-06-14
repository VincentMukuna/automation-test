const axios = require("axios");
const xml2js = require("xml2js");

const websites = [
	"https://antelopepets.com",
	"https://theclearbrands.com",
	"https://packwoods.com",
	"https://pctl.com",
	"https://biohazardinc.com",
];

async function testSitemap(url) {
	const sitemapUrl = `${url}/sitemap.xml`;
	console.log(`\nTesting sitemap for: ${url}`);
	console.log(`Sitemap URL: ${sitemapUrl}`);

	try {
		const response = await axios.get(sitemapUrl, {
			headers: {
				"User-Agent":
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
			},
		});

		console.log("Status:", response.status);
		console.log("Content Type:", response.headers["content-type"]);

		// Try to parse the XML
		const parser = new xml2js.Parser();
		const result = await parser.parseStringPromise(response.data);

		if (result.urlset && result.urlset.url) {
			console.log("Number of URLs found:", result.urlset.url.length);
			// Show first 3 URLs as sample
			console.log("Sample URLs:");
			result.urlset.url.slice(0, 3).forEach((url) => {
				console.log("-", url.loc[0]);
			});
		} else {
			console.log("No URLs found in sitemap");
		}
	} catch (error) {
		console.log("Error:", error.message);
		if (error.response) {
			console.log("Response status:", error.response.status);
			console.log("Response headers:", error.response.headers);
		}
	}
}

async function main() {
	for (const website of websites) {
		await testSitemap(website);
	}
}

main();
