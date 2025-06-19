const axios = require("axios");
const cheerio = require("cheerio");

class PlatformDetector {
	constructor() {
		this.platformPatterns = {
			shopify: [
				"cdn.shopify.com",
				"window.Shopify",
				"shopify.com",
				"myshopify.com"
			],
			woocommerce: [
				"woocommerce",
				"wp-content/plugins/woocommerce",
				"wc-",
				"woocommerce-"
			],
			bigcommerce: [
				"stencil-utils",
				"cdn.bcapps.net",
				"bigcommerce.com",
				"bc-sf-filter"
			],
			webflow: [
				"webflow.js",
				"data-wf-page",
				"Webflow.push",
				"webflow.com"
			]
		};

		this.integrationPatterns = {
			klaviyo: [
				"klaviyo.js",
				"static.klaviyo.com",
				"klaviyo.com",
				"klaviyo"
			],
			meta: [
				"fbq('init')",
				"connect.facebook.net",
				"facebook.com",
				"fbq(",
				"facebook pixel"
			]
		};
	}

	async detectPlatform(domain) {
		try {
			const response = await axios.get(`https://${domain}`, {
				headers: {
					"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
				},
				timeout: 10000
			});

			const html = response.data;
			const $ = cheerio.load(html);

			// Check for platform patterns
			for (const [platform, patterns] of Object.entries(this.platformPatterns)) {
				for (const pattern of patterns) {
					if (html.toLowerCase().includes(pattern.toLowerCase())) {
						return this.capitalizePlatform(platform);
					}
				}
			}

			// Check for platform-specific meta tags
			if ($('meta[name="generator"]').length > 0) {
				const generator = $('meta[name="generator"]').attr('content');
				if (generator && generator.toLowerCase().includes('shopify')) {
					return 'Shopify';
				}
				if (generator && generator.toLowerCase().includes('woocommerce')) {
					return 'WooCommerce';
				}
			}

			// Check for platform-specific classes
			if ($('.shopify-section').length > 0) {
				return 'Shopify';
			}
			if ($('.woocommerce').length > 0) {
				return 'WooCommerce';
			}
			if ($('[data-bc-sf-filter]').length > 0) {
				return 'BigCommerce';
			}

			return 'Unknown';
		} catch (error) {
			console.error(`Error detecting platform for ${domain}:`, error.message);
			return 'Unknown';
		}
	}

	capitalizePlatform(platform) {
		const platformMap = {
			'shopify': 'Shopify',
			'woocommerce': 'WooCommerce',
			'bigcommerce': 'BigCommerce',
			'webflow': 'Webflow',
			'unknown': 'Custom or Unknown'
		};
		return platformMap[platform] || 'Custom';
	}

	async detectIntegrations(domain) {
		try {
			const response = await axios.get(`https://${domain}`, {
				headers: {
					"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
				},
				timeout: 10000
			});

			const html = response.data;
			const integrations = {};

			// Check for Klaviyo integration
			integrations.klaviyo = this.integrationPatterns.klaviyo.some(pattern => 
				html.toLowerCase().includes(pattern.toLowerCase())
			);

			// Check for Meta/Facebook integration
			integrations.meta = this.integrationPatterns.meta.some(pattern => 
				html.toLowerCase().includes(pattern.toLowerCase())
			);

			return integrations;
		} catch (error) {
			console.error(`Error detecting integrations for ${domain}:`, error.message);
			return { klaviyo: false, meta: false };
		}
	}

	async detectEcommerce(urls) {
		const ecommercePatterns = [
			'/collections',
			'/product',
			'/shop',
			'/cart',
			'/checkout',
			'/store',
			'/buy',
			'/add-to-cart',
			'/products'
		];

		for (const url of urls) {
			if (ecommercePatterns.some(pattern => url.toLowerCase().includes(pattern))) {
				return true;
			}
		}

		return false;
	}
}

module.exports = PlatformDetector; 