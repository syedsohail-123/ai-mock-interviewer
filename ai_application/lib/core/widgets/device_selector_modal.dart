import 'dart:async';
import 'package:flutter/material.dart';
import 'package:camera/camera.dart';
import 'package:record/record.dart';
import '../theme/app_theme.dart';

class DeviceSelectorModal extends StatefulWidget {
  final List<CameraDescription> availableCameras;
  final int selectedCameraIndex;
  final Function(int newIndex) onCameraSelected;

  const DeviceSelectorModal({
    super.key,
    required this.availableCameras,
    required this.selectedCameraIndex,
    required this.onCameraSelected,
  });

  @override
  State<DeviceSelectorModal> createState() => _DeviceSelectorModalState();
}

class _DeviceSelectorModalState extends State<DeviceSelectorModal> {
  late int _currentIndex;
  late AudioRecorder _testRecorder;
  bool _isTestingMic = false;
  double _micLevel = 0.0;
  StreamSubscription<Amplitude>? _ampSubscription;

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.selectedCameraIndex;
    _testRecorder = AudioRecorder();
  }

  Future<void> _startMicTest() async {
    try {
      final hasPerm = await _testRecorder.hasPermission();
      if (!hasPerm) return;

      final stream = _testRecorder.onAmplitudeChanged(const Duration(milliseconds: 100));
      _ampSubscription = stream.listen((amp) {
        if (mounted) {
          // amp.current is in dBFS (e.g. -60 to 0)
          final normalized = ((amp.current + 50) / 50).clamp(0.05, 1.0);
          setState(() {
            _micLevel = normalized;
          });
        }
      });

      setState(() => _isTestingMic = true);
    } catch (e) {
      debugPrint('Mic test error: $e');
    }
  }

  Future<void> _stopMicTest() async {
    await _ampSubscription?.cancel();
    _ampSubscription = null;
    try {
      if (await _testRecorder.isRecording()) {
        await _testRecorder.stop();
      }
    } catch (_) {}
    if (mounted) {
      setState(() {
        _isTestingMic = false;
        _micLevel = 0.0;
      });
    }
  }

  @override
  void dispose() {
    _ampSubscription?.cancel();
    _testRecorder.dispose();
    super.dispose();
  }

  String _cleanCameraName(String rawName, int idx) {
    if (rawName.isEmpty) return 'Camera ${idx + 1}';
    final stripped = rawName.split('<').first.trim();
    if (stripped.isNotEmpty) return stripped;
    return 'Camera ${idx + 1}';
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: AppColors.surface,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Container(
        width: 520,
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Row(
                  children: [
                    Icon(Icons.settings_rounded, color: AppColors.primary, size: 22),
                    SizedBox(width: 10),
                    Text(
                      'Audio & Video Hardware Setup',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
                IconButton(
                  icon: const Icon(Icons.close_rounded, color: AppColors.textMuted),
                  onPressed: () {
                    _stopMicTest();
                    Navigator.of(context).pop();
                  },
                ),
              ],
            ),
            const Divider(color: AppColors.border, height: 28),

            // Camera Device selection
            const Text(
              'Select Camera Device',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textSecondary),
            ),
            const SizedBox(height: 10),
            if (widget.availableCameras.isEmpty)
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.background,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Text('No cameras detected', style: TextStyle(color: AppColors.textMuted)),
              )
            else
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.background,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppColors.border),
                ),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<int>(
                    value: _currentIndex < widget.availableCameras.length ? _currentIndex : 0,
                    isExpanded: true,
                    dropdownColor: AppColors.surface,
                    items: List.generate(widget.availableCameras.length, (idx) {
                      final cam = widget.availableCameras[idx];
                      final displayName = _cleanCameraName(cam.name, idx);
                      return DropdownMenuItem<int>(
                        value: idx,
                        child: Text(
                          displayName,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
                        ),
                      );
                    }),
                    onChanged: (newIdx) {
                      if (newIdx != null) {
                        setState(() => _currentIndex = newIdx);
                        widget.onCameraSelected(newIdx);
                      }
                    },
                  ),
                ),
              ),
            const SizedBox(height: 24),

            // Microphone Level Test
            const Text(
              'Microphone Input Level Test',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textSecondary),
            ),
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.background,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                children: [
                  Row(
                    children: [
                      Icon(
                        _isTestingMic ? Icons.mic_rounded : Icons.mic_none_rounded,
                        color: _isTestingMic ? AppColors.success : AppColors.textMuted,
                        size: 20,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(4),
                          child: LinearProgressIndicator(
                            value: _isTestingMic ? _micLevel : 0.0,
                            minHeight: 10,
                            backgroundColor: AppColors.surfaceLight,
                            valueColor: AlwaysStoppedAnimation<Color>(
                              _micLevel > 0.85 ? AppColors.danger : AppColors.success,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  Align(
                    alignment: Alignment.centerRight,
                    child: ElevatedButton.icon(
                      onPressed: _isTestingMic ? _stopMicTest : _startMicTest,
                      icon: Icon(_isTestingMic ? Icons.stop_rounded : Icons.play_arrow_rounded, size: 16),
                      label: Text(_isTestingMic ? 'Stop Test' : 'Test Microphone'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: _isTestingMic ? AppColors.danger : AppColors.primary,
                        foregroundColor: Colors.black,
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Done button
            Align(
              alignment: Alignment.centerRight,
              child: OutlinedButton(
                onPressed: () {
                  _stopMicTest();
                  Navigator.of(context).pop();
                },
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                ),
                child: const Text('Save & Close'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
