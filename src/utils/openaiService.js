const OpenAI = require("openai");
require("dotenv").config();

class OpenAIService {
	constructor() {
		this.openai = new OpenAI({
			apiKey: process.env.OPENAI_API_KEY,
		});
	}

	async generateOneLiner(aboutContent) {
		try {
			if (!aboutContent) {
				return "Unable to generate response - no about page content available";
			}

			const prompt = `Based on this company's about page content, generate a friendly one-liner message starting with "Hey, I love the mission you're on regarding". Keep it concise and focused on their main mission or purpose. Content: ${aboutContent}`;

			const response = await this.openai.chat.completions.create({
				model: "gpt-3.5-turbo",
				messages: [
					{
						role: "system",
						content:
							"You are a friendly AI assistant that generates concise, mission-focused messages.",
					},
					{
						role: "user",
						content: prompt,
					},
				],
				max_tokens: 100,
				temperature: 0.7,
			});

			return response.choices[0].message.content.trim();
		} catch (error) {
			console.error("Error generating OpenAI response:", error.message);
			return "Error generating response";
		}
	}
}

module.exports = OpenAIService;
