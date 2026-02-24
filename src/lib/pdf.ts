import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency, formatDate } from './utils';
import type { EventSummary, MonthlySummary } from '@/types';

// ========================================
// PDF Report Generation
// ========================================

interface ReportHeader {
  title: string;
  subtitle?: string;
  dateRange?: string;
  orgName?: string;
}

function addHeader(doc: jsPDF, header: ReportHeader) {
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(header.orgName || 'Nonprofit Association', pageWidth / 2, 20, { align: 'center' });

  doc.setFontSize(14);
  doc.text(header.title, pageWidth / 2, 30, { align: 'center' });

  if (header.subtitle) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(header.subtitle, pageWidth / 2, 37, { align: 'center' });
  }

  if (header.dateRange) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.text(header.dateRange, pageWidth / 2, 43, { align: 'center' });
  }

  doc.setLineWidth(0.5);
  doc.line(14, 47, pageWidth - 14, 47);
}

function addFooter(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.text(
      `Generated on ${new Date().toLocaleDateString()} | Page ${i} of ${pageCount}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' },
    );
  }
}

// --- Event Report ---

export interface EventReportData {
  eventName: string;
  eventDate: string;
  income: { type: string; amount: number; details: string }[];
  sponsorship: { sponsor: string; amount: number; status: string }[];
  expenses: { category: string; description: string; amount: number; paidBy: string }[];
}

export function generateEventReport(data: EventReportData): ArrayBuffer {
  const doc = new jsPDF();

  addHeader(doc, {
    title: 'Event Financial Report',
    subtitle: data.eventName,
    dateRange: data.eventDate ? `Event Date: ${formatDate(data.eventDate)}` : undefined,
  });

  let yPos = 55;

  // Income
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Income', 14, yPos);
  yPos += 3;

  const totalIncome = data.income.reduce((s, i) => s + i.amount, 0);

  autoTable(doc, {
    startY: yPos,
    head: [['Type', 'Details', 'Amount']],
    body: [
      ...data.income.map((i) => [i.type, i.details, formatCurrency(i.amount)]),
      [{ content: 'Total Income', colSpan: 2, styles: { fontStyle: 'bold' } }, { content: formatCurrency(totalIncome), styles: { fontStyle: 'bold' } }],
    ],
    margin: { left: 14, right: 14 },
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246] },
  });

  yPos = (doc as unknown as Record<string, Record<string, number>>).lastAutoTable?.finalY + 10 || yPos + 40;

  // Sponsorship
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Sponsorship', 14, yPos);
  yPos += 3;

  const totalSponsorship = data.sponsorship.reduce((s, i) => s + i.amount, 0);

  autoTable(doc, {
    startY: yPos,
    head: [['Sponsor', 'Amount', 'Status']],
    body: [
      ...data.sponsorship.map((s) => [s.sponsor, formatCurrency(s.amount), s.status]),
      [{ content: 'Total Sponsorship', styles: { fontStyle: 'bold' } }, { content: formatCurrency(totalSponsorship), styles: { fontStyle: 'bold' } }, ''],
    ],
    margin: { left: 14, right: 14 },
    theme: 'grid',
    headStyles: { fillColor: [16, 185, 129] },
  });

  yPos = (doc as unknown as Record<string, Record<string, number>>).lastAutoTable?.finalY + 10 || yPos + 40;

  // Expenses
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Expenses', 14, yPos);
  yPos += 3;

  const totalExpenses = data.expenses.reduce((s, e) => s + e.amount, 0);

  autoTable(doc, {
    startY: yPos,
    head: [['Category', 'Description', 'Paid By', 'Amount']],
    body: [
      ...data.expenses.map((e) => [e.category, e.description, e.paidBy, formatCurrency(e.amount)]),
      [{ content: 'Total Expenses', colSpan: 3, styles: { fontStyle: 'bold' } }, { content: formatCurrency(totalExpenses), styles: { fontStyle: 'bold' } }],
    ],
    margin: { left: 14, right: 14 },
    theme: 'grid',
    headStyles: { fillColor: [239, 68, 68] },
  });

  yPos = (doc as unknown as Record<string, Record<string, number>>).lastAutoTable?.finalY + 15 || yPos + 40;

  // Summary
  const netResult = totalIncome + totalSponsorship - totalExpenses;
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Event Summary', 14, yPos);

  autoTable(doc, {
    startY: yPos + 3,
    body: [
      ['Total Income', formatCurrency(totalIncome)],
      ['Total Sponsorship', formatCurrency(totalSponsorship)],
      ['Total Expenses', formatCurrency(totalExpenses)],
      [{ content: netResult >= 0 ? 'Net Surplus' : 'Net Deficit', styles: { fontStyle: 'bold' } },
       { content: formatCurrency(netResult), styles: { fontStyle: 'bold', textColor: netResult >= 0 ? [16, 185, 129] : [239, 68, 68] } }],
    ],
    margin: { left: 14, right: 14 },
    theme: 'plain',
    columnStyles: { 0: { cellWidth: 100 }, 1: { halign: 'right' } },
  });

  addFooter(doc);
  return doc.output('arraybuffer');
}

// --- Monthly Treasurer Report ---

export interface MonthlyReportData {
  month: string;
  year: number;
  beginningBalance: number;
  incomeByCategory: { category: string; amount: number }[];
  expenseByCategory: { category: string; amount: number }[];
}

export function generateMonthlyReport(data: MonthlyReportData): ArrayBuffer {
  const doc = new jsPDF();

  addHeader(doc, {
    title: 'Monthly Treasurer Report',
    subtitle: `${data.month} ${data.year}`,
  });

  let yPos = 55;

  const totalIncome = data.incomeByCategory.reduce((s, i) => s + i.amount, 0);
  const totalExpense = data.expenseByCategory.reduce((s, e) => s + e.amount, 0);
  const endingBalance = data.beginningBalance + totalIncome - totalExpense;

  // Beginning Balance
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`Beginning Balance: ${formatCurrency(data.beginningBalance)}`, 14, yPos);
  yPos += 10;

  // Income
  doc.text('Income', 14, yPos);
  yPos += 3;

  autoTable(doc, {
    startY: yPos,
    head: [['Category', 'Amount']],
    body: [
      ...data.incomeByCategory.map((i) => [i.category, formatCurrency(i.amount)]),
      [{ content: 'Total Income', styles: { fontStyle: 'bold' } }, { content: formatCurrency(totalIncome), styles: { fontStyle: 'bold' } }],
    ],
    margin: { left: 14, right: 14 },
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246] },
  });

  yPos = (doc as unknown as Record<string, Record<string, number>>).lastAutoTable?.finalY + 10 || yPos + 40;

  // Expenses
  doc.setFont('helvetica', 'bold');
  doc.text('Expenses', 14, yPos);
  yPos += 3;

  autoTable(doc, {
    startY: yPos,
    head: [['Category', 'Amount']],
    body: [
      ...data.expenseByCategory.map((e) => [e.category, formatCurrency(e.amount)]),
      [{ content: 'Total Expenses', styles: { fontStyle: 'bold' } }, { content: formatCurrency(totalExpense), styles: { fontStyle: 'bold' } }],
    ],
    margin: { left: 14, right: 14 },
    theme: 'grid',
    headStyles: { fillColor: [239, 68, 68] },
  });

  yPos = (doc as unknown as Record<string, Record<string, number>>).lastAutoTable?.finalY + 15 || yPos + 40;

  // Summary
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Net Result: ${formatCurrency(totalIncome - totalExpense)}`, 14, yPos);
  yPos += 8;
  doc.text(`Ending Balance: ${formatCurrency(endingBalance)}`, 14, yPos);

  addFooter(doc);
  return doc.output('arraybuffer');
}

