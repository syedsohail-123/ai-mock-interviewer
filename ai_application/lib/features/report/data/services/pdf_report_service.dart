import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import '../models/report_model.dart';

class PdfReportService {
  static Future<void> exportAndPrintReport(InterviewReportModel report) async {
    final pdf = pw.Document();

    final primaryColor = PdfColor.fromHex('#6366F1');
    final successColor = PdfColor.fromHex('#10B981');

    pdf.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(32),
        build: (pw.Context context) {
          return [
            // Header
            pw.Row(
              mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
              children: [
                pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    pw.Text(
                      'AI Mock Interview Report',
                      style: pw.TextStyle(
                        fontSize: 22,
                        fontWeight: pw.FontWeight.bold,
                        color: primaryColor,
                      ),
                    ),
                    pw.SizedBox(height: 4),
                    pw.Text(
                      'Candidate: ${report.candidateName}  |  Role: ${report.targetRole}',
                      style: const pw.TextStyle(fontSize: 12, color: PdfColors.grey700),
                    ),
                  ],
                ),
                pw.Container(
                  padding: const pw.EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  decoration: pw.BoxDecoration(
                    color: primaryColor,
                    borderRadius: pw.BorderRadius.circular(8),
                  ),
                  child: pw.Text(
                    'Score: ${report.overallScorePercentage.toInt()}%',
                    style: const pw.TextStyle(
                      fontSize: 16,
                      fontWeight: pw.FontWeight.bold,
                      color: PdfColors.white,
                    ),
                  ),
                ),
              ],
            ),
            pw.Divider(color: PdfColors.grey300, height: 24),

            // Overview details
            pw.Row(
              mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
              children: [
                _buildPdfStat('Difficulty', report.difficulty),
                _buildPdfStat('Focus', report.interviewType),
                _buildPdfStat('Questions Evaluated', '${report.totalQuestions}'),
                _buildPdfStat('Speaking Pace', '${report.avgWordsPerMinute} WPM'),
                _buildPdfStat('Filler Words', '${report.totalFillerWords} detected'),
              ],
            ),
            pw.SizedBox(height: 18),

            // Executive Summary
            pw.Container(
              padding: const pw.EdgeInsets.all(12),
              decoration: pw.BoxDecoration(
                color: PdfColors.grey100,
                borderRadius: pw.BorderRadius.circular(6),
                border: pw.Border.all(color: PdfColors.grey300),
              ),
              child: pw.Column(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  pw.Text(
                    'Executive Summary',
                    style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 12, color: primaryColor),
                  ),
                  pw.SizedBox(height: 6),
                  pw.Text(
                    report.summary,
                    style: const pw.TextStyle(fontSize: 10, color: PdfColors.grey800, lineSpacing: 1.3),
                  ),
                ],
              ),
            ),
            pw.SizedBox(height: 18),

            // Competencies
            pw.Text('Core Competency Breakdown', style: pw.TextStyle(fontSize: 13, fontWeight: pw.FontWeight.bold)),
            pw.SizedBox(height: 8),
            _buildPdfScoreRow('Technical Mastery', report.technicalScore),
            _buildPdfScoreRow('Communication & Structure', report.communicationScore),
            _buildPdfScoreRow('Problem Solving & Workflow', report.problemSolvingScore),
            _buildPdfScoreRow('Clarity & Articulation', report.clarityScore),
            _buildPdfScoreRow('Technical Depth & Trade-offs', report.depthScore),
            pw.SizedBox(height: 16),

            // Strengths & Growth
            pw.Row(
              crossAxisAlignment: pw.CrossAxisAlignment.start,
              children: [
                pw.Expanded(
                  child: pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text('Observed Strengths', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, color: successColor, fontSize: 11)),
                      pw.SizedBox(height: 6),
                      ...report.strengths.map((s) => pw.Bullet(text: s, style: const pw.TextStyle(fontSize: 9))),
                    ],
                  ),
                ),
                pw.SizedBox(width: 16),
                pw.Expanded(
                  child: pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text('Growth Areas', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, color: PdfColors.amber800, fontSize: 11)),
                      pw.SizedBox(height: 6),
                      ...report.weaknesses.map((w) => pw.Bullet(text: w, style: const pw.TextStyle(fontSize: 9))),
                    ],
                  ),
                ),
              ],
            ),
            pw.SizedBox(height: 20),

            // Questions review
            pw.Text('Question Feedback & STAR Model Answers', style: pw.TextStyle(fontSize: 13, fontWeight: pw.FontWeight.bold)),
            pw.SizedBox(height: 8),
            ...report.questionReviews.map((r) => _buildPdfQuestionItem(r, primaryColor)),
          ];
        },
      ),
    );

    await Printing.layoutPdf(
      onLayout: (PdfPageFormat format) async => pdf.save(),
      name: 'Interview_Report_${report.candidateName.replaceAll(' ', '_')}.pdf',
    );
  }

  static pw.Widget _buildPdfStat(String label, String value) {
    return pw.Column(
      crossAxisAlignment: pw.CrossAxisAlignment.start,
      children: [
        pw.Text(label, style: const pw.TextStyle(fontSize: 8, color: PdfColors.grey600)),
        pw.SizedBox(height: 2),
        pw.Text(value, style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold)),
      ],
    );
  }

  static pw.Widget _buildPdfScoreRow(String name, double score) {
    return pw.Padding(
      padding: const pw.EdgeInsets.only(bottom: 6),
      child: pw.Row(
        mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
        children: [
          pw.Text(name, style: const pw.TextStyle(fontSize: 9)),
          pw.Text('${score.toStringAsFixed(1)} / 100', style: pw.TextStyle(fontSize: 9, fontWeight: pw.FontWeight.bold)),
        ],
      ),
    );
  }

  static pw.Widget _buildPdfQuestionItem(QuestionReviewModel r, PdfColor primaryColor) {
    return pw.Container(
      margin: const pw.EdgeInsets.only(bottom: 12),
      padding: const pw.EdgeInsets.all(10),
      decoration: pw.BoxDecoration(
        border: pw.Border.all(color: PdfColors.grey300),
        borderRadius: pw.BorderRadius.circular(6),
      ),
      child: pw.Column(
        crossAxisAlignment: pw.CrossAxisAlignment.start,
        children: [
          pw.Row(
            mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
            children: [
              pw.Text('Q${r.questionNumber}: ${r.stage}', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 10, color: primaryColor)),
              pw.Text('Score: ${r.score.toStringAsFixed(0)}/100', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 10)),
            ],
          ),
          pw.SizedBox(height: 4),
          pw.Text(r.question, style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 9)),
          pw.SizedBox(height: 4),
          pw.Text('Candidate Answer: "${r.answer}"', style: const pw.TextStyle(fontSize: 8, color: PdfColors.grey700, fontStyle: pw.FontStyle.italic)),
          if (r.modelAnswer.isNotEmpty) ...[
            pw.SizedBox(height: 4),
            pw.Text('Recommended STAR Answer: ${r.modelAnswer}', style: const pw.TextStyle(fontSize: 8, color: PdfColors.indigo900)),
          ],
        ],
      ),
    );
  }
}
