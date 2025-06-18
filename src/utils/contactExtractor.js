const axios = require("axios");
const cheerio = require("cheerio");

class ContactExtractor {
	constructor() {
		this.socialPatterns = {
			facebook: [
				"facebook.com",
				"fb.com",
				"facebook"
			],
			linkedin: [
				"linkedin.com",
				"linkedin"
			],
			twitter: [
				"twitter.com",
				"x.com",
				"twitter"
			],
			instagram: [
				"instagram.com",
				"instagram"
			],
			youtube: [
				"youtube.com",
				"youtu.be",
				"youtube"
			],
			tiktok: [
				"tiktok.com",
				"tiktok"
			]
		};
	}

	async extractContactInfo(url) {
		try {
			const response = await axios.get(url, {
				headers: {
					"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
				},
				timeout: 10000
			});

			const $ = cheerio.load(response.data);
			const contactInfo = {
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

			// Extract emails
			const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
			const textContent = $.text();
			const emails = textContent.match(emailRegex) || [];
			contactInfo.emails = [...new Set(emails)]; // Remove duplicates

			// Extract social media links
			$('a[href*="http"]').each((i, element) => {
				const href = $(element).attr('href');
				if (href) {
					for (const [platform, patterns] of Object.entries(this.socialPatterns)) {
						if (patterns.some(pattern => href.toLowerCase().includes(pattern))) {
							contactInfo.socialLinks[platform].push(href);
						}
					}
				}
			});

			// Remove duplicates from social links
			for (const platform in contactInfo.socialLinks) {
				contactInfo.socialLinks[platform] = [...new Set(contactInfo.socialLinks[platform])];
			}

			// Extract address (look for common address patterns)
			const addressSelectors = [
				'[itemtype*="PostalAddress"]',
				'.address',
				'#address',
				'[class*="address"]',
				'[id*="address"]'
			];

			for (const selector of addressSelectors) {
				const addressElement = $(selector);
				if (addressElement.length > 0) {
					contactInfo.address = addressElement.text().trim();
					break;
				}
			}

			// Extract phone number
			const phoneRegex = /(\+?1?[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g;
			const phoneMatches = textContent.match(phoneRegex) || [];
			if (phoneMatches.length > 0) {
				contactInfo.phone = phoneMatches[0];
			}

			return contactInfo;
		} catch (error) {
			console.error(`Error extracting contact info from ${url}:`, error.message);
			return {
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
		}
	}

	async findContactPage(domain, allUrls) {
		const contactPatterns = [
			'/contact',
			'/about',
			'/about-us',
			'/contact-us',
			'/get-in-touch',
			'/reach-us'
		];

		// First try to find contact page in provided URLs
		for (const url of allUrls) {
			if (contactPatterns.some(pattern => url.toLowerCase().includes(pattern))) {
				return url;
			}
		}

		// If not found, try common contact page URLs
		for (const pattern of contactPatterns) {
			try {
				const url = `https://${domain}${pattern}`;
				const response = await axios.get(url, {
					headers: {
						"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
					},
					timeout: 5000
				});
				if (response.status === 200) {
					return url;
				}
			} catch (error) {
				// Continue to next pattern
			}
		}

		return null;
	}

	formatSocialLinks(socialLinks) {
		const formatted = {};
		for (const [platform, links] of Object.entries(socialLinks)) {
			formatted[`pages_contact_page_social_links_${platform}`] = links.join(', ');
		}
		return formatted;
	}
}

module.exports = ContactExtractor; 