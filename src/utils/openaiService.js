const OpenAI = require("openai");
require("dotenv").config();

class OpenAIService {
	constructor() {
		this.openai = new OpenAI({
			apiKey: process.env.OPENAI_API_KEY,
		});
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

			const response = await this.openai.chat.completions.create({
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

			const response = await this.openai.chat.completions.create({
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

			return response.choices[0].message.content.trim();
		} catch (error) {
			console.error("Error generating about summary:", error.message);
			return "";
		}
	}
}

module.exports = OpenAIService;
