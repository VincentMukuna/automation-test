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
				timeout: 15000, // Increased timeout for better reliability
				maxRedirects: 5,
			});

			const $ = cheerio.load(response.data);

			// Remove only truly unwanted elements that don't contain meaningful content
			$(
				"script, style, noscript, iframe, svg, video, audio, form"
			).remove();

			// Get comprehensive content from the page
			let content = this.extractAllContent($);

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

	extractAllContent($) {
		let content = "";

		// Extract text from all meaningful elements
		const textElements = [
			"h1",
			"h2",
			"h3",
			"h4",
			"h5",
			"h6", // Headings
			"p",
			"div",
			"span",
			"li",
			"td",
			"th", // Text content
			"article",
			"section",
			"main",
			"aside", // Semantic content
			"blockquote",
			"pre",
			"code", // Code and quotes
			"label",
			"legend",
			"caption", // Form and table labels
			"title",
			"meta[name='description']",
			"meta[name='keywords']", // Meta content
		];

		// Extract text from each element type
		textElements.forEach((selector) => {
			$(selector).each((i, element) => {
				const text = $(element).text().trim();
				if (text && text.length > 0) {
					content += text + " ";
				}
			});
		});

		// Also extract alt text from images for accessibility content
		$("img[alt]").each((i, element) => {
			const altText = $(element).attr("alt").trim();
			if (altText && altText.length > 0) {
				content += altText + " ";
			}
		});

		// Extract title attributes from elements
		$("[title]").each((i, element) => {
			const titleText = $(element).attr("title").trim();
			if (titleText && titleText.length > 0) {
				content += titleText + " ";
			}
		});

		// If still no content, get everything from body
		if (!content.trim()) {
			content = $("body").text();
		}

		return content;
	}

	async analyzeHomepage(url) {
		try {
			const response = await axios.get(url, {
				headers: this.headers,
				timeout: 15000,
				maxRedirects: 5,
			});

			const $ = cheerio.load(response.data);
			const baseUrl = new URL(url).origin;
			const urls = new Set();

			// Find all links - more comprehensive approach
			$("a").each((i, link) => {
				const href = $(link).attr("href");
				if (href) {
					// Convert relative URLs to absolute
					let fullUrl;
					try {
						if (href.startsWith("http")) {
							fullUrl = href;
						} else if (href.startsWith("/")) {
							fullUrl = baseUrl + href;
						} else if (
							href.startsWith("#") ||
							href.startsWith("javascript:") ||
							href.startsWith("mailto:") ||
							href.startsWith("tel:")
						) {
							// Skip anchor links, javascript, email, and phone links
							return;
						} else {
							fullUrl = baseUrl + "/" + href;
						}

						// Only include URLs from the same domain and valid URLs
						if (
							fullUrl.startsWith(baseUrl) &&
							!fullUrl.includes("#")
						) {
							urls.add(fullUrl);
						}
					} catch (e) {
						// Skip invalid URLs
						console.warn(`Invalid URL found: ${href}`);
					}
				}
			});

			// Get comprehensive content
			const content = this.extractAllContent($);

			// Categorize URLs - more flexible matching
			const categorizedUrls = {
				aboutPage: null,
				collectionsPage: null,
				productPage: null,
				contactPage: null,
				blogPage: null,
			};

			// Sort URLs by relevance (prefer shorter URLs for the same type)
			const sortedUrls = Array.from(urls).sort(
				(a, b) => a.length - b.length
			);

			for (const url of sortedUrls) {
				const lowerUrl = url.toLowerCase();
				const path = new URL(url).pathname.toLowerCase();

				// About page matching - more patterns
				if (
					!categorizedUrls.aboutPage &&
					(path.includes("/about") ||
						path.includes("/about-us") ||
						path.includes("/about-our-company") ||
						path.includes("/our-story") ||
						path.includes("/who-we-are") ||
						path.includes("/company") ||
						path.includes("/team") ||
						path.includes("/story") ||
						path.includes("/mission") ||
						path.includes("/vision") ||
						path.includes("/values"))
				) {
					categorizedUrls.aboutPage = url;
				}

				// Contact page matching - more patterns
				if (
					!categorizedUrls.contactPage &&
					(path.includes("/contact") ||
						path.includes("/contact-us") ||
						path.includes("/get-in-touch") ||
						path.includes("/reach-us") ||
						path.includes("/connect") ||
						path.includes("/support") ||
						path.includes("/help") ||
						path.includes("/get-help"))
				) {
					categorizedUrls.contactPage = url;
				}

				// Collections page matching - more patterns
				if (
					!categorizedUrls.collectionsPage &&
					(path.includes("/collections") ||
						path.includes("/shop") ||
						path.includes("/category") ||
						path.includes("/products") ||
						path.includes("/store") ||
						path.includes("/catalog") ||
						path.includes("/browse") ||
						path.includes("/menu") ||
						path.includes("/services") ||
						path.includes("/offerings"))
				) {
					categorizedUrls.collectionsPage = url;
				}

				// Product page matching - more patterns
				if (
					!categorizedUrls.productPage &&
					(path.includes("/product/") ||
						path.includes("/products/") ||
						path.includes("/item/") ||
						path.includes("/p/") ||
						path.includes("/product-detail") ||
						path.includes("/buy/") ||
						path.includes("/shop/") ||
						path.includes("/detail/") ||
						path.includes("/view/"))
				) {
					categorizedUrls.productPage = url;
				}

				// Blog page matching - more patterns
				if (
					!categorizedUrls.blogPage &&
					(path.includes("/blog") ||
						path.includes("/news") ||
						path.includes("/articles") ||
						path.includes("/posts") ||
						path.includes("/journal") ||
						path.includes("/magazine") ||
						path.includes("/insights") ||
						path.includes("/resources") ||
						path.includes("/updates"))
				) {
					categorizedUrls.blogPage = url;
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

		return content
			.replace(/\s+/g, " ") // Replace multiple spaces with single space
			.replace(/\n+/g, " ") // Replace newlines with space
			.replace(/[^\S\r\n]+/g, " ") // Replace multiple whitespace with single space
			.replace(/[\u200B-\u200D\uFEFF]/g, "") // Remove zero-width spaces
			.replace(/\s+/g, " ") // Final cleanup of any remaining multiple spaces
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
