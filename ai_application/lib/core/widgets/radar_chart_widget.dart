import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class RadarChartWidget extends StatelessWidget {
  final Map<String, double> metrics; // Label -> Score (0-100)
  final double size;
  final Color polygonColor;

  const RadarChartWidget({
    super.key,
    required this.metrics,
    this.size = 280,
    this.polygonColor = AppColors.primary,
  });

  @override
  Widget build(BuildContext context) {
    if (metrics.isEmpty) return const SizedBox.shrink();

    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(
        painter: _RadarChartPainter(
          metrics: metrics,
          polygonColor: polygonColor,
        ),
      ),
    );
  }
}

class _RadarChartPainter extends CustomPainter {
  final Map<String, double> metrics;
  final Color polygonColor;

  _RadarChartPainter({
    required this.metrics,
    required this.polygonColor,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = math.min(size.width, size.height) * 0.38;
    final keys = metrics.keys.toList();
    final count = keys.length;
    if (count < 3) return;

    final angleStep = (math.pi * 2) / count;

    // 1. Draw web grid levels (25%, 50%, 75%, 100%)
    final gridPaint = Paint()
      ..color = Colors.white.withValues(alpha: 0.1)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.0;

    for (int level = 1; level <= 4; level++) {
      final levelRadius = radius * (level / 4.0);
      final gridPath = Path();
      for (int i = 0; i < count; i++) {
        final angle = -math.pi / 2 + (i * angleStep);
        final x = center.dx + levelRadius * math.cos(angle);
        final y = center.dy + levelRadius * math.sin(angle);
        if (i == 0) {
          gridPath.moveTo(x, y);
        } else {
          gridPath.lineTo(x, y);
        }
      }
      gridPath.close();
      canvas.drawPath(gridPath, gridPaint);
    }

    // 2. Draw axis lines from center to outer points
    final axisPaint = Paint()
      ..color = Colors.white.withValues(alpha: 0.15)
      ..strokeWidth = 1.0;

    for (int i = 0; i < count; i++) {
      final angle = -math.pi / 2 + (i * angleStep);
      final x = center.dx + radius * math.cos(angle);
      final y = center.dy + radius * math.sin(angle);
      canvas.drawLine(center, Offset(x, y), axisPaint);

      // Draw label
      final label = keys[i];
      final textPainter = TextPainter(
        text: TextSpan(
          text: label,
          style: const TextStyle(
            color: AppColors.textSecondary,
            fontSize: 11,
            fontWeight: FontWeight.w600,
          ),
        ),
        textDirection: TextDirection.ltr,
      )..layout();

      final labelRadius = radius + 22;
      final lx = center.dx + labelRadius * math.cos(angle) - (textPainter.width / 2);
      final ly = center.dy + labelRadius * math.sin(angle) - (textPainter.height / 2);
      textPainter.paint(canvas, Offset(lx, ly));
    }

    // 3. Draw filled polygon of user scores
    final dataPath = Path();
    final fillPaint = Paint()
      ..color = polygonColor.withValues(alpha: 0.25)
      ..style = PaintingStyle.fill;

    final strokePaint = Paint()
      ..color = polygonColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.5
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;

    final pointPaint = Paint()
      ..color = polygonColor
      ..style = PaintingStyle.fill;

    for (int i = 0; i < count; i++) {
      final score = (metrics[keys[i]] ?? 0.0).clamp(0.0, 100.0);
      final ratio = score / 100.0;
      final currentRadius = radius * ratio;
      final angle = -math.pi / 2 + (i * angleStep);
      final x = center.dx + currentRadius * math.cos(angle);
      final y = center.dy + currentRadius * math.sin(angle);

      if (i == 0) {
        dataPath.moveTo(x, y);
      } else {
        dataPath.lineTo(x, y);
      }
    }
    dataPath.close();

    canvas.drawPath(dataPath, fillPaint);
    canvas.drawPath(dataPath, strokePaint);

    // 4. Draw points
    for (int i = 0; i < count; i++) {
      final score = (metrics[keys[i]] ?? 0.0).clamp(0.0, 100.0);
      final ratio = score / 100.0;
      final currentRadius = radius * ratio;
      final angle = -math.pi / 2 + (i * angleStep);
      final x = center.dx + currentRadius * math.cos(angle);
      final y = center.dy + currentRadius * math.sin(angle);
      canvas.drawCircle(Offset(x, y), 4.5, pointPaint);
    }
  }

  @override
  bool shouldRepaint(covariant _RadarChartPainter oldDelegate) {
    return oldDelegate.metrics != metrics || oldDelegate.polygonColor != polygonColor;
  }
}
