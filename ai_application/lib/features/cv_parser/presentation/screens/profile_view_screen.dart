import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/code_sandbox_widget.dart';
import '../../bloc/cv_bloc.dart';
import '../../bloc/cv_event.dart';
import '../../bloc/cv_state.dart';
import '../../data/models/candidate_profile_model.dart';

class ProfileViewScreen extends StatefulWidget {
  const ProfileViewScreen({super.key});

  @override
  State<ProfileViewScreen> createState() => _ProfileViewScreenState();
}

class _ProfileViewScreenState extends State<ProfileViewScreen> {
  bool _showCodingSandbox = false;
  final ScrollController _scrollController = ScrollController();

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _toggleCodingSandbox() {
    setState(() {
      _showCodingSandbox = !_showCodingSandbox;
    });
    if (_showCodingSandbox) {
      Future.delayed(const Duration(milliseconds: 100), () {
        if (_scrollController.hasClients) {
          _scrollController.animateTo(
            350.0,
            duration: const Duration(milliseconds: 400),
            curve: Curves.easeInOut,
          );
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          tooltip: 'Back to CV Upload',
          onPressed: () {
            context.read<CvBloc>().add(ResetCvEvent());
            if (context.canPop()) {
              context.pop();
            } else {
              context.go('/');
            }
          },
        ),
        title: const Text(
          'Candidate Profile & Technical Hub',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        actions: [
          // Coding Sandbox Toggle Button
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: OutlinedButton.icon(
              onPressed: _toggleCodingSandbox,
              icon: Icon(
                _showCodingSandbox ? Icons.visibility_off_rounded : Icons.code_rounded,
                color: _showCodingSandbox ? AppColors.success : AppColors.primary,
                size: 18,
              ),
              label: Text(
                _showCodingSandbox ? 'Hide Coding Sandbox' : 'Practice Coding (IDE)',
                style: TextStyle(
                  color: _showCodingSandbox ? AppColors.success : AppColors.primary,
                  fontWeight: FontWeight.w600,
                  fontSize: 13,
                ),
              ),
              style: OutlinedButton.styleFrom(
                side: BorderSide(color: _showCodingSandbox ? AppColors.success : AppColors.primary),
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              ),
            ),
          ),

          // Start / Configure Interview
          Padding(
            padding: const EdgeInsets.only(right: 20),
            child: ElevatedButton.icon(
              onPressed: () => context.push('/interview-setup'),
              icon: const Icon(Icons.play_arrow_rounded, color: Colors.black),
              label: const Text('Configure Interview'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
              ),
            ),
          ),
        ],
      ),
      body: BlocBuilder<CvBloc, CvState>(
        builder: (context, state) {
          if (state is! CvParsedSuccessState) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text('No candidate profile loaded.'),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () => context.go('/'),
                    child: const Text('Go to Upload'),
                  ),
                ],
              ),
            );
          }

