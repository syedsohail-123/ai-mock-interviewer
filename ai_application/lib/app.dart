import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'core/network/api_client.dart';
import 'core/theme/app_theme.dart';
import 'features/cv_parser/bloc/cv_bloc.dart';
import 'features/cv_parser/presentation/screens/cv_upload_screen.dart';
import 'features/cv_parser/presentation/screens/profile_view_screen.dart';
import 'features/interview/bloc/interview_bloc.dart';
import 'features/interview/presentation/screens/interview_setup_screen.dart';
import 'features/interview/presentation/screens/interview_chamber_screen.dart';
import 'features/report/presentation/screens/report_screen.dart';

final GoRouter _router = GoRouter(
  initialLocation: '/',
  routes: [
    GoRoute(
      path: '/',
      builder: (context, state) => const CvUploadScreen(),
    ),
    GoRoute(
      path: '/profile',
      builder: (context, state) => const ProfileViewScreen(),
    ),
    GoRoute(
      path: '/interview-setup',
      builder: (context, state) => const InterviewSetupScreen(),
    ),
    GoRoute(
      path: '/interview-chamber',
      builder: (context, state) => const InterviewChamberScreen(),
    ),
    GoRoute(
      path: '/report/:sessionId',
      builder: (context, state) {
        final sessionId = state.pathParameters['sessionId'] ?? '';
        return ReportScreen(sessionId: sessionId);
      },
    ),
  ],
);

class AiInterviewApp extends StatelessWidget {
  const AiInterviewApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider<CvBloc>(
          create: (context) => CvBloc(apiClient: apiClient),
        ),
        BlocProvider<InterviewBloc>(
          create: (context) => InterviewBloc(apiClient: apiClient),
        ),
      ],
      child: MaterialApp.router(
        title: 'AI Mock Interview & CV Studio',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.darkTheme,
        routerConfig: _router,
      ),
    );
  }
}
