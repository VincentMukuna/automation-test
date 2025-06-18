# Lead Enrichment & Automation System

A production-level lead enrichment pipeline that processes lead data and generates actionable insights and personalization assets.

## Features

### ✅ Implemented Features

- **Sitemap Parsing & URL Discovery** - Automatically finds and categorizes website pages
- **Platform Detection** - Identifies Shopify, WooCommerce, BigCommerce, Webflow
- **Tech Stack Integration Detection** - Detects Klaviyo and Meta/Facebook integrations
- **E-commerce Detection** - Identifies e-commerce stores based on URL patterns
- **Email Validation & Finding** - Uses LeadMagic API for email validation and discovery
- **Contact Information Extraction** - Extracts emails, social media links, and contact details
- **Content Scraping** - Scrapes content from about, contact, product, and blog pages
- **Personalized One-Liner Generation** - Creates personalized outreach messages using OpenAI
- **Google Sheets Integration** - Comprehensive data storage with all required fields

### 🔮 Future Development Features

- Webflow CMS Entry Creation
- Screenshot Generation
- Instantly.ai Integration

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Create a `.env` file with the following variables:

```env
# OpenAI API Configuration
OPENAI_API_KEY=your-openai-api-key

# LeadMagic API Configuration
LEADMAGIC_API_KEY=your-leadmagic-api-key

# Google Sheets Configuration
GOOGLE_SHEETS_CLIENT_EMAIL=your-service-account-email@project.iam.gserviceaccount.com
GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEETS_SPREADSHEET_ID=your-spreadsheet-id-here
```

#### How to Get Google Sheets API Environment Variables

1. **Create a Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Click "Select a project" > "New Project"
   - Give it a name and create it

2. **Enable the Google Sheets API**
   - In your project, go to "APIs & Services" > "Library"
   - Search for "Google Sheets API" and click "Enable"

3. **Create a Service Account**
   - Go to "APIs & Services" > "Credentials"
   - Click "+ Create Credentials" > "Service account"
   - Give it a name (e.g., "sheets-access") and click "Create and Continue"
   - (You can skip granting roles and users for this use case)
   - Click "Done"

4. **Create and Download a Private Key**
   - In the Service Accounts list, click your new service account
   - Go to the "Keys" tab
   - Click "Add Key" > "Create new key" > Select JSON > "Create"
   - Download the JSON file and open it
   - Copy the `client_email` and `private_key` values
   - Set these as `GOOGLE_SHEETS_CLIENT_EMAIL` and `GOOGLE_SHEETS_PRIVATE_KEY` in your `.env` file
   - **Note:** For the private key, keep the `\n` line breaks as shown in the example above

5. **Share Your Google Sheet with the Service Account**
   - Create a new Google Sheet (or use an existing one)
   - Copy the spreadsheet ID from the URL (the long string between `/d/` and `/edit`)
   - Set this as `GOOGLE_SHEETS_SPREADSHEET_ID` in your `.env` file
   - Share the sheet with your service account email (from step 4) with "Editor" access

### 3. Google Sheets Setup

1. Create a new Google Sheet
2. Set up Google Sheets API credentials
3. Share the sheet with your service account email
4. Copy the spreadsheet ID from the URL

### 4. Lead Data Format

The system expects lead data in this format:

```javascript
const leads = [
    {
        firstName: "John",
        lastName: "Doe", 
        domain: "example.com",
        email: "john@example.com" // Optional
    }
];
```

## Usage

### Run the System

```bash
npm start
```

### Input Data

The system processes leads with 4 data points:

1. **First Name** - Contact's first name
2. **Last Name** - Contact's last name  
3. **Domain** - Company website domain
4. **Email** - Contact email (optional, will be found if missing)

### Output Data

The system generates comprehensive lead enrichment data including:

#### Contact Information

- Validated email address
- Email validation status and source
- Contact page emails and social media links

#### Organization Analysis

- E-commerce platform detection (Shopify, WooCommerce, etc.)
- E-commerce status
- Tech stack integrations (Klaviyo, Meta/Facebook)

#### Website Content

- All discovered pages
- About, contact, product, collection, and blog page URLs
- Scraped content from key pages
- Contact page social media links

#### Personalization Assets

- Personalized one-liner for outreach
- About page summary
- Email candidates

## Architecture

### Core Services

- **SitemapParser** - Discovers and categorizes website pages
- **ContentScraper** - Extracts content from web pages
- **PlatformDetector** - Identifies e-commerce platforms and integrations
- **EmailService** - Handles email validation and discovery via LeadMagic
- **ContactExtractor** - Extracts contact information and social links
- **OpenAIService** - Generates personalized content and summaries
- **SheetsService** - Manages Google Sheets integration

### Data Flow

1. **Input Processing** - Lead data validation and preparation
2. **Website Analysis** - Sitemap parsing and URL discovery
3. **Platform Detection** - E-commerce platform and integration identification
4. **Email Processing** - Validation and discovery of contact emails
5. **Content Extraction** - Scraping and categorizing page content
6. **Personalization** - Generating personalized outreach content
7. **Data Storage** - Writing comprehensive data to Google Sheets

## Error Handling

The system includes robust error handling:

- Graceful fallbacks when sitemaps aren't found
- Timeout protection for API calls
- Parallel processing with individual error isolation
- Comprehensive logging for debugging

## Future Enhancements

### Webflow CMS Integration

- Automatic CMS entry creation for valid leads
- Screenshot generation of CMS items
- Integration with Webflow API

### Instantly.ai Integration

- Direct campaign insertion via webhook
- Automated outreach workflow
- Campaign performance tracking

## API Documentation

### LeadMagic API

- **Email Validation**: `POST /validate-email`
- **Email Finder**: `POST /find-email`

### OpenAI API

- **One-Liner Generation**: GPT-3.5-turbo with custom prompts
- **Content Summarization**: Professional summaries of about pages

### Google Sheets API

- **Data Storage**: Comprehensive lead enrichment data
- **Real-time Updates**: Immediate data insertion

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
