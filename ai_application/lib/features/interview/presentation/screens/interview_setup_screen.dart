import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:camera/camera.dart';
import '../../../../core/widgets/device_selector_modal.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../cv_parser/bloc/cv_bloc.dart';
import '../../../cv_parser/bloc/cv_state.dart';
import '../../bloc/interview_bloc.dart';
import '../../bloc/interview_event.dart';
import '../../bloc/interview_state.dart';
import '../../data/models/interview_models.dart';

class InterviewSetupScreen extends StatefulWidget {
  const InterviewSetupScreen({super.key});

  @override
  State<InterviewSetupScreen> createState() => _InterviewSetupScreenState();
}

class _InterviewSetupScreenState extends State<InterviewSetupScreen> {
  final _roleController = TextEditingController(text: 'Senior Backend Engineer');
  final _skillInputController = TextEditingController();
  
  String _experienceLevel = 'Senior (5+ yrs)';
  String _difficulty = 'Intermediate';
  String _interviewType = 'Mixed';
  int _maxQuestions = 5;

  final Set<String> _selectedSkills = {
    'Python',
    'FastAPI',
    'PostgreSQL',
    'Redis',
    'Kafka',
    'Docker',
    'Kubernetes',
    'System Design'
  };

  static final Map<String, List<String>> _roleSkillPresets = {
    'Senior Backend Engineer': [
      'Python',
      'FastAPI',
      'Go',
      'PostgreSQL',
      'Redis',
      'Kafka',
      'Docker',
      'Kubernetes',
      'gRPC',
      'System Design',
      'Microservices',
    ],
    'Full-Stack Engineer': [
      'React',
      'TypeScript',
      'Node.js',
      'Next.js',
      'TailwindCSS',
      'PostgreSQL',
      'REST APIs',
      'GraphQL',
      'Docker',
      'State Management',
    ],
    'Distributed Systems Engineer': [
      'Go',
      'Rust',
      'Kafka',
      'Cassandra',
      'Raft/Paxos',
      'gRPC',
      'Distributed Caching',
      'Kubernetes',
      'High Concurrency',
      'Fault Tolerance',
    ],
    'Machine Learning / AI Engineer': [
      'PyTorch',
      'TensorFlow',
      'LLMs',
      'RAG',
      'LangChain',
      'FastAPI',
      'Python',
      'Vector DBs',
      'Embeddings',
      'MLOps',
    ],
    'DevOps & Cloud Architect': [
      'AWS',
      'Terraform',
      'Kubernetes',
      'CI/CD',
      'Docker',
      'Linux',
      'Prometheus',
      'Grafana',
      'Ansible',
      'Cloud Architecture',
    ],
    'Mobile Engineer (Flutter/iOS/Android)': [
      'Flutter',
      'Dart',
      'iOS (Swift)',
      'Android (Kotlin)',
      'Bloc / State Management',
      'REST APIs',
      'Clean Architecture',
      'Firebase',
      'App Performance',
    ],
  };

  final List<String> _roleSuggestions = [
    'Senior Backend Engineer',
    'Full-Stack Engineer',
    'Distributed Systems Engineer',
    'Machine Learning / AI Engineer',
    'DevOps & Cloud Architect',
    'Mobile Engineer (Flutter/iOS/Android)',
  ];

  final List<String> _experienceLevels = [
    'Junior (1-2 yrs)',
    'Mid-Level (3-5 yrs)',
    'Senior (5+ yrs)',
    'Staff / Principal Engineer',
  ];

  final List<String> _difficulties = ['Beginner', 'Intermediate', 'Advanced'];
  final List<String> _interviewTypes = [
    'Mixed',
    'Technical',
    'Behavioral',
    'Project Deep Dive',
  ];

