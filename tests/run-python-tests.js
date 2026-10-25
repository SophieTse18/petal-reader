const { spawnSync } = require('node:child_process');

const candidates = [
  { command: 'python3', prefix: [] },
  { command: 'python', prefix: [] },
  { command: 'py', prefix: ['-3'] }
];

const selected = candidates.find(({ command, prefix }) => {
  const probe = spawnSync(command, [...prefix, '--version'], { stdio: 'ignore' });
  return !probe.error && probe.status === 0;
});

if (!selected) {
  console.error('Python 3 is required to run the exporter tests.');
  process.exit(1);
}

const result = spawnSync(
  selected.command,
  [...selected.prefix, '-m', 'unittest', 'discover', '-s', 'tests', '-p', 'test_*.py'],
  { stdio: 'inherit' }
);
if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}
process.exit(result.status ?? 1);
