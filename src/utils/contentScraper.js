const axios = require("axios");
const cheerio = require("cheerio");

class ContentScraper {
	constructor() {
		this.headers = {
			"User-Agent":
				"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
			Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
			"Accept-Language": "en-US,en;q=0.5",
			Connection: "keep-alive",
			"Upgrade-Insecure-Requests": "1",
		};
	}

	async scrapeContent(url) {
		if (!url) return null;

		try {
			const response = await axios.get(url, {
				headers: this.headers,
				timeout: 10000, // 10 second timeout
				maxRedirects: 5,
			});

			const $ = cheerio.load(response.data);

			// Remove unwanted elements
			$(
				"script, style, noscript, iframe, svg, img, video, audio, form, nav, footer, header"
			).remove();

			// Try to find the main content
			let content = "";

			// Common content selectors
			const contentSelectors = [
				"main",
				"article",
				".main-content",
				".content",
				"#content",
				".post-content",
				".entry-content",
				".product-description",
				".product-content",
			];

			// Try each selector
			for (const selector of contentSelectors) {
				const element = $(selector);
				if (element.length > 0) {
					content = element.text();
					break;
				}
			}

			// If no content found with selectors, use body
			if (!content) {
				content = $("body").text();
			}

			return this.cleanContent(content);
		} catch (error) {
			console.error(`Error scraping content from ${url}:`, error.message);
			if (error.response) {
				console.error("Response status:", error.response.status);
				console.error("Response headers:", error.response.headers);
			}
			return null;
		}
	}

	async analyzeHomepage(url) {
		try {
			const response = await axios.get(url, {
				headers: this.headers,
				timeout: 10000,
				maxRedirects: 5,
			});

			const $ = cheerio.load(response.data);
			const baseUrl = new URL(url).origin;
			const urls = new Set();
			let content = "";

			// Find all links
			$("a").each((i, link) => {
				const href = $(link).attr("href");
			});

			// Get main content
			const contentSelectors = [
				"main",
				"article",
				".main-content",
				".content",
				"#content",
				".post-content",
				".entry-content",
			];

			for (const selector of contentSelectors) {
				const element = $(selector);
				if (element.length > 0) {
					content = element.text();
					break;
				}
			}

			if (!content) {
				content = $("body").text();
			}

			// Categorize URLs
			const categorizedUrls = {
				aboutPage: null,
				collectionsPage: null,
				productPage: null,
			};

			// Sort URLs by relevance (prefer shorter URLs for the same type)
			const sortedUrls = Array.from(urls).sort(
				(a, b) => a.length - b.length
			);

			for (const url of sortedUrls) {
				const lowerUrl = url.toLowerCase();

				// About page matching
				if (
					!categorizedUrls.aboutPage &&
					(lowerUrl.includes("/about") ||
						lowerUrl.includes("/about-us") ||
						lowerUrl.includes("/about-our-company") ||
						lowerUrl.includes("/our-story") ||
						lowerUrl.includes("/who-we-are") ||
						lowerUrl.includes("/company") ||
						lowerUrl.includes("/team"))
				) {
					categorizedUrls.aboutPage = url;
				}

				// Collections page matching
				if (
					!categorizedUrls.collectionsPage &&
					(lowerUrl.includes("/collections") ||
						lowerUrl.includes("/shop") ||
						lowerUrl.includes("/category") ||
						lowerUrl.includes("/products") ||
						lowerUrl.includes("/store") ||
						lowerUrl.includes("/catalog") ||
						lowerUrl.includes("/browse"))
				) {
					categorizedUrls.collectionsPage = url;
				}

				// Product page matching
				if (
					!categorizedUrls.productPage &&
					(lowerUrl.includes("/product/") ||
						lowerUrl.includes("/products/") ||
						lowerUrl.includes("/item/") ||
						lowerUrl.includes("/p/") ||
						lowerUrl.includes("/product-detail") ||
						lowerUrl.includes("/buy/") ||
						lowerUrl.includes("/shop/"))
				) {
					categorizedUrls.productPage = url;
				}
			}

			return {
				urls: categorizedUrls,
				content: this.cleanContent(content),
				allUrls: Array.from(urls),
			};
		} catch (error) {
			console.error(`Error analyzing homepage ${url}:`, error.message);
			return {
				urls: {
					aboutPage: null,
					collectionsPage: null,
					productPage: null,
				},
				content: "",
				allUrls: [],
			};
		}
	}

	cleanContent(content) {
		if (!content) return "";

		return content
			.replace(/\s+/g, " ") // Replace multiple spaces with single space
			.replace(/\n+/g, " ") // Replace newlines with space
			.replace(/[^\S\r\n]+/g, " ") // Replace multiple whitespace with single space
			.replace(/[\u200B-\u200D\uFEFF]/g, "") // Remove zero-width spaces
			.trim(); // Remove leading/trailing whitespace
	}

	isEcommerceStore(urls) {
		if (!urls || !urls.length) return false;

		const ecommercePatterns = [
			"/cart",
			"/product",
			"/products",
			"/collections",
			"/shop",
			"/checkout",
			"/basket",
			"/store",
			"/catalog",
			"/category",
			"/add-to-cart",
			"/shopping-cart",
			"/my-account",
			"/account",
			"/wishlist",
		];

		return urls.some(
			(url) =>
				url &&
				ecommercePatterns.some((pattern) =>
					url.toLowerCase().includes(pattern)
				)
		);
	}
}

module.exports = ContentScraper;
