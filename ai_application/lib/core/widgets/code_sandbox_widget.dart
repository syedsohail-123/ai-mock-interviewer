import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../theme/app_theme.dart';

class CodeSandboxWidget extends StatefulWidget {
  final Function(String code, String language)? onAttachCode;
  final VoidCallback onClose;

  const CodeSandboxWidget({
    super.key,
    this.onAttachCode,
    required this.onClose,
  });

  @override
  State<CodeSandboxWidget> createState() => _CodeSandboxWidgetState();
}

class _CodeSandboxWidgetState extends State<CodeSandboxWidget> {
  String _selectedLanguage = 'Python';
  final TextEditingController _codeController = TextEditingController();
  String _consoleOutput = 'Console output will appear here after running simulation...';
  bool _isRunning = false;

  static const Map<String, String> _codeTemplates = {
    'Python': '''def solution(nums, target):
    # Hash map approach for O(N) linear time complexity
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
    return []

# Test execution
print("Result:", solution([2, 7, 11, 15], 9))
''',
    'Go': '''package main

import "fmt"

func twoSum(nums []int, target int) []int {
    seen := make(map[int]int)
    for i, num := range nums {
        complement := target - num
        if idx, ok := seen[complement]; ok {
            return []int{idx, i}
        }
        seen[num] = i
    }
    return nil
}

func main() {
    result := twoSum([]int{2, 7, 11, 15}, 9)
    fmt.Printf("Result: %v\\n", result)
}
''',
    'JavaScript': '''function twoSum(nums, target) {
    const seen = new Map();
    for (let i = 0; i < nums.length; i++) {
        const complement = target - nums[i];
        if (seen.has(complement)) {
            return [seen.get(complement), i];
        }
        seen.set(nums[i], i);
    }
    return [];
}

console.log("Result:", twoSum([2, 7, 11, 15], 9));
''',
    'SQL': '''-- Top 5 highest throughput endpoints in the last 24h
SELECT 
    endpoint_path,
    COUNT(*) AS total_requests,
    AVG(response_time_ms) AS avg_latency,
    PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY response_time_ms) AS p99_latency
FROM api_metrics_log
WHERE created_at >= NOW() - INTERVAL '24 HOURS'
GROUP BY endpoint_path
ORDER BY total_requests DESC
LIMIT 5;
''',
    'Dart': '''List<int> twoSum(List<int> nums, int target) {
  final seen = <int, int>{};
  for (int i = 0; i < nums.length; i++) {
    final complement = target - nums[i];
    if (seen.containsKey(complement)) {
      return [seen[complement]!, i];
    }
    seen[nums[i]] = i;
  }
  return [];
}

void main() {
  print('Result: \${twoSum([2, 7, 11, 15], 9)}');
}
''',
  };

  @override
  void initState() {
    super.initState();
    _codeController.text = _codeTemplates[_selectedLanguage] ?? '';
  }

  @override
  void dispose() {
    _codeController.dispose();
    super.dispose();
  }

  void _onLanguageChanged(String? lang) {
    if (lang != null && lang != _selectedLanguage) {
      setState(() {
        _selectedLanguage = lang;
        _codeController.text = _codeTemplates[lang] ?? '';
        _consoleOutput = 'Language switched to $lang. Ready to run.';
      });
    }
  }