  @override
  void initState() {
    super.initState();
    // Load skills from CV if available
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final cvState = context.read<CvBloc>().state;
      if (cvState is CvParsedSuccessState && cvState.profile.skills.isNotEmpty) {
        setState(() {
          _selectedSkills.addAll(cvState.profile.skills);
        });
      }
    });
  }

  @override
  void dispose() {
    _roleController.dispose();
    _skillInputController.dispose();
    super.dispose();
  }

  void _onRoleSelected(String role) {
    setState(() {
      _roleController.text = role;
      if (_roleSkillPresets.containsKey(role)) {
        _selectedSkills.clear();
        _selectedSkills.addAll(_roleSkillPresets[role]!);
      }
    });
  }

  void _addCustomSkill() {
    final skill = _skillInputController.text.trim();
    if (skill.isNotEmpty) {
      setState(() {
        _selectedSkills.add(skill);
        _skillInputController.clear();
      });
    }
  }

  bool _hasNavigated = false;

  void _startInterview() {
    _hasNavigated = false;
    final cvState = context.read<CvBloc>().state;
    if (cvState is! CvParsedSuccessState) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please upload or load a candidate CV first.')),
      );
      return;
    }

    final selectedRole = _roleController.text.trim().isEmpty
        ? 'Software Engineer'
        : _roleController.text.trim();

    final updatedProfile = cvState.profile.copyWith(
      skills: _selectedSkills.toList(),
    );

    final config = InterviewConfig(
      targetRole: selectedRole,
      experienceLevel: _experienceLevel,
      difficulty: _difficulty,
      interviewType: _interviewType,
      maxQuestions: _maxQuestions,
    );

    context.read<InterviewBloc>().add(
          CreateAndStartSessionEvent(
            profile: updatedProfile,
            config: config,
          ),
        );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          tooltip: 'Back to Profile',
          onPressed: () {
            if (context.canPop()) {
              context.pop();
            } else {
              context.go('/profile');
            }
          },
        ),
        title: const Text(
          'Interview Configuration',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings_rounded, color: AppColors.primary),
            tooltip: 'Camera & Microphone Hardware Test',
            onPressed: () async {
              final cams = await availableCameras();
              if (context.mounted) {
                showDialog(
                  context: context,
                  builder: (ctx) => DeviceSelectorModal(
                    availableCameras: cams,
                    selectedCameraIndex: 0,
                    onCameraSelected: (_) {},
                  ),
                );
              }
            },
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: BlocConsumer<InterviewBloc, InterviewState>(
        listener: (context, state) {
          if (state is InterviewActiveState && !_hasNavigated) {
            _hasNavigated = true;
            context.go('/interview-chamber');
          } else if (state is InterviewErrorState) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.errorMessage),
                backgroundColor: AppColors.danger,
              ),
            );
          }
        },
        builder: (context, state) {
          if (state is InterviewLoadingState) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const CircularProgressIndicator(color: AppColors.primary),
                  const SizedBox(height: 20),
                  Text(
                    state.message,
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w500),
                  ),
                ],
              ),
            );
          }

          return Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 24),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 780),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Target Job Role & Parameters',
                      style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      'Tailor the AI interviewer to probe specific competencies, technologies, and difficulty depth.',
                      style: TextStyle(color: AppColors.textSecondary, fontSize: 14),
                    ),
                    const SizedBox(height: 28),

                    // Target Role Input & Suggestions
                    _buildLabel('Target Job Role'),
                    TextField(
                      controller: _roleController,
                      onChanged: (text) {
                        for (final key in _roleSkillPresets.keys) {
                          if (text.toLowerCase().contains(key.toLowerCase().split(' ').first)) {
                            setState(() {
                              _selectedSkills.addAll(_roleSkillPresets[key]!.take(4));
                            });
                            break;
                          }
                        }
                      },
                      decoration: const InputDecoration(
                        hintText: 'e.g. Senior Backend Engineer (Python / Go)',
                        prefixIcon: Icon(Icons.badge_outlined, color: AppColors.primary),
                      ),
                    ),
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: _roleSuggestions.map((role) {
                        final isSelected = _roleController.text == role;
                        return ChoiceChip(
                          label: Text(role, style: TextStyle(fontSize: 12, color: isSelected ? Colors.black : Colors.white)),
                          selected: isSelected,
                          selectedColor: AppColors.primary,
                          backgroundColor: AppColors.surfaceLight,
                          onSelected: (_) => _onRoleSelected(role),
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 24),

                    // DYNAMIC TARGET TECH STACK & SKILLS
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        _buildLabel('Target Tech Stack & Skills (${_selectedSkills.length} active)'),
                        TextButton.icon(
                          onPressed: () {
                            setState(() {
                              _selectedSkills.clear();
                            });
                          },
                          icon: const Icon(Icons.clear_all, size: 16),
                          label: const Text('Clear Skills', style: TextStyle(fontSize: 12)),
                        ),
                      ],
                    ),
                    const Text(
                      'AI interviewer will formulate technical questions, architecture deep-dives, and trade-offs around these exact skills.',
                      style: TextStyle(color: AppColors.textMuted, fontSize: 12),
                    ),
                    const SizedBox(height: 10),

                    // Skills Tags Wrap
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: _selectedSkills.map((skill) {
                              return Chip(
                                label: Text(
                                  skill,
                                  style: const TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                    color: Colors.black,
                                  ),
                                ),
                                backgroundColor: AppColors.primary,
                                deleteIcon: const Icon(Icons.close, size: 14, color: Colors.black),
                                onDeleted: () {
                                  setState(() {
                                    _selectedSkills.remove(skill);
                                  });
                                },
                              );
                            }).toList(),
                          ),
                          const SizedBox(height: 12),
                          // Custom Skill Adder Field
                          Row(
                            children: [
                              Expanded(
                                child: TextField(
                                  controller: _skillInputController,
                                  textInputAction: TextInputAction.done,
                                  onSubmitted: (_) => _addCustomSkill(),
                                  decoration: const InputDecoration(
                                    hintText: 'Add custom technology or skill (e.g. AWS, Redis, GraphQL)...',
                                    hintStyle: TextStyle(fontSize: 12),
                                    isDense: true,
                                    fillColor: AppColors.background,
                                    contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 8),
                              IconButton.filled(
                                onPressed: _addCustomSkill,
                                style: IconButton.styleFrom(
                                  backgroundColor: AppColors.primary,
                                  padding: const EdgeInsets.all(10),
                                ),
                                icon: const Icon(Icons.add, color: Colors.black, size: 20),
                                tooltip: 'Add Skill',
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Experience Level
                    _buildLabel('Experience Level'),
                    DropdownButtonFormField<String>(
                      initialValue: _experienceLevel,
                      decoration: const InputDecoration(
                        prefixIcon: Icon(Icons.timeline_rounded, color: AppColors.secondary),
                      ),
                      items: _experienceLevels
                          .map((lvl) => DropdownMenuItem(value: lvl, child: Text(lvl)))
                          .toList(),
                      onChanged: (val) => setState(() => _experienceLevel = val!),
                    ),
                    const SizedBox(height: 24),

                    // Two columns: Difficulty & Interview Type
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _buildLabel('Difficulty'),
                              DropdownButtonFormField<String>(
                                initialValue: _difficulty,
                                decoration: const InputDecoration(
                                  prefixIcon: Icon(Icons.speed_rounded, color: AppColors.warning),
                                ),
                                items: _difficulties
                                    .map((d) => DropdownMenuItem(value: d, child: Text(d)))
                                    .toList(),
                                onChanged: (val) => setState(() => _difficulty = val!),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _buildLabel('Interview Focus'),
                              DropdownButtonFormField<String>(
                                initialValue: _interviewType,
                                decoration: const InputDecoration(
                                  prefixIcon: Icon(Icons.category_outlined, color: AppColors.success),
                                ),
                                items: _interviewTypes
                                    .map((t) => DropdownMenuItem(value: t, child: Text(t)))
                                    .toList(),
                                onChanged: (val) => setState(() => _interviewType = val!),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),

                    // Max Questions Slider
                    _buildLabel('Number of Questions: $_maxQuestions'),
                    SliderTheme(
                      data: SliderTheme.of(context).copyWith(
                        activeTrackColor: AppColors.primary,
                        thumbColor: AppColors.primary,
                      ),
                      child: Slider(
                        value: _maxQuestions.toDouble(),
                        min: 3,
                        max: 8,
                        divisions: 5,
                        label: '$_maxQuestions questions',
                        onChanged: (v) => setState(() => _maxQuestions = v.round()),
                      ),
                    ),
                    const SizedBox(height: 36),

                    // Start Interview Action Button
                    SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: ElevatedButton.icon(
                        onPressed: _startInterview,
                        icon: const Icon(Icons.mic_none_rounded, color: Colors.black),
                        label: const Text(
                          'Enter Interview Chamber',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                      ),
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

  Widget _buildLabel(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(
        text,
        style: const TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w600,
          color: AppColors.textPrimary,
        ),
      ),
    );
  }
}
