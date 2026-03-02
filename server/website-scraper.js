// Lightweight website scraper — fetches a URL and extracts clean text content
// No external dependencies, uses native fetch

const MAX_CONTENT_LENGTH = 3000;
const FETCH_TIMEOUT = 10000;

/**
 * Scrape a website and return clean text content.
 * @param {string} url - The URL to scrape
 * @returns {{ title: string, content: string, url: string }}
 */
export async function scrapeWebsite(url) {
  // Normalize URL
  let normalizedUrl = url.trim();
  if (!/^https?:\/\//i.test(normalizedUrl)) {
    normalizedUrl = 'https://' + normalizedUrl;
  }

  // Validate URL
  try {
    new URL(normalizedUrl);
  } catch {
    throw new Error('Invalid URL');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const response = await fetch(normalizedUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; VoxBharat/1.0; +https://voxbharat.com)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      throw new Error('URL did not return HTML content');
    }

    const html = await response.text();
    const title = extractTitle(html);
    const content = htmlToText(html);

    return {
      title: title || normalizedUrl,
      content: content.slice(0, MAX_CONTENT_LENGTH),
      url: normalizedUrl,
    };
  } finally {
    clearTimeout(timeout);
  }
}

/** Extract <title> from HTML */
function extractTitle(html) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? decodeEntities(match[1]).trim() : '';
}

/** Extract meta description */
function extractMetaDescription(html) {
  const match = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([\s\S]*?)["'][^>]*>/i)
    || html.match(/<meta[^>]*content=["']([\s\S]*?)["'][^>]*name=["']description["'][^>]*>/i);
  return match ? decodeEntities(match[1]).trim() : '';
}

/** Convert HTML to clean text */
function htmlToText(html) {
  let text = html;

  // Remove script, style, nav, header, footer, and SVG blocks
  text = text.replace(/<script[\s\S]*?<\/script>/gi, ' ');
  text = text.replace(/<style[\s\S]*?<\/style>/gi, ' ');
  text = text.replace(/<nav[\s\S]*?<\/nav>/gi, ' ');
  text = text.replace(/<footer[\s\S]*?<\/footer>/gi, ' ');
  text = text.replace(/<svg[\s\S]*?<\/svg>/gi, ' ');
  text = text.replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ');

  // Extract meta description to prepend
  const metaDesc = extractMetaDescription(html);

  // Add line breaks for block elements
  text = text.replace(/<\/?(h[1-6]|p|div|br|li|tr|blockquote)[^>]*>/gi, '\n');

  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, ' ');

  // Decode HTML entities
  text = decodeEntities(text);

  // Clean up whitespace
  text = text
    .split('\n')
    .map(line => line.replace(/\s+/g, ' ').trim())
    .filter(line => line.length > 0)
    .join('\n');

  // Remove duplicate lines
  const seen = new Set();
  const lines = text.split('\n').filter(line => {
    if (seen.has(line)) return false;
    seen.add(line);
    return true;
  });

  // Prepend meta description if available
  const body = lines.join('\n');
  return metaDesc ? `${metaDesc}\n\n${body}` : body;
}

/** Decode common HTML entities */
function decodeEntities(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
}
