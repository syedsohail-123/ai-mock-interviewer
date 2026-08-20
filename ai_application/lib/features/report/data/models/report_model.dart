import 'package:equatable/equatable.dart';

class QuestionReviewModel extends Equatable {
  final int questionNumber;
  final String stage;
  final String question;
  final String answer;
  final double score;
  final String feedback;
  final List<String> strengths;
  final List<String> weaknesses;
  final String modelAnswer;
  final String starSituation;
  final String starTask;
  final String starAction;
  final String starResult;
  final int wordsPerMinute;
  final Map<String, int> fillerWords;

  const QuestionReviewModel({
    required this.questionNumber,
    required this.stage,
    required this.question,
    required this.answer,
    required this.score,
    required this.feedback,
    this.strengths = const [],
    this.weaknesses = const [],
    this.modelAnswer = '',
    this.starSituation = '',
    this.starTask = '',
    this.starAction = '',
    this.starResult = '',
    this.wordsPerMinute = 120,
    this.fillerWords = const {},
  });

  factory QuestionReviewModel.fromJson(Map<String, dynamic> json) {
    final answerText = json['answer'] ?? '';
    final words = answerText.toString().trim().split(RegExp(r'\s+')).where((w) => w.isNotEmpty).toList();
    final wordCount = words.length;

    // Detect common filler words
    final lowerAnswer = answerText.toString().toLowerCase();
    final fillers = <String, int>{};
    for (final filler in ['um', 'uh', 'like', 'actually', 'you know', 'basically']) {
      final matches = RegExp(r'\b' + RegExp.escape(filler) + r'\b').allMatches(lowerAnswer).length;
      if (matches > 0) fillers[filler] = matches;
    }

    // Heuristic WPM based on standard ~45s response or word length
    final estWpm = (wordCount > 0) ? ((wordCount / 40.0) * 60).round().clamp(70, 190) : 115;

    final feedbackText = json['feedback'] ?? '';
    final strengthsList = List<String>.from(json['strengths'] ?? []);
    final weaknessesList = List<String>.from(json['weaknesses'] ?? []);

    return QuestionReviewModel(
      questionNumber: json['question_number'] ?? 1,
      stage: json['stage'] ?? 'General',
      question: json['question'] ?? '',
      answer: answerText,
      score: (json['score'] as num?)?.toDouble() ?? 0.0,
      feedback: feedbackText,
      strengths: strengthsList,
      weaknesses: weaknessesList,
      modelAnswer: json['model_answer'] ?? _generateFallbackModelAnswer(json['question'] ?? '', json['stage'] ?? ''),
      starSituation: json['star_situation'] ?? 'Set context clearly: Identify the project, scale, or business challenge.',
      starTask: json['star_task'] ?? 'Define the objective: Detail your exact responsibilities and technical goals.',
      starAction: json['star_action'] ?? 'Explain actions taken: Detail architectural decisions, tools, and problem-solving steps.',
      starResult: json['star_result'] ?? 'Highlight outcomes: Quantify metrics (e.g. latency reduced by 40%, reliability boosted).',
      wordsPerMinute: (json['wpm'] as num?)?.toInt() ?? estWpm,
      fillerWords: (json['filler_words'] as Map<String, dynamic>?)?.map((k, v) => MapEntry(k, (v as num).toInt())) ?? fillers,
    );
  }

  static String _generateFallbackModelAnswer(String question, String stage) {
    if (stage.toLowerCase().contains('coding') || question.toLowerCase().contains('algorithm')) {
      return 'To solve this efficiently, I would first analyze the edge cases and time/space constraints. A two-pointer or hash map approach allows achieving O(N) linear time complexity with O(1) auxiliary space, ensuring resilient error handling.';
    }
    return 'In my previous role, when faced with a similar challenge, I structured the solution by first breaking down requirements, aligning stakeholders, and iteratively implementing the architecture with robust unit testing. This achieved a 35% improvement in deployment velocity.';
  }

