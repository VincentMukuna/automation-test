# Website Scraper and Analyzer

This project is a Node.js application that scrapes websites, analyzes their content, and outputs the results to a Google Sheet. It's designed to evaluate websites for eCommerce capabilities and generate AI-powered responses based on their content.

## Features

-   Sitemap parsing with fallback to homepage crawling
-   Content scraping from About, Collections, and Product pages
-   eCommerce detection
-   OpenAI-powered content analysis
-   Google Sheets integration for data output

## Prerequisites

-   Node.js (v14 or higher)
-   OpenAI API key
-   Google Sheets API credentials
-   Google Cloud Project with Sheets API enabled

## Setup

1. Clone the repository:

```bash
git clone <repository-url>
cd website-scraper
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:

```
OPENAI_API_KEY=your_openai_api_key_here
GOOGLE_SHEETS_CLIENT_EMAIL=your_client_email_here
GOOGLE_SHEETS_PRIVATE_KEY=your_private_key_here
GOOGLE_SHEETS_SPREADSHEET_ID=your_spreadsheet_id_here
```

4. Set up Google Sheets API:
    - Create a Google Cloud Project
    - Enable the Google Sheets API
    - Create a service account and download credentials
    - Share your Google Sheet with the service account email

## Usage

Run the application:

```bash
npm start
```

The script will:

1. Process each website in the list
2. Scrape and analyze their content
3. Generate AI responses
4. Output results to the specified Google Sheet

## Project Structure

```
src/
├── index.js              # Main application file
└── utils/
    ├── sitemapParser.js  # Sitemap parsing logic
    ├── contentScraper.js # Content scraping logic
    ├── openaiService.js  # OpenAI integration
    └── sheetsService.js  # Google Sheets integration
```

## Error Handling

The application includes comprehensive error handling for:

-   Failed HTTP requests
-   Missing sitemaps
-   API rate limits
-   Invalid responses
-   Google Sheets API errors

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT
