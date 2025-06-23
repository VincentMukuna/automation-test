const OpenAI = require("openai");
require("dotenv").config();

class OpenAIService {
	constructor() {
		this.openai = new OpenAI({
			apiKey: process.env.OPENAI_API_KEY,
			timeout: 30000, // 30 second timeout
		});
		this.requestQueue = [];
		this.isProcessing = false;
		this.lastRequestTime = 0;
		this.minRequestInterval = 20000; // 20 seconds between requests (3 RPM = 20 seconds each)
	}

	// Helper method to wait for rate limit
	async waitForRateLimit() {
		const now = Date.now();
		const timeSinceLastRequest = now - this.lastRequestTime;

		if (timeSinceLastRequest < this.minRequestInterval) {
			const waitTime = this.minRequestInterval - timeSinceLastRequest;
			console.log(
				`Rate limiting: waiting ${waitTime}ms before next OpenAI request...`
			);
			await new Promise((resolve) => setTimeout(resolve, waitTime));
		}
		this.lastRequestTime = Date.now();
	}

	// Helper method to retry with exponential backoff
	async retryWithBackoff(fn, maxRetries = 3) {
		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			try {
				await this.waitForRateLimit();
				return await fn();
			} catch (error) {
				if (error.message.includes("429") && attempt < maxRetries) {
					const backoffTime = Math.pow(2, attempt) * 1000; // Exponential backoff: 2s, 4s, 8s
					console.log(
						`Rate limit hit, retrying in ${backoffTime}ms (attempt ${attempt}/${maxRetries})...`
					);
					await new Promise((resolve) =>
						setTimeout(resolve, backoffTime)
					);
				} else {
					throw error;
				}
			}
		}
	}

	async generateOneLiner(aboutContent, firstName = "") {
		try {
			if (!aboutContent) {
				return "Unable to generate response - no about page content available";
			}

			const namePrefix = firstName ? `Hey ${firstName}, ` : "Hey, ";

			const prompt = `Based on this company's about page content, generate a personalized one-liner message that starts with "${namePrefix}I love the mission you're on regarding" and then summarizes their main mission or purpose in a concise, friendly way. 

Content: ${aboutContent}

Requirements:
- Start with "${namePrefix}I love the mission you're on regarding"
- Keep it concise and conversational
- Focus on their main mission, values, or purpose
- Make it feel personal and genuine`;

			console.log(`Generating one-liner for ${firstName}...`);

			const response = await this.retryWithBackoff(async () => {
				return await this.openai.chat.completions.create({
					model: "gpt-3.5-turbo",
					messages: [
						{
							role: "system",
							content:
								"You are a friendly AI assistant that generates personalized, mission-focused messages for lead outreach. Always start with the exact format requested and keep responses concise and genuine.",
						},
						{
							role: "user",
							content: prompt,
						},
					],
					max_tokens: 150,
					temperature: 0.7,
				});
			});

			console.log(`One-liner generated successfully for ${firstName}`);
			return response.choices[0].message.content.trim();
		} catch (error) {
			console.error("Error generating OpenAI response:", error.message);
			return "Error generating response";
		}
	}

	async generateAboutSummary(aboutContent) {
		try {
			if (!aboutContent) {
				return "";
			}

			const prompt = `Summarize this company's about page content in 2-3 sentences, focusing on their mission, what they do, and their key value proposition. Keep it professional and informative.

Content: ${aboutContent}`;

			console.log("Generating about summary...");

			const response = await this.retryWithBackoff(async () => {
				return await this.openai.chat.completions.create({
					model: "gpt-3.5-turbo",
					messages: [
						{
							role: "system",
							content:
								"You are a professional AI assistant that creates concise, informative summaries of company information.",
						},
						{
							role: "user",
							content: prompt,
						},
					],
					max_tokens: 200,
					temperature: 0.5,
				});
			});

			console.log("About summary generated successfully");
			return response.choices[0].message.content.trim();
		} catch (error) {
			console.error("Error generating about summary:", error.message);
			return "";
		}
	}
}

module.exports = OpenAIService;