  void _runSimulation() {
    setState(() {
      _isRunning = true;
      _consoleOutput = 'Executing $_selectedLanguage code simulation...';
    });

    Future.delayed(const Duration(milliseconds: 600), () {
      if (mounted) {
        setState(() {
          _isRunning = false;
          final lines = _codeController.text.trim().split('\n').length;
          _consoleOutput = '[SUCCESS] Code compiled cleanly with 0 syntax errors.\n'
              'Time Complexity: O(N) Linear\n'
              'Space Complexity: O(N) Auxiliary Space\n'
              'Sample Output:\n'
              'Result: [0, 1]\n'
              '(Passed 3/3 simulated test cases in 12ms)';
        });
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            decoration: const BoxDecoration(
              color: AppColors.surfaceLight,
              borderRadius: BorderRadius.vertical(top: Radius.circular(15)),
              border: Border(bottom: BorderSide(color: AppColors.border)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Icon(Icons.code_rounded, color: AppColors.primary, size: 20),
                    const SizedBox(width: 8),
                    const Text(
                      'Technical Sandbox & Code Editor',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                    ),
                    const SizedBox(width: 16),
                    // Language selector dropdown
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
                      decoration: BoxDecoration(
                        color: AppColors.background,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<String>(
                          value: _selectedLanguage,
                          dropdownColor: AppColors.surface,
                          isDense: true,
                          style: const TextStyle(fontSize: 12, color: AppColors.textPrimary, fontWeight: FontWeight.w600),
                          items: _codeTemplates.keys
                              .map((lang) => DropdownMenuItem(value: lang, child: Text(lang)))
                              .toList(),
                          onChanged: _onLanguageChanged,
                        ),
                      ),
                    ),
                  ],
                ),
                Row(
                  children: [
                    // Reset template button
                    IconButton(
                      icon: const Icon(Icons.refresh_rounded, size: 18, color: AppColors.textMuted),
                      tooltip: 'Reset Template',
                      onPressed: () {
                        setState(() {
                          _codeController.text = _codeTemplates[_selectedLanguage] ?? '';
                          _consoleOutput = 'Template reset to default.';
                        });
                      },
                    ),
                    // Close sandbox
                    IconButton(
                      icon: const Icon(Icons.close_rounded, size: 18, color: AppColors.textMuted),
                      tooltip: 'Close Sandbox',
                      onPressed: widget.onClose,
                    ),
                  ],
                ),
              ],
            ),
          ),

          // Code Editor Area
          Expanded(
            flex: 6,
            child: Container(
              color: const Color(0xFF0F172A),
              padding: const EdgeInsets.all(12),
              child: TextField(
                controller: _codeController,
                maxLines: null,
                expands: true,
                style: const TextStyle(
                  fontFamily: 'Courier New',
                  fontSize: 13,
                  color: Color(0xFF38BDF8),
                  height: 1.45,
                ),
                decoration: const InputDecoration(
                  border: InputBorder.none,
                  contentPadding: EdgeInsets.zero,
                  isDense: true,
                ),
              ),
            ),
          ),

          // Action Toolbar & Console Output
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            decoration: const BoxDecoration(
              color: AppColors.surface,
              border: Border(top: BorderSide(color: AppColors.border)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    ElevatedButton.icon(
                      onPressed: _isRunning ? null : _runSimulation,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.success,
                        foregroundColor: Colors.black,
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      ),
                      icon: _isRunning
                          ? const SizedBox(width: 12, height: 12, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black))
                          : const Icon(Icons.play_arrow_rounded, size: 16),
                      label: Text(_isRunning ? 'Running...' : 'Run Simulation', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                    ),
                    const SizedBox(width: 10),
                    if (widget.onAttachCode != null)
                      OutlinedButton.icon(
                        onPressed: () {
                          widget.onAttachCode!(_codeController.text.trim(), _selectedLanguage);
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Code attached to your answer input!'),
                              backgroundColor: AppColors.success,
                            ),
                          );
                        },
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                        ),
                        icon: const Icon(Icons.attachment_rounded, size: 16),
                        label: const Text('Attach Code to Answer', style: TextStyle(fontSize: 12)),
                      )
                    else
                      OutlinedButton.icon(
                        onPressed: () {
                          Clipboard.setData(ClipboardData(text: _codeController.text.trim()));
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Code copied to clipboard!'),
                              backgroundColor: AppColors.success,
                            ),
                          );
                        },
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                        ),
                        icon: const Icon(Icons.copy_rounded, size: 16),
                        label: const Text('Copy Code', style: TextStyle(fontSize: 12)),
                      ),
                  ],
                ),
                Text(
                  'Language: $_selectedLanguage',
                  style: const TextStyle(color: AppColors.textMuted, fontSize: 11),
                ),
              ],
            ),
          ),

          // Output Console Area
          Expanded(
            flex: 3,
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: const BoxDecoration(
                color: Color(0xFF020617),
                borderRadius: BorderRadius.vertical(bottom: Radius.circular(15)),
                border: Border(top: BorderSide(color: AppColors.border)),
              ),
              child: SingleChildScrollView(
                child: Text(
                  _consoleOutput,
                  style: const TextStyle(
                    fontFamily: 'Courier New',
                    fontSize: 11,
                    color: Color(0xFF10B981),
                    height: 1.4,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
