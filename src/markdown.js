/**
 * Fast, lightweight, safe Markdown renderer with syntax card presentation
 */
export function renderMarkdown(text) {
  if (!text) return "";

  // Strip internal thinking/reasoning tags (<think>...</think>)
  let cleanText = text.replace(/<think>[\s\S]*?<\/think>/gi, "");
  cleanText = cleanText.replace(/<think>[\s\S]*$/gi, "").trimStart();
  if (!cleanText) return "";

  // 1. Preserve and extract code blocks before escaping HTML
  const codeBlocks = [];
  let processed = cleanText.replace(/```([a-zA-Z0-9_\-+#]*)\n([\s\S]*?)```/g, (match, lang, code) => {
    const id = "CODEBLOCK_" + codeBlocks.length + "_" + Math.random().toString(36).substr(2, 6);
    codeBlocks.push({ id, lang: lang || "code", code: code.trimEnd() });
    return `%%%${id}%%%`;
  });

  // 2. Escape HTML special characters in ordinary text
  processed = processed
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // 3. Tables
  processed = renderTables(processed);

  // 4. Blockquotes
  processed = processed.replace(/^>\s?(.*)$/gm, "<blockquote>$1</blockquote>");

  // 5. Headings
  processed = processed.replace(/^### (.*$)/gm, "<h3>$1</h3>");
  processed = processed.replace(/^## (.*$)/gm, "<h2>$1</h2>");
  processed = processed.replace(/^# (.*$)/gm, "<h1>$1</h1>");

  // 6. Horizontal Rules
  processed = processed.replace(/^---$/gm, "<hr />");

  // 7. Unordered lists
  processed = processed.replace(/^\s*[-*]\s+(.*)$/gm, "<li>$1</li>");
  processed = processed.replace(/(<li>.*<\/li>(\n|$))+/g, "<ul>$&</ul>");

  // 8. Ordered lists
  processed = processed.replace(/^\s*(\d+)\.\s+(.*)$/gm, "<li data-num=\"$1\">$2</li>");
  processed = processed.replace(/(<li data-num=.*<\/li>(\n|$))+/g, "<ol>$&</ol>");

  // 9. Bold & Italic & Strikethrough
  processed = processed.replace(/\*\*\*(.*?)\*\*\*/g, "<strong><em>$1</em></strong>");
  processed = processed.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  processed = processed.replace(/\*(.*?)\*/g, "<em>$1</em>");
  processed = processed.replace(/~~(.*?)~~/g, "<del>$1</del>");

  // 10. Inline code
  processed = processed.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

  // 11. Links
  processed = processed.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="chat-link">$1 <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg></a>'
  );

  // 12. Paragraphs & Linebreaks
  const paragraphs = processed.split(/\n{2,}/);
  processed = paragraphs
    .map((p) => {
      p = p.trim();
      if (!p) return "";
      if (/^(<(h[1-3]|ul|ol|blockquote|hr|table|div))/.test(p)) {
        return p;
      }
      return `<p>${p.replace(/\n/g, "<br/>")}</p>`;
    })
    .filter(Boolean)
    .join("\n");

  // 13. Re-insert formatted Code Blocks with copy buttons
  codeBlocks.forEach(({ id, lang, code }) => {
    const escapedCode = code
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    const blockHtml = `
      <div class="code-card" data-code="${encodeURIComponent(code)}">
        <div class="code-header">
          <span class="code-lang">${lang.toLowerCase()}</span>
          <button type="button" class="copy-code-btn" onclick="window.copyCodeSnippet(this)">
            <svg class="copy-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <span class="copy-label">Copy</span>
          </button>
        </div>
        <pre><code class="language-${lang.toLowerCase()}">${escapedCode}</code></pre>
      </div>
    `;

    processed = processed.replace(`%%%${id}%%%`, blockHtml);
  });

  return processed;
}

function renderTables(text) {
  return text.replace(/((?:\|[^\n]+\|\n?){2,})/g, (match) => {
    const lines = match.trim().split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) return match;

    const parseRow = (row) =>
      row
        .replace(/^\||\|$/g, "")
        .split("|")
        .map((cell) => cell.trim());

    const header = parseRow(lines[0]);
    let bodyStartIndex = 1;

    // Check if second line is separator |---|---|
    if (lines[1] && lines[1].includes("-")) {
      bodyStartIndex = 2;
    }

    let html = '<div class="table-container"><table class="chat-table"><thead><tr>';
    header.forEach((h) => {
      html += `<th>${h}</th>`;
    });
    html += "</tr></thead><tbody>";

    for (let i = bodyStartIndex; i < lines.length; i++) {
      const cells = parseRow(lines[i]);
      html += "<tr>";
      cells.forEach((cell) => {
        html += `<td>${cell}</td>`;
      });
      html += "</tr>";
    }

    html += "</tbody></table></div>";
    return html;
  });
}

// Global copy handler
window.copyCodeSnippet = function (btn) {
  const card = btn.closest(".code-card");
  if (!card) return;
  const rawCode = decodeURIComponent(card.getAttribute("data-code") || "");

  navigator.clipboard.writeText(rawCode).then(() => {
    const label = btn.querySelector(".copy-label");
    const originalText = label ? label.textContent : "Copy";
    if (label) label.textContent = "Copied!";
    btn.classList.add("copied");

    setTimeout(() => {
      if (label) label.textContent = originalText;
      btn.classList.remove("copied");
    }, 2000);
  });
};
