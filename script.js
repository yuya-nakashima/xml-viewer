const xmlFileInput = document.getElementById('xmlFile');
const xslFileInput = document.getElementById('xslFile');
const xmlFileName = document.getElementById('xmlFileName');
const xslFileName = document.getElementById('xslFileName');
const renderButton = document.getElementById('renderButton');
const clearButton = document.getElementById('clearButton');
const copyButton = document.getElementById('copyButton');
const dropZone = document.getElementById('dropZone');
const message = document.getElementById('message');
const formattedOutput = document.getElementById('formattedOutput');
const treeOutput = document.getElementById('treeOutput');
const transformedOutput = document.getElementById('transformedOutput');
const panelTitle = document.getElementById('panelTitle');
const tabs = document.querySelectorAll('.tab');
const panels = {
  formatted: document.getElementById('panel-formatted'),
  tree: document.getElementById('panel-tree'),
  transformed: document.getElementById('panel-transformed')
};

let currentXmlText = '';
let currentXslText = '';

xmlFileInput.addEventListener('change', handleXmlSelect);
xslFileInput.addEventListener('change', handleXslSelect);
renderButton.addEventListener('click', renderFiles);
clearButton.addEventListener('click', clearViewer);
copyButton.addEventListener('click', copyCurrentPanel);

dropZone.addEventListener('dragenter', handleDragEnter);
dropZone.addEventListener('dragover', handleDragOver);
dropZone.addEventListener('dragleave', handleDragLeave);
dropZone.addEventListener('drop', handleDrop);

tabs.forEach((tab) => {
  tab.addEventListener('click', () => switchTab(tab.dataset.tab));
});

function handleXmlSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  xmlFileName.textContent = file.name;
  readFileText(file).then((text) => {
    currentXmlText = text;
    showMessage('XMLファイルを読み込みました。', 'success');
  }).catch(() => {
    showMessage('XMLファイルの読み込みに失敗しました。', 'error');
  });
}

function handleXslSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  xslFileName.textContent = file.name;
  readFileText(file).then((text) => {
    currentXslText = text;
    showMessage('XSLファイルを読み込みました。', 'success');
  }).catch(() => {
    showMessage('XSLファイルの読み込みに失敗しました。', 'error');
  });
}

function handleDragEnter(event) {
  event.preventDefault();
  dropZone.classList.add('is-dragover');
}

function handleDragOver(event) {
  event.preventDefault();
  dropZone.classList.add('is-dragover');
}

function handleDragLeave(event) {
  event.preventDefault();
  if (!dropZone.contains(event.relatedTarget)) {
    dropZone.classList.remove('is-dragover');
  }
}

async function handleDrop(event) {
  event.preventDefault();
  dropZone.classList.remove('is-dragover');

  const files = Array.from(event.dataTransfer.files || []);
  if (files.length === 0) return;

  const xmlFile = files.find((file) => isXmlFile(file) && !isXslFile(file));
  const xslFile = files.find((file) => isXslFile(file));

  if (!xmlFile && !xslFile && files.length === 1 && isXmlFile(files[0])) {
    currentXmlText = await readFileText(files[0]);
    xmlFileName.textContent = files[0].name;
    showMessage('XMLファイルを読み込みました。', 'success');
    return;
  }

  if (xmlFile) {
    currentXmlText = await readFileText(xmlFile);
    xmlFileName.textContent = xmlFile.name;
  }

  if (xslFile) {
    currentXslText = await readFileText(xslFile);
    xslFileName.textContent = xslFile.name;
  }

  if (!xmlFile && files.length > 0) {
    const fallbackXml = files.find((file) => isXmlFile(file));
    if (fallbackXml) {
      currentXmlText = await readFileText(fallbackXml);
      xmlFileName.textContent = fallbackXml.name;
    }
  }

  showMessage('ファイルを読み込みました。「表示」を押してください。', 'success');
}

async function renderFiles() {
  if (!currentXmlText) {
    showMessage('XMLファイルを選択してください。', 'error');
    return;
  }

  try {
    const xmlDoc = parseXml(currentXmlText);
    formattedOutput.innerHTML = highlightXml(formatXml(currentXmlText));
    treeOutput.innerHTML = '';
    treeOutput.appendChild(buildTreeView(xmlDoc.documentElement));

    if (currentXslText) {
      try {
        const xslDoc = parseXml(currentXslText);
        const resultNode = transformXml(xmlDoc, xslDoc);
        transformedOutput.innerHTML = '';
        transformedOutput.appendChild(resultNode);
        showMessage('XMLを表示しました。XSL適用結果も生成しました。', 'success');
      } catch (error) {
        transformedOutput.textContent = 'XSLの適用に失敗しました。XSLの形式を確認してください。';
        showMessage('XMLは表示しましたが、XSLの適用に失敗しました。', 'error');
      }
    } else {
      transformedOutput.textContent = 'XSLファイルが未選択です。必要ならXSLを選択してから「表示」を押してください。';
      showMessage('XMLを表示しました。', 'success');
    }
  } catch (error) {
    formattedOutput.textContent = 'XMLの表示に失敗しました。';
    treeOutput.textContent = 'XMLの構造を表示できませんでした。';
    transformedOutput.textContent = 'XSL適用結果を表示できませんでした。';
    showMessage('XMLの形式が正しくない可能性があります。', 'error');
  }
}

