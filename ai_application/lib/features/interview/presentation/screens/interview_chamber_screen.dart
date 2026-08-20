import 'dart:async';
import 'dart:convert';
import 'dart:ffi';
import 'dart:io';
import 'dart:typed_data';
import 'package:ffi/ffi.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:camera/camera.dart';
import 'package:camera_platform_interface/camera_platform_interface.dart';
import 'package:camera_windows/camera_windows.dart';
import 'package:record/record.dart';
import 'package:path_provider/path_provider.dart';
import 'package:win32/win32.dart';
import 'package:flutter/services.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/audio_waveform_widget.dart';
import '../../../../core/widgets/device_selector_modal.dart';
import '../../../../core/widgets/behavioral_hud_widget.dart';
import '../../../cv_parser/bloc/cv_bloc.dart';
import '../../../cv_parser/bloc/cv_event.dart';
import '../../bloc/interview_bloc.dart';
import '../../bloc/interview_event.dart';
import '../../bloc/interview_state.dart';
import '../../data/models/interview_models.dart';

class InterviewChamberScreen extends StatefulWidget {
  const InterviewChamberScreen({super.key});

  @override
  State<InterviewChamberScreen> createState() => _InterviewChamberScreenState();
}

class _InterviewChamberScreenState extends State<InterviewChamberScreen>
    with TickerProviderStateMixin {
  final _answerController = TextEditingController();
  final _scrollController = ScrollController();
  late AudioRecorder _audioRecorder;

  CameraController? _cameraController;
  List<CameraDescription> _availableCameras = [];
  int _selectedCameraIndex = 0;
  bool _isCameraInitialized = false;
  bool _isCameraLoading = false;
  bool _isCameraOn = true;
  String? _cameraErrorMessage;
  String? _activeCameraName;
  bool _showChatTranscript = true;
  bool _showBehavioralHud = true;

  bool _isRecording = false;
  bool _isTranscribing = false;
  bool _isVoiceMuted = false;
  bool _isAISpeaking = false;
  String? _lastSpokenQuestion;
  String? _recordedFilePath;
  int _recordSeconds = 0;
  Timer? _recordTimer;

  String? _inlineStatusMessage;
  bool _isInlineStatusSuccess = true;
  Timer? _inlineStatusTimer;

  late AnimationController _waveController;
  late AnimationController _aiPulseController;
  late AnimationController _faceFrameController;

  void _showInlineStatus(String message, {bool isSuccess = true}) {
    _inlineStatusTimer?.cancel();
    if (mounted) {
      setState(() {
        _inlineStatusMessage = message;
        _isInlineStatusSuccess = isSuccess;
      });
      _inlineStatusTimer = Timer(const Duration(seconds: 4), () {
        if (mounted) {
          setState(() {
            _inlineStatusMessage = null;
          });
        }
      });
    }
  }

  @override
  void initState() {
    super.initState();
    _audioRecorder = AudioRecorder();
    _initCamera();

    _waveController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    )..repeat(reverse: true);

    _aiPulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat(reverse: true);

    _faceFrameController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2000),
    )..repeat(reverse: true);
  }

  Future<void> _initCamera() async {
    if (!mounted) return;
    if (_isCameraInitialized && _cameraController != null && _cameraController!.value.isInitialized) {
      return; // Already actively streaming
    }
    if (_isCameraLoading) return; // Already in progress

    setState(() {
      _isCameraLoading = true;
      _cameraErrorMessage = null;
    });

    try {
      if (Platform.isWindows && CameraPlatform.instance is! CameraWindows) {
        CameraPlatform.instance = CameraWindows();
      }

      // Proactively clear any stale camera handles on Windows Media Foundation
      if (Platform.isWindows) {
        for (var i = 0; i < 8; i++) {
          try {
            await CameraPlatform.instance.dispose(i);
          } catch (_) {}
        }
      }

      _availableCameras = await availableCameras();
      if (_availableCameras.isEmpty) {
        if (mounted) {
          setState(() {
            _isCameraInitialized = false;
            _isCameraLoading = false;
            _cameraErrorMessage = "No webcam device detected on your PC.";
          });
        }
        return;
      }

      final camIndex =
          _selectedCameraIndex < _availableCameras.length ? _selectedCameraIndex : 0;
      final selectedCam = _availableCameras[camIndex];
      _activeCameraName = selectedCam.name;

      final controller = CameraController(
        selectedCam,
        ResolutionPreset.high,
        enableAudio: false,
      );

      try {
        await controller.initialize();
        if (mounted) {
          setState(() {
            _cameraController = controller;
            _isCameraInitialized = true;
            _isCameraOn = true;
            _cameraErrorMessage = null;
          });
        }
      } catch (e) {
        try {
          await controller.dispose();
        } catch (_) {}
        debugPrint("Camera initialize error: $e");
        if (mounted) {
          setState(() {
            _isCameraInitialized = false;
            _cameraErrorMessage = "Camera device: ${e.toString()}";
          });
        }
      }
    } catch (e) {
      debugPrint("Camera platform error: $e");
      if (mounted) {
        setState(() {
          _isCameraInitialized = false;
          _cameraErrorMessage = "Camera error: ${e.toString()}";
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _isCameraLoading = false;
        });
      }
    }
  }

  Future<void> _toggleCamera() async {
    if (_isCameraOn) {
      // Turn OFF
      if (_cameraController != null) {
        await _cameraController!.dispose();
        _cameraController = null;
      }
      setState(() {
        _isCameraOn = false;
        _isCameraInitialized = false;
      });
    } else {
      // Turn ON
      setState(() {
        _isCameraOn = true;
      });
      await _initCamera();
    }
  }

  Future<void> _switchCamera() async {
    if (_availableCameras.length <= 1) return;
    _selectedCameraIndex = (_selectedCameraIndex + 1) % _availableCameras.length;
    await _initCamera();
  }

  @override
  void dispose() {
    _recordTimer?.cancel();
    _inlineStatusTimer?.cancel();
    _stopSpeaking();
    _answerController.dispose();
    _scrollController.dispose();
    try {
      _audioRecorder.dispose();
    } catch (e) {
      debugPrint('Audio recorder dispose note: $e');
    }
    
    // Explicitly release webcam hardware and turn off LED light
    if (_cameraController != null) {
      final cam = _cameraController!;
      _cameraController = null;
      cam.dispose().catchError((_) => null);
    }
    if (Platform.isWindows) {
      for (var i = 0; i < 8; i++) {
        try {
          CameraPlatform.instance.dispose(i);
        } catch (_) {}
      }
    }

    _waveController.dispose();
    _aiPulseController.dispose();
    _faceFrameController.dispose();
    super.dispose();
  }

  String? _currentlySpeakingText;
  int _audioPlayNonce = 0;

  void _speakQuestion(String rawText, {String? audioBase64}) async {
    final text = _cleanDisplayQuestion(rawText);
    if (_isVoiceMuted || text.isEmpty) return;
    
    _lastSpokenQuestion = rawText;
    _currentlySpeakingText = text;

    _stopSpeaking();
    final currentNonce = ++_audioPlayNonce;

    try {
      String? base64ToPlay = audioBase64;
      if (base64ToPlay == null || base64ToPlay.isEmpty || base64ToPlay.length <= 50) {
        base64ToPlay = await apiClient.synthesizeSpeech(text);
      }

      if (currentNonce != _audioPlayNonce) return;

      if (!kIsWeb && base64ToPlay != null && base64ToPlay.length > 50) {
        final bytes = base64Decode(base64ToPlay);
        if (bytes.isNotEmpty) {
          final tempDir = await getTemporaryDirectory();
          final audioFile = File('${tempDir.path}/ai_q_${DateTime.now().millisecondsSinceEpoch}.wav');
          await audioFile.writeAsBytes(bytes);

          if (currentNonce != _audioPlayNonce) {
            try { audioFile.deleteSync(); } catch (_) {}
            return;
          }

          if (mounted) setState(() => _isAISpeaking = true);

          if (Platform.isWindows) {
            try {
              final pathPtr = audioFile.path.toNativeUtf16();
              // Native Win32 multimedia sound playback - zero subprocesses, zero console windows
              PlaySound(pathPtr, NULL, SND_FILENAME | SND_ASYNC | SND_NODEFAULT);
              free(pathPtr);
            } catch (e) {
              debugPrint('Win32 PlaySound note: $e');
            }

            final estDurationSecs = (text.length / 14).ceil().clamp(3, 30);
            Future.delayed(Duration(seconds: estDurationSecs), () {
              if (currentNonce == _audioPlayNonce && mounted) {
                setState(() {
                  _isAISpeaking = false;
                  _currentlySpeakingText = null;
                });
              }
              try {
                if (audioFile.existsSync()) audioFile.deleteSync();
              } catch (_) {}
            });
          }
        }
      }
    } catch (e) {
      debugPrint("Audio playback note: $e");
      if (currentNonce == _audioPlayNonce && mounted) {
        setState(() {
          _isAISpeaking = false;
          _currentlySpeakingText = null;
        });
      }
    }
  }

  void _stopSpeaking() {
    _audioPlayNonce++;
    _currentlySpeakingText = null;
    if (Platform.isWindows) {
      try {
        PlaySound(nullptr, NULL, 0);
      } catch (e) {
        debugPrint('Win32 PlaySound stop note: $e');
      }
    }
    if (mounted) setState(() => _isAISpeaking = false);
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      try {
        if (_scrollController.hasClients && _scrollController.position.hasContentDimensions) {
          _scrollController.animateTo(
            _scrollController.position.maxScrollExtent,
            duration: const Duration(milliseconds: 300),
            curve: Curves.easeOut,
          );
        }
      } catch (_) {}
    });
  }

  Future<void> _submitAnswer() async {
    final text = _answerController.text.trim();
    if (text.isEmpty) {
      debugPrint('[Chamber] Submit answer ignored: text is empty');
      return;
    }

    debugPrint('[Chamber] Submitting candidate answer: "$text"');

    // Ensure recording is stopped and awaited cleanly if active
    if (_isRecording) {
      _recordTimer?.cancel();
      try {
        await _audioRecorder.stop();
      } catch (e) {
        debugPrint('[Chamber] Recorder stop note: $e');
      }
      if (mounted) setState(() => _isRecording = false);
    }

    _stopSpeaking();
    _answerController.clear();
    context.read<InterviewBloc>().add(
          SubmitCandidateAnswerEvent(answerText: text),
        );
    _scrollToBottom();
  }

  Future<void> _toggleRecording() async {
    if (_isRecording) {
      // STOP RECORDING
      _recordTimer?.cancel();
      setState(() {
        _isRecording = false;
        _isTranscribing = true;
      });

      final recordedSecs = _recordSeconds;
      _showInlineStatus('Transcribing ${recordedSecs}s of speech into complete text...', isSuccess: true);
      try {
        final path = await _audioRecorder.stop();
        final finalPath = path ?? _recordedFilePath;

        if (recordedSecs < 1) {
          _showInlineStatus('Recording too short (< 1s). Please speak clearly into your mic.', isSuccess: false);
          return;
        }

        if (finalPath != null && await File(finalPath).exists()) {
          final bytes = await File(finalPath).readAsBytes();
          if (bytes.length > 500) {
            final base64Audio = base64Encode(bytes);
            final transcribedText =
                await apiClient.transcribeAudioBase64(base64Audio, filename: 'recording.wav');

            if (mounted) {
              if (transcribedText.isNotEmpty) {
                final current = _answerController.text.trim();
                final fullAnswer = current.isEmpty ? transcribedText : '$current $transcribedText';
                _answerController.text = fullAnswer;
                _showInlineStatus('✓ Transcribed ${transcribedText.split(' ').length} words • Sending to AI...', isSuccess: true);
                // DIRECT AUTO-SUBMIT: Sends answer immediately to AI
                _submitAnswer();
              } else {
                _showInlineStatus('Microphone heard silence or low volume. Please speak closer to your mic or type below.', isSuccess: false);
              }
            }
          } else {
            _showInlineStatus('No audio data captured. Please check mic permissions.', isSuccess: false);
          }
        }
      } catch (e) {
        debugPrint('Audio recording/transcription error: $e');
        if (mounted) {
          _showInlineStatus('Transcription note: ${e.toString()}', isSuccess: false);
        }
      } finally {
        if (mounted) {
          setState(() {
            _isTranscribing = false;
            _recordSeconds = 0;
          });
        }
      }
    } else {
      // START RECORDING
      try {
        final hasPermission = await _audioRecorder.hasPermission();
        if (!hasPermission) {
          if (mounted) {
            _showInlineStatus('Microphone permission needed', isSuccess: false);
          }
          return;
        }

        final tempDir = await getTemporaryDirectory();
        _recordedFilePath =
            '${tempDir.path}/interview_ans_${DateTime.now().millisecondsSinceEpoch}.wav';

        await _audioRecorder.start(
          const RecordConfig(
            encoder: AudioEncoder.wav,
            sampleRate: 44100,
            numChannels: 1,
          ),
          path: _recordedFilePath!,
        );

        _stopSpeaking();
        setState(() {
          _isRecording = true;
          _recordSeconds = 0;
        });

        _recordTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
          if (mounted) {
            setState(() {
              _recordSeconds++;
            });
          }
        });
      } catch (e) {
        debugPrint('Error starting audio recording: $e');
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Could not start microphone: $e'),
              backgroundColor: AppColors.danger,
            ),
          );
        }
      }
    }
  }

  String _formatDuration(int seconds) {
    final mins = (seconds ~/ 60).toString().padLeft(2, '0');
    final secs = (seconds % 60).toString().padLeft(2, '0');
    return '$mins:$secs';
  }

  void _showExitConfirmationDialog() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.exit_to_app_rounded, color: AppColors.danger, size: 24),
            SizedBox(width: 10),
            Text('Exit Interview Chamber?'),
          ],
        ),
        content: const Text(
          'Are you sure you want to end this interview session? You will be redirected back to the Resume Upload screen to upload a new CV or start fresh.',
          style: TextStyle(color: AppColors.textSecondary, fontSize: 14),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Resume Interview', style: TextStyle(color: AppColors.textPrimary)),
          ),
          ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.danger,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            ),
            onPressed: () async {
              _stopSpeaking();
              _recordTimer?.cancel();
              try {
                if (await _audioRecorder.isRecording()) {
                  await _audioRecorder.stop();
                }
              } catch (_) {}

              if (_cameraController != null) {
                final cam = _cameraController!;
                _cameraController = null;
                await cam.dispose().catchError((_) => null);
              }
              if (Platform.isWindows) {
                for (var i = 0; i < 8; i++) {
                  try {
                    await CameraPlatform.instance.dispose(i);
                  } catch (_) {}
                }
              }

              if (mounted) {
                context.read<CvBloc>().add(ResetCvEvent());
                Navigator.pop(ctx);
                context.go('/');
              }
            },
            icon: const Icon(Icons.logout_rounded, size: 16),
            label: const Text('Exit & Upload New Resume'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return CallbackShortcuts(
      bindings: <ShortcutActivator, VoidCallback>{
        const SingleActivator(LogicalKeyboardKey.enter, control: true): _submitAnswer,
        const SingleActivator(LogicalKeyboardKey.escape): _showExitConfirmationDialog,
      },
      child: Focus(
        autofocus: true,
        child: Scaffold(
          backgroundColor: AppColors.background,
          appBar: AppBar(
            backgroundColor: AppColors.surface,
            elevation: 0,
            leading: IconButton(
              icon: const Icon(Icons.close_rounded),
              onPressed: _showExitConfirmationDialog,
            ),
        title: BlocBuilder<InterviewBloc, InterviewState>(
          builder: (context, state) {
            if (state is InterviewActiveState) {
              return Row(
                children: [
                  Container(
                    width: 8,
                    height: 8,
                    margin: const EdgeInsets.only(right: 8),
                    decoration: const BoxDecoration(
                      color: AppColors.success,
                      shape: BoxShape.circle,
                    ),
                  ),
                  Text(
                    '${state.session.config.targetRole} • Question ${state.session.questionNumber} of ${state.session.config.maxQuestions}',
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                ],
              );
            }
            return const Text('AI Video Mock Interview Chamber');
          },
        ),
        actions: [
          // AI Speaking Status Indicator
          if (_isAISpeaking)
            Container(
              margin: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: AppColors.success.withOpacity(0.15),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.success.withOpacity(0.4)),
              ),
              child: const Row(
                children: [
                  Icon(Icons.volume_up_rounded, size: 16, color: AppColors.success),
                  SizedBox(width: 6),
                  Text('AI Asking Question...',
                      style: TextStyle(
                          color: AppColors.success, fontSize: 12, fontWeight: FontWeight.w600)),
                ],
              ),
            ),

          // Camera Toggle
          IconButton(
            icon: Icon(
              _isCameraOn ? Icons.videocam_rounded : Icons.videocam_off_rounded,
              color: _isCameraOn ? AppColors.primary : AppColors.textMuted,
            ),
            tooltip: _isCameraOn ? 'Turn Off Webcam' : 'Turn On Webcam',
            onPressed: _toggleCamera,
          ),

          // Switch / Refresh Camera
          if (_availableCameras.length > 1)
            IconButton(
              icon: const Icon(Icons.flip_camera_ios_rounded, color: AppColors.primary),
              tooltip: 'Switch Camera Device',
              onPressed: _switchCamera,
            ),

          // Hardware Device Setup Modal (Camera & Mic Test)
          IconButton(
            icon: const Icon(Icons.settings_rounded, color: AppColors.primary),
            tooltip: 'Camera & Microphone Hardware Settings',
            onPressed: () {
              showDialog(
                context: context,
                builder: (ctx) => DeviceSelectorModal(
                  availableCameras: _availableCameras,
                  selectedCameraIndex: _selectedCameraIndex,
                  onCameraSelected: (newIdx) {
                    setState(() => _selectedCameraIndex = newIdx);
                    _initCamera();
                  },
                ),
              );
            },
          ),

          // Audio Mute Toggle
          IconButton(
            icon: Icon(
              _isVoiceMuted ? Icons.volume_off_rounded : Icons.volume_up_rounded,
              color: _isVoiceMuted ? AppColors.textMuted : AppColors.primary,
            ),
            tooltip: _isVoiceMuted ? 'Unmute AI Speech' : 'Mute AI Speech',
            onPressed: () {
              setState(() {
                _isVoiceMuted = !_isVoiceMuted;
                if (_isVoiceMuted) {
                  _stopSpeaking();
                } else if (_lastSpokenQuestion != null) {
                  _speakQuestion(_lastSpokenQuestion!);
                }
              });
            },
          ),

          // Toggle Behavioral Vision HUD
          IconButton(
            icon: Icon(
              _showBehavioralHud ? Icons.visibility_rounded : Icons.visibility_off_rounded,
              color: _showBehavioralHud ? AppColors.primary : AppColors.textMuted,
            ),
            tooltip: _showBehavioralHud ? 'Hide Behavioral Analytics HUD' : 'Show Behavioral Analytics HUD',
            onPressed: () {
              setState(() {
                _showBehavioralHud = !_showBehavioralHud;
              });
            },
          ),

          // Toggle Transcript / Chat View
          IconButton(
            icon: Icon(
              _showChatTranscript ? Icons.chat_bubble_rounded : Icons.chat_bubble_outline_rounded,
              color: _showChatTranscript ? AppColors.primary : AppColors.textMuted,
            ),
            tooltip: _showChatTranscript ? 'Hide Transcript' : 'Show Transcript',
            onPressed: () {
              setState(() {
                _showChatTranscript = !_showChatTranscript;
              });
            },
          ),

          // Current Stage Badge
          BlocBuilder<InterviewBloc, InterviewState>(
            builder: (context, state) {
              if (state is InterviewActiveState) {
                return Container(
                  margin: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: AppColors.primary.withOpacity(0.3)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.record_voice_over_rounded,
                          size: 16, color: AppColors.primary),
                      const SizedBox(width: 6),
                      Text(
                        state.session.stage.label,
                        style: const TextStyle(
                            color: AppColors.primary,
                            fontWeight: FontWeight.w600,
                            fontSize: 12),
                      ),
                    ],
                  ),
                );
              }
              return const SizedBox.shrink();
            },
          ),

          // Direct Exit Interview Button
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: OutlinedButton.icon(
              onPressed: _showExitConfirmationDialog,
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: AppColors.danger),
                foregroundColor: AppColors.danger,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              ),
              icon: const Icon(Icons.exit_to_app_rounded, size: 16, color: AppColors.danger),
              label: const Text('Exit Session', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
            ),
          ),
        ],
      ),
      body: BlocConsumer<InterviewBloc, InterviewState>(
        listener: (context, state) {
          if (state is InterviewActiveState) {
            final q = state.session.currentQuestion;
            // DIRECT AUTO-SPEAK: Speaks immediately without requiring any user click
            if (q != null && q.isNotEmpty && q != _lastSpokenQuestion) {
              _speakQuestion(q, audioBase64: state.audioBase64ToPlay);
            }
            _scrollToBottom();
          } else if (state is InterviewCompletedState) {
            _stopSpeaking();
            if (_cameraController != null) {
              final cam = _cameraController!;
              _cameraController = null;
              cam.dispose().catchError((_) => null);
            }
            if (Platform.isWindows) {
              for (var i = 0; i < 8; i++) {
                try {
                  CameraPlatform.instance.dispose(i);
                } catch (_) {}
              }
            }
            context.push('/report/${state.sessionId}');
          }
        },
        builder: (context, state) {
          if (state is! InterviewActiveState) {
            return const Center(child: CircularProgressIndicator(color: AppColors.primary));
          }

          final session = state.session;
          final isEvaluating = state.isEvaluating;
          final currentQ = session.currentQuestion ?? "Preparing your interview question...";

          // Auto-trigger speech on first render if not spoken yet
          if (_lastSpokenQuestion == null && session.currentQuestion != null) {
            WidgetsBinding.instance.addPostFrameCallback((_) {
              if (mounted && _lastSpokenQuestion == null) {
                _speakQuestion(session.currentQuestion!, audioBase64: state.audioBase64ToPlay);
              }
            });
          }

          return Column(
            children: [
              // Top stage progression bar
              _buildStageStepper(session.stage),

              // Main Body: Split between Video Feeds and Conversation Stream
              Expanded(
                child: Row(
                  children: [
                    // LEFT / MAIN: LIVE DUAL VIDEO CHAMBER (AI + Candidate)
                    Expanded(
                      flex: 6,
                      child: Container(
                        color: AppColors.background,
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          children: [
                            // Dual Video Stream Tiles (AI + Candidate)
                            Expanded(
                              child: Row(
                                children: [
                                  // 1. AI INTERVIEWER PERSONA TILE
                                  Expanded(
                                    child: _buildAIInterviewerVideoTile(currentQ, session),
                                  ),
                                  const SizedBox(width: 14),
                                  // 2. CANDIDATE WEBCAM / PROCTOR TILE
                                  Expanded(
                                    child: _buildCandidateWebcamTile(session),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 12),
                            // Current Active Question Banner with replay button
                            _buildCurrentQuestionCard(currentQ),
                          ],
                        ),
                      ),
                    ),

                    // RIGHT: CONVERSATION TRANSCRIPT & EVALUATION STREAM (Collapsible)
                    if (_showChatTranscript)
                      Expanded(
                        flex: 4,
                        child: Container(
                          decoration: const BoxDecoration(
                            color: AppColors.surface,
                            border: Border(left: BorderSide(color: AppColors.border)),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                                decoration: const BoxDecoration(
                                  border: Border(bottom: BorderSide(color: AppColors.border)),
                                ),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    const Row(
                                      children: [
                                        Icon(Icons.history_rounded,
                                            size: 18, color: AppColors.primary),
                                        SizedBox(width: 8),
                                        Text('Session Transcript',
                                            style: TextStyle(
                                                fontWeight: FontWeight.bold, fontSize: 13)),
                                      ],
                                    ),
                                    Text(
                                      '${session.conversationHistory.length} messages',
                                      style: const TextStyle(
                                          color: AppColors.textMuted, fontSize: 11),
                                    ),
                                  ],
                                ),
                              ),
                              Expanded(
                                child: ListView.builder(
                                  controller: _scrollController,
                                  padding:
                                      const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                                  itemCount:
                                      session.conversationHistory.length + (isEvaluating ? 1 : 0),
                                  itemBuilder: (context, index) {
                                    if (index == session.conversationHistory.length &&
                                        isEvaluating) {
                                      return _buildEvaluatingIndicator();
                                    }
                                    final msg = session.conversationHistory[index];
                                    final isAI = msg.role == 'assistant';
                                    return _buildChatBubble(msg, isAI, session);
                                  },
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                  ],
                ),
              ),

              // Bottom Input Bar
              _buildInputArea(isEvaluating),
            ],
          );
        },
      ),
    ),
    ),
    );
  }

  Widget _buildAIInterviewerVideoTile(String currentQuestion, InterviewSessionModel session) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: _isAISpeaking ? AppColors.primary : AppColors.border,
          width: _isAISpeaking ? 2.0 : 1.0,
        ),
      ),
      child: Stack(
        alignment: Alignment.center,
        children: [
          // Background Gradient Mesh
          Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  AppColors.primaryDark.withOpacity(0.2),
                  AppColors.surface,
                  AppColors.background,
                ],
              ),
            ),
          ),

          // Central AI Avatar with Speaking Waves
          Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Stack(
                alignment: Alignment.center,
                children: [
                  // Animated halo if AI is speaking
                  if (_isAISpeaking)
                    AnimatedBuilder(
                      animation: _aiPulseController,
                      builder: (context, child) {
                        return Container(
                          width: 100 + (_aiPulseController.value * 24),
                          height: 100 + (_aiPulseController.value * 24),
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: AppColors.primary
                                .withOpacity(0.15 - (_aiPulseController.value * 0.1)),
                          ),
                        );
                      },
                    ),

                  // Avatar Circle
                  Container(
                    width: 86,
                    height: 86,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: AppColors.surfaceLight,
                      border: Border.all(
                        color: _isAISpeaking
                            ? AppColors.primary
                            : AppColors.primary.withOpacity(0.4),
                        width: 2.5,
                      ),
                    ),
                    child: const Icon(
                      Icons.psychology_rounded,
                      size: 46,
                      color: AppColors.primary,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              Text(
                'AI ${session.config.targetRole} Lead',
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 15,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 4),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 7,
                    height: 7,
                    decoration: BoxDecoration(
                      color: _isAISpeaking ? AppColors.success : AppColors.textMuted,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    _isAISpeaking ? 'Directly Asking Question...' : 'Listening to Candidate...',
                    style: TextStyle(
                      fontSize: 12,
                      color: _isAISpeaking ? AppColors.success : AppColors.textMuted,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ],
          ),

          // Top Badges
          Positioned(
            top: 12,
            left: 12,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: Colors.black.withOpacity(0.5),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Row(
                children: [
                  Icon(Icons.smart_toy_rounded, size: 14, color: AppColors.primary),
                  SizedBox(width: 6),
                  Text('Interviewer AI',
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                ],
              ),
            ),
          ),

          Positioned(
            top: 12,
            right: 12,
            child: IconButton(
              icon: Icon(
                _isAISpeaking ? Icons.volume_up_rounded : Icons.replay_rounded,
                size: 20,
                color: AppColors.primary,
              ),
              tooltip: 'Replay Question Audio',
              onPressed: () => _speakQuestion(currentQuestion),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCandidateWebcamTile(InterviewSessionModel session) {
    final isCameraReady = _isCameraInitialized &&
        _cameraController != null &&
        _cameraController!.value.isInitialized &&
        _isCameraOn;

    return Container(
      decoration: BoxDecoration(
        color: Colors.black,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: _isRecording ? AppColors.danger : AppColors.border,
          width: _isRecording ? 2.0 : 1.0,
        ),
      ),
      clipBehavior: Clip.antiAlias,
      child: Stack(
        alignment: Alignment.center,
        children: [
          // 1. Crystal Clear Live Camera Feed
          if (isCameraReady)
            Positioned.fill(
              child: ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: Transform.scale(
                  scaleX: -1.0, // Mirror horizontally for natural webcam self-view
                  child: Center(
                    child: CameraPreview(_cameraController!),
                  ),
                ),
              ),
            )
          else
            // Fallback / Loading / Off State
            Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topRight,
                  end: Alignment.bottomLeft,
                  colors: [
                    AppColors.secondary.withOpacity(0.12),
                    AppColors.surface,
                    AppColors.background,
                  ],
                ),
              ),
              child: Center(
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      if (_isCameraLoading) ...[
                        const CircularProgressIndicator(color: AppColors.primary),
                        const SizedBox(height: 14),
                        const Text(
                          'Starting Webcam Device...',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                        ),
                      ] else ...[
                        CircleAvatar(
                          radius: 36,
                          backgroundColor: AppColors.surfaceLight,
                          child: Icon(
                            _isCameraOn ? Icons.videocam_rounded : Icons.videocam_off_rounded,
                            size: 38,
                            color: _isCameraOn ? AppColors.secondary : AppColors.textMuted,
                          ),
                        ),
                        const SizedBox(height: 12),
                        Text(
                          _cameraErrorMessage != null
                              ? 'Camera Status'
                              : _isCameraOn
                                  ? 'Webcam Standby'
                                  : 'Camera Turned Off',
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          _cameraErrorMessage ??
                              (_isCameraOn
                                  ? 'Click below to connect webcam feed'
                                  : 'Click Turn On Camera to enable video'),
                          textAlign: TextAlign.center,
                          style: const TextStyle(color: AppColors.textMuted, fontSize: 12),
                        ),
                        const SizedBox(height: 12),
                        ElevatedButton.icon(
                          onPressed: _initCamera,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            foregroundColor: Colors.black,
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          ),
                          icon: const Icon(Icons.videocam_rounded, size: 18),
                          label: const Text('Turn On Camera',
                              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ),

          // 2. Top Badges: Candidate Name & Live Camera Device Name
          Positioned(
            top: 12,
            left: 12,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: Colors.black.withOpacity(0.65),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  const Icon(Icons.person_rounded, size: 14, color: AppColors.secondary),
                  const SizedBox(width: 6),
                  Text(
                    isCameraReady
                        ? (_activeCameraName != null ? 'Candidate • $_activeCameraName' : 'Candidate (Live Video)')
                        : 'Candidate Feed',
                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
            ),
          ),

          // 3. Behavioral HUD Overlay (Live Eye Contact, Posture, Real-Time Tips)
          if (_showBehavioralHud)
            Positioned.fill(
              child: BehavioralHudWidget(isCameraActive: isCameraReady),
            ),

          // 4. Live Proctoring Status Bar
          Positioned(
            bottom: 12,
            left: 12,
            right: 12,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: Colors.black.withOpacity(0.75),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.white.withOpacity(0.15)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 8,
                        height: 8,
                        decoration: BoxDecoration(
                          color: _isRecording ? AppColors.danger : (isCameraReady ? AppColors.success : AppColors.warning),
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        _isRecording
                            ? 'Candidate Speaking...'
                            : (isCameraReady ? 'Live Face Video • Centered' : 'Camera Standby'),
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: _isRecording ? AppColors.danger : Colors.white,
                        ),
                      ),
                    ],
                  ),
                  Text(
                    isCameraReady ? 'Proctoring: Active' : 'Audio Only',
                    style: const TextStyle(fontSize: 10, color: AppColors.textSecondary),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _cleanDisplayQuestion(String text) {
    if (text.isEmpty) return text;
    var cleaned = text.replaceAll(RegExp(r'<think>[\s\S]*?<\/think>'), '').trim();
    if (cleaned.contains('<think>')) {
      cleaned = cleaned.replaceAll(RegExp(r'<think>[\s\S]*'), '').trim();
    }
    cleaned = cleaned.replaceAll(RegExp(r'^Thinking Process:[\s\S]*?\n\n', caseSensitive: false), '').trim();
    if (cleaned.isEmpty) {
      final lines = text.split('\n').where((l) => l.trim().isNotEmpty && !l.trim().startsWith(RegExp(r'[\*\-#<0-9]'))).toList();
      if (lines.isNotEmpty) cleaned = lines.last.trim();
    }
    return cleaned.isNotEmpty ? cleaned : text;
  }

  Widget _buildCurrentQuestionCard(String rawQuestion) {
    final currentQuestion = _cleanDisplayQuestion(rawQuestion);
    final isDrillDown = currentQuestion.toLowerCase().contains('follow-up') ||
        currentQuestion.toLowerCase().contains('specifically') ||
        currentQuestion.toLowerCase().contains('drill-down') ||
        currentQuestion.toLowerCase().contains('you mentioned');

    return Container(
      width: double.infinity,
      constraints: const BoxConstraints(maxHeight: 115),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isDrillDown ? const Color(0xFFA855F7) : AppColors.primary.withOpacity(0.3),
          width: isDrillDown ? 1.5 : 1.0,
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: (isDrillDown ? const Color(0xFFA855F7) : AppColors.primary).withOpacity(0.15),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(
              isDrillDown ? Icons.psychology_alt_rounded : Icons.record_voice_over_rounded,
              color: isDrillDown ? const Color(0xFFA855F7) : AppColors.primary,
              size: 20,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    children: [
                      Text(
                        isDrillDown ? 'ADAPTIVE DRILL-DOWN PROBE' : 'CURRENT INTERVIEW QUESTION',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                          color: isDrillDown ? const Color(0xFFA855F7) : AppColors.primary,
                          letterSpacing: 0.5,
                        ),
                      ),
                      if (isDrillDown) ...[
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                          decoration: BoxDecoration(
                            color: const Color(0xFFA855F7).withOpacity(0.2),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: const Text(
                            '🔥 Deep Dive',
                            style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Color(0xFFA855F7)),
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 3),
                  Text(
                    currentQuestion,
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary,
                      height: 1.35,
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(width: 8),
          IconButton(
            icon: const Icon(Icons.flash_on_rounded, color: AppColors.warning, size: 20),
            tooltip: 'Request AI Mid-Answer Challenge / Interruption',
            onPressed: () {
              final currentText = _answerController.text.trim();
              if (currentText.isNotEmpty) {
                _submitAnswer();
              } else {
                _showInlineStatus('⚡ AI is listening to your answer to cross-question you...', isSuccess: true);
              }
            },
          ),
          IconButton(
            icon: const Icon(Icons.volume_up_rounded, color: AppColors.primary, size: 20),
            tooltip: 'Listen to Question Again',
            onPressed: () => _speakQuestion(currentQuestion),
          ),
        ],
      ),
    );
  }

  Widget _buildStageStepper(InterviewStage currentStage) {
    final stages = [
      InterviewStage.intro,
      InterviewStage.background,
      InterviewStage.technical,
      InterviewStage.projectDeepDive,
      InterviewStage.problemSolving,
      InterviewStage.behavioral,
      InterviewStage.finalStage,
    ];

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
      decoration: const BoxDecoration(
        color: AppColors.surface,
        border: Border(bottom: BorderSide(color: AppColors.border)),
      ),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: stages.map((stage) {
            final isCurrent = stage == currentStage;
            final isPassed = stages.indexOf(stage) < stages.indexOf(currentStage);

            return Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: isCurrent
                        ? AppColors.primary
                        : isPassed
                            ? AppColors.success.withOpacity(0.2)
                            : AppColors.surfaceLight,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    stage.label,
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: isCurrent ? FontWeight.bold : FontWeight.w500,
                      color: isCurrent
                          ? Colors.black
                          : isPassed
                              ? AppColors.success
                              : AppColors.textMuted,
                    ),
                  ),
                ),
                if (stage != stages.last)
                  Container(
                    width: 14,
                    height: 1,
                    color: isPassed ? AppColors.success : AppColors.border,
                    margin: const EdgeInsets.symmetric(horizontal: 4),
                  ),
              ],
            );
          }).toList(),
        ),
      ),
    );
  }

  Widget _buildChatBubble(InterviewMessage msg, bool isAI, InterviewSessionModel session) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Column(
        crossAxisAlignment: isAI ? CrossAxisAlignment.start : CrossAxisAlignment.end,
        children: [
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                isAI ? Icons.psychology_rounded : Icons.person,
                size: 13,
                color: isAI ? AppColors.primary : AppColors.secondary,
              ),
              const SizedBox(width: 4),
              Text(
                isAI ? 'Interviewer (${msg.stage ?? "Question"})' : 'Candidate Answer',
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                  color: isAI ? AppColors.primary : AppColors.secondary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: isAI ? AppColors.background : AppColors.primaryDark.withOpacity(0.35),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(
                color: isAI ? AppColors.border : AppColors.primary.withOpacity(0.3),
              ),
            ),
            child: Text(
              isAI ? _cleanDisplayQuestion(msg.content) : msg.content,
              style: const TextStyle(fontSize: 13, height: 1.4, color: AppColors.textPrimary),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEvaluatingIndicator() {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: AppColors.background,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: AppColors.border),
        ),
        child: const Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              width: 14,
              height: 14,
              child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary),
            ),
            SizedBox(width: 10),
            Text(
              'Evaluating response & adapting next question...',
              style: TextStyle(color: AppColors.textSecondary, fontSize: 12),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInputArea(bool isEvaluating) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: const BoxDecoration(
        color: AppColors.surface,
        border: Border(top: BorderSide(color: AppColors.border)),
      ),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 1000),
          child: Column(
            children: [
              // Live Recording Banner
              if (_isRecording)
                Container(
                  margin: const EdgeInsets.only(bottom: 10),
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  decoration: BoxDecoration(
                    color: AppColors.danger.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: AppColors.danger.withOpacity(0.4)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 10,
                        height: 10,
                        decoration: const BoxDecoration(
                          color: AppColors.danger,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 10),
                      Text(
                        'Recording Your Answer (${_formatDuration(_recordSeconds)}) • Click Stop Mic when finished',
                        style: const TextStyle(
                            color: AppColors.danger, fontSize: 13, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                ),

              // Transcribing Banner
              if (_isTranscribing)
                Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.primary.withOpacity(0.4)),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      SizedBox(
                        width: 12,
                        height: 12,
                        child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary),
                      ),
                      SizedBox(width: 8),
                      Text(
                        'Transcribing speech with Whisper...',
                        style: TextStyle(
                            color: AppColors.primary, fontSize: 12, fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),
                ),

              // Small Compact Inline Status Badge above answer box (non-blocking)
              if (_inlineStatusMessage != null)
                Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: (_isInlineStatusSuccess ? AppColors.success : AppColors.warning)
                        .withOpacity(0.15),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: (_isInlineStatusSuccess ? AppColors.success : AppColors.warning)
                          .withOpacity(0.35),
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        _isInlineStatusSuccess
                            ? Icons.check_circle_rounded
                            : Icons.info_outline_rounded,
                        size: 13,
                        color: _isInlineStatusSuccess ? AppColors.success : AppColors.warning,
                      ),
                      const SizedBox(width: 5),
                      Text(
                        _inlineStatusMessage!,
                        style: TextStyle(
                          color: _isInlineStatusSuccess ? AppColors.success : AppColors.warning,
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),

              // Live Waveform Visualizer for Recording & AI Speech
              if (_isRecording || _isAISpeaking)
                Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: AudioWaveformWidget(
                    isRecording: _isRecording,
                    isAiSpeaking: _isAISpeaking,
                    height: 28,
                  ),
                ),

              Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  // Mic button
                  IconButton.filled(
                    onPressed:
                        (isEvaluating || _isTranscribing) ? null : _toggleRecording,
                    style: IconButton.styleFrom(
                      backgroundColor:
                          _isRecording ? AppColors.danger : AppColors.surfaceLight,
                      padding: const EdgeInsets.all(14),
                    ),
                    icon: Icon(
                      _isRecording ? Icons.stop_rounded : Icons.mic_rounded,
                      color: _isRecording ? Colors.white : AppColors.primary,
                    ),
                    tooltip: _isRecording
                        ? 'Stop Recording & Transcribe'
                        : 'Answer with Voice / Mic',
                  ),
                  const SizedBox(width: 12),
                  // Text input
                  Expanded(
                    child: TextField(
                      controller: _answerController,
                      enabled: !isEvaluating && !_isTranscribing,
                      maxLines: 3,
                      minLines: 1,
                      textInputAction: TextInputAction.send,
                      onSubmitted: (_) => _submitAnswer(),
                      decoration: InputDecoration(
                        hintText: _isRecording
                            ? 'Listening... Speak your answer now'
                            : _isTranscribing
                                ? 'Transcribing your audio...'
                                : 'Type your answer or speak using microphone... (Ctrl + Enter to submit)',
                        fillColor: AppColors.background,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  // Send button
                  IconButton.filled(
                    onPressed: (isEvaluating || _isTranscribing || _isRecording)
                        ? null
                        : _submitAnswer,
                    style: IconButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      padding: const EdgeInsets.all(14),
                    ),
                    icon: const Icon(Icons.arrow_upward_rounded, color: Colors.black),
                    tooltip: 'Submit Answer (Ctrl + Enter)',
                  ),
                ],
              ),
              const SizedBox(height: 6),
              const Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  Text(
                    'Shortcuts: [Ctrl + Enter] Submit Answer  •  [Esc] Exit Session',
                    style: TextStyle(color: AppColors.textMuted, fontSize: 11),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
