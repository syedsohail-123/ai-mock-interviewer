import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:file_picker/file_picker.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_theme.dart';
import '../../bloc/cv_bloc.dart';
import '../../bloc/cv_event.dart';
import '../../bloc/cv_state.dart';
import '../../data/models/candidate_profile_model.dart';
import '../../../interview/bloc/interview_bloc.dart';
import '../../../interview/bloc/interview_event.dart';
import '../../../interview/data/models/interview_models.dart';

class CvUploadScreen extends StatefulWidget {
  const CvUploadScreen({super.key});

  @override
  State<CvUploadScreen> createState() => _CvUploadScreenState();
}

class _CvUploadScreenState extends State<CvUploadScreen> {
  bool _isHovering = false;
  bool _isConnecting = false;
  bool _showJdMatcher = false;
  final TextEditingController _keyController = TextEditingController();
  final TextEditingController _jdController = TextEditingController();
  double _atsMatchScore = 0.0;
  List<String> _matchedKeywords = [];
  List<String> _missingKeywords = [];

  void _analyzeJobDescription(String jdText) {
    if (jdText.trim().isEmpty) {
      setState(() {
        _atsMatchScore = 0.0;
        _matchedKeywords = [];
        _missingKeywords = [];
      });
      return;
    }

    final commonSkills = [
      'flutter', 'dart', 'python', 'fastapi', 'go', 'golang', 'docker', 'kubernetes',
      'redis', 'postgresql', 'mysql', 'aws', 'grpc', 'rest', 'kafka', 'ci/cd', 'git',
      'microservices', 'distributed systems', 'system design', 'machine learning', 'sql'
    ];

    final jdLower = jdText.toLowerCase();
    final requiredSkills = commonSkills.where((s) => jdLower.contains(s)).toList();
    
    // Sample matched profile baseline skills for preview
    final candidateSkills = ['python', 'fastapi', 'go', 'redis', 'postgresql', 'docker', 'kubernetes', 'kafka', 'grpc', 'flutter'];
    
    final matched = <String>[];
    final missing = <String>[];

    for (final skill in requiredSkills) {
      if (candidateSkills.contains(skill)) {
        matched.add(skill);
      } else {
        missing.add(skill);
      }
    }

    final score = requiredSkills.isNotEmpty
        ? (matched.length / requiredSkills.length) * 100
        : 75.0;

    setState(() {
      _atsMatchScore = score;
      _matchedKeywords = matched;
      _missingKeywords = missing;
    });
  }

  @override
  void dispose() {
    _keyController.dispose();
    _jdController.dispose();
    super.dispose();
  }