function clearViewer() {
  currentXmlText = '';
  currentXslText = '';
  xmlFileInput.value = '';
  xslFileInput.value = '';
  xmlFileName.textContent = '未選択';
  xslFileName.textContent = '未選択';
  formattedOutput.textContent = 'ここにXMLが表示されます。';
  treeOutput.textContent = 'ここにXMLの構造が表示されます。';
  transformedOutput.textContent = 'ここにXSL適用結果が表示されます。';
  message.textContent = '';
  dropZone.classList.remove('is-dragover');
}

function switchTab(tabName) {
  tabs.forEach((tab) => {
    tab.classList.toggle('is-active', tab.dataset.tab === tabName);
  });

  Object.entries(panels).forEach(([key, panel]) => {
    panel.classList.toggle('is-active', key === tabName);
  });

  const titles = {
    formatted: '整形XML',
    tree: 'ツリー表示',
    transformed: 'XSL適用結果'
  };

  panelTitle.textContent = titles[tabName];
}

function showMessage(text, type) {
  message.textContent = text;
  message.style.color = type === 'success' ? '#15803d' : '#b91c1c';
}

function readFileText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => resolve(event.target.result);
    reader.onerror = () => reject(new Error('Read error'));

    reader.readAsText(file, 'UTF-8');
  });
}

function parseXml(xmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'application/xml');
  const parseError = doc.getElementsByTagName('parsererror');

  if (parseError.length > 0) {
    throw new Error('Invalid XML');
  }

  return doc;
}

function transformXml(xmlDoc, xslDoc) {
  const processor = new XSLTProcessor();
  processor.importStylesheet(xslDoc);

  const fragment = processor.transformToFragment(xmlDoc, document);
  const wrapper = document.createElement('div');
  wrapper.appendChild(fragment);
  return wrapper;
}

function isXmlFile(file) {
  const name = file.name.toLowerCase();
  return (
    file.type === 'text/xml' ||
    file.type === 'application/xml' ||
    name.endsWith('.xml') ||
    name.endsWith('.xsl') ||
    name.endsWith('.xslt')
  );
}

function isXslFile(file) {
  const name = file.name.toLowerCase();
  return name.endsWith('.xsl') || name.endsWith('.xslt');
}

function formatXml(xml) {
  const normalized = xml.replace(/>\s*</g, '><').trim();

  return normalized
    .replace(/(>)(<)(\/*)/g, '$1\n$2$3')
    .split('\n')
    .reduce(
      (state, line) => {
        const trimmed = line.trim();
        if (!trimmed) return state;

        if (/^<\//.test(trimmed)) {
          state.indent -= 1;
        }

        const indent = '  '.repeat(Math.max(state.indent, 0));
        state.output.push(indent + trimmed);

        if (
          /^<[^!?/][^>]*[^/]?>$/.test(trimmed) &&
          !/^<.*<\/.*>$/.test(trimmed)
        ) {
          state.indent += 1;
        }

        return state;
      },
      { output: [], indent: 0 }
    )
    .output.join('\n');
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function highlightXml(xmlText) {
  let escaped = escapeHtml(xmlText);

  escaped = escaped.replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="xml-comment">$1</span>');

  escaped = escaped.replace(
    /(&lt;\/?)([\w:-]+)(.*?)(\/?&gt;)/g,
    (match, open, tagName, attrs, close) => {
      const highlightedAttrs = attrs.replace(
        /([\w:-]+)=(&quot;.*?&quot;|".*?"|'.*?')/g,
        '<span class="xml-attr">$1</span>=<span class="xml-value">$2</span>'
      );

      return `${open}<span class="xml-tag">${tagName}</span>${highlightedAttrs}${close}`;
    }
  );

  return escaped;
}

function buildTreeView(element) {
  const rootList = document.createElement('ul');
  rootList.className = 'tree-list';
  rootList.appendChild(buildTreeNode(element));
  return rootList;
}

function buildTreeNode(node) {
  const item = document.createElement('li');
  item.className = 'tree-node';

  const label = document.createElement('div');
  label.className = 'tree-label';

  const attrs = Array.from(node.attributes || [])
    .map((attr) => `${attr.name}="${attr.value}"`)
    .join(' ');

  label.textContent = attrs
    ? `<${node.nodeName} ${attrs}>`
    : `<${node.nodeName}>`;

  item.appendChild(label);

  const childElements = Array.from(node.children || []);
  const textContent = Array.from(node.childNodes || [])
    .filter((child) => child.nodeType === Node.TEXT_NODE)
    .map((child) => child.textContent.trim())
    .filter(Boolean)
    .join(' ');

  if (textContent) {
    const text = document.createElement('div');
    text.className = 'tree-text';
    text.textContent = textContent;
    item.appendChild(text);
  }

  if (childElements.length > 0) {
    const childList = document.createElement('ul');
    childList.className = 'tree-list';

    childElements.forEach((child) => {
      childList.appendChild(buildTreeNode(child));
    });

    item.appendChild(childList);
  }

  return item;
}

async function copyCurrentPanel() {
  const activeTab = document.querySelector('.tab.is-active')?.dataset.tab;

  let text = '';

  if (activeTab === 'formatted') {
    text = formattedOutput.innerText.trim();
  } else if (activeTab === 'tree') {
    text = treeOutput.innerText.trim();
  } else if (activeTab === 'transformed') {
    text = transformedOutput.innerText.trim();
  }

  if (!text || text.includes('ここに')) {
    showMessage('コピーする内容がありません。', 'error');
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    showMessage('表示内容をコピーしました。', 'success');
  } catch (error) {
    showMessage('コピーに失敗しました。', 'error');
  }
}