const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const executeCode = (language, code) => {
  return new Promise((resolve) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    const tempDir = os.tmpdir();
    const results = { stdout: '', stderr: '' };

    const cleanup = (files = []) => {
      files.forEach(file => {
        if (fs.existsSync(file)) {
          try {
            fs.unlinkSync(file);
          } catch (err) {
            console.error(`Cleanup error for ${file}:`, err);
          }
        }
      });
    };

    switch (language.toLowerCase()) {
      case 'javascript': {
        const filePath = path.join(tempDir, `temp_${id}.js`);
        fs.writeFileSync(filePath, code);

        exec(`node "${filePath}"`, (error, stdout, stderr) => {
          cleanup([filePath]);
          resolve({ 
            stdout, 
            stderr: stderr || (error ? error.message : ''),
            status: error ? 'Error' : 'Success'
          });
        });
        break;
      }

      case 'python': {
        const filePath = path.join(tempDir, `temp_${id}.py`);
        fs.writeFileSync(filePath, code);

        exec(`python "${filePath}"`, (error, stdout, stderr) => {
          cleanup([filePath]);
          resolve({ 
            stdout, 
            stderr: stderr || (error ? error.message : ''),
            status: error ? 'Error' : 'Success'
          });
        });
        break;
      }

      case 'cpp': {
        const sourcePath = path.join(tempDir, `temp_${id}.cpp`);
        const executablePath = path.join(tempDir, `temp_${id}${os.platform() === 'win32' ? '.exe' : ''}`);
        
        fs.writeFileSync(sourcePath, code);

        // 1. Compile
        exec(`g++ "${sourcePath}" -o "${executablePath}"`, (compileError, compileStdout, compileStderr) => {
          if (compileError) {
            cleanup([sourcePath, executablePath]);
            resolve({ 
              stdout: compileStdout, 
              stderr: compileStderr || compileError.message,
              status: 'Compilation Error'
            });
            return;
          }

          // 2. Run
          exec(`"${executablePath}"`, (runError, runStdout, runStderr) => {
            cleanup([sourcePath, executablePath]);
            resolve({ 
              stdout: runStdout, 
              stderr: runStderr || (runError ? runError.message : ''),
              status: runError ? 'Runtime Error' : 'Success'
            });
          });
        });
        break;
      }

      default:
        resolve({ stdout: '', stderr: `Unsupported language for local execution: ${language}` });
    }
  });
};

module.exports = { executeCode };
