import 'package:equatable/equatable.dart';
import '../../../cv_parser/data/models/candidate_profile_model.dart';

enum InterviewStage {
  intro('INTRO', 'Introduction'),
  background('BACKGROUND', 'Background & Experience'),
  technical('TECHNICAL', 'Core Technical'),
  projectDeepDive('PROJECT_DEEP_DIVE', 'Project Deep Dive'),
  problemSolving('PROBLEM_SOLVING', 'Problem Solving'),
  behavioral('BEHAVIORAL', 'Behavioral & Leadership'),
  finalStage('FINAL', 'Closing Questions'),
  completed('COMPLETED', 'Completed');

  final String code;
  final String label;
  const InterviewStage(this.code, this.label);

  static InterviewStage fromString(String code) {
    return InterviewStage.values.firstWhere(
      (e) => e.code.toUpperCase() == code.toUpperCase(),
      orElse: () => InterviewStage.technical,
    );
  }
}

class InterviewConfig extends Equatable {
  final String targetRole;
  final String experienceLevel;
  final String difficulty;
  final String interviewType;
  final int maxQuestions;

  const InterviewConfig({
    this.targetRole = 'Software Engineer',
    this.experienceLevel = 'Mid-Level',
    this.difficulty = 'Intermediate',
    this.interviewType = 'Mixed',
    this.maxQuestions = 6,
  });

  Map<String, dynamic> toJson() => {
        'target_role': targetRole,
        'experience_level': experienceLevel,
        'difficulty': difficulty,
        'interview_type': interviewType,
        'max_questions': maxQuestions,
      };

  @override
  List<Object?> get props => [targetRole, experienceLevel, difficulty, interviewType, maxQuestions];
}

class InterviewMessage extends Equatable {
  final String role;
  final String content;
  final String? stage;
  final int? questionNumber;
  final String? timestamp;
  final String? audioBase64;

  const InterviewMessage({
    required this.role,
    required this.content,
    this.stage,
    this.questionNumber,
    this.timestamp,
    this.audioBase64,
  });

  factory InterviewMessage.fromJson(Map<String, dynamic> json) {
    return InterviewMessage(
      role: json['role'] ?? 'assistant',
      content: json['content'] ?? '',
      stage: json['stage'],
      questionNumber: json['question_number'],
      timestamp: json['timestamp'],
      audioBase64: json['audio_base64'],
    );
  }

  Map<String, dynamic> toJson() => {
        'role': role,
        'content': content,
        'stage': stage,
        'question_number': questionNumber,
        'timestamp': timestamp,
      };

  @override
  List<Object?> get props => [role, content, stage, questionNumber, timestamp, audioBase64];
}

class AnswerEvaluation extends Equatable {
  final int questionNumber;
  final String questionText;
  final String answerText;
  final double technicalScore;
  final double communicationScore;
  final double clarityScore;
  final double depthScore;
  final double problemSolvingScore;
  final double correctnessScore;
  final double overallScore;
  final List<String> strengths;
  final List<String> weaknesses;
  final bool followUpRequired;
  final String? followUpReason;
  final String improvementFeedback;

  const AnswerEvaluation({
    required this.questionNumber,
    required this.questionText,
    required this.answerText,
    this.technicalScore = 7.0,
    this.communicationScore = 7.0,
    this.clarityScore = 7.0,
    this.depthScore = 7.0,
    this.problemSolvingScore = 7.0,
    this.correctnessScore = 7.0,
    this.overallScore = 7.0,
    this.strengths = const [],
    this.weaknesses = const [],
    this.followUpRequired = false,
    this.followUpReason,
    this.improvementFeedback = '',
  });