  Future<void> _pickCvFile() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['pdf', 'docx', 'doc', 'txt'],
    );

    if (result != null && result.files.single.path != null && mounted) {
      final file = result.files.single;
      context.read<CvBloc>().add(
            UploadCvFileEvent(filePath: file.path!, fileName: file.name),
          );
    }
  }

  void _connectWithKey() {
    final key = _keyController.text.trim();
    if (key.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please enter an Interview Access Key (e.g. INT-8492)'),
          backgroundColor: AppColors.warning,
        ),
      );
      return;
    }

    setState(() => _isConnecting = true);
    context.read<CvBloc>().add(ConnectWithAccessKeyEvent(key));
  }

  void _loadSampleCandidateProfile() {
    const sampleProfile = CandidateProfile(
      id: 'demo-sample-id',
      personalInfo: PersonalInfo(
        name: 'Jordan Vance',
        email: 'jordan.vance@example.com',
        phone: '+1 (555) 234-8921',
        location: 'San Francisco, CA (Remote)',
        linkedin: 'linkedin.com/in/jordanvance',
        github: 'github.com/jordanvance',
      ),
      summary:
          'Senior Backend & Distributed Systems Engineer with 6+ years designing high-throughput microservices in Go, Python (FastAPI), Redis, and Kubernetes. Passionate about real-time streaming architectures and database optimization.',
      skills: [
        'Python',
        'FastAPI',
        'Go',
        'Redis',
        'PostgreSQL',
        'Docker',
        'Kubernetes',
        'Kafka',
        'gRPC',
        'Flutter',
      ],
      experience: [
        ExperienceItem(
          role: 'Senior Backend Engineer',
          company: 'CloudStream Systems',
          duration: '2022 - Present',
          description:
              'Architected high-throughput message processing engine scaling to 40k events/sec. Reduced 99th percentile query latency by 45% via distributed Redis caching.',
          technologies: ['FastAPI', 'Kafka', 'Redis', 'PostgreSQL'],
        ),
        ExperienceItem(
          role: 'Software Engineer',
          company: 'Nexus Digital',
          duration: '2019 - 2022',
          description:
              'Built resilient REST and gRPC microservices and automated CI/CD deployment pipelines on AWS Kubernetes (EKS).',
          technologies: ['Python', 'Docker', 'AWS', 'MySQL'],
        ),
      ],
      education: [
        EducationItem(
          degree: 'B.S. in Computer Science',
          institution: 'University of California, Berkeley',
          year: '2019',
        ),
      ],
      projects: [
        ProjectItem(
          title: 'Distributed In-Memory Cache with Raft Consensus',
          description:
              'Built a fault-tolerant key-value store with leader election and log replication.',
          technologies: ['Go', 'Raft', 'gRPC'],
        ),
        ProjectItem(
          title: 'Real-Time Financial Telemetry Aggregator',
          description:
              'WebSocket streaming backend for low-latency market order book processing.',
          technologies: ['FastAPI', 'Redis', 'TimescaleDB'],
        ),
      ],
      certifications: ['AWS Certified Solutions Architect', 'CKA: Certified Kubernetes Administrator'],
    );

    context.read<CvBloc>().add(const UpdateCandidateProfileEvent(sampleProfile));
    context.push('/profile');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: BlocConsumer<CvBloc, CvState>(
        listener: (context, state) {
          if (state is CvConnectedAndStartInterviewState) {
            try {
              context.read<CvBloc>().add(UpdateCandidateProfileEvent(state.profile));
              final session = InterviewSessionModel.fromJson(state.sessionJson);
              context.read<InterviewBloc>().add(
                SetActiveSessionEvent(
                  session: session,
                  audioBase64: state.audioBase64,
                ),
              );
              context.go('/interview-chamber');
            } catch (e) {
              // Fallback to profile view if parsing session fails
              if (mounted) setState(() => _isConnecting = false);
              context.go('/profile');
            }
          } else if (state is CvParsedSuccessState) {
            if (mounted) setState(() => _isConnecting = false);
            context.go('/profile');
          } else if (state is CvParsingErrorState) {
            if (mounted) setState(() => _isConnecting = false);
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.errorMessage),
                backgroundColor: AppColors.danger,
              ),
            );
          }
        },
        builder: (context, state) {
          return Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(28),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 750),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    // Header Logo
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppColors.primary.withValues(alpha: 0.2)),
                      ),
                      child: const Icon(
                        Icons.smart_toy_rounded,
                        size: 44,
                        color: AppColors.primary,
                      ),
                    ),
                    const SizedBox(height: 18),
                    const Text(
                      'AI Mock Interview Chamber',
                      style: TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.bold,
                        letterSpacing: -0.5,
                      ),
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      'Attend your personalized AI interview via Web Key or by uploading your CV directly.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 15,
                      ),
                    ),
                    const SizedBox(height: 30),

                    if (state is CvParsingLoadingState)
                      Container(
                        padding: const EdgeInsets.all(40),
                        decoration: BoxDecoration(
                          color: AppColors.surface,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: AppColors.border),
                        ),
                        child: Column(
                          children: [
                            const CircularProgressIndicator(color: AppColors.primary),
                            const SizedBox(height: 20),
                            Text(
                              state.statusMessage,
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                      )
                    else ...[
                      // Option 1: Connect with Web Access Key
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: AppColors.surface,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(6),
                                  decoration: BoxDecoration(
                                    color: AppColors.primary.withValues(alpha: 0.15),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: const Icon(
                                    Icons.vpn_key_rounded,
                                    size: 18,
                                    color: AppColors.primary,
                                  ),
                                ),
                                const SizedBox(width: 10),
                                const Text(
                                  'Option 1: Connect with Web Resume Key',
                                  style: TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 6),
                            const Text(
                              'Enter the Access Key generated from your ATS Resume Builder web app.',
                              style: TextStyle(
                                color: AppColors.textSecondary,
                                fontSize: 13,
                              ),
                            ),
                            const SizedBox(height: 14),
                            Row(
                              children: [
                                Expanded(
                                  child: TextField(
                                    controller: _keyController,
                                    textCapitalization: TextCapitalization.characters,
                                    decoration: InputDecoration(
                                      hintText: 'e.g. INT-8492-BJ',
                                      prefixIcon: const Icon(Icons.key, size: 18),
                                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                                      border: OutlineInputBorder(
                                        borderRadius: BorderRadius.circular(10),
                                      ),
                                    ),
                                    onSubmitted: (_) => _connectWithKey(),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                ElevatedButton(
                                  onPressed: _isConnecting ? null : _connectWithKey,
                                  style: ElevatedButton.styleFrom(
                                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(10),
                                    ),
                                  ),
                                  child: _isConnecting
                                      ? const Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            SizedBox(
                                              width: 16,
                                              height: 16,
                                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                            ),
                                            SizedBox(width: 8),
                                            Text('Connecting...'),
                                          ],
                                        )
                                      : const Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            Icon(Icons.arrow_forward, size: 18),
                                            SizedBox(width: 6),
                                            Text('Connect & Start'),
                                          ],
                                        ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 20),

                      // Divider / "OR"
                      Row(
                        children: [
                          const Expanded(child: Divider(color: AppColors.border)),
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            child: Text(
                              'OR',
                              style: TextStyle(
                                color: AppColors.textMuted,
                                fontWeight: FontWeight.bold,
                                fontSize: 12,
                              ),
                            ),
                          ),
                          const Expanded(child: Divider(color: AppColors.border)),
                        ],
                      ),

                      const SizedBox(height: 20),

                      // Option 2: Upload File Box
                      MouseRegion(
                        onEnter: (_) => setState(() => _isHovering = true),
                        onExit: (_) => setState(() => _isHovering = false),
                        child: GestureDetector(
                          onTap: _pickCvFile,
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 200),
                            width: double.infinity,
                            padding: const EdgeInsets.symmetric(vertical: 36, horizontal: 24),
                            decoration: BoxDecoration(
                              color: _isHovering
                                  ? AppColors.surfaceLight.withValues(alpha: 0.4)
                                  : AppColors.surface,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(
                                color: _isHovering ? AppColors.primary : AppColors.border,
                                width: _isHovering ? 1.5 : 1.0,
                              ),
                            ),
                            child: Column(
                              children: [
                                Icon(
                                  Icons.cloud_upload_outlined,
                                  size: 46,
                                  color: _isHovering ? AppColors.primary : AppColors.textSecondary,
                                ),
                                const SizedBox(height: 12),
                                const Text(
                                  'Option 2: Upload Resume (PDF / DOCX)',
                                  style: TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                const Text(
                                  'Select a CV file from your device (up to 10MB)',
                                  style: TextStyle(
                                    color: AppColors.textMuted,
                                    fontSize: 13,
                                  ),
                                ),
                                const SizedBox(height: 18),
                                ElevatedButton.icon(
                                  onPressed: _pickCvFile,
                                  icon: const Icon(Icons.folder_open, size: 18),
                                  label: const Text('Browse Device Files'),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),

                      const SizedBox(height: 20),

                      // Optional Target Job Description (JD) & ATS Keyword Matcher Card
                      Container(
                        width: double.infinity,
                        decoration: BoxDecoration(
                          color: AppColors.surface,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: AppColors.border),
                        ),
                        child: Column(
                          children: [
                            InkWell(
                              borderRadius: BorderRadius.circular(16),
                              onTap: () => setState(() => _showJdMatcher = !_showJdMatcher),
                              child: Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                                child: Row(
                                  children: [
                                    const Icon(Icons.track_changes_rounded, color: AppColors.warning, size: 20),
                                    const SizedBox(width: 10),
                                    const Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            'Target Job Description & ATS Keyword Matcher (Optional)',
                                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                          ),
                                          Text(
                                            'Paste a target job posting to analyze keyword alignment before starting.',
                                            style: TextStyle(color: AppColors.textMuted, fontSize: 12),
                                          ),
                                        ],
                                      ),
                                    ),
                                    Icon(
                                      _showJdMatcher ? Icons.expand_less_rounded : Icons.expand_more_rounded,
                                      color: AppColors.textMuted,
                                    ),
                                  ],
                                ),
                              ),
                            ),
                            if (_showJdMatcher)
                              Padding(
                                padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Divider(color: AppColors.border, height: 1),
                                    const SizedBox(height: 16),
                                    TextField(
                                      controller: _jdController,
                                      maxLines: 4,
                                      onChanged: _analyzeJobDescription,
                                      decoration: InputDecoration(
                                        hintText: 'Paste Job Description text here (e.g. Senior Backend Engineer with Go, FastAPI, Kubernetes, Redis, Docker)...',
                                        hintStyle: const TextStyle(color: AppColors.textMuted, fontSize: 13),
                                        border: OutlineInputBorder(
                                          borderRadius: BorderRadius.circular(8),
                                        ),
                                        filled: true,
                                        fillColor: AppColors.background,
                                      ),
                                    ),
                                    if (_atsMatchScore > 0) ...[
                                      const SizedBox(height: 14),
                                      Row(
                                        children: [
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                            decoration: BoxDecoration(
                                              color: AppColors.primary.withValues(alpha: 0.15),
                                              borderRadius: BorderRadius.circular(6),
                                              border: Border.all(color: AppColors.primary),
                                            ),
                                            child: Text(
                                              'ATS Keyword Match: ${_atsMatchScore.toInt()}%',
                                              style: const TextStyle(
                                                color: AppColors.primary,
                                                fontWeight: FontWeight.bold,
                                                fontSize: 12,
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                      if (_matchedKeywords.isNotEmpty) ...[
                                        const SizedBox(height: 8),
                                        Wrap(
                                          spacing: 6,
                                          runSpacing: 6,
                                          children: _matchedKeywords.map((kw) {
                                            return Chip(
                                              backgroundColor: AppColors.success.withValues(alpha: 0.15),
                                              label: Text('✓ $kw', style: const TextStyle(color: AppColors.success, fontSize: 11)),
                                              visualDensity: VisualDensity.compact,
                                            );
                                          }).toList(),
                                        ),
                                      ],
                                      if (_missingKeywords.isNotEmpty) ...[
                                        const SizedBox(height: 8),
                                        Wrap(
                                          spacing: 6,
                                          runSpacing: 6,
                                          children: _missingKeywords.map((kw) {
                                            return Chip(
                                              backgroundColor: AppColors.danger.withValues(alpha: 0.15),
                                              label: Text('✗ Missing: $kw', style: const TextStyle(color: AppColors.danger, fontSize: 11)),
                                              visualDensity: VisualDensity.compact,
                                            );
                                          }).toList(),
                                        ),
                                      ],
                                    ],
                                  ],
                                ),
                              ),
                          ],
                        ),
                      ),
                    ],

                    const SizedBox(height: 24),
                    // Quick Demo / Sample Profile button
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Text(
                          'Want to test immediately? ',
                          style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
                        ),
                        TextButton.icon(
                          onPressed: _loadSampleCandidateProfile,
                          icon: const Icon(Icons.bolt, color: AppColors.warning, size: 16),
                          label: const Text(
                            'Load Demo Candidate Profile',
                            style: TextStyle(
                              color: AppColors.primary,
                              fontWeight: FontWeight.w600,
                              fontSize: 13,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
