import PDFDocument from 'pdfkit';

export interface ColumnDef {
  label: string;
  key: string;
  width: number;
}

export interface TableOptions {
  startY: number;
  startX?: number;
  rowHeight?: number;
  headerHeight?: number;
  fontSize?: number;
  landscape?: boolean;
  margin?: number;
}

export function drawPdfTable(
  doc: any, // PDFKit.PDFDocument instance
  columns: ColumnDef[],
  rows: any[],
  options: TableOptions
): number {
  const startX = options.startX ?? 40;
  const rowHeight = options.rowHeight ?? 20;
  const headerHeight = options.headerHeight ?? 20;
  const fontSize = options.fontSize ?? 7;
  const landscape = options.landscape ?? false;
  const margin = options.margin ?? 40;

  let currentY = options.startY;

  // Calculate total table width to draw backgrounds/borders
  const totalWidth = columns.reduce((sum, col) => sum + col.width, 0);

  // Helper to draw the header row
  const drawHeader = (y: number) => {
    // Fill background
    doc.rect(startX, y, totalWidth, headerHeight).fill('#F3F4F6');
    doc.fillColor('#374151').fontSize(fontSize).font('Helvetica-Bold');
    
    let x = startX + 5;
    for (const col of columns) {
      doc.text(col.label, x, y + 6, { width: col.width - 8, ellipsis: true });
      x += col.width;
    }
    return y + headerHeight;
  };

  // Draw initial header
  currentY = drawHeader(currentY);

  // Draw data rows
  doc.font('Helvetica').fontSize(fontSize);
  
  rows.forEach((row, rowIndex) => {
    // Check overflow based on page height
    const pageHeight = doc.page.height;
    const threshold = pageHeight - margin - rowHeight;

    if (currentY > threshold) {
      doc.addPage({ layout: landscape ? 'landscape' : 'portrait', margin });
      currentY = margin;
      currentY = drawHeader(currentY);
      doc.font('Helvetica').fontSize(fontSize);
    }

    // Alternating background colors
    if (rowIndex % 2 === 1) {
      doc.rect(startX, currentY, totalWidth, rowHeight).fill('#F9FAFB');
    }

    doc.fillColor('#4B5563');
    let x = startX + 5;
    for (const col of columns) {
      const val = row[col.key];
      const textVal = val == null ? '-' : String(val);
      doc.text(textVal, x, currentY + 6, { width: col.width - 8, ellipsis: true });
      x += col.width;
    }

    // Border line below the row
    doc.strokeColor('#E5E7EB').lineWidth(0.5).moveTo(startX, currentY + rowHeight).lineTo(startX + totalWidth, currentY + rowHeight).stroke();
    currentY += rowHeight;
  });

  return currentY;
}
