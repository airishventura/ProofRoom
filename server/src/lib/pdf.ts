/**
 * Minimal single-page PDF builder (no native deps).
 * Good enough for sealed report downloads / object storage.
 */

function escPdf(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function wrapLines(text: string, max = 90): string[] {
  const out: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\t/g, '  ');
    if (line.length <= max) {
      out.push(line);
      continue;
    }
    let rest = line;
    while (rest.length > max) {
      let breakAt = rest.lastIndexOf(' ', max);
      if (breakAt < 40) breakAt = max;
      out.push(rest.slice(0, breakAt));
      rest = rest.slice(breakAt).trimStart();
    }
    if (rest) out.push(rest);
  }
  return out;
}

export interface PdfReportInput {
  title: string;
  roomId: string;
  hash: string;
  url: string;
  timestamp: string;
  citations: Array<{ title: string; receipt: string; hash: string; sourceDoc?: string }>;
  bodyLines?: string[];
}

/** Build a simple multi-page text PDF as a Buffer. */
export function buildReportPdf(input: PdfReportInput): Buffer {
  const lines: string[] = [
    'ProofRoom — Verified Report',
    '===========================',
    '',
    `Title: ${input.title}`,
    `Room:  ${input.roomId}`,
    `URL:   ${input.url}`,
    `Hash:  ${input.hash}`,
    `When:  ${input.timestamp}`,
    '',
    'Citations',
    '---------',
  ];
  for (const c of input.citations) {
    lines.push(`• ${c.title}`);
    lines.push(`  receipt ${c.receipt}`);
    lines.push(`  hash    ${c.hash.slice(0, 32)}…`);
    if (c.sourceDoc) lines.push(`  source  ${c.sourceDoc}`);
  }
  if (input.bodyLines?.length) {
    lines.push('', 'Snapshot', '--------', ...input.bodyLines);
  }
  lines.push('', '— sealed by ProofRoom');

  const wrapped = wrapLines(lines.join('\n'), 88);
  const pageHeight = 792;
  const pageWidth = 612;
  const marginTop = 54;
  const lineH = 12;
  const linesPerPage = Math.floor((pageHeight - marginTop * 2) / lineH);

  const pages: string[][] = [];
  for (let i = 0; i < wrapped.length; i += linesPerPage) {
    pages.push(wrapped.slice(i, i + linesPerPage));
  }
  if (!pages.length) pages.push(['(empty)']);

  const objects: string[] = [];
  const offsets: number[] = [0]; // 1-indexed later

  const addObj = (body: string) => {
    objects.push(body);
    return objects.length;
  };

  // 1 catalog, 2 pages tree — filled later
  const catalogId = addObj(''); // placeholder
  const pagesId = addObj(''); // placeholder
  const fontId = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');

  const pageIds: number[] = [];
  const contentIds: number[] = [];

  for (const pageLines of pages) {
    let y = pageHeight - marginTop;
    const cmds: string[] = ['BT', '/F1 10 Tf', '14 TL'];
    for (const line of pageLines) {
      cmds.push(`1 0 0 1 50 ${y} Tm (${escPdf(line)}) Tj`);
      y -= lineH;
    }
    cmds.push('ET');
    const stream = cmds.join('\n');
    const contentId = addObj(
      `<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream`
    );
    contentIds.push(contentId);
    const pageId = addObj(
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] ` +
        `/Contents ${contentId} 0 R /Resources << /Font << /F1 ${fontId} 0 R >> >> >>`
    );
    pageIds.push(pageId);
  }

  objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId - 1] =
    `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;

  // Assemble
  let pdf = '%PDF-1.4\n';
  const objOffsets: number[] = [0];
  for (let i = 0; i < objects.length; i++) {
    objOffsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefPos = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(objOffsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\n`;
  pdf += `startxref\n${xrefPos}\n%%EOF\n`;

  return Buffer.from(pdf, 'utf8');
}
