import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/network/api_client.dart';
import '../data/models/candidate_profile_model.dart';
import 'cv_event.dart';
import 'cv_state.dart';

class CvBloc extends Bloc<CvEvent, CvState> {
  final ApiClient apiClient;

  CvBloc({required this.apiClient}) : super(CvInitialState()) {
    on<UploadCvFileEvent>(_onUploadCvFile);
    on<ConnectWithAccessKeyEvent>(_onConnectWithKey);
    on<UpdateCandidateProfileEvent>(_onUpdateProfile);
    on<ResetCvEvent>(_onReset);
  }

  Future<void> _onConnectWithKey(
    ConnectWithAccessKeyEvent event,
    Emitter<CvState> emit,
  ) async {
    emit(const CvParsingLoadingState(statusMessage: 'Connecting with Web Resume Key...'));
    try {
      final response = await apiClient.connectInterviewKey(event.accessKey);
      if (response.statusCode == 200) {
        final candidateData = response.data['candidate'] as Map<String, dynamic>;
        final sessionData = response.data['session'] as Map<String, dynamic>;
        final audioBase64 = response.data['audio_base64'] as String?;
        final profile = CandidateProfile.fromJson(candidateData);
        emit(CvConnectedAndStartInterviewState(
          profile: profile,
          sessionJson: sessionData,
          audioBase64: audioBase64,
        ));
      } else {
        emit(CvParsingErrorState('Server returned status ${response.statusCode}'));
      }
    } catch (e) {
      emit(const CvParsingErrorState('Invalid or expired interview key. Please verify the code generated in your web browser.'));
    }
  }

  Future<void> _onUploadCvFile(
    UploadCvFileEvent event,
    Emitter<CvState> emit,
  ) async {
    emit(const CvParsingLoadingState(statusMessage: 'Extracting text and analyzing candidate background...'));
    try {
      final response = await apiClient.uploadCvFile(event.filePath, event.fileName);
      if (response.statusCode == 200) {
        final profile = CandidateProfile.fromJson(response.data as Map<String, dynamic>);
        emit(CvParsedSuccessState(profile));
      } else {
        emit(CvParsingErrorState('Server returned status ${response.statusCode}'));
      }
    } catch (e) {
      emit(CvParsingErrorState('Failed to parse CV: ${e.toString()}'));
    }
  }

  void _onUpdateProfile(
    UpdateCandidateProfileEvent event,
    Emitter<CvState> emit,
  ) {
    emit(CvParsedSuccessState(event.profile));
  }

  void _onReset(
    ResetCvEvent event,
    Emitter<CvState> emit,
  ) {
    emit(CvInitialState());
  }
}
