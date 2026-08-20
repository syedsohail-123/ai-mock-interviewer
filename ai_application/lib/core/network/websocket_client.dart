import 'dart:async';
import 'dart:convert';
import 'package:web_socket_channel/web_socket_channel.dart';
import '../constants/api_constants.dart';

class InterviewWebSocketClient {
  WebSocketChannel? _channel;
  StreamController<Map<String, dynamic>>? _controller;
  bool _isConnected = false;

  bool get isConnected => _isConnected;
  Stream<Map<String, dynamic>>? get stream => _controller?.stream;

  Future<void> connect(String sessionId) async {
    final uri = Uri.parse('${ApiConstants.wsBaseUrl}/interview/ws/$sessionId');
    _controller = StreamController<Map<String, dynamic>>.broadcast();
    
    try {
      _channel = WebSocketChannel.connect(uri);
      _isConnected = true;

      _channel!.stream.listen(
        (data) {
          try {
            final decoded = jsonDecode(data as String) as Map<String, dynamic>;
            _controller?.add(decoded);
          } catch (e) {
            _controller?.addError(e);
          }
        },
        onError: (err) {
          _isConnected = false;
          _controller?.addError(err);
        },
        onDone: () {
          _isConnected = false;
        },
      );
    } catch (e) {
      _isConnected = false;
      _controller?.addError(e);
    }
  }

  void send(Map<String, dynamic> message) {
    if (_channel != null && _isConnected) {
      _channel!.sink.add(jsonEncode(message));
    }
  }

  void sendStart() {
    send({'action': 'start'});
  }

  void sendAnswer({required String answerText, String? audioBase64}) {
    send({
      'action': 'answer',
      'answer_text': answerText,
      'audio_base64': audioBase64,
    });
  }

  void disconnect() {
    _isConnected = false;
    _channel?.sink.close();
    _channel = null;
    _controller?.close();
    _controller = null;
  }
}
