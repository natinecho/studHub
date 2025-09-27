import puppeteer from 'puppeteer';

// Helper function to ensure a URL has a protocol
const ensureProtocol = (url) => {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  // Keep relative and fragment links as is
  if (url.startsWith('#') || url.startsWith('/')) {
    return url;
  }
 
  return `https://${url}`;
};

/**
 * Generates a PDF buffer from a note object.
 * @param {object} note The note object containing title and content.
 * @returns {Promise<Buffer>} The PDF file buffer.
 */

export async function generateNotePDF(note) {
  let sanitizedContent = note.content;

  if (sanitizedContent) {
    //Process EXISTING <a> tags
    const existingAnchorPattern = /<a(?:\s+href=['"`]([^'"`]*)['"`])?>(.*?)<\/a>/gi;

    sanitizedContent = sanitizedContent.replace(
      existingAnchorPattern,
      (match, href, text) => {
        if (href && href !== '#') return `<a href="${ensureProtocol(href)}">${text}</a>`;

        const urlPattern = /^(https?:\/\/[^\s]+|[a-z0-9\-\.]+\.[a-z]{2,}(\/[^\s]*)?)$/i;
        if (urlPattern.test(text)) {
          return `<a href="${ensureProtocol(text)}">${text}</a>`;
        }
        return text; 
      }
    );
    
    const bareUrlPattern = /(?<!["'])(https?:\/\/[^\s'"<>`]+)/gi;

    sanitizedContent = sanitizedContent.replace(
      bareUrlPattern,
      (match) => {
        return `<a href="${ensureProtocol(match)}">${match}</a>`;
      }
    );
  } else {
    sanitizedContent = "<p>No content available</p>";
  }

  // Wrap content in HTML
  const htmlContent = `
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #333; }
          ul { margin-left: 20px; }
          a { color: #1a0dab; text-decoration: underline; }
        </style>
      </head>
      <body>
        <h1>${note.title || "Untitled Note"}</h1>
        ${sanitizedContent}
      </body>
    </html>
  `;

  // --- Puppeteer Execution ---
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  
  try {
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "domcontentloaded" });

    const pdfBuffer = await page.pdf({ 
      format: "A4", 
      printBackground: true, 
    });
    return pdfBuffer;
  } finally {
    await browser.close();
  }
}