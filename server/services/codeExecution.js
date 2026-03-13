const axios = require('axios');

/**
 * Piston Language ID Mapping & Versions
 * We use '*' for versions to let Piston pick the latest available.
 */
const LANGUAGE_CONFIG = {
  javascript: { language: 'javascript', version: '18.15.0' },
  python: { language: 'python', version: '3.10.0' },
  cpp: { language: 'cpp', version: '10.2.0' },
  java: { language: 'java', version: '15.0.2' }
};

const PISTON_URL = process.env.EXECUTION_API_URL || 'https://emkc.org/api/v2/piston/execute';

/**
 * Executes code using the Piston Code Execution Engine.
 * 
 * @param {string} language - The programming language (e.g., 'javascript', 'python')
 * @param {string} code - The source code to execute
 * @returns {Promise<Object>} Object containing stdout, stderr, and status
 */
const executeCode = async (language, code) => {
  const config = LANGUAGE_CONFIG[language.toLowerCase()];

  if (!config) {
    throw new Error(`Unsupported language: ${language}`);
  }

  try {
    const response = await axios.post(PISTON_URL, {
      language: config.language,
      version: config.version,
      files: [
        {
          content: code
        }
      ]
    });

    const result = response.data;

    // Piston returns separate objects for compile and run stages if applicable.
    // We combine them for the frontend.
    const runResult = result.run || {};
    const compileResult = result.compile || {};

    return {
      stdout: runResult.stdout || '',
      stderr: (compileResult.stderr || '') + (runResult.stderr || ''),
      status: runResult.signal ? `Terminated by ${runResult.signal}` : (runResult.code === 0 ? 'Accepted' : `Exited with code ${runResult.code}`),
      compile_output: compileResult.stdout || '',
      message: ''
    };

  } catch (error) {
    console.error('[Piston] Execution Error:', error.response?.data || error.message);
    throw new Error(`Code execution failed: ${error.message}`);
  }
};

module.exports = { executeCode };
