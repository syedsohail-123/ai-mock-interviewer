class ApiConstants {
  static const String baseUrl = 'http://127.0.0.1:8000/api';
  static const String wsBaseUrl = 'ws://127.0.0.1:8000/api';

  // Endpoints
  static const String uploadCv = '/cv/upload';
  static const String updateProfile = '/cv/profile';
  static const String createSession = '/interview/create';
  static const String connectKey = '/interview/connect-key';
  static const String startInterview = '/interview';
  static const String submitAnswer = '/interview/answer';
  static const String transcribe = '/interview/transcribe';
  static const String tts = '/interview/tts';
  static const String report = '/report';
  static const String mlAnalytics = '/report';
}
