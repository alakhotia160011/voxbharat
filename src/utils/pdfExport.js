import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─── Brand Constants ─────────────────────────────────────
const COLORS = {
  saffron: [232, 85, 15],
  earth: [61, 35, 20],
  earthMid: [107, 76, 58],
  cream: [250, 248, 245],
  creamWarm: [245, 237, 227],
  gold: [196, 160, 74],
  indigo: [45, 58, 110],
  white: [255, 255, 255],
};

const PAGE_MARGIN = 18;
const PAGE_WIDTH = 210; // A4
const CONTENT_WIDTH = PAGE_WIDTH - 2 * PAGE_MARGIN;

// ─── Shared Helpers ──────────────────────────────────────

function formatDuration(sec) {
  if (!sec) return '-';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

function formatAnswer(val) {
  if (val == null || val === '') return 'Not answered';
  return String(val).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function deriveFieldName(textEn) {
  return textEn.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').substring(0, 40);
}

const BUILTIN_QUESTIONS = [
  { field: 'age', camel: 'age', text: 'What is your age?' },
  { field: 'religion', camel: 'religion', text: 'What religion do you follow?' },
  { field: 'religion_importance', camel: 'religionImportance', text: 'How important is religion in your daily life?' },
  { field: 'prayer_frequency', camel: 'prayerFrequency', text: 'How often do you pray or worship?' },
  { field: 'religious_freedom', camel: 'religiousFreedom', text: 'Do people of all religions have freedom to practice?' },
  { field: 'interfaith_neighbor', camel: 'interfaithNeighbor', text: "How would you feel if another religion's family moved nearby?" },
  { field: 'interfaith_marriage', camel: 'interfaithMarriage', text: 'What is your opinion on inter-faith marriage?' },
  { field: 'diversity_opinion', camel: 'diversityOpinion', text: 'Does religious diversity make India better or more challenging?' },
];

function buildQuestionAnswerPairs(callData) {
  const pairs = [];
  if (callData.custom_survey?.questions) {
    for (const q of callData.custom_survey.questions) {
      const fieldName = q.textEn ? deriveFieldName(q.textEn) : `question_${q.id}`;
      const answer = callData.responses?.[fieldName] ?? null;
      pairs.push({
        question: q.textEn || q.text,
        questionOriginal: q.text !== q.textEn ? q.text : null,
        answer,
      });
    }
  } else if (callData.structured) {
    for (const q of BUILTIN_QUESTIONS) {
      const answer = callData.structured[q.camel] ?? callData.demographics?.[q.field] ?? null;
      pairs.push({ question: q.text, questionOriginal: null, answer });
    }
  }
  return pairs;
}

function addBrandHeader(doc, title, subtitle) {
  let y = PAGE_MARGIN;

  // "Vox" in saffron, "Bharat" in earth
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(...COLORS.saffron);
  doc.text('Vox', PAGE_MARGIN, y + 8);
  const voxWidth = doc.getTextWidth('Vox');
  doc.setTextColor(...COLORS.earth);
  doc.text('Bharat', PAGE_MARGIN + voxWidth, y + 8);

  // Accent line
  y += 13;
  doc.setDrawColor(...COLORS.saffron);
  doc.setLineWidth(0.6);
  doc.line(PAGE_MARGIN, y, PAGE_WIDTH - PAGE_MARGIN, y);

  // Title
  y += 9;
  doc.setFontSize(16);
  doc.setTextColor(...COLORS.earth);
  doc.text(title, PAGE_MARGIN, y);

  // Subtitle
  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.earthMid);
  doc.text(subtitle, PAGE_MARGIN, y);

  // Date
  y += 5;
  doc.setFontSize(8);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`, PAGE_MARGIN, y);

  return y + 8;
}

function addPageFooters(doc) {
  const totalPages = doc.internal.getNumberOfPages();
  const pageHeight = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const footerY = pageHeight - 10;
    doc.setDrawColor(...COLORS.saffron);
    doc.setLineWidth(0.3);
    doc.line(PAGE_MARGIN, footerY - 3, PAGE_WIDTH - PAGE_MARGIN, footerY - 3);
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.earthMid);
    doc.setFont('helvetica', 'normal');
    doc.text('VoxBharat \u2014 Confidential', PAGE_MARGIN, footerY);
    doc.text(`Page ${i} of ${totalPages}`, PAGE_WIDTH - PAGE_MARGIN, footerY, { align: 'right' });
  }
}

function addSectionHeading(doc, y, title) {
  y = checkPageBreak(doc, y, 15);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...COLORS.earth);
  doc.text(title, PAGE_MARGIN, y);
  // Underline
  doc.setDrawColor(...COLORS.creamWarm);
  doc.setLineWidth(0.3);
  doc.line(PAGE_MARGIN, y + 1.5, PAGE_WIDTH - PAGE_MARGIN, y + 1.5);
  return y + 6;
}

function checkPageBreak(doc, y, neededHeight) {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + neededHeight > pageHeight - 18) {
    doc.addPage();
    return PAGE_MARGIN + 5;
  }
  return y;
}

function drawHorizontalBars(doc, y, data, color) {
  const barHeight = 5;
  const labelWidth = 42;
  const barMaxWidth = CONTENT_WIDTH - labelWidth - 18;
  const gap = 2.5;

  const maxPct = Math.max(...data.map(d => d.pct), 1);

  data.forEach((item, i) => {
    y = checkPageBreak(doc, y, barHeight + gap);
    const rowY = y;

    // Label
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.earthMid);
    const label = String(item.label || 'Unknown').substring(0, 20);
    doc.text(label, PAGE_MARGIN, rowY + barHeight - 1);

    // Bar background
    doc.setFillColor(...COLORS.creamWarm);
    doc.rect(PAGE_MARGIN + labelWidth, rowY, barMaxWidth, barHeight, 'F');

    // Bar fill
    const barWidth = (item.pct / maxPct) * barMaxWidth;
    if (barWidth > 0) {
      doc.setFillColor(...color);
      doc.rect(PAGE_MARGIN + labelWidth, rowY, Math.max(barWidth, 1), barHeight, 'F');
    }

    // Percentage
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.earth);
    doc.text(`${item.pct}%`, PAGE_MARGIN + labelWidth + barMaxWidth + 2, rowY + barHeight - 1);

    y += barHeight + gap;
  });

  return y + 3;
}

// ─── Individual Call PDF ─────────────────────────────────

export function generateCallPDF(data) {
  try {
  const doc = new jsPDF('p', 'mm', 'a4');

  // 1. Header
  let y = addBrandHeader(doc, data.custom_survey?.name || 'AI Voice Survey', 'Individual Call Report');

  // 2. Call metadata
  y = addSectionHeading(doc, y, 'Call Information');
  autoTable(doc, {
    startY: y,
    body: [
      ['Call ID', data.id || '-'],
      ['Date', data.started_at ? new Date(data.started_at).toLocaleString() : '-'],
      ['Duration', formatDuration(data.duration)],
      ['Language', (data.language || '-').toUpperCase()],
      ['Status', (data.status || '-').charAt(0).toUpperCase() + (data.status || '-').slice(1)],
      ['Phone', data.phone_number || '-'],
    ],
    theme: 'plain',
    styles: { fontSize: 9, font: 'helvetica', cellPadding: { top: 2, bottom: 2, left: 3, right: 3 } },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 35, textColor: COLORS.earth },
      1: { textColor: COLORS.earthMid },
    },
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    tableLineColor: COLORS.creamWarm,
    tableLineWidth: 0.2,
  });
  y = doc.lastAutoTable.finalY + 8;

  // 3. AI Summary
  const summary = data.summary || '';
  if (summary) {
    y = addSectionHeading(doc, y, 'AI Summary');
    // Summary in a cream box
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.earthMid);
    const lines = doc.splitTextToSize(`\u201C${summary}\u201D`, CONTENT_WIDTH - 12);
    const blockHeight = lines.length * 4.5 + 6;
    y = checkPageBreak(doc, y, blockHeight);
    doc.setFillColor(...COLORS.creamWarm);
    doc.rect(PAGE_MARGIN, y - 2, CONTENT_WIDTH, blockHeight, 'F');
    // Left accent bar
    doc.setFillColor(...COLORS.saffron);
    doc.rect(PAGE_MARGIN, y - 2, 1.5, blockHeight, 'F');
    doc.text(lines, PAGE_MARGIN + 6, y + 3);
    y += blockHeight + 6;
  }

  // 4. Survey Responses
  const qaPairs = buildQuestionAnswerPairs(data);
  if (qaPairs.length > 0) {
    y = addSectionHeading(doc, y, 'Survey Responses');
    autoTable(doc, {
      startY: y,
      head: [['#', 'Question', 'Answer']],
      body: qaPairs.map((pair, i) => [
        `Q${i + 1}`,
        pair.question,
        formatAnswer(pair.answer),
      ]),
      theme: 'striped',
      headStyles: { fillColor: COLORS.saffron, textColor: COLORS.white, fontSize: 8, font: 'helvetica', fontStyle: 'bold' },
      styles: { fontSize: 8, font: 'helvetica', cellPadding: 3, lineColor: COLORS.creamWarm, lineWidth: 0.2 },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center', fontStyle: 'bold', textColor: COLORS.saffron },
        1: { cellWidth: 85, textColor: COLORS.earth },
        2: { textColor: COLORS.earthMid },
      },
      alternateRowStyles: { fillColor: COLORS.cream },
      margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  // 5. Demographics & Sentiment side by side
  const demographics = data.demographics || {};
  const sentiment = data.sentiment || {};
  const hasDemographics = Object.keys(demographics).length > 0;
  const hasSentiment = Object.keys(sentiment).length > 0;

  if (hasDemographics || hasSentiment) {
    y = addSectionHeading(doc, y, 'Extracted Data');

    if (hasDemographics) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...COLORS.earth);
      doc.text('Demographics', PAGE_MARGIN, y + 3);
      autoTable(doc, {
        startY: y + 5,
        body: Object.entries(demographics).map(([key, value]) => [
          key.replace(/([A-Z])/g, ' $1').trim(),
          String(value),
        ]),
        theme: 'plain',
        styles: { fontSize: 8, font: 'helvetica', cellPadding: 2 },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 40, textColor: COLORS.earthMid },
          1: { textColor: COLORS.earth },
        },
        margin: { left: PAGE_MARGIN, right: PAGE_WIDTH / 2 },
        tableWidth: CONTENT_WIDTH / 2 - 4,
      });
      y = doc.lastAutoTable.finalY + 4;
    }

    if (hasSentiment) {
      y = checkPageBreak(doc, y, 20);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...COLORS.earth);
      doc.text('Sentiment Analysis', PAGE_MARGIN, y + 3);
      autoTable(doc, {
        startY: y + 5,
        body: Object.entries(sentiment).map(([key, value]) => [
          key.charAt(0).toUpperCase() + key.slice(1),
          String(value || '-'),
        ]),
        theme: 'plain',
        styles: { fontSize: 8, font: 'helvetica', cellPadding: 2 },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 40, textColor: COLORS.earthMid },
          1: { textColor: COLORS.earth },
        },
        margin: { left: PAGE_MARGIN, right: PAGE_WIDTH / 2 },
        tableWidth: CONTENT_WIDTH / 2 - 4,
      });
      y = doc.lastAutoTable.finalY + 8;
    }
  }

  // 6. Transcript
  const transcript = data.transcript || [];
  if (transcript.length > 0) {
    y = addSectionHeading(doc, y, 'Conversation Transcript');
    autoTable(doc, {
      startY: y,
      head: [['Speaker', 'Message']],
      body: transcript.map(msg => [
        msg.role === 'assistant' ? 'AI Interviewer' : 'Respondent',
        msg.content || '',
      ]),
      theme: 'striped',
      headStyles: { fillColor: COLORS.earth, textColor: COLORS.white, fontSize: 8, fontStyle: 'bold' },
      styles: { fontSize: 8, font: 'helvetica', cellPadding: 3, lineColor: COLORS.creamWarm, lineWidth: 0.2, overflow: 'linebreak' },
      columnStyles: {
        0: { cellWidth: 28, fontStyle: 'bold' },
        1: { cellWidth: CONTENT_WIDTH - 28 },
      },
      alternateRowStyles: { fillColor: COLORS.cream },
      margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
      didParseCell: (hookData) => {
        if (hookData.section === 'body' && hookData.column.index === 0) {
          const role = hookData.cell.raw;
          hookData.cell.styles.textColor = role === 'AI Interviewer' ? COLORS.saffron : COLORS.indigo;
        }
      },
    });
  }

  // Footers
  addPageFooters(doc);

  // Save
  const callIdShort = (data.id || 'unknown').slice(0, 8);
  doc.save(`voxbharat-call-${callIdShort}.pdf`);
  } catch (err) {
    console.error('PDF generation failed:', err);
    alert('Failed to generate PDF: ' + err.message);
  }
}

// ─── Project Report PDF ──────────────────────────────────

export function generateProjectPDF(projectName, analytics, breakdowns, calls) {
  try {
  const doc = new jsPDF('p', 'mm', 'a4');

  // 1. Header
  let y = addBrandHeader(doc, projectName, 'Project Analytics Report');

  // 2. Overview stats
  const totalCalls = analytics?.totalCalls || calls.length;
  const avgDuration = analytics?.avgDuration || 0;
  const totalDuration = analytics?.totalDuration || 0;
  const languages = (analytics?.byLanguage || []).map(r => r.language).filter(Boolean);

  y = addSectionHeading(doc, y, 'Overview');
  autoTable(doc, {
    startY: y,
    body: [
      ['Total Respondents', String(totalCalls)],
      ['Average Duration', formatDuration(avgDuration)],
      ['Total Minutes', String(Math.round((totalDuration || 0) / 60))],
      ['Languages', languages.length > 0 ? languages.join(', ') : '-'],
    ],
    theme: 'plain',
    styles: { fontSize: 10, font: 'helvetica', cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 50, textColor: COLORS.earthMid },
      1: { textColor: COLORS.earth, fontStyle: 'bold', fontSize: 12 },
    },
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
  });
  y = doc.lastAutoTable.finalY + 8;

  // 3. Analytics charts
  const chartSections = [
    { title: 'By Language', data: analytics?.byLanguage, labelKey: 'language', color: COLORS.saffron },
    { title: 'By Religion', data: analytics?.byReligion, labelKey: 'religion', color: COLORS.gold },
    { title: 'By Age Group', data: analytics?.byAgeGroup, labelKey: 'age_group', color: [194, 74, 14] },
    { title: 'Overall Sentiment', data: analytics?.sentimentBreakdown, labelKey: 'overall', color: COLORS.indigo },
  ];

  const validCharts = chartSections.filter(s => s.data?.length > 0);
  if (validCharts.length > 0) {
    y = addSectionHeading(doc, y, 'Analytics');

    for (const section of validCharts) {
      y = checkPageBreak(doc, y, 15 + section.data.length * 8);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...COLORS.earth);
      doc.text(section.title, PAGE_MARGIN, y);
      y += 5;

      const chartData = section.data.map(r => ({
        label: r[section.labelKey] || 'Unknown',
        pct: totalCalls > 0 ? Math.round((parseInt(r.count, 10) / totalCalls) * 100) : 0,
      }));
      y = drawHorizontalBars(doc, y, chartData, section.color);
      y += 3;
    }
  }

  // 4. Response breakdowns
  if (breakdowns?.questions?.length > 0) {
    y = addSectionHeading(doc, y, 'Survey Response Breakdowns');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.earthMid);
    doc.text(`${breakdowns.totalResponses || 0} completed responses`, PAGE_MARGIN, y);
    y += 5;

    for (let qi = 0; qi < breakdowns.questions.length; qi++) {
      const q = breakdowns.questions[qi];
      const breakdown = q.breakdown || [];

      y = checkPageBreak(doc, y, 20 + breakdown.length * 6);

      // Question header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...COLORS.earth);
      doc.text(`Q${qi + 1}. ${q.text}`, PAGE_MARGIN, y);
      y += 4;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...COLORS.earthMid);
      doc.text(`${q.answered || 0} answered \u00B7 ${q.unanswered || 0} unanswered`, PAGE_MARGIN, y);
      y += 4;

      if (breakdown.length > 0) {
        autoTable(doc, {
          startY: y,
          head: [['Answer', 'Count', '%']],
          body: breakdown.map(b => [
            String(b.value || '').replace(/_/g, ' '),
            String(b.count),
            `${b.pct}%`,
          ]),
          theme: 'striped',
          headStyles: { fillColor: COLORS.saffron, textColor: COLORS.white, fontSize: 7, fontStyle: 'bold' },
          styles: { fontSize: 7, font: 'helvetica', cellPadding: 2, lineColor: COLORS.creamWarm, lineWidth: 0.1 },
          columnStyles: {
            0: { textColor: COLORS.earth },
            1: { cellWidth: 16, halign: 'center', textColor: COLORS.earthMid },
            2: { cellWidth: 16, halign: 'center', fontStyle: 'bold', textColor: COLORS.saffron },
          },
          alternateRowStyles: { fillColor: COLORS.cream },
          margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
        });
        y = doc.lastAutoTable.finalY + 8;
      } else {
        y += 4;
      }
    }
  }

  // 5. Call list
  if (calls.length > 0) {
    y = addSectionHeading(doc, y, 'Call List');
    autoTable(doc, {
      startY: y,
      head: [['Date', 'Phone', 'Language', 'Duration', 'Summary']],
      body: calls.map(c => [
        c.started_at ? new Date(c.started_at).toLocaleDateString() : '-',
        c.phone_number || '-',
        (c.language || '-').toUpperCase(),
        formatDuration(c.duration),
        (c.summary || '').substring(0, 80) + ((c.summary || '').length > 80 ? '...' : ''),
      ]),
      theme: 'striped',
      headStyles: { fillColor: COLORS.earth, textColor: COLORS.white, fontSize: 7, fontStyle: 'bold' },
      styles: { fontSize: 7, font: 'helvetica', cellPadding: 2, lineColor: COLORS.creamWarm, lineWidth: 0.1, overflow: 'linebreak' },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 28 },
        2: { cellWidth: 18, halign: 'center' },
        3: { cellWidth: 18 },
        4: { textColor: COLORS.earthMid },
      },
      alternateRowStyles: { fillColor: COLORS.cream },
      margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    });
  }

  // Footers
  addPageFooters(doc);

  // Save
  doc.save(`${projectName}-report.pdf`);
  } catch (err) {
    console.error('PDF generation failed:', err);
    alert('Failed to generate PDF: ' + err.message);
  }
}