  factory AnswerEvaluation.fromJson(Map<String, dynamic> json) {
    return AnswerEvaluation(
      questionNumber: json['question_number'] ?? 1,
      questionText: json['question_text'] ?? '',
      answerText: json['answer_text'] ?? '',
      technicalScore: (json['technical_score'] as num?)?.toDouble() ?? 7.0,
      communicationScore: (json['communication_score'] as num?)?.toDouble() ?? 7.0,
      clarityScore: (json['clarity_score'] as num?)?.toDouble() ?? 7.0,
      depthScore: (json['depth_score'] as num?)?.toDouble() ?? 7.0,
      problemSolvingScore: (json['problem_solving_score'] as num?)?.toDouble() ?? 7.0,
      correctnessScore: (json['correctness_score'] as num?)?.toDouble() ?? 7.0,
      overallScore: (json['overall_score'] as num?)?.toDouble() ?? 7.0,
      strengths: List<String>.from(json['strengths'] ?? []),
      weaknesses: List<String>.from(json['weaknesses'] ?? []),
      followUpRequired: json['follow_up_required'] ?? false,
      followUpReason: json['follow_up_reason'],
      improvementFeedback: json['improvement_feedback'] ?? '',
    );
  }

  @override
  List<Object?> get props => [
        questionNumber,
        technicalScore,
        communicationScore,
        clarityScore,
        depthScore,
        problemSolvingScore,
        overallScore,
        strengths,
        weaknesses,
        followUpRequired,
      ];
}

class InterviewSessionModel extends Equatable {
  final String sessionId;
  final CandidateProfile candidateProfile;
  final InterviewConfig config;
  final InterviewStage stage;
  final int questionNumber;
  final String? currentQuestion;
  final List<InterviewMessage> conversationHistory;
  final List<AnswerEvaluation> evaluations;
  final bool isActive;

  const InterviewSessionModel({
    required this.sessionId,
    required this.candidateProfile,
    required this.config,
    this.stage = InterviewStage.intro,
    this.questionNumber = 0,
    this.currentQuestion,
    this.conversationHistory = const [],
    this.evaluations = const [],
    this.isActive = true,
  });

  factory InterviewSessionModel.fromJson(Map<String, dynamic> json) {
    return InterviewSessionModel(
      sessionId: json['session_id'] ?? '',
      candidateProfile: json['candidate_profile'] != null
          ? CandidateProfile.fromJson(json['candidate_profile'])
          : const CandidateProfile(),
      config: json['config'] != null
          ? InterviewConfig(
              targetRole: json['config']['target_role'] ?? 'Software Engineer',
              experienceLevel: json['config']['experience_level'] ?? 'Mid-Level',
              difficulty: json['config']['difficulty'] ?? 'Intermediate',
              interviewType: json['config']['interview_type'] ?? 'Mixed',
              maxQuestions: json['config']['max_questions'] ?? 6,
            )
          : const InterviewConfig(),
      stage: InterviewStage.fromString(json['stage'] ?? 'INTRO'),
      questionNumber: json['question_number'] ?? 0,
      currentQuestion: json['current_question'],
      conversationHistory: (json['conversation_history'] as List? ?? [])
          .map((e) => InterviewMessage.fromJson(e))
          .toList(),
      evaluations: (json['evaluations'] as List? ?? [])
          .map((e) => AnswerEvaluation.fromJson(e))
          .toList(),
      isActive: json['is_active'] ?? true,
    );
  }

  InterviewSessionModel copyWith({
    String? sessionId,
    CandidateProfile? candidateProfile,
    InterviewConfig? config,
    InterviewStage? stage,
    int? questionNumber,
    String? currentQuestion,
    List<InterviewMessage>? conversationHistory,
    List<AnswerEvaluation>? evaluations,
    bool? isActive,
  }) {
    return InterviewSessionModel(
      sessionId: sessionId ?? this.sessionId,
      candidateProfile: candidateProfile ?? this.candidateProfile,
      config: config ?? this.config,
      stage: stage ?? this.stage,
      questionNumber: questionNumber ?? this.questionNumber,
      currentQuestion: currentQuestion ?? this.currentQuestion,
      conversationHistory: conversationHistory ?? this.conversationHistory,
      evaluations: evaluations ?? this.evaluations,
      isActive: isActive ?? this.isActive,
    );
  }

  @override
  List<Object?> get props => [
        sessionId,
        stage,
        questionNumber,
        currentQuestion,
        conversationHistory,
        evaluations,
        isActive,
      ];
}
