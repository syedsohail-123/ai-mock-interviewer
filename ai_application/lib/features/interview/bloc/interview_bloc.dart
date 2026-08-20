import 'package:flutter/foundation.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/network/api_client.dart';
import '../data/models/interview_models.dart';
import 'interview_event.dart';
import 'interview_state.dart';

class InterviewBloc extends Bloc<InterviewEvent, InterviewState> {
  final ApiClient apiClient;

  InterviewBloc({required this.apiClient}) : super(InterviewInitialState()) {
    on<CreateAndStartSessionEvent>(_onCreateAndStart);
    on<SetActiveSessionEvent>(_onSetActiveSession);
    on<SubmitCandidateAnswerEvent>(_onSubmitAnswer);
    on<ResetInterviewEvent>(_onReset);
  }

  void _onSetActiveSession(
    SetActiveSessionEvent event,
    Emitter<InterviewState> emit,
  ) {
    debugPrint('[InterviewBloc] Setting active session from Key: ${event.session.sessionId}');
    emit(InterviewActiveState(
      session: event.session,
      audioBase64ToPlay: event.audioBase64,
    ));
  }

  Future<void> _onCreateAndStart(
    CreateAndStartSessionEvent event,
    Emitter<InterviewState> emit,
  ) async {
    debugPrint('[InterviewBloc] Starting new session for role: ${event.config.targetRole}');
    emit(const InterviewLoadingState(message: 'Generating personalized interview context...'));
    try {
      // 1. Create Session
      final createRes = await apiClient.createInterviewSession({
        'profile': event.profile.toJson(),
        'config': event.config.toJson(),
      });
      
      if (createRes.statusCode != 200) {
        debugPrint('[InterviewBloc] Failed to create session: ${createRes.statusCode}');
        emit(InterviewErrorState('Failed to create session (${createRes.statusCode})'));
        return;
      }

      final sessionId = createRes.data['session_id'] as String;
      debugPrint('[InterviewBloc] Session created with ID: $sessionId');

      // 2. Start Interview
      final startRes = await apiClient.startInterview(sessionId);
      if (startRes.statusCode == 200) {
        final data = startRes.data as Map<String, dynamic>;
        final session = InterviewSessionModel.fromJson(data['session'] as Map<String, dynamic>);
        final audioBase64 = data['audio_base64'] as String?;
        debugPrint('[InterviewBloc] Interview started. First Q: ${session.currentQuestion}');
        
        emit(InterviewActiveState(
          session: session,
          audioBase64ToPlay: audioBase64,
        ));
      } else {
        debugPrint('[InterviewBloc] Failed to start interview: ${startRes.statusCode}');
        emit(InterviewErrorState('Failed to start interview: ${startRes.statusCode}'));
      }
    } catch (e, stack) {
      debugPrint('[InterviewBloc] Error starting interview: $e\n$stack');
      emit(InterviewErrorState('Interview initialization error: ${e.toString()}'));
    }
  }

  Future<void> _onSubmitAnswer(
    SubmitCandidateAnswerEvent event,
    Emitter<InterviewState> emit,
  ) async {
    if (state is! InterviewActiveState) {
      debugPrint('[InterviewBloc] Cannot submit answer: state is not InterviewActiveState ($state)');
      return;
    }
    final currentState = state as InterviewActiveState;
    final currentSession = currentState.session;

    debugPrint('[InterviewBloc] >>> SUBMITTING ANSWER: "${event.answerText}" for Session ID: ${currentSession.sessionId}');
    
    // Instantly add candidate's answer to the conversation history so it renders immediately in the chat!
    final candidateMessage = InterviewMessage(
      role: 'user',
      content: event.answerText,
      stage: currentSession.stage.code,
      questionNumber: currentSession.questionNumber,
      timestamp: DateTime.now().toIso8601String(),
    );
    final optimisticHistory = List<InterviewMessage>.from(currentSession.conversationHistory)
      ..add(candidateMessage);
    final optimisticSession = currentSession.copyWith(conversationHistory: optimisticHistory);

    emit(currentState.copyWith(
      session: optimisticSession,
      isEvaluating: true,
    ));

    try {
      final res = await apiClient.submitAnswer({
        'session_id': currentSession.sessionId,
        'answer_text': event.answerText,
        'audio_data_base64': event.audioBase64,
      });

      debugPrint('[InterviewBloc] <<< Received submitAnswer response with status: ${res.statusCode}');

      if (res.statusCode == 200) {
        final data = res.data as Map<String, dynamic>;
        final updatedSession = InterviewSessionModel.fromJson(data['session'] as Map<String, dynamic>);
        final isCompleted = data['is_completed'] as bool? ?? false;
        final audioBase64 = data['audio_base64'] as String?;

        debugPrint('[InterviewBloc] Successfully evaluated. Next Q: "${updatedSession.currentQuestion}", Stage: ${updatedSession.stage.code}, IsCompleted: $isCompleted');

        if (isCompleted || updatedSession.stage == InterviewStage.completed) {
          debugPrint('[InterviewBloc] Interview session reached completion. Navigating to report.');
          emit(InterviewCompletedState(
            sessionId: currentSession.sessionId,
            completionMessage: 'Interview successfully completed! Generating performance metrics...',
          ));
        } else {
          emit(InterviewActiveState(
            session: updatedSession,
            isEvaluating: false,
            audioBase64ToPlay: audioBase64,
          ));
        }
      } else {
        debugPrint('[InterviewBloc] Non-200 response received: ${res.statusCode} ${res.data}');
        emit(currentState.copyWith(isEvaluating: false));
      }
    } catch (e, stack) {
      debugPrint('[InterviewBloc] EXCEPTION during submitAnswer: $e\n$stack');
      emit(currentState.copyWith(isEvaluating: false));
    }
  }

  void _onReset(
    ResetInterviewEvent event,
    Emitter<InterviewState> emit,
  ) {
    debugPrint('[InterviewBloc] Resetting interview state.');
    emit(InterviewInitialState());
  }
}