          final profile = state.profile;
          return SingleChildScrollView(
            controller: _scrollController,
            padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 24),
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 1000),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Header card
                    _buildHeaderCard(profile.personalInfo),
                    const SizedBox(height: 24),

                    // Interactive Coding Sandbox on Resume Page
                    if (_showCodingSandbox) ...[
                      _buildSectionTitle(Icons.terminal_rounded, 'Interactive Technical Coding Sandbox'),
                      const SizedBox(height: 10),
                      Container(
                        height: 480,
                        margin: const EdgeInsets.only(bottom: 28),
                        child: CodeSandboxWidget(
                          onClose: () => setState(() => _showCodingSandbox = false),
                        ),
                      ),
                    ],

                    // Summary
                    if (profile.summary.isNotEmpty) ...[
                      _buildSectionTitle(Icons.person_pin_rounded, 'Professional Summary'),
                      _buildInfoCard(Text(
                        profile.summary,
                        style: const TextStyle(
                          fontSize: 15,
                          height: 1.5,
                          color: AppColors.textSecondary,
                        ),
                      )),
                      const SizedBox(height: 24),
                    ],

                    // Skills
                    _buildSectionTitle(Icons.psychology_rounded, 'Extracted Skills & Competencies'),
                    _buildSkillsCard(profile.skills),
                    const SizedBox(height: 24),

                    // Experience
                    _buildSectionTitle(Icons.work_outline_rounded, 'Work Experience'),
                    _buildExperienceList(profile.experience),
                    const SizedBox(height: 24),

                    // Projects
                    if (profile.projects.isNotEmpty) ...[
                      _buildSectionTitle(Icons.rocket_launch_outlined, 'Featured Projects'),
                      _buildProjectsList(profile.projects),
                      const SizedBox(height: 24),
                    ],

                    // Education & Certifications
                    _buildSectionTitle(Icons.school_outlined, 'Education & Certifications'),
                    _buildEducationAndCerts(profile.education, profile.certifications),
                    const SizedBox(height: 40),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildHeaderCard(PersonalInfo info) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CircleAvatar(
            radius: 36,
            backgroundColor: AppColors.primary.withValues(alpha: 0.15),
            child: Text(
              info.name.isNotEmpty ? info.name[0].toUpperCase() : 'U',
              style: const TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.bold,
                color: AppColors.primary,
              ),
            ),
          ),
          const SizedBox(width: 24),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  info.name.isNotEmpty ? info.name : 'Unknown Candidate',
                  style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 16,
                  runSpacing: 8,
                  children: [
                    if (info.email != null && info.email!.isNotEmpty)
                      _buildContactItem(Icons.email_outlined, info.email!),
                    if (info.phone != null && info.phone!.isNotEmpty)
                      _buildContactItem(Icons.phone_outlined, info.phone!),
                    if (info.location != null && info.location!.isNotEmpty)
                      _buildContactItem(Icons.location_on_outlined, info.location!),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildContactItem(IconData icon, String text) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 16, color: AppColors.textMuted),
        const SizedBox(width: 6),
        Text(
          text,
          style: const TextStyle(
            fontSize: 13,
            color: AppColors.textSecondary,
          ),
        ),
      ],
    );
  }

  Widget _buildSectionTitle(IconData icon, String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Icon(icon, size: 20, color: AppColors.primary),
          const SizedBox(width: 8),
          Text(
            title,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: AppColors.textPrimary,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoCard(Widget child) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: child,
    );
  }

  Widget _buildSkillsCard(List<String> skills) {
    return _buildInfoCard(
      Wrap(
        spacing: 8,
        runSpacing: 8,
        children: skills.map((skill) {
          return Chip(
            label: Text(
              skill,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w500,
                color: AppColors.primary,
              ),
            ),
            backgroundColor: AppColors.primary.withValues(alpha: 0.1),
            side: BorderSide(color: AppColors.primary.withValues(alpha: 0.2)),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildExperienceList(List<ExperienceItem> experience) {
    return Column(
      children: experience.map((exp) {
        return Container(
          margin: const EdgeInsets.only(bottom: 16),
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.border),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      exp.role,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textPrimary,
                      ),
                    ),
                  ),
                  Text(
                    exp.duration ?? '',
                    style: const TextStyle(
                      fontSize: 13,
                      color: AppColors.textMuted,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Text(
                exp.company,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: AppColors.secondary,
                ),
              ),
              if (exp.description != null && exp.description!.isNotEmpty) ...[
                const SizedBox(height: 10),
                Text(
                  exp.description!,
                  style: const TextStyle(
                    fontSize: 14,
                    color: AppColors.textSecondary,
                    height: 1.4,
                  ),
                ),
              ],
              if (exp.technologies.isNotEmpty) ...[
                const SizedBox(height: 12),
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: exp.technologies.map((tech) {
                    return Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppColors.surfaceLight,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        tech,
                        style: const TextStyle(
                          fontSize: 11,
                          color: AppColors.textMuted,
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ],
            ],
          ),
        );
      }).toList(),
    );
  }

  Widget _buildProjectsList(List<ProjectItem> projects) {
    return Column(
      children: projects.map((proj) {
        return Container(
          margin: const EdgeInsets.only(bottom: 16),
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.border),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                proj.title,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary,
                ),
              ),
              if (proj.description != null && proj.description!.isNotEmpty) ...[
                const SizedBox(height: 8),
                Text(
                  proj.description!,
                  style: const TextStyle(
                    fontSize: 14,
                    color: AppColors.textSecondary,
                    height: 1.4,
                  ),
                ),
              ],
              if (proj.technologies.isNotEmpty) ...[
                const SizedBox(height: 12),
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: proj.technologies.map((tech) {
                    return Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppColors.surfaceLight,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        tech,
                        style: const TextStyle(
                          fontSize: 11,
                          color: AppColors.secondary,
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ],
            ],
          ),
        );
      }).toList(),
    );
  }

  Widget _buildEducationAndCerts(List<EducationItem> edu, List<String> certs) {
    return _buildInfoCard(
      Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (edu.isNotEmpty) ...[
            const Text(
              'Education',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 8),
            ...edu.map((e) => Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: Text(
                    '${e.degree} - ${e.institution} (${e.year})',
                    style: const TextStyle(fontSize: 14, color: AppColors.textSecondary),
                  ),
                )),
          ],
          if (certs.isNotEmpty) ...[
            if (edu.isNotEmpty) const Divider(height: 24, color: AppColors.border),
            const Text(
              'Certifications',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: certs.map((c) => Chip(
                    label: Text(c, style: const TextStyle(fontSize: 12)),
                    backgroundColor: AppColors.surfaceLight,
                  )).toList(),
            ),
          ],
        ],
      ),
    );
  }
}
