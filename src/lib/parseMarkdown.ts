export function parseMarkdown(input: string): string {
  if (!input) return "";

  const escaped = input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const lines = escaped.split("\n");
  const result: string[] = [];
  let inList = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    if (/^#{1}\s/.test(line)) {
      if (inList) { result.push("</ul>"); inList = false; }
      result.push(`<h1>${line.replace(/^#\s/, "")}</h1>`);
      continue;
    }
    if (/^#{2}\s/.test(line)) {
      if (inList) { result.push("</ul>"); inList = false; }
      result.push(`<h2>${line.replace(/^##\s/, "")}</h2>`);
      continue;
    }
    if (/^#{3}\s/.test(line)) {
      if (inList) { result.push("</ul>"); inList = false; }
      result.push(`<h3>${line.replace(/^###\s/, "")}</h3>`);
      continue;
    }

    if (/^[-*]\s/.test(line)) {
      if (!inList) { result.push("<ul>"); inList = true; }
      const content = applyInline(line.replace(/^[-*]\s/, ""));
      result.push(`<li>${content}</li>`);
      continue;
    } else if (inList) {
      result.push("</ul>");
      inList = false;
    }

    if (line.trim() === "") {
      result.push("<br />");
      continue;
    }

    result.push(`<p>${applyInline(line)}</p>`);
  }

  if (inList) result.push("</ul>");

  return result.join("");
}

function applyInline(text: string): string {
  return text
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
}