  @override
  List<Object?> get props => [
        questionNumber,
        stage,
        question,
        answer,
        score,
        feedback,
        modelAnswer,
        wordsPerMinute,
      ];
}

class InterviewReportModel extends Equatable {
  final String sessionId;
  final String candidateName;
  final String targetRole;
  final String difficulty;
  final String interviewType;
  final int totalQuestions;
  final double overallScorePercentage;
  final double technicalScore;
  final double communicationScore;
  final double clarityScore;
  final double depthScore;
  final double problemSolvingScore;
  final List<String> strengths;
  final List<String> weaknesses;
  final List<String> recommendedTopics;
  final String summary;
  final List<QuestionReviewModel> questionReviews;
  final String createdAt;
  final int avgWordsPerMinute;
  final int totalFillerWords;

  const InterviewReportModel({
    required this.sessionId,
    required this.candidateName,
    required this.targetRole,
    required this.difficulty,
    required this.interviewType,
    required this.totalQuestions,
    required this.overallScorePercentage,
    required this.technicalScore,
    required this.communicationScore,
    required this.clarityScore,
    required this.depthScore,
    required this.problemSolvingScore,
    this.strengths = const [],
    this.weaknesses = const [],
    this.recommendedTopics = const [],
    required this.summary,
    this.questionReviews = const [],
    required this.createdAt,
    this.avgWordsPerMinute = 125,
    this.totalFillerWords = 0,
  });

  Map<String, double> get radarMetrics => {
        'Technical': technicalScore,
        'Communication': communicationScore,
        'Problem Solving': problemSolvingScore,
        'Clarity': clarityScore,
        'Depth': depthScore,
      };

  factory InterviewReportModel.fromJson(Map<String, dynamic> json) {
    final reviews = (json['question_reviews'] as List? ?? [])
        .map((e) => QuestionReviewModel.fromJson(e as Map<String, dynamic>))
        .toList();

    int totalFillers = 0;
    int sumWpm = 0;
    for (final r in reviews) {
      sumWpm += r.wordsPerMinute;
      for (final count in r.fillerWords.values) {
        totalFillers += count;
      }
    }
    final avgWpm = reviews.isNotEmpty ? (sumWpm / reviews.length).round() : 125;

    return InterviewReportModel(
      sessionId: json['session_id'] ?? '',
      candidateName: json['candidate_name'] ?? 'Candidate',
      targetRole: json['target_role'] ?? 'Software Engineer',
      difficulty: json['difficulty'] ?? 'Intermediate',
      interviewType: json['interview_type'] ?? 'Mixed',
      totalQuestions: json['total_questions'] ?? reviews.length,
      overallScorePercentage: (json['overall_score_percentage'] as num?)?.toDouble() ?? 0.0,
      technicalScore: (json['technical_score'] as num?)?.toDouble() ?? 0.0,
      communicationScore: (json['communication_score'] as num?)?.toDouble() ?? 0.0,
      clarityScore: (json['clarity_score'] as num?)?.toDouble() ?? 0.0,
      depthScore: (json['depth_score'] as num?)?.toDouble() ?? 0.0,
      problemSolvingScore: (json['problem_solving_score'] as num?)?.toDouble() ?? 0.0,
      strengths: List<String>.from(json['strengths'] ?? []),
      weaknesses: List<String>.from(json['weaknesses'] ?? []),
      recommendedTopics: List<String>.from(json['recommended_topics'] ?? []),
      summary: json['summary'] ?? '',
      questionReviews: reviews,
      createdAt: json['created_at'] ?? '',
      avgWordsPerMinute: (json['avg_wpm'] as num?)?.toInt() ?? avgWpm,
      totalFillerWords: (json['total_filler_words'] as num?)?.toInt() ?? totalFillers,
    );
  }

  @override
  List<Object?> get props => [
        sessionId,
        candidateName,
        targetRole,
        overallScorePercentage,
        technicalScore,
        communicationScore,
        clarityScore,
        depthScore,
        problemSolvingScore,
        strengths,
        weaknesses,
        recommendedTopics,
        avgWordsPerMinute,
        totalFillerWords,
      ];
}
