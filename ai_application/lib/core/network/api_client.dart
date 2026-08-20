import 'package:dio/dio.dart';
import '../constants/api_constants.dart';

class ApiClient {
  late final Dio _dio;

  ApiClient({String? baseUrl}) {
    _dio = Dio(
      BaseOptions(
        baseUrl: baseUrl ?? ApiConstants.baseUrl,
        connectTimeout: const Duration(seconds: 30),
        receiveTimeout: const Duration(seconds: 120),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );
  }

  Dio get client => _dio;

  Future<Response> uploadCvFile(String filePath, String fileName) async {
    final formData = FormData.fromMap({
      'file': await MultipartFile.fromFile(filePath, filename: fileName),
    });
    return _dio.post(ApiConstants.uploadCv, data: formData);
  }

  Future<Response> createInterviewSession(Map<String, dynamic> data) {
    return _dio.post(ApiConstants.createSession, data: data);
  }

  Future<Response> connectInterviewKey(String accessKey) {
    return _dio.post(ApiConstants.connectKey, data: {'access_key': accessKey});
  }

  Future<Response> startInterview(String sessionId) {
    return _dio.post('${ApiConstants.startInterview}/$sessionId/start');
  }

  Future<Response> submitAnswer(Map<String, dynamic> data) {
    return _dio.post(ApiConstants.submitAnswer, data: data);
  }

  Future<String> transcribeAudioBase64(String base64Audio, {String filename = 'recording.m4a'}) async {
    try {
      final res = await _dio.post(
        ApiConstants.transcribe,
        data: {
          'audio_base64': base64Audio,
          'filename': filename,
        },
      );
      if (res.statusCode == 200 && res.data != null) {
        return (res.data['text'] as String?)?.trim() ?? '';
      }
    } catch (e) {
      // Fallback
    }
    return '';
  }

  Future<String?> synthesizeSpeech(String text) async {
    try {
      final res = await _dio.post(
        ApiConstants.tts,
        data: {'text': text},
      );
      if (res.statusCode == 200 && res.data != null) {
        return res.data['audio_base64'] as String?;
      }
    } catch (e) {
      // Ignore
    }
    return null;
  }

  Future<Response> getReport(String sessionId) {
    return _dio.get('${ApiConstants.report}/$sessionId');
  }

  Future<Response> getMlAnalytics(String sessionId) {
    return _dio.get('${ApiConstants.mlAnalytics}/$sessionId/ml-analytics');
  }
}

final apiClient = ApiClient();
