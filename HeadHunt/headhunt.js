#!/usr/bin/env node

/**
 * HeadHuntSEO Metadata Scraper
 * Extracts comprehensive SEO metadata from any website
 * Usage: node seo-scraper.js https://websiteurl.com
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { URL } = require('url');
const https = require('https');

// Create HTTPS agent to handle SSL certificates
const httpsAgent = new https.Agent({
    rejectUnauthorized: false
});

// User agent to mimic a real browser
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';

// SEO metadata categories
const SEO_CATEGORIES = {
    BASIC: 'basic',
    OPEN_GRAPH: 'open_graph',
    TWITTER: 'twitter',
    SCHEMA: 'schema',
    TECHNICAL: 'technical',
    LINKS: 'links',
    HEADINGS: 'headings',
    IMAGES: 'images',
    PERFORMANCE: 'performance'
};

class SEOScraper {
    constructor(url) {
        this.url = url;
        this.html = '';
        this.$ = null;
        this.metadata = {
            url: url,
            timestamp: new Date().toISOString(),
            seo: {}
        };
    }

    async fetchPage() {
        try {
            console.log(`🔍 Fetching: ${this.url}`);

            const response = await axios.get(this.url, {
                headers: {
                    'User-Agent': USER_AGENT,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1'
                },
                httpsAgent: httpsAgent,
                timeout: 30000,
                maxRedirects: 5
            });

            this.html = response.data;
            this.$ = cheerio.load(this.html);
            console.log('✅ Page fetched successfully');
        } catch (error) {
            throw new Error(`Failed to fetch page: ${error.message}`);
        }
    }

    extractBasicMetadata() {
        const basic = {
            title: this.$('title').text() || null,
            metaDescription: this.$('meta[name="description"]').attr('content') || null,
            canonical: this.$('link[rel="canonical"]').attr('href') || null,
            robots: this.$('meta[name="robots"]').attr('content') || null,
            viewport: this.$('meta[name="viewport"]').attr('content') || null,
            charset: this.$('meta[charset]').attr('charset') || this.$('meta[http-equiv="Content-Type"]').attr('content') || null,
            language: this.$('html').attr('lang') || null,
            hreflang: []
        };

        // Extract hreflang links
        this.$('link[rel="alternate"][hreflang]').each((i, elem) => {
            basic.hreflang.push({
                lang: this.$(elem).attr('hreflang'),
                href: this.$(elem).attr('href')
            });
        });

        this.metadata.seo[SEO_CATEGORIES.BASIC] = basic;
    }

    extractOpenGraphMetadata() {
        const ogTags = {};

        this.$('meta[property^="og:"]').each((i, elem) => {
            const property = this.$(elem).attr('property').replace('og:', '');
            const content = this.$(elem).attr('content');

            if (property && content) {
                // Handle nested properties (og:image:width, og:image:height, etc.)
                if (property.includes(':')) {
                    const [parent, child] = property.split(':');
                    if (!ogTags[parent]) ogTags[parent] = {};
                    ogTags[parent][child] = content;
                } else {
                    ogTags[property] = content;
                }
            }
        });

        this.metadata.seo[SEO_CATEGORIES.OPEN_GRAPH] = ogTags;
    }

    extractTwitterMetadata() {
        const twitterTags = {};

        this.$('meta[name^="twitter:"]').each((i, elem) => {
            const name = this.$(elem).attr('name').replace('twitter:', '');
            const content = this.$(elem).attr('content');

            if (name && content) {
                twitterTags[name] = content;
            }
        });

        this.metadata.seo[SEO_CATEGORIES.TWITTER] = twitterTags;
    }

    extractSchemaMetadata() {
        const schemaData = {
            jsonLd: [],
            microdata: {}
        };

        // Extract JSON-LD schemas
        this.$('script[type="application/ld+json"]').each((i, elem) => {
            try {
                const jsonContent = this.$(elem).html();
                if (jsonContent) {
                    const parsed = JSON.parse(jsonContent);
                    schemaData.jsonLd.push(parsed);
                }
            } catch (error) {
                // Silent fail for invalid JSON
            }
        });

        // Extract common microdata
        const microdata = {};
        this.$('[itemscope]').each((i, elem) => {
            const itemtype = this.$(elem).attr('itemtype');
            if (itemtype) {
                const type = itemtype.split('/').pop();
                if (!microdata[type]) microdata[type] = [];

                const item = {};
                this.$(elem).find('[itemprop]').each((j, prop) => {
                    const propName = this.$(prop).attr('itemprop');
                    const content = this.$(prop).attr('content') || this.$(prop).text();
                    item[propName] = content;
                });

                microdata[type].push(item);
            }
        });

        schemaData.microdata = microdata;
        this.metadata.seo[SEO_CATEGORIES.SCHEMA] = schemaData;
    }

    extractTechnicalMetadata() {
        const technical = {
            doctype: this.html.match(/<!DOCTYPE[^>]*>/i)?.[0] || null,
            htmlVersion: this.getHtmlVersion(),
            hasViewport: this.$('meta[name="viewport"]').length > 0,
            hasCharset: this.$('meta[charset]').length > 0 || this.$('meta[http-equiv="Content-Type"]').length > 0,
            hasCanonical: this.$('link[rel="canonical"]').length > 0,
            hasRobots: this.$('meta[name="robots"]').length > 0,
            hasSitemap: this.$('link[rel="sitemap"]').length > 0,
            hasRSS: this.$('link[type="application/rss+xml"]').length > 0,
            hasAMP: this.$('link[rel="amphtml"]').length > 0,
            hasMobileAlternate: this.$('link[rel="alternate"][media]').length > 0,
            sitemapUrl: this.$('link[rel="sitemap"]').attr('href') || null,
            rssUrl: this.$('link[type="application/rss+xml"]').attr('href') || null
        };

        this.metadata.seo[SEO_CATEGORIES.TECHNICAL] = technical;
    }

    getHtmlVersion() {
        const doctype = this.html.match(/<!DOCTYPE[^>]*>/i)?.[0] || '';

        if (doctype.includes('HTML 4')) return 'HTML4';
        if (doctype.includes('XHTML')) return 'XHTML';
        if (doctype.includes('HTML5') || doctype === '<!DOCTYPE html>') return 'HTML5';

        return 'Unknown';
    }

    extractLinks() {
        const links = {
            internal: [],
            external: [],
            nofollow: [],
            broken: []
        };

        this.$('a[href]').each((i, elem) => {
            const href = this.$(elem).attr('href');
            const rel = this.$(elem).attr('rel') || '';
            const text = this.$(elem).text().trim();

            if (!href) return;

            const link = {
                url: href,
                text: text || null,
                rel: rel || null,
                isNofollow: rel.toLowerCase().includes('nofollow'),
                isSponsored: rel.toLowerCase().includes('sponsored'),
                isUGC: rel.toLowerCase().includes('ugc'),
                title: this.$(elem).attr('title') || null
            };

            // Categorize links
            if (href.startsWith('#') || href.startsWith('javascript:')) {
                // Skip anchor links and JS links
                return;
            } else if (href.startsWith('http')) {
                try {
                    const urlObj = new URL(href);
                    const baseUrlObj = new URL(this.url);

                    if (urlObj.hostname === baseUrlObj.hostname) {
                        links.internal.push(link);
                    } else {
                        links.external.push(link);
                    }
                } catch (error) {
                    links.external.push(link);
                }
            } else {
                links.internal.push(link);
            }

            // Track nofollow links
            if (link.isNofollow) {
                links.nofollow.push(link);
            }
        });

        // Remove duplicates
        const uniqueLinks = (arr) => Array.from(new Set(arr.map(l => l.url)))
            .map(url => arr.find(l => l.url === url));

        links.internal = uniqueLinks(links.internal);
        links.external = uniqueLinks(links.external);
        links.nofollow = uniqueLinks(links.nofollow);

        this.metadata.seo[SEO_CATEGORIES.LINKS] = links;
    }

    extractHeadings() {
        const headings = {
            h1: [],
            h2: [],
            h3: [],
            h4: [],
            h5: [],
            h6: [],
            counts: {}
        };

        // Extract all headings
        for (let i = 1; i <= 6; i++) {
            const tag = `h${i}`;
            headings[tag] = [];

            this.$(tag).each((index, elem) => {
                const text = this.$(elem).text().trim();
                const id = this.$(elem).attr('id') || null;

                if (text) {
                    headings[tag].push({
                        text: text,
                        id: id,
                        length: text.length
                    });
                }
            });

            headings.counts[tag] = headings[tag].length;
        }

        this.metadata.seo[SEO_CATEGORIES.HEADINGS] = headings;
    }

    extractImages() {
        const images = {
            withAlt: [],
            withoutAlt: [],
            lazyLoaded: [],
            counts: {
                total: 0,
                withAlt: 0,
                withoutAlt: 0,
                lazyLoaded: 0
            }
        };

        this.$('img').each((i, elem) => {
            const src = this.$(elem).attr('src');
            const alt = this.$(elem).attr('alt') || '';
            const loading = this.$(elem).attr('loading');
            const srcset = this.$(elem).attr('srcset');

            if (!src) return;

            const image = {
                src: src,
                alt: alt || null,
                hasAlt: !!alt,
                isLazy: loading === 'lazy',
                srcset: srcset || null,
                title: this.$(elem).attr('title') || null
            };

            images.counts.total++;

            if (image.hasAlt) {
                images.withAlt.push(image);
                images.counts.withAlt++;
            } else {
                images.withoutAlt.push(image);
                images.counts.withoutAlt++;
            }

            if (image.isLazy) {
                images.lazyLoaded.push(image);
                images.counts.lazyLoaded++;
            }
        });

        this.metadata.seo[SEO_CATEGORIES.IMAGES] = images;
    }

    extractPerformanceMetrics() {
        const performance = {
            totalImages: this.$('img').length,
            totalScripts: this.$('script[src]').length,
            totalStylesheets: this.$('link[rel="stylesheet"]').length,
            totalInlineScripts: this.$('script:not([src])').length,
            totalInlineStyles: this.$('style').length,
            totalLinks: this.$('a[href]').length,
            totalHeadings: this.$('h1, h2, h3, h4, h5, h6').length,
            htmlSize: Buffer.byteLength(this.html, 'utf8'),
            estimatedPageWeight: this.estimatePageWeight()
        };

        this.metadata.seo[SEO_CATEGORIES.PERFORMANCE] = performance;
    }

    estimatePageWeight() {
        const htmlSize = Buffer.byteLength(this.html, 'utf8');

        // Rough estimation of external resources (very basic)
        let externalResourcesSize = 0;

        // Estimate CSS sizes
        this.$('link[rel="stylesheet"]').each((i, elem) => {
            externalResourcesSize += 15000; // Average 15KB per stylesheet
        });

        // Estimate JS sizes
        this.$('script[src]').each((i, elem) => {
            externalResourcesSize += 50000; // Average 50KB per script
        });

        // Estimate image sizes (very rough)
        this.$('img[src]').each((i, elem) => {
            externalResourcesSize += 100000; // Average 100KB per image
        });

        return {
            html: htmlSize,
            estimatedExternalResources: externalResourcesSize,
            totalEstimated: htmlSize + externalResourcesSize
        };
    }

    async analyze() {
        console.log('📊 Analyzing SEO metadata...');

        const steps = [
            { name: 'Basic Metadata', method: () => this.extractBasicMetadata() },
            { name: 'Open Graph Tags', method: () => this.extractOpenGraphMetadata() },
            { name: 'Twitter Cards', method: () => this.extractTwitterMetadata() },
            { name: 'Schema Markup', method: () => this.extractSchemaMetadata() },
            { name: 'Technical SEO', method: () => this.extractTechnicalMetadata() },
            { name: 'Links Analysis', method: () => this.extractLinks() },
            { name: 'Headings Structure', method: () => this.extractHeadings() },
            { name: 'Images Analysis', method: () => this.extractImages() },
            { name: 'Performance Metrics', method: () => this.extractPerformanceMetrics() }
        ];

        for (const step of steps) {
            try {
                step.method();
                console.log(`✅ ${step.name}`);
            } catch (error) {
                console.log(`⚠️  ${step.name}: ${error.message}`);
            }
        }

        console.log('✅ Analysis complete!');
        return this.metadata;
    }

    printSummary() {
        const seo = this.metadata.seo;

        console.log('\n📈 SEO SUMMARY');
        console.log('='.repeat(50));

        if (seo.basic?.title) {
            console.log(`📝 Title: ${seo.basic.title} (${seo.basic.title.length} chars)`);
        }

        if (seo.basic?.metaDescription) {
            console.log(`📋 Description: ${seo.basic.metaDescription.substring(0, 100)}... (${seo.basic.metaDescription.length} chars)`);
        }

        console.log(`🔗 Canonical: ${seo.basic?.canonical || 'Not found'}`);
        console.log(`🤖 Robots: ${seo.basic?.robots || 'Not specified'}`);
        console.log(`📱 Viewport: ${seo.technical?.hasViewport ? 'Yes' : 'No'}`);

        console.log('\n📊 Counts:');
        console.log(`  H1: ${seo.headings?.counts?.h1 || 0}`);
        console.log(`  Images: ${seo.images?.counts?.total || 0} (${seo.images?.counts?.withAlt || 0} with alt text)`);
        console.log(`  Internal Links: ${seo.links?.internal?.length || 0}`);
        console.log(`  External Links: ${seo.links?.external?.length || 0}`);
        console.log(`  Nofollow Links: ${seo.links?.nofollow?.length || 0}`);

        console.log('\n🎭 Social Media:');
        console.log(`  Open Graph: ${Object.keys(seo.open_graph || {}).length} tags`);
        console.log(`  Twitter: ${Object.keys(seo.twitter || {}).length} tags`);

        console.log('\n🧬 Structured Data:');
        console.log(`  JSON-LD: ${seo.schema?.jsonLd?.length || 0} schemas`);

        console.log('\n⚡ Performance:');
        console.log(`  HTML Size: ${Math.round((seo.performance?.htmlSize || 0) / 1024)} KB`);
        console.log(`  Estimated Total: ${Math.round((seo.performance?.estimatedPageWeight?.totalEstimated || 0) / 1024)} KB`);

        console.log('='.repeat(50));
    }
}

async function main() {
    // Get URL from command line arguments
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.error('❌ Please provide a URL');
        console.log('Usage: node seo-scraper.js https://websiteurl.com');
        process.exit(1);
    }

    const url = args[0];

    // Validate URL
    try {
        new URL(url);
    } catch (error) {
        console.error('❌ Invalid URL provided');
        process.exit(1);
    }

    try {
        const scraper = new SEOScraper(url);

        // Fetch the page
        await scraper.fetchPage();

        // Analyze SEO
        await scraper.analyze();

        // Print summary
        scraper.printSummary();

        // Output full JSON
        console.log('\n📦 Full SEO Metadata JSON:');
        console.log(JSON.stringify(scraper.metadata, null, 2));

    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        process.exit(1);
    }
}

// Run the script
if (require.main === module) {
    main();
}

module.exports = SEOScraper;