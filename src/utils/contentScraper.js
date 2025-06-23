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
			const { data: html } = await axios.get(url, {
				headers: this.headers,
				timeout: 15000,
				maxRedirects: 5,
			});

			const $ = cheerio.load(html);

			// Simple approach like ecommerce checker - get all text from body
			const text = $("body").text().replace(/\s+/g, " ").trim();

			return text;
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
			const { data: html } = await axios.get(url, {
				headers: this.headers,
				timeout: 15000,
				maxRedirects: 5,
			});

			const $ = cheerio.load(html);
			const baseUrl = new URL(url).origin;
			const urls = new Set();

			// Find all links - simple approach like ecommerce checker
			$("a[href]").each((_, el) => {
				let href = $(el).attr("href");
				if (!href) return;

				// Convert relative URLs to absolute
				if (href.startsWith("/")) {
					href = baseUrl + href;
				} else if (!href.startsWith("http")) {
					href = baseUrl + "/" + href;
				}

				// Only include URLs from the same domain
				if (href.includes(baseUrl) && !href.includes("#")) {
					urls.add(href.split("#")[0].split("?")[0]);
				}
			});

			// Get content using simple approach
			const content = $("body").text().replace(/\s+/g, " ").trim();

			// Categorize URLs
			const categorizedUrls = {
				aboutPage: null,
				collectionsPage: null,
				productPage: null,
				contactPage: null,
				blogPage: null,
			};

			const sortedUrls = Array.from(urls).sort(
				(a, b) => a.length - b.length
			);

			for (const url of sortedUrls) {
				const path = new URL(url).pathname.toLowerCase();

				// About page matching
				if (
					!categorizedUrls.aboutPage &&
					(path.includes("/about") ||
						path.includes("/about-us") ||
						path.includes("/our-story") ||
						path.includes("/company"))
				) {
					categorizedUrls.aboutPage = url;
				}

				// Contact page matching
				if (
					!categorizedUrls.contactPage &&
					(path.includes("/contact") ||
						path.includes("/contact-us") ||
						path.includes("/get-in-touch") ||
						path.includes("/support"))
				) {
					categorizedUrls.contactPage = url;
				}

				// Collections page matching
				if (
					!categorizedUrls.collectionsPage &&
					(path.includes("/collections") ||
						path.includes("/shop") ||
						path.includes("/category") ||
						path.includes("/products"))
				) {
					categorizedUrls.collectionsPage = url;
				}

				// Product page matching
				if (
					!categorizedUrls.productPage &&
					(path.includes("/product/") ||
						path.includes("/products/") ||
						path.includes("/item/") ||
						path.includes("/p/"))
				) {
					categorizedUrls.productPage = url;
				}

				// Blog page matching
				if (
					!categorizedUrls.blogPage &&
					(path.includes("/blog") ||
						path.includes("/news") ||
						path.includes("/articles") ||
						path.includes("/posts"))
				) {
					categorizedUrls.blogPage = url;
				}
			}

			return {
				urls: categorizedUrls,
				content: content,
				allUrls: Array.from(urls),
			};
		} catch (error) {
			console.error(`Error analyzing homepage ${url}:`, error.message);
			return {
				urls: {
					aboutPage: null,
					collectionsPage: null,
					productPage: null,
					contactPage: null,
					blogPage: null,
				},
				content: "",
				allUrls: [],
			};
		}
	}

	cleanContent(content) {
		if (!content) return "";
		return content.replace(/\s+/g, " ").trim();
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
			"/order",
			"/payment",
			"/shipping",
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
