import 'dart:io';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:camera_platform_interface/camera_platform_interface.dart';
import 'package:camera_windows/camera_windows.dart';
import 'app.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();

  FlutterError.onError = (FlutterErrorDetails details) {
    FlutterError.presentError(details);
    debugPrint('[FlutterError] ${details.exceptionAsString()}');
  };

  PlatformDispatcher.instance.onError = (error, stack) {
    debugPrint('[PlatformDispatcher Uncaught Error] $error\n$stack');
    return true; // Prevent app exit
  };

  if (Platform.isWindows) {
    try {
      CameraPlatform.instance = CameraWindows();
    } catch (e) {
      debugPrint('CameraWindows registration note: $e');
    }
  }
  runApp(const AiInterviewApp());
}
