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
          /* Mirrors the editor's own styling closely enough that an exported
             note is recognisably the note the student wrote. Anything the
             editor can produce needs a rule here, or it prints unstyled. */
          body { font-family: Arial, Helvetica, sans-serif; padding: 24px; color: #1d1f20; line-height: 1.55; }
          h1 { color: #1d1f20; font-size: 26px; margin: 0 0 4px; }
          h2 { font-size: 20px; margin: 22px 0 8px; padding-bottom: 6px; border-bottom: 1px solid #d9d9dc; }
          h3 { font-size: 17px; margin: 18px 0 6px; }
          p { margin: 0 0 12px; }
          ul, ol { margin: 12px 0; padding-left: 22px; }
          li { margin: 4px 0; }
          a { color: #1a0dab; text-decoration: underline; }
          blockquote { margin: 16px 0; padding: 10px 16px; border-left: 2px solid #5980a6; background: #f2f6fa; font-style: italic; }
          code { background: #eeeef0; padding: 1px 4px; border-radius: 3px; }
          pre { background: #eeeef0; padding: 12px; border-radius: 6px; overflow-x: auto; }
          mark { background: #cfe0f0; }
          hr { border: 0; height: 1px; background: #d9d9dc; margin: 20px 0; }

          /* Bullet styles carried over from the editor's data-bullet attribute. */
          ul[data-bullet="circle"] { list-style: circle; }
          ul[data-bullet="square"] { list-style: square; }
          ul[data-bullet="dash"],
          ul[data-bullet="arrow"],
          ul[data-bullet="check"] { list-style: none; padding-left: 18px; }
          ul[data-bullet="dash"] > li,
          ul[data-bullet="arrow"] > li,
          ul[data-bullet="check"] > li { position: relative; padding-left: 4px; }
          ul[data-bullet="dash"] > li::before,
          ul[data-bullet="arrow"] > li::before,
          ul[data-bullet="check"] > li::before { position: absolute; left: -14px; color: #5980a6; }
          ul[data-bullet="dash"] > li::before { content: "\\2013"; }
          ul[data-bullet="arrow"] > li::before { content: "\\2192"; }
          ul[data-bullet="check"] > li::before { content: "\\2713"; }

          /* Equations. Unicode maths in a serif face, so it prints as maths. */
          .math-inline, [data-math="inline"] {
            font-family: "Cambria", "Times New Roman", serif; font-style: italic;
            background: #eef4fa; padding: 0 2px; border-radius: 3px;
          }
          .math-block, [data-math="block"] {
            font-family: "Cambria", "Times New Roman", serif; font-style: italic;
            font-size: 17px; text-align: center; margin: 16px 0; padding: 10px 14px;
            border-left: 2px solid #5980a6; background: #f2f6fa;
          }

          /* Task lists — the checkbox is an input the print engine keeps. */
          ul[data-type="taskList"] { list-style: none; padding-left: 2px; }
          ul[data-type="taskList"] li { display: flex; align-items: flex-start; gap: 8px; }
          ul[data-type="taskList"] li > div { min-width: 0; }
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