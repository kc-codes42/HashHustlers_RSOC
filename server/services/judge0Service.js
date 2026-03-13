const axios = require('axios');

/**
 * Judge0 Language ID Mapping for Self-Hosted Instance
 * Note: These IDs may vary based on your Judge0 flavors/images.
 */
const LANGUAGE_MAP = {
  javascript: 63, // Node.js
  python: 71,     // Python 3
  cpp: 54,        // C++ (GCC)
  java: 62        // Java (OpenJDK)
};

const JUDGE0_LOCAL_URL = 'http://localhost:2358/submissions';

/**
 * Executes code using the local Judge0 API.
 * 
 * @param {string} language - The programming language (e.g., 'javascript', 'python')
 * @param {string} code - The source code to execute
 * @returns {Promise<Object>} Object containing stdout, stderr, compile_output, and status
 */
const executeCode = async (language, code) => {
  const languageId = LANGUAGE_MAP[language.toLowerCase()];

  if (!languageId) {
    throw new Error(`Unsupported language: ${language}`);
  }

  try {
    const response = await axios.post(
      `${JUDGE0_LOCAL_URL}?base64_encoded=false&wait=true`,
      {
        source_code: code,
        language_id: languageId,
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    const result = response.data;

    return {
      stdout: result.stdout || '',
      stderr: result.stderr || '',
      compile_output: result.compile_output || '',
      status: result.status?.description || 'Unknown',
      message: result.message || ''
    };

  } catch (error) {
    console.error('[Local Judge0] Execution Error:', error.response?.data || error.message);
    throw new Error(`Local code execution failed: ${error.message}`);
  }
};

module.exports = { executeCode };
