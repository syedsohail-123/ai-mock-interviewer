import 'package:flutter_test/flutter_test.dart';
import 'package:ai_application/features/cv_parser/data/models/candidate_profile_model.dart';
import 'package:ai_application/features/interview/data/models/interview_models.dart';

void main() {
  test('Candidate Profile Model serialization and deserialization', () {
    const profile = CandidateProfile(
      id: 'test-123',
      personalInfo: const PersonalInfo(name: 'Test Candidate', email: 'test@example.com'),
      skills: const ['Python', 'FastAPI', 'Flutter'],
      summary: 'Experienced Engineer',
      experience: const [
        ExperienceItem(role: 'Dev', company: 'Tech Inc', duration: '2 yrs')
      ],
    );

    final json = profile.toJson();
    final parsed = CandidateProfile.fromJson(json);

    assert(parsed.id == 'test-123');
    assert(parsed.personalInfo.name == 'Test Candidate');
    assert(parsed.skills.length == 3);
    assert(parsed.experience.first.company == 'Tech Inc');
  });

  test('Interview State Machine Stage parsing', () {
    assert(InterviewStage.fromString('INTRO') == InterviewStage.intro);
    assert(InterviewStage.fromString('TECHNICAL') == InterviewStage.technical);
    assert(InterviewStage.fromString('PROJECT_DEEP_DIVE') == InterviewStage.projectDeepDive);
    assert(InterviewStage.fromString('COMPLETED') == InterviewStage.completed);
  });
}
