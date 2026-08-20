import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class AudioWaveformWidget extends StatefulWidget {
  final bool isRecording;
  final bool isAiSpeaking;
  final Color? activeColor;
  final double height;

  const AudioWaveformWidget({
    super.key,
    required this.isRecording,
    required this.isAiSpeaking,
    this.activeColor,
    this.height = 36,
  });

  @override
  State<AudioWaveformWidget> createState() => _AudioWaveformWidgetState();
}

class _AudioWaveformWidgetState extends State<AudioWaveformWidget>
    with SingleTickerProviderStateMixin {
  late AnimationController _animController;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    )..repeat();
  }

  @override
  void dispose() {
    _animController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isActive = widget.isRecording || widget.isAiSpeaking;
    final color = widget.activeColor ??
        (widget.isRecording ? AppColors.danger : AppColors.primary);

    return SizedBox(
      height: widget.height,
      child: AnimatedBuilder(
        animation: _animController,
        builder: (context, child) {
          return CustomPaint(
            painter: _WaveformPainter(
              progress: _animController.value,
              isActive: isActive,
              barColor: color,
              barCount: 26,
            ),
            size: Size.infinite,
          );
        },
      ),
    );
  }
}

class _WaveformPainter extends CustomPainter {
  final double progress;
  final bool isActive;
  final Color barColor;
  final int barCount;

  _WaveformPainter({
    required this.progress,
    required this.isActive,
    required this.barColor,
    required this.barCount,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = isActive ? barColor : barColor.withValues(alpha: 0.25)
      ..strokeCap = StrokeCap.round
      ..style = PaintingStyle.fill;

    final barWidth = size.width / (barCount * 2);
    final midY = size.height / 2;

    for (int i = 0; i < barCount; i++) {
      final x = i * (barWidth * 2) + barWidth / 2;
      double barHeight;

      if (isActive) {
        final factor = math.sin((i / barCount) * math.pi * 2 + (progress * math.pi * 2));
        final factor2 = math.cos((i / barCount) * math.pi * 3 - (progress * math.pi * 2));
        final normalized = ((factor + factor2 + 2) / 4).clamp(0.15, 1.0);
        barHeight = (size.height * 0.85) * normalized;
      } else {
        barHeight = size.height * 0.15;
      }

      final top = midY - (barHeight / 2);
      final rect = RRect.fromRectAndRadius(
        Rect.fromLTWH(x, top, barWidth, barHeight),
        Radius.circular(barWidth / 2),
      );
      canvas.drawRRect(rect, paint);
    }
  }

  @override
  bool shouldRepaint(covariant _WaveformPainter oldDelegate) {
    return oldDelegate.progress != progress ||
        oldDelegate.isActive != isActive ||
        oldDelegate.barColor != barColor;
  }
}
