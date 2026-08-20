import 'package:equatable/equatable.dart';
import '../../cv_parser/data/models/candidate_profile_model.dart';
import '../data/models/interview_models.dart';

abstract class InterviewEvent extends Equatable {
  const InterviewEvent();

  @override
  List<Object?> get props => [];
}

class CreateAndStartSessionEvent extends InterviewEvent {
  final CandidateProfile profile;
  final InterviewConfig config;

  const CreateAndStartSessionEvent({required this.profile, required this.config});

  @override
  List<Object?> get props => [profile, config];
}

class SetActiveSessionEvent extends InterviewEvent {
  final InterviewSessionModel session;
  final String? audioBase64;

  const SetActiveSessionEvent({required this.session, this.audioBase64});

  @override
  List<Object?> get props => [session, audioBase64];
}

class SubmitCandidateAnswerEvent extends InterviewEvent {
  final String answerText;
  final String? audioBase64;

  const SubmitCandidateAnswerEvent({required this.answerText, this.audioBase64});

  @override
  List<Object?> get props => [answerText, audioBase64];
}

class ResetInterviewEvent extends InterviewEvent {}
