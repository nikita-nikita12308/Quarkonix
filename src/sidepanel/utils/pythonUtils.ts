/**
 * Python-specific context generation utilities
 */

export interface PythonContext {
  imports: string[];
  classes: PythonClass[];
  functions: PythonFunction[];
  variables: string[];
}

export interface PythonClass {
  name: string;
  methods: string[];
  lineno: number;
}

export interface PythonFunction {
  name: string;
  params: string[];
  lineno: number;
}

/**
 * Parse Python code to extract context information
 */
export const generatePythonContext = (code: string): PythonContext => {
  const lines = code.split('\n');
  const context: PythonContext = {
    imports: [],
    classes: [],
    functions: [],
    variables: [],
  };

  let currentClass: PythonClass | null = null;
  let classIndent = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const indent = line.search(/\S/);

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Import statements
    if (trimmed.startsWith('import ') || trimmed.startsWith('from ')) {
      context.imports.push(trimmed);
      continue;
    }

    // Class definitions
    if (trimmed.startsWith('class ')) {
      const match = trimmed.match(/class\s+(\w+)\s*(?:\((.*?)\))?:/);
      if (match) {
        currentClass = {
          name: match[1],
          methods: [],
          lineno: i + 1,
        };
        context.classes.push(currentClass);
        classIndent = indent;
      }
      continue;
    }

    // Function/method definitions
    if (trimmed.startsWith('def ') || trimmed.startsWith('async def ')) {
      const funcMatch = trimmed.match(/(?:async\s+)?def\s+(\w+)\s*\((.*?)\)/);
      if (funcMatch) {
        const func: PythonFunction = {
          name: funcMatch[1],
          params: funcMatch[2]
            .split(',')
            .map(p => p.trim())
            .filter(p => p && p !== 'self'),
          lineno: i + 1,
        };

        // Check if it's a method (inside a class)
        if (currentClass && indent > classIndent) {
          currentClass.methods.push(funcMatch[1]);
        } else {
          context.functions.push(func);
          currentClass = null;
        }
      }
      continue;
    }

    // Module-level variables (uppercase constants)
    if (
      /^[A-Z_][A-Z0-9_]*\s*=/.test(trimmed) &&
      !currentClass
    ) {
      context.variables.push(trimmed.split('=')[0].trim());
    }

    // Reset class context if we're back to module level
    if (currentClass && indent <= classIndent && !trimmed.startsWith('def ')) {
      currentClass = null;
    }
  }

  return context;
};

/**
 * Format Python context for AI prompt
 */
export const formatPythonContextForAI = (context: PythonContext): string => {
  const sections: string[] = [];

  if (context.imports.length > 0) {
    sections.push('**Imports:**\n' + context.imports.map(imp => `- ${imp}`).join('\n'));
  }

  if (context.classes.length > 0) {
    const classDocs = context.classes.map(cls => {
      const methods = cls.methods.length > 0 ? `\n  Methods: ${cls.methods.join(', ')}` : '';
      return `- ${cls.name} (line ${cls.lineno})${methods}`;
    }).join('\n');
    sections.push(`**Classes:**\n${classDocs}`);
  }

  if (context.functions.length > 0) {
    const funcDocs = context.functions.map(func => {
      const params = func.params.length > 0 ? ` - params: ${func.params.join(', ')}` : '';
      return `- ${func.name}(${func.params.join(', ')}) (line ${func.lineno})`;
    }).join('\n');
    sections.push(`**Functions:**\n${funcDocs}`);
  }

  if (context.variables.length > 0) {
    sections.push('**Variables:**\n' + context.variables.map(v => `- ${v}`).join('\n'));
  }

  return sections.join('\n\n');
};
