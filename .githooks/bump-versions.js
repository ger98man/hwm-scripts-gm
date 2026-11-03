// Tampermonkey обновляет скрипт, только если выросла @version. Перед коммитом поднимаем её
// в изменённых скриптах, где версию не подняли вручную, и переносим версии в таблицу README.
// Правим и индекс, и рабочий файл: незастейдженные правки в коммит не попадают.
const { execFileSync } = require('child_process');
const fs = require('fs');

const VERSION_LINE = /^(\/\/ @version[ \t]+)(\S+)/m;

function git(args, input) {
  return execFileSync('git', args, { encoding: 'utf8', input: input, maxBuffer: 64 * 1024 * 1024 });
}

function versionOf(text) {
  const found = VERSION_LINE.exec(text);
  return found ? found[2] : null;
}

function nextVersion(version) {
  const parts = version.split('.');
  const last = parseInt(parts[parts.length - 1], 10);
  if (isNaN(last)) throw new Error('Не удалось поднять версию: ' + version);
  parts[parts.length - 1] = String(last + 1);
  return parts.join('.');
}

function rewrite(path, change) {
  const mode = git(['ls-files', '--stage', '--', path]).split(' ')[0];
  const blob = git(['hash-object', '-w', '--stdin'], change(git(['show', ':' + path]))).trim();
  git(['update-index', '--cacheinfo', mode + ',' + blob + ',' + path]);
  fs.writeFileSync(path, change(fs.readFileSync(path, 'utf8')));
}

function syncReadme(script, version) {
  const name = script.replace('.user.js', '');
  rewrite('README.md', function (text) {
    return text.replace('| `' + name + '` | ' + readmeVersion(text, name) + ' |', '| `' + name + '` | ' + version + ' |');
  });
}

function readmeVersion(text, name) {
  const row = text.split('\n').find(function (line) { return line.indexOf('| `' + name + '` | ') === 0; });
  return row ? row.split(' | ')[1] : null;
}

const changed = git(['diff', '--cached', '--name-only', '--diff-filter=M']).split('\n').filter(function (path) {
  return /^[^/]+\.user\.js$/.test(path);
});

changed.forEach(function (script) {
  const before = versionOf(git(['show', 'HEAD:' + script]));
  let version = versionOf(git(['show', ':' + script]));
  if (!version) throw new Error('Нет @version в ' + script);
  if (version === before) {
    version = nextVersion(version);
    rewrite(script, function (text) {
      return text.replace(VERSION_LINE, '$1' + version);
    });
    console.log(script + ': версия ' + before + ' -> ' + version);
  }
  syncReadme(script, version);
});
