import 'package:equatable/equatable.dart';
import '../data/models/interview_models.dart';

abstract class InterviewState extends Equatable {
  const InterviewState();

  @override
  List<Object?> get props => [];
}

class InterviewInitialState extends InterviewState {}

class InterviewLoadingState extends InterviewState {
  final String message;

  const InterviewLoadingState({this.message = 'Initializing session...'});

  @override
  List<Object?> get props => [message];
}

class InterviewActiveState extends InterviewState {
  final InterviewSessionModel session;
  final bool isEvaluating;
  final String? audioBase64ToPlay;

  const InterviewActiveState({
    required this.session,
    this.isEvaluating = false,
    this.audioBase64ToPlay,
  });

  InterviewActiveState copyWith({
    InterviewSessionModel? session,
    bool? isEvaluating,
    String? audioBase64ToPlay,
  }) {
    return InterviewActiveState(
      session: session ?? this.session,
      isEvaluating: isEvaluating ?? this.isEvaluating,
      audioBase64ToPlay: audioBase64ToPlay,
    );
  }

  @override
  List<Object?> get props => [session, isEvaluating, audioBase64ToPlay];
}

class InterviewCompletedState extends InterviewState {
  final String sessionId;
  final String completionMessage;

  const InterviewCompletedState({
    required this.sessionId,
    required this.completionMessage,
  });

  @override
  List<Object?> get props => [sessionId, completionMessage];
}

class InterviewErrorState extends InterviewState {
  final String errorMessage;

  const InterviewErrorState(this.errorMessage);

  @override
  List<Object?> get props => [errorMessage];
}
