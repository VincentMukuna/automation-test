const axios = require("axios");
const xml2js = require("xml2js");
const cheerio = require("cheerio");

class SitemapParser {
	constructor(baseUrl) {
		this.baseUrl = baseUrl;
		this.sitemapUrls = [
			`${baseUrl}/sitemap.xml`,
			`${baseUrl}/sitemap_index.xml`,
			`${baseUrl}/sitemap-index.xml`,
			`${baseUrl}/sitemap/sitemap.xml`,
			`${baseUrl}/sitemap/sitemap-index.xml`,
		];
	}

	async parseSitemap() {
		// Try all possible sitemap locations
		for (const sitemapUrl of this.sitemapUrls) {
			try {
				const response = await axios.get(sitemapUrl, {
					headers: {
						"User-Agent":
							"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
					},
					timeout: 10000,
				});

				const parser = new xml2js.Parser();
				const result = await parser.parseStringPromise(response.data);

				// Handle sitemap index
				if (result.sitemapindex && result.sitemapindex.sitemap) {
					const urls = await this.processSitemapIndex(
						result.sitemapindex.sitemap
					);
					return this.categorizeUrls(urls);
				}

				// Handle regular sitemap
				if (result.urlset && result.urlset.url) {
					const urls = result.urlset.url.map((entry) => entry.loc[0]);
					return this.categorizeUrls(urls);
				}
			} catch (error) {
				console.log(`Sitemap not found at ${sitemapUrl}`);
				continue;
			}
		}

		// If no sitemap found, try multiple fallback methods
		console.log(
			`No sitemap found for ${this.baseUrl}, trying fallback methods...`
		);
		return this.tryFallbackMethods();
	}

	async tryFallbackMethods() {
		// Try robots.txt first
		try {
			const robotsResponse = await axios.get(
				`${this.baseUrl}/robots.txt`,
				{
					headers: {
						"User-Agent":
							"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
					},
					timeout: 5000,
				}
			);

			const sitemapMatch = robotsResponse.data.match(/Sitemap:\s*(.+)/i);
			if (sitemapMatch) {
				const sitemapUrl = sitemapMatch[1].trim();
				const sitemapResponse = await axios.get(sitemapUrl);
				const parser = new xml2js.Parser();
				const result = await parser.parseStringPromise(
					sitemapResponse.data
				);

				if (result.urlset && result.urlset.url) {
					const urls = result.urlset.url.map((entry) => entry.loc[0]);
					return this.categorizeUrls(urls);
				}
			}
		} catch (error) {
			console.log("Error checking robots.txt:", error.message);
		}

		// Try homepage crawl
		try {
			const response = await axios.get(this.baseUrl, {
				headers: {
					"User-Agent":
						"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
				},
				timeout: 10000,
			});

			const $ = cheerio.load(response.data);
			const urls = new Set();

			// Find all links
			$("a").each((i, link) => {
				const href = $(link).attr("href");
				if (href && !href.startsWith("#")) {
					try {
						const absoluteUrl = new URL(
							href,
							this.baseUrl
						).toString();
						urls.add(absoluteUrl);
					} catch (error) {
						console.log(`Invalid URL: ${href}`);
					}
				}
			});

			// Also check for common URL patterns in the HTML
			const commonPatterns = [
				"/about",
				"/about-us",
				"/shop",
				"/products",
				"/collections",
				"/store",
				"/catalog",
			];

			for (const pattern of commonPatterns) {
				try {
					const testUrl = new URL(pattern, this.baseUrl).toString();
					const testResponse = await axios.get(testUrl, {
						headers: {
							"User-Agent":
								"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
						},
						timeout: 5000,
						validateStatus: (status) => status < 400,
					});
					urls.add(testUrl);
				} catch (error) {
					// Ignore errors for test URLs
				}
			}

			return this.categorizeUrls(Array.from(urls));
		} catch (error) {
			console.error(`Error in fallback methods: ${error.message}`);
			return {
				aboutPage: null,
				collectionsPage: null,
				productPage: null,
			};
		}
	}

	async processSitemapIndex(sitemaps) {
		const allUrls = new Set();

		for (const sitemap of sitemaps) {
			try {
				const response = await axios.get(sitemap.loc[0], {
					headers: {
						"User-Agent":
							"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
					},
					timeout: 10000,
				});

				const parser = new xml2js.Parser();
				const result = await parser.parseStringPromise(response.data);

				if (result.urlset && result.urlset.url) {
					result.urlset.url.forEach((entry) =>
						allUrls.add(entry.loc[0])
					);
				}
			} catch (error) {
				console.log(
					`Error processing sitemap ${sitemap.loc[0]}: ${error.message}`
				);
			}
		}

		return Array.from(allUrls);
	}

	categorizeUrls(urls) {
		const result = {
			aboutPage: null,
			collectionsPage: null,
			productPage: null,
			contactPage: null,
			blogPage: null,
		};

		// Sort URLs by relevance (prefer shorter URLs for the same type)
		const sortedUrls = urls.sort((a, b) => a.length - b.length);

		for (const url of sortedUrls) {
			const lowerUrl = url.toLowerCase();

			// About page matching
			if (
				!result.aboutPage &&
				(lowerUrl.includes("/about") ||
					lowerUrl.includes("/about-us") ||
					lowerUrl.includes("/about-our-company") ||
					lowerUrl.includes("/our-story") ||
					lowerUrl.includes("/who-we-are") ||
					lowerUrl.includes("/company") ||
					lowerUrl.includes("/team") ||
					lowerUrl.includes("/story"))
			) {
				result.aboutPage = url;
			}

			// Contact page matching
			if (
				!result.contactPage &&
				(lowerUrl.includes("/contact") ||
					lowerUrl.includes("/contact-us") ||
					lowerUrl.includes("/get-in-touch") ||
					lowerUrl.includes("/reach-us") ||
					lowerUrl.includes("/connect"))
			) {
				result.contactPage = url;
			}

			// Collections page matching
			if (
				!result.collectionsPage &&
				(lowerUrl.includes("/collections") ||
					lowerUrl.includes("/shop") ||
					lowerUrl.includes("/category") ||
					lowerUrl.includes("/products") ||
					lowerUrl.includes("/store") ||
					lowerUrl.includes("/catalog") ||
					lowerUrl.includes("/browse"))
			) {
				result.collectionsPage = url;
			}

			// Product page matching
			if (
				!result.productPage &&
				(lowerUrl.includes("/product/") ||
					lowerUrl.includes("/products/") ||
					lowerUrl.includes("/item/") ||
					lowerUrl.includes("/p/") ||
					lowerUrl.includes("/product-detail") ||
					lowerUrl.includes("/buy/") ||
					lowerUrl.includes("/shop/"))
			) {
				result.productPage = url;
			}

			// Blog page matching
			if (
				!result.blogPage &&
				(lowerUrl.includes("/blog") ||
					lowerUrl.includes("/news") ||
					lowerUrl.includes("/articles") ||
					lowerUrl.includes("/posts") ||
					lowerUrl.includes("/journal") ||
					lowerUrl.includes("/magazine"))
			) {
				result.blogPage = url;
			}
		}

		return result;
	}
}

module.exports = SitemapParser;
