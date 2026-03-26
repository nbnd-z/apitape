/**
 * @fileoverview Zero-dependency CLI argument parser.
 * Replaces commander with a minimal implementation supporting
 * subcommands, positional args, flags, key-value options, and multi-value options.
 * @module cli/arg-parser
 */

import { parseArgs } from 'node:util';

/**
 * @typedef {Object} OptionDef
 * @property {string} short - Short flag (e.g. '-f')
 * @property {string} long - Long flag (e.g. '--force')
 * @property {string} description - Help text
 * @property {'boolean'|'string'} type - Option type
 * @property {boolean} [required] - Whether the option is required
 * @property {string} [defaultValue] - Default value for string options
 * @property {boolean} [multiple] - Accept multiple values
 */

/**
 * @typedef {Object} CommandDef
 * @property {string} name - Command name
 * @property {string} description - Help text
 * @property {string|null} positional - Name of positional arg (e.g. '<url>') or null
 * @property {OptionDef[]} options - Option definitions
 * @property {Function} action - Handler function
 */

/**
 * Create a CLI program.
 * @param {Object} meta - Program metadata
 * @param {string} meta.name - Program name
 * @param {string} meta.description - Program description
 * @param {string} meta.version - Program version
 * @returns {Object} CLI builder
 */
export function createCLI(meta) {
  /** @type {CommandDef[]} */
  const commands = [];

  return {
    /**
     * Register a command.
     * @param {CommandDef} cmd
     */
    command(cmd) {
      commands.push(cmd);
    },

    /**
     * Parse process.argv and run the matched command.
     */
    async run() {
      const argv = process.argv.slice(2);

      // --version / -V
      if (argv.includes('--version') || argv.includes('-V')) {
        console.log(meta.version);
        return;
      }

      // Top-level --help or no args
      if (argv.length === 0 || argv[0] === '--help' || argv[0] === '-h') {
        printGlobalHelp(meta, commands);
        return;
      }

      const cmdName = argv[0];
      const cmd = commands.find(c => c.name === cmdName);

      if (!cmd) {
        console.error(`Unknown command: ${cmdName}`);
        console.error(`Run "${meta.name} --help" for usage.`);
        process.exit(1);
      }

      const cmdArgv = argv.slice(1);

      // Command-level --help
      if (cmdArgv.includes('--help') || cmdArgv.includes('-h')) {
        printCommandHelp(meta, cmd);
        return;
      }

      // Build parseArgs config
      const { parsed, positionalValue } = parseCommand(cmd, cmdArgv);

      // Check required options
      for (const opt of cmd.options) {
        if (opt.required && parsed[camelCase(optKey(opt.long))] === undefined) {
          console.error(`Missing required option: ${opt.long}`);
          process.exit(1);
        }
      }

      // Apply defaults
      for (const opt of cmd.options) {
        const key = camelCase(optKey(opt.long));
        if (parsed[key] === undefined && opt.defaultValue !== undefined) {
          parsed[key] = opt.defaultValue;
        }
      }

      // Call action
      if (cmd.positional) {
        await cmd.action(positionalValue, parsed);
      } else {
        await cmd.action(parsed);
      }
    }
  };
}

/**
 * Parse command arguments using node:util parseArgs.
 * @param {CommandDef} cmd - Command definition
 * @param {string[]} argv - Arguments after command name
 * @returns {{ parsed: Object, positionalValue: string|undefined }}
 */
function parseCommand(cmd, argv) {
  // Build parseArgs options config
  const options = {};
  // Track --no-* flags for manual handling
  const noFlags = [];

  for (const opt of cmd.options) {
    const key = optKey(opt.long);
    if (opt.long.startsWith('--no-')) {
      noFlags.push(opt);
      continue; // handled manually below
    }
    options[key] = { type: opt.type || 'boolean' };
    if (opt.short) options[key].short = opt.short.slice(1);
    if (opt.multiple) options[key].multiple = true;
  }

  let positionalValue;
  let parseArgv = argv;

  // Handle --no-* flags: rewrite argv to remove them and track their presence
  const noFlagValues = {};
  for (const nf of noFlags) {
    const flagStr = nf.long; // e.g. '--no-gitignore'
    const positiveKey = nf.long.slice(5); // e.g. 'gitignore'
    if (parseArgv.includes(flagStr)) {
      noFlagValues[positiveKey] = false;
      parseArgv = parseArgv.filter(a => a !== flagStr);
    } else {
      noFlagValues[positiveKey] = true; // default: the positive form is true
    }
  }

  // Extract positional arg (first non-flag argument)
  if (cmd.positional) {
    const posIdx = parseArgv.findIndex(a => !a.startsWith('-'));
    if (posIdx !== -1) {
      positionalValue = parseArgv[posIdx];
      parseArgv = [...parseArgv.slice(0, posIdx), ...parseArgv.slice(posIdx + 1)];
    }
  }

  try {
    const { values } = parseArgs({
      args: parseArgv,
      options,
      strict: false
    });

    // Merge into flat object, camelCase keys
    const parsed = {};
    for (const [key, val] of Object.entries(values)) {
      parsed[camelCase(key)] = val;
    }

    // Merge --no-* flag results
    for (const [key, val] of Object.entries(noFlagValues)) {
      parsed[camelCase(key)] = val;
    }

    return { parsed, positionalValue };
  } catch (err) {
    console.error(`Error parsing arguments: ${err.message}`);
    process.exit(1);
  }
}

/**
 * Extract option key from long flag (e.g. '--fail-on-drift' → 'fail-on-drift').
 * @param {string} long
 * @returns {string}
 */
function optKey(long) {
  return long.replace(/^--/, '');
}

/**
 * Convert kebab-case to camelCase.
 * @param {string} str
 * @returns {string}
 */
function camelCase(str) {
  return str.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

/**
 * Print global help.
 * @param {Object} meta
 * @param {CommandDef[]} commands
 */
function printGlobalHelp(meta, commands) {
  console.log(`${meta.name} v${meta.version}`);
  console.log(`${meta.description}\n`);
  console.log(`Usage: ${meta.name} <command> [options]\n`);
  console.log('Commands:');
  const maxLen = Math.max(...commands.map(c => c.name.length));
  for (const cmd of commands) {
    console.log(`  ${cmd.name.padEnd(maxLen + 2)} ${cmd.description}`);
  }
  console.log(`\nRun "${meta.name} <command> --help" for command-specific options.`);
}

/**
 * Print command-level help.
 * @param {Object} meta
 * @param {CommandDef} cmd
 */
function printCommandHelp(meta, cmd) {
  const positional = cmd.positional ? ` ${cmd.positional}` : '';
  console.log(`Usage: ${meta.name} ${cmd.name}${positional} [options]\n`);
  console.log(cmd.description + '\n');
  if (cmd.options.length === 0) return;
  console.log('Options:');
  const lines = cmd.options.map(o => {
    const flags = o.short ? `${o.short}, ${o.long}` : `    ${o.long}`;
    return { flags, desc: o.description + (o.required ? ' (required)' : '') + (o.defaultValue ? ` (default: ${o.defaultValue})` : '') };
  });
  const maxFlags = Math.max(...lines.map(l => l.flags.length));
  for (const l of lines) {
    console.log(`  ${l.flags.padEnd(maxFlags + 2)} ${l.desc}`);
  }
}