// --- Annual Report ---

export interface AnnualReportData {
  year: number;
  incomeByCategory: { category: string; amount: number }[];
  sponsorshipTotal: number;
  expenseByCategory: { category: string; amount: number }[];
  monthlySummary: MonthlySummary[];
  eventSummaries: EventSummary[];
}

export function generateAnnualReport(data: AnnualReportData): ArrayBuffer {
  const doc = new jsPDF();

  addHeader(doc, {
    title: 'Annual Financial Report',
    subtitle: `Financial Year ${data.year}`,
    dateRange: `January 1 – December 31, ${data.year}`,
  });

  let yPos = 55;

  const totalIncome = data.incomeByCategory.reduce((s, i) => s + i.amount, 0) + data.sponsorshipTotal;
  const totalExpenses = data.expenseByCategory.reduce((s, e) => s + e.amount, 0);
  const surplus = totalIncome - totalExpenses;

  // Executive Summary
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Executive Summary', 14, yPos);

  autoTable(doc, {
    startY: yPos + 3,
    body: [
      ['Total Income (incl. Sponsorship)', formatCurrency(totalIncome)],
      ['Total Sponsorship', formatCurrency(data.sponsorshipTotal)],
      ['Total Expenses', formatCurrency(totalExpenses)],
      [{ content: surplus >= 0 ? 'Net Surplus' : 'Net Deficit', styles: { fontStyle: 'bold' } },
       { content: formatCurrency(surplus), styles: { fontStyle: 'bold', textColor: surplus >= 0 ? [16, 185, 129] : [239, 68, 68] } }],
    ],
    margin: { left: 14, right: 14 },
    theme: 'striped',
    columnStyles: { 0: { cellWidth: 120 }, 1: { halign: 'right' } },
  });

  yPos = (doc as unknown as Record<string, Record<string, number>>).lastAutoTable?.finalY + 10 || yPos + 40;

  // Income Breakdown
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Income Breakdown', 14, yPos);

  autoTable(doc, {
    startY: yPos + 3,
    head: [['Category', 'Amount']],
    body: data.incomeByCategory.map((i) => [i.category, formatCurrency(i.amount)]),
    margin: { left: 14, right: 14 },
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246] },
  });

  yPos = (doc as unknown as Record<string, Record<string, number>>).lastAutoTable?.finalY + 10 || yPos + 40;

  // Expense Breakdown
  doc.setFont('helvetica', 'bold');
  doc.text('Expense Breakdown', 14, yPos);

  autoTable(doc, {
    startY: yPos + 3,
    head: [['Category', 'Amount']],
    body: data.expenseByCategory.map((e) => [e.category, formatCurrency(e.amount)]),
    margin: { left: 14, right: 14 },
    theme: 'grid',
    headStyles: { fillColor: [239, 68, 68] },
  });

  // Monthly Summary - new page
  doc.addPage();
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Monthly Summary', 14, 20);

  autoTable(doc, {
    startY: 25,
    head: [['Month', 'Income', 'Sponsorship', 'Expenses', 'Net']],
    body: data.monthlySummary.map((m) => [
      m.month,
      formatCurrency(m.income),
      formatCurrency(m.sponsorship),
      formatCurrency(m.expenses),
      formatCurrency(m.net),
    ]),
    margin: { left: 14, right: 14 },
    theme: 'grid',
    headStyles: { fillColor: [107, 114, 128] },
  });

  // Event Summaries
  if (data.eventSummaries.length > 0) {
    const evtY = (doc as unknown as Record<string, Record<string, number>>).lastAutoTable?.finalY + 15 || 120;
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Event Summaries', 14, evtY);

    autoTable(doc, {
      startY: evtY + 3,
      head: [['Event', 'Income', 'Sponsorship', 'Expenses', 'Net']],
      body: data.eventSummaries.map((e) => [
        e.eventName,
        formatCurrency(e.income),
        formatCurrency(e.sponsorship),
        formatCurrency(e.expenses),
        formatCurrency(e.net),
      ]),
      margin: { left: 14, right: 14 },
      theme: 'grid',
      headStyles: { fillColor: [147, 51, 234] },
    });
  }

  addFooter(doc);
  return doc.output('arraybuffer');
}
