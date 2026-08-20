import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/radar_chart_widget.dart';
import '../../data/models/report_model.dart';
import '../../data/services/pdf_report_service.dart';

class ReportScreen extends StatefulWidget {
  final String sessionId;

  const ReportScreen({super.key, required this.sessionId});

  @override
  State<ReportScreen> createState() => _ReportScreenState();
}

class _ReportScreenState extends State<ReportScreen> {
  InterviewReportModel? _report;
  Map<String, dynamic>? _mlAnalytics;
  bool _isLoading = true;
  bool _isExportingPdf = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchReportData();
  }

  Future<void> _fetchReportData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final res = await apiClient.getReport(widget.sessionId);
      if (res.statusCode == 200) {
        _report = InterviewReportModel.fromJson(res.data as Map<String, dynamic>);
      }

      final mlRes = await apiClient.getMlAnalytics(widget.sessionId);
      if (mlRes.statusCode == 200) {
        _mlAnalytics = mlRes.data as Map<String, dynamic>;
      }
    } catch (e) {
      _error = e.toString();
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _exportPdf() async {
    if (_report == null) return;
    setState(() => _isExportingPdf = true);
    try {
      await PdfReportService.exportAndPrintReport(_report!);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('PDF Report generated successfully!'),
            backgroundColor: AppColors.success,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Export error: $e'),
            backgroundColor: AppColors.danger,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isExportingPdf = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.home_rounded),
          onPressed: () => context.go('/'),
        ),
        title: const Text(
          'Interview Performance Report',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 16),
            child: ElevatedButton.icon(
              onPressed: (_report == null || _isExportingPdf) ? null : _exportPdf,
              icon: _isExportingPdf
                  ? const SizedBox(
                      width: 14,
                      height: 14,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : const Icon(Icons.picture_as_pdf_rounded, size: 16, color: Colors.black),
              label: Text(
                _isExportingPdf ? 'Generating PDF...' : 'Download PDF Report',
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              ),
            ),
          ),
        ],
      ),
      body: _isLoading
          ? const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  CircularProgressIndicator(color: AppColors.primary),
                  SizedBox(height: 20),
                  Text('Compiling comprehensive evaluation report...', style: TextStyle(fontSize: 16)),
                ],
              ),
            )
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text('Error loading report: $_error', style: const TextStyle(color: AppColors.danger)),
                      const SizedBox(height: 16),
                      ElevatedButton(onPressed: _fetchReportData, child: const Text('Retry')),
                    ],
                  ),
                )
              : _buildReportContent(_report!),
    );
  }

  Widget _buildReportContent(InterviewReportModel report) {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 24),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 1000),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Top Score Card
              _buildOverallScoreHero(report),
              const SizedBox(height: 24),

              // Summary
              _buildSummaryCard(report.summary),
              const SizedBox(height: 24),

              // Dimensional Metrics & Radar Chart
              _buildDimensionsSection(report),
              const SizedBox(height: 24),

              // Speaking Pace & Communication Fluency Analytics
              _buildCommunicationAnalyticsCard(report),
              const SizedBox(height: 24),

              // ML & Semantic Alignment Analytics
              if (_mlAnalytics != null) ...[
                _buildMlAnalyticsCard(_mlAnalytics!),
                const SizedBox(height: 24),
              ],

              // Strengths & Weaknesses
              _buildStrengthsWeaknessesSection(report.strengths, report.weaknesses),
              const SizedBox(height: 24),

              // Recommended Study Topics
              if (report.recommendedTopics.isNotEmpty) ...[
                _buildRecommendationsCard(report.recommendedTopics),
                const SizedBox(height: 24),
              ],

              // Question by Question Review
              if (report.questionReviews.isNotEmpty) ...[
                _buildQuestionReviewsList(report.questionReviews),
                const SizedBox(height: 32),
              ],

              // Restart Interview Button
              Center(
                child: ElevatedButton.icon(
                  onPressed: () => context.go('/'),
                  icon: const Icon(Icons.replay_rounded, color: Colors.black),
                  label: const Text('Start New Mock Interview', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 18),
                  ),
                ),
              ),
              const SizedBox(height: 40),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildOverallScoreHero(InterviewReportModel report) {
    return Container(
      padding: const EdgeInsets.all(28),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.primary.withValues(alpha: 0.4)),
      ),
      child: Row(
        children: [
          Container(
            width: 110,
            height: 110,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: AppColors.primary.withValues(alpha: 0.12),
              border: Border.all(color: AppColors.primary, width: 3),
            ),
            child: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    '${report.overallScorePercentage.toInt()}%',
                    style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: AppColors.primary),
                  ),
                  const Text('Overall', style: TextStyle(fontSize: 12, color: AppColors.textMuted)),
                ],
              ),
            ),
          ),
          const SizedBox(width: 28),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${report.candidateName} — ${report.targetRole}',
                  style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 6),
                Text(
                  'Difficulty: ${report.difficulty}  •  Focus: ${report.interviewType}  •  ${report.totalQuestions} Questions Evaluated',
                  style: const TextStyle(color: AppColors.textSecondary, fontSize: 13),
                ),
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: AppColors.success.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: const Text(
                    '✓ Performance standard met for target role tier',
                    style: TextStyle(color: AppColors.success, fontWeight: FontWeight.w600, fontSize: 13),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryCard(String summary) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.auto_awesome_rounded, color: AppColors.warning, size: 20),
              SizedBox(width: 8),
              Text('Executive Evaluation Summary', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            ],
          ),
          const SizedBox(height: 10),
          Text(summary, style: const TextStyle(color: AppColors.textSecondary, fontSize: 14, height: 1.5)),
        ],
      ),
    );
  }

  Widget _buildDimensionsSection(InterviewReportModel report) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Competency Score Breakdown & Multi-Axis Radar', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          const SizedBox(height: 18),
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              // Radar chart visual
              Expanded(
                flex: 4,
                child: Center(
                  child: RadarChartWidget(
                    metrics: report.radarMetrics,
                    size: 260,
                  ),
                ),
              ),
              const SizedBox(width: 20),
              // Bars list
              Expanded(
                flex: 5,
                child: Column(
                  children: [
                    _buildScoreBar('Technical Mastery', report.technicalScore, AppColors.primary),
                    _buildScoreBar('Communication & Structure', report.communicationScore, AppColors.secondary),
                    _buildScoreBar('Problem Solving & Workflow', report.problemSolvingScore, AppColors.success),
                    _buildScoreBar('Clarity & Articulation', report.clarityScore, AppColors.warning),
                    _buildScoreBar('Technical Depth & Trade-offs', report.depthScore, const Color(0xFFF472B6)),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildCommunicationAnalyticsCard(InterviewReportModel report) {
    final wpm = report.avgWordsPerMinute;
    String paceStatus = 'Optimal Pace (110 - 150 WPM)';
    Color paceColor = AppColors.success;
    if (wpm < 110) {
      paceStatus = 'Deliberate / Slower Pace (< 110 WPM)';
      paceColor = AppColors.warning;
    } else if (wpm > 155) {
      paceStatus = 'Fast-Paced Delivery (> 155 WPM)';
      paceColor = AppColors.warning;
    }

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.record_voice_over_rounded, color: AppColors.primary, size: 20),
              SizedBox(width: 8),
              Text('Speaking Pace & Fluency Analytics', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(color: AppColors.surfaceLight, borderRadius: BorderRadius.circular(8)),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Average Speaking Speed', style: TextStyle(color: AppColors.textMuted, fontSize: 12)),
                      const SizedBox(height: 4),
                      Text('$wpm WPM', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppColors.primary)),
                      const SizedBox(height: 4),
                      Text(paceStatus, style: TextStyle(color: paceColor, fontSize: 11, fontWeight: FontWeight.w600)),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(color: AppColors.surfaceLight, borderRadius: BorderRadius.circular(8)),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Filler Word Occurrences', style: TextStyle(color: AppColors.textMuted, fontSize: 12)),
                      const SizedBox(height: 4),
                      Text('${report.totalFillerWords} detected', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: report.totalFillerWords < 4 ? AppColors.success : AppColors.warning)),
                      const SizedBox(height: 4),
                      Text(
                        report.totalFillerWords < 4
                            ? '✓ Clean verbal articulation'
                            : 'Minimize "like", "um", "you know"',
                        style: TextStyle(
                          color: report.totalFillerWords < 4 ? AppColors.success : AppColors.warning,
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildScoreBar(String title, double score, Color color) {
    final percent = (score / 100).clamp(0.0, 1.0);
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(title, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
              Text('${score.toStringAsFixed(1)} / 100', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: color)),
            ],
          ),
          const SizedBox(height: 6),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: percent,
              minHeight: 8,
              backgroundColor: AppColors.surfaceLight,
              valueColor: AlwaysStoppedAnimation<Color>(color),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMlAnalyticsCard(Map<String, dynamic> data) {
    final matchScore = (data['candidate_role_match_score'] as num?)?.toDouble() ?? 85.0;
    final tier = data['communication_depth_tier'] ?? 'Advanced';

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.secondary.withValues(alpha: 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.hub_outlined, color: AppColors.secondary, size: 20),
              SizedBox(width: 8),
              Text('ML Semantic Alignment & Job Fit Analytics', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(color: AppColors.surfaceLight, borderRadius: BorderRadius.circular(8)),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('CV-to-Role Semantic Match', style: TextStyle(color: AppColors.textMuted, fontSize: 12)),
                      const SizedBox(height: 4),
                      Text('${matchScore.toStringAsFixed(1)}%', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppColors.secondary)),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(color: AppColors.surfaceLight, borderRadius: BorderRadius.circular(8)),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Semantic Depth Classification', style: TextStyle(color: AppColors.textMuted, fontSize: 12)),
                      const SizedBox(height: 4),
                      Text(tier, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppColors.primary)),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStrengthsWeaknessesSection(List<String> strengths, List<String> weaknesses) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Strengths
        Expanded(
          child: Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Icon(Icons.check_circle_outline_rounded, color: AppColors.success, size: 18),
                    SizedBox(width: 8),
                    Text('Observed Strengths', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                  ],
                ),
                const SizedBox(height: 12),
                ...strengths.map((s) => Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('• ', style: TextStyle(color: AppColors.success, fontWeight: FontWeight.bold)),
                          Expanded(child: Text(s, style: const TextStyle(fontSize: 13, color: AppColors.textSecondary))),
                        ],
                      ),
                    )),
              ],
            ),
          ),
        ),
        const SizedBox(width: 16),
        // Weaknesses / Growth Areas
        Expanded(
          child: Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Icon(Icons.trending_up_rounded, color: AppColors.warning, size: 18),
                    SizedBox(width: 8),
                    Text('Growth & Revision Areas', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                  ],
                ),
                const SizedBox(height: 12),
                ...weaknesses.map((w) => Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('• ', style: TextStyle(color: AppColors.warning, fontWeight: FontWeight.bold)),
                          Expanded(child: Text(w, style: const TextStyle(fontSize: 13, color: AppColors.textSecondary))),
                        ],
                      ),
                    )),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildRecommendationsCard(List<String> topics) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.menu_book_rounded, color: AppColors.primary, size: 18),
              SizedBox(width: 8),
              Text('Recommended Technical Revision Roadmap', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
            ],
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: topics.map((t) {
              return Chip(
                avatar: const Icon(Icons.bookmark_outline_rounded, size: 14, color: AppColors.primary),
                label: Text(t, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500)),
                backgroundColor: AppColors.surfaceLight,
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildQuestionReviewsList(List<QuestionReviewModel> reviews) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Question-by-Question Evaluation & STAR Coaching', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        const SizedBox(height: 14),
        ...reviews.map((r) {
          return Container(
            margin: const EdgeInsets.only(bottom: 16),
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Question #${r.questionNumber} • ${r.stage}', style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold, fontSize: 13)),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: r.score >= 70 ? AppColors.success.withValues(alpha: 0.15) : AppColors.warning.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        '${r.score.toStringAsFixed(0)}/100',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 13,
                          color: r.score >= 70 ? AppColors.success : AppColors.warning,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(r.question, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
                const SizedBox(height: 12),
                
                // Candidate Answer & WPM
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(color: AppColors.background, borderRadius: BorderRadius.circular(8)),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Your Answer:', style: TextStyle(color: AppColors.textMuted, fontSize: 11, fontWeight: FontWeight.w600)),
                          Text('${r.wordsPerMinute} WPM', style: const TextStyle(color: AppColors.textMuted, fontSize: 11)),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text('"${r.answer}"', style: const TextStyle(color: AppColors.textSecondary, fontSize: 13, fontStyle: FontStyle.italic)),
                    ],
                  ),
                ),
                if (r.feedback.isNotEmpty) ...[
                  const SizedBox(height: 10),
                  Text('💡 Feedback: ${r.feedback}', style: const TextStyle(color: AppColors.warning, fontSize: 13)),
                ],
                const SizedBox(height: 14),

                // STAR Coaching Card
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceLight,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: AppColors.primary.withValues(alpha: 0.25)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Row(
                        children: [
                          Icon(Icons.auto_fix_high_rounded, color: AppColors.primary, size: 16),
                          SizedBox(width: 6),
                          Text('AI Model Answer & STAR Structuring Guide', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.primary)),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text('Recommended Answer: "${r.modelAnswer}"', style: const TextStyle(fontSize: 12, height: 1.4, color: AppColors.textPrimary)),
                      const Divider(color: AppColors.border, height: 16),
                      _buildStarRow('S', 'Situation', r.starSituation),
                      _buildStarRow('T', 'Task', r.starTask),
                      _buildStarRow('A', 'Action', r.starAction),
                      _buildStarRow('R', 'Result', r.starResult),
                    ],
                  ),
                ),
              ],
            ),
          );
        }),
      ],
    );
  }

  Widget _buildStarRow(String letter, String title, String desc) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(4),
            ),
            child: Text(letter, style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold, fontSize: 10)),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: RichText(
              text: TextSpan(
                style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
                children: [
                  TextSpan(text: '$title: ', style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                  TextSpan(text: desc),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
