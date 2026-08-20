import 'package:equatable/equatable.dart';

class PersonalInfo extends Equatable {
  final String name;
  final String? email;
  final String? phone;
  final String? location;
  final String? linkedin;
  final String? github;

  const PersonalInfo({
    this.name = 'Candidate',
    this.email,
    this.phone,
    this.location,
    this.linkedin,
    this.github,
  });

  factory PersonalInfo.fromJson(Map<String, dynamic> json) {
    return PersonalInfo(
      name: json['name'] ?? 'Candidate',
      email: json['email'],
      phone: json['phone'],
      location: json['location'],
      linkedin: json['linkedin'],
      github: json['github'],
    );
  }

  Map<String, dynamic> toJson() => {
        'name': name,
        'email': email,
        'phone': phone,
        'location': location,
        'linkedin': linkedin,
        'github': github,
      };

  @override
  List<Object?> get props => [name, email, phone, location, linkedin, github];
}

class ExperienceItem extends Equatable {
  final String role;
  final String company;
  final String? duration;
  final String? description;
  final List<String> technologies;

  const ExperienceItem({
    required this.role,
    required this.company,
    this.duration,
    this.description,
    this.technologies = const [],
  });

  factory ExperienceItem.fromJson(Map<String, dynamic> json) {
    return ExperienceItem(
      role: json['role'] ?? '',
      company: json['company'] ?? '',
      duration: json['duration'],
      description: json['description'],
      technologies: List<String>.from(json['technologies'] ?? []),
    );
  }

  Map<String, dynamic> toJson() => {
        'role': role,
        'company': company,
        'duration': duration,
        'description': description,
        'technologies': technologies,
      };

  @override
  List<Object?> get props => [role, company, duration, description, technologies];
}

class EducationItem extends Equatable {
  final String degree;
  final String institution;
  final String? year;
  final String? grade;

  const EducationItem({
    required this.degree,
    required this.institution,
    this.year,
    this.grade,
  });

  factory EducationItem.fromJson(Map<String, dynamic> json) {
    return EducationItem(
      degree: json['degree'] ?? '',
      institution: json['institution'] ?? '',
      year: json['year'],
      grade: json['grade'],
    );
  }

  Map<String, dynamic> toJson() => {
        'degree': degree,
        'institution': institution,
        'year': year,
        'grade': grade,
      };

  @override
  List<Object?> get props => [degree, institution, year, grade];
}

class ProjectItem extends Equatable {
  final String title;
  final String description;
  final List<String> technologies;
  final String? link;

  const ProjectItem({
    required this.title,
    required this.description,
    this.technologies = const [],
    this.link,
  });

  factory ProjectItem.fromJson(Map<String, dynamic> json) {
    return ProjectItem(
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      technologies: List<String>.from(json['technologies'] ?? []),
      link: json['link'],
    );
  }

  Map<String, dynamic> toJson() => {
        'title': title,
        'description': description,
        'technologies': technologies,
        'link': link,
      };

  @override
  List<Object?> get props => [title, description, technologies, link];
}

class CandidateProfile extends Equatable {
  final String? id;
  final PersonalInfo personalInfo;
  final String summary;
  final List<String> skills;
  final List<ExperienceItem> experience;
  final List<EducationItem> education;
  final List<ProjectItem> projects;
  final List<String> certifications;
  final List<String> achievements;
  final String? rawText;

  const CandidateProfile({
    this.id,
    this.personalInfo = const PersonalInfo(),
    this.summary = '',
    this.skills = const [],
    this.experience = const [],
    this.education = const [],
    this.projects = const [],
    this.certifications = const [],
    this.achievements = const [],
    this.rawText,
  });

  factory CandidateProfile.fromJson(Map<String, dynamic> json) {
    return CandidateProfile(
      id: json['id'],
      personalInfo: json['personal_info'] != null
          ? PersonalInfo.fromJson(json['personal_info'])
          : const PersonalInfo(),
      summary: json['summary'] ?? '',
      skills: List<String>.from(json['skills'] ?? []),
      experience: (json['experience'] as List? ?? [])
          .map((e) => ExperienceItem.fromJson(e))
          .toList(),
      education: (json['education'] as List? ?? [])
          .map((e) => EducationItem.fromJson(e))
          .toList(),
      projects: (json['projects'] as List? ?? [])
          .map((e) => ProjectItem.fromJson(e))
          .toList(),
      certifications: List<String>.from(json['certifications'] ?? []),
      achievements: List<String>.from(json['achievements'] ?? []),
      rawText: json['raw_text'],
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'personal_info': personalInfo.toJson(),
        'summary': summary,
        'skills': skills,
        'experience': experience.map((e) => e.toJson()).toList(),
        'education': education.map((e) => e.toJson()).toList(),
        'projects': projects.map((e) => e.toJson()).toList(),
        'certifications': certifications,
        'achievements': achievements,
        'raw_text': rawText,
      };

  CandidateProfile copyWith({
    String? id,
    PersonalInfo? personalInfo,
    String? summary,
    List<String>? skills,
    List<ExperienceItem>? experience,
    List<EducationItem>? education,
    List<ProjectItem>? projects,
    List<String>? certifications,
    List<String>? achievements,
    String? rawText,
  }) {
    return CandidateProfile(
      id: id ?? this.id,
      personalInfo: personalInfo ?? this.personalInfo,
      summary: summary ?? this.summary,
      skills: skills ?? this.skills,
      experience: experience ?? this.experience,
      education: education ?? this.education,
      projects: projects ?? this.projects,
      certifications: certifications ?? this.certifications,
      achievements: achievements ?? this.achievements,
      rawText: rawText ?? this.rawText,
    );
  }

  @override
  List<Object?> get props => [
        id,
        personalInfo,
        summary,
        skills,
        experience,
        education,
        projects,
        certifications,
        achievements,
      ];
}
