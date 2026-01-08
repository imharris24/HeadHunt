# HeadHunt 🎯

The terminal-first SEO metadata hunter. Scrape, structure, and visualize website `<head>` tags in JSON format.

![HeadHunt in Action](https://img.shields.io/badge/status-active-brightgreen)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

### 🔍 Comprehensive Metadata Extraction
- Basic SEO tags (title, meta description, canonical, robots, etc.)
- Open Graph protocol tags for social media
- Twitter Card metadata
- Schema.org structured data (JSON-LD and Microdata)
- Technical SEO elements

### 🔗 Link Analysis
- Internal vs external links
- Nofollow, sponsored, UGC links
- Link text analysis

### 📝 Content Structure
- Heading hierarchy (H1-H6)
- Image analysis with alt text detection
- Lazy loading detection

### ⚡ Performance Metrics
- Page weight estimation
- Resource counting
- HTML size analysis

### 📊 Professional Output
- Terminal summary with key metrics
- Complete JSON output
- Error handling and validation

## Installation

1. Clone the repository:
```bash
git clone https://github.com/imharris24/HeadHunt-JS.git
cd headhunt
```

2. Install dependencies:
```bash
npm install
```

3. Make the script executable:
```bash
chmod +x headhunt.js
```

## Usage

### Basic Usage
```bash
node headhunt.js https://example.com
```

## Future Features (Coming Soon)

### 🚀 Enhanced Features
- Visual feedback with colored output and terminal spinners
- Global CLI installation via npm
- JavaScript rendering with Puppeteer/Playwright
- Advanced schema.org validation
- Bulk URL processing

### 🔍 Advanced Analysis
- Length warnings for meta tags
- Missing tag alerts
- Keyword density analysis
- Broken link checking

### 📦 Distribution
- NPM package publication
- Proxy support for bot protection
- Multiple export formats (JSON, CSV, Markdown)

## Contributing

Contributions are welcome!

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

Found a bug or have a feature request? Please [open an issue](https://github.com/imharris24/HeadHunt-JS/issues).
