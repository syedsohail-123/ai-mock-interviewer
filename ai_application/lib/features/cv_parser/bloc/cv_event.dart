import 'package:equatable/equatable.dart';
import '../data/models/candidate_profile_model.dart';

abstract class CvEvent extends Equatable {
  const CvEvent();

  @override
  List<Object?> get props => [];
}

class UploadCvFileEvent extends CvEvent {
  final String filePath;
  final String fileName;

  const UploadCvFileEvent({required this.filePath, required this.fileName});

  @override
  List<Object?> get props => [filePath, fileName];
}

class ConnectWithAccessKeyEvent extends CvEvent {
  final String accessKey;

  const ConnectWithAccessKeyEvent(this.accessKey);

  @override
  List<Object?> get props => [accessKey];
}

class UpdateCandidateProfileEvent extends CvEvent {
  final CandidateProfile profile;

  const UpdateCandidateProfileEvent(this.profile);

  @override
  List<Object?> get props => [profile];
}

class ResetCvEvent extends CvEvent {}
