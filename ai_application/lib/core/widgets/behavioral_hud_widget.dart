import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class BehavioralHudWidget extends StatefulWidget {
  final bool isCameraActive;

  const BehavioralHudWidget({
    super.key,
    required this.isCameraActive,
  });

  @override
  State<BehavioralHudWidget> createState() => _BehavioralHudWidgetState();
}

class _BehavioralHudWidgetState extends State<BehavioralHudWidget> {
  Timer? _metricsTimer;
  double _eyeContactPercent = 94.0;
  String _postureStatus = 'Centered & Aligned';
  Color _postureColor = AppColors.success;
  int _currentTipIndex = 0;

  static const List<String> _coachingTips = [
    'Maintain natural eye contact with the camera',
    'Good steady posture and balanced framing',
    'Speak clearly with structured pauses',
    'Neutral and confident facial expression',
  ];

  @override
  void initState() {
    super.initState();
    // Simulate real-time computer vision tracker variations
    _metricsTimer = Timer.periodic(const Duration(seconds: 4), (timer) {
      if (mounted && widget.isCameraActive) {
        final rand = math.Random();
        final eyeScore = 88.0 + rand.nextDouble() * 10.0;
        final postures = ['Centered & Aligned', 'Optimal Framing', 'Good Posture'];
        setState(() {
          _eyeContactPercent = eyeScore.clamp(80.0, 99.0);
          _postureStatus = postures[rand.nextInt(postures.length)];
          _postureColor = AppColors.success;
          _currentTipIndex = (timer.tick) % _coachingTips.length;
        });
      }
    });
  }

  @override
  void dispose() {
    _metricsTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.isCameraActive) return const SizedBox.shrink();

    return Stack(
      children: [
        // Top Left: Eye Contact & Posture Badges
        Positioned(
          top: 10,
          left: 10,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Eye Contact Gauge Pill
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.7),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: AppColors.success.withValues(alpha: 0.5)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.remove_red_eye_rounded, size: 14, color: AppColors.success),
                    const SizedBox(width: 6),
                    Text(
                      'Eye Contact: ${_eyeContactPercent.toInt()}%',
                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 6),
              // Posture Status Pill
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.7),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: _postureColor.withValues(alpha: 0.5)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.accessibility_new_rounded, size: 14, color: _postureColor),
                    const SizedBox(width: 6),
                    Text(
                      _postureStatus,
                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),

        // Bottom Banner: Real-Time Vision Coaching Tip
        Positioned(
          bottom: 10,
          left: 10,
          right: 10,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: Colors.black.withValues(alpha: 0.75),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.white.withValues(alpha: 0.15)),
            ),
            child: Row(
              children: [
                const Icon(Icons.auto_awesome_rounded, size: 13, color: AppColors.warning),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    _coachingTips[_currentTipIndex],
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 11, color: Colors.white, fontWeight: FontWeight.w500),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
