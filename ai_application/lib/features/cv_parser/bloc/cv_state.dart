import 'package:equatable/equatable.dart';
import '../data/models/candidate_profile_model.dart';

abstract class CvState extends Equatable {
  const CvState();

  @override
  List<Object?> get props => [];
}

class CvInitialState extends CvState {}

class CvParsingLoadingState extends CvState {
  final String statusMessage;

  const CvParsingLoadingState({this.statusMessage = 'Parsing document & extracting candidate profile...'});

  @override
  List<Object?> get props => [statusMessage];
}

class CvParsedSuccessState extends CvState {
  final CandidateProfile profile;

  const CvParsedSuccessState(this.profile);

  @override
  List<Object?> get props => [profile];
}

class CvConnectedAndStartInterviewState extends CvState {
  final CandidateProfile profile;
  final Map<String, dynamic> sessionJson;
  final String? audioBase64;

  const CvConnectedAndStartInterviewState({
    required this.profile,
    required this.sessionJson,
    this.audioBase64,
  });

  @override
  List<Object?> get props => [profile, sessionJson, audioBase64];
}

class CvParsingErrorState extends CvState {
  final String errorMessage;

  const CvParsingErrorState(this.errorMessage);

  @override
  List<Object?> get props => [errorMessage];
}
