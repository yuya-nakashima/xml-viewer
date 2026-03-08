const xmlFileInput = document.getElementById('xmlFile');
const output = document.getElementById('output');
const message = document.getElementById('message');
const fileName = document.getElementById('fileName');
const clearButton = document.getElementById('clearButton');
const copyButton = document.getElementById('copyButton');

xmlFileInput.addEventListener('change', handleFileSelect);
clearButton.addEventListener('click', clearViewer);
copyButton.addEventListener('click', copyOutput);

function handleFileSelect(event) {
  const file = event.target.files[0];

  clearMessage();

  if (!file) {
    return;
  }

  fileName.textContent = `ファイル名: ${file.name}`;

  const reader = new FileReader();

  reader.onload = function (e) {
    const xmlText = e.target.result;

    try {
      const formattedXml = formatXml(xmlText);
      output.textContent = formattedXml;
      message.textContent = 'XMLを読み込みました。';
      message.style.color = '#15803d';
    } catch (error) {
      output.textContent = 'XMLの表示に失敗しました。';
      message.textContent = 'XMLの形式が正しくない可能性があります。';
      message.style.color = '#b91c1c';
    }
  };

  reader.onerror = function () {
    output.textContent = 'ファイルの読み込みに失敗しました。';
    message.textContent = 'ファイルの読み込み中にエラーが発生しました。';
    message.style.color = '#b91c1c';
  };

  reader.readAsText(file, 'UTF-8');
}

function formatXml(xml) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xml, 'application/xml');

  const parseError = xmlDoc.getElementsByTagName('parsererror');
  if (parseError.length > 0) {
    throw new Error('Invalid XML');
  }

  const serializer = new XMLSerializer();
  const raw = serializer.serializeToString(xmlDoc);

  const pretty = raw
    .replace(/(>)(<)(\/*)/g, '$1\n$2$3')
    .split('\n')
    .reduce(
      (result, line) => {
        let indentChange = 0;

        if (line.match(/^<\/.+>/)) {
          result.indent -= 1;
        }

        const indent = '  '.repeat(Math.max(result.indent, 0));
        result.formatted += indent + line + '\n';

        if (line.match(/^<[^!?].*[^/]>/) && !line.match(/<\/.+>/)) {
          indentChange = 1;
        }

        result.indent += indentChange;
        return result;
      },
      { formatted: '', indent: 0 }
    ).formatted;

  return pretty.trim();
}

function clearViewer() {
  xmlFileInput.value = '';
  output.textContent = 'ここにXMLが表示されます。';
  message.textContent = '';
  fileName.textContent = '';
}

function clearMessage() {
  message.textContent = '';
}

async function copyOutput() {
  const text = output.textContent;

  if (!text || text === 'ここにXMLが表示されます。') {
    message.textContent = 'コピーする内容がありません。';
    message.style.color = '#b91c1c';
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    message.textContent = '表示中のXMLをコピーしました。';
    message.style.color = '#15803d';
  } catch (error) {
    message.textContent = 'コピーに失敗しました。';
    message.style.color = '#b91c1c';
  }
